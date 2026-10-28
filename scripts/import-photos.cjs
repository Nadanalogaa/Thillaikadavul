#!/usr/bin/env node
/**
 * Copy each student's photo from Google Drive onto the server and point the
 * profile at the local copy, so the app never depends on Drive again.
 *
 * Reads scripts/students-import.json (the Drive id per student is in there),
 * matches students by name + phone, downloads to server/uploads/photos/, and
 * sets users.photo_url. Drive files must be shared "Anyone with the link".
 * A file that is not public is reported and skipped; nothing else changes.
 *
 *   DATABASE_URL=... node scripts/import-photos.cjs --check   # report only
 *   DATABASE_URL=... node scripts/import-photos.cjs           # do it
 *
 * In the container (node, pg and the uploads volume are all there):
 *   docker exec -w /app/server nadanaloga-main-app node import-photos.cjs /app/students-import.json
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const moduleDirs = [
    path.join(__dirname, '..', 'server', 'node_modules'),
    path.join(__dirname, 'node_modules'),
    '/app/server/node_modules',
].filter(d => fs.existsSync(d));
const req = (m) => {
    try { return require(m); } catch (e) {
        for (const d of moduleDirs) { try { return require(path.join(d, m)); } catch {} }
        throw e;
    }
};
const { Pool } = req('pg');

const CHECK = process.argv.includes('--check');
const DATA = JSON.parse(fs.readFileSync(
    process.argv.find(a => a.endsWith('.json')) || path.join(__dirname, 'students-import.json'), 'utf8'));

// Where the app serves /uploads from: server/uploads in the repo, /app/server/uploads in the container.
const UPLOADS_DIR = [path.join(__dirname, '..', 'server', 'uploads'), '/app/server/uploads']
    .find(d => fs.existsSync(d)) || path.join(__dirname, '..', 'server', 'uploads');
const PHOTO_DIR = path.join(UPLOADS_DIR, 'photos');

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

/** Fetch a Drive file; resolves {buffer, type} or rejects if it is not public. */
const fetchDrive = (id) => new Promise((resolve, reject) => {
    const url = `https://drive.google.com/uc?export=download&id=${id}`;
    const get = (u, hops) => https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && hops < 5) {
            r.resume();
            return get(new URL(r.headers.location, u).toString(), hops + 1);
        }
        const type = String(r.headers['content-type'] || '');
        if (r.statusCode !== 200 || !type.startsWith('image/')) {
            r.resume();
            return reject(new Error(type.includes('text/html') ? 'not public (Drive sign-in page)' : `HTTP ${r.statusCode} ${type}`));
        }
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => resolve({ buffer: Buffer.concat(chunks), type }));
        r.on('error', reject);
    }).on('error', reject);
    get(url, 0);
});

const ext = (type) => type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';

(async () => {
    const students = [];
    for (const f of DATA.families) for (const s of f.children) if (s.photo_drive_id) students.push(s);
    console.log(`${students.length} students have a Drive photo id`);
    if (!CHECK) fs.mkdirSync(PHOTO_DIR, { recursive: true });

    let done = 0, skipped = 0, notFound = 0;
    const problems = [];
    for (const s of students) {
        const row = (await pool.query(
            `SELECT id, user_id FROM users WHERE role = 'Student' AND is_deleted = false
               AND LOWER(name) = LOWER($1) AND contact_number = $2 LIMIT 1`,
            [s.name, s.phone])).rows[0];
        if (!row) { notFound++; problems.push(`${s.name} (${s.phone}): no matching student in the database`); continue; }
        try {
            const { buffer, type } = await fetchDrive(s.photo_drive_id);
            if (CHECK) { done++; continue; }
            const file = `${row.user_id.toLowerCase()}.${ext(type)}`;
            fs.writeFileSync(path.join(PHOTO_DIR, file), buffer);
            await pool.query('UPDATE users SET photo_url = $1, updated_at = NOW() WHERE id = $2',
                [`/uploads/photos/${file}`, row.id]);
            done++;
        } catch (e) {
            skipped++;
            problems.push(`${s.name}: ${e.message}`);
        }
    }
    console.log(`\n${CHECK ? 'Would copy' : 'Copied'}: ${done}   skipped: ${skipped}   not matched: ${notFound}`);
    if (problems.length) {
        console.log('\nProblems:');
        for (const p of problems.slice(0, 15)) console.log('  -', p);
        if (problems.length > 15) console.log(`  … and ${problems.length - 15} more`);
    }
    if (!CHECK && done) console.log(`\nPhotos are in ${PHOTO_DIR} and served at /uploads/photos/.`);
    await pool.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
