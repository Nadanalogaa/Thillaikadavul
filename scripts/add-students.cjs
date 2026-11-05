#!/usr/bin/env node
/**
 * Add students to the LIVE database without touching anyone else (unlike
 * import-students.cjs, which rebuilds from scratch). Reads a data file built
 * from the academy's spreadsheet (students-add-*.json — personal data, kept
 * out of git) and, in ONE transaction:
 *
 *   - renames teachers (teacher_renames: phone + name_from -> name_to)
 *   - adds each new student under the family with the same phone (a new
 *     family login is made when the phone is new), with grade per course and
 *     batch per course; a student already there (same name + phone) is skipped
 *   - updates existing students (updates: name + phone): date of birth,
 *     grade per course, batch per course (moved out of any other batch of the
 *     same course), and adds courses they now take. Nothing is removed.
 *   - re-prices this month's UNPAID bills (no screenshot / payment) of the
 *     students whose grade or batch changed; the 6-hourly bill run then
 *     creates bills for courses that have none yet.
 *
 *   DATABASE_URL=... node scripts/add-students.cjs students-add-2026-11.json --dry-run
 *   DATABASE_URL=... node scripts/add-students.cjs students-add-2026-11.json
 *
 * In the container:
 *   docker exec -w /app/server nadanaloga-main-app node add-students.cjs /app/students-add-2026-11.json --dry-run
 *
 * New logins use the default password and must change it on first sign-in.
 * No notifications are sent.
 */
const fs = require('fs');
const path = require('path');

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
const bcrypt = req('bcryptjs');

const DRY_RUN = process.argv.includes('--dry-run');
const FILE = process.argv.slice(2).find(a => a.endsWith('.json'));
if (!FILE) { console.error('Usage: node add-students.cjs <students-add-*.json> [--dry-run]'); process.exit(1); }
const DATA = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const DEFAULT_PASSWORD = 'nadanaloga123';
const JOINED = DATA.joined || new Date().toISOString().slice(0, 10);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const log = (...a) => console.log(...a);
const letters = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

(async () => {
    const client = await pool.connect();
    const summary = {};
    const count = (k, n = 1) => { summary[k] = (summary[k] || 0) + n; };
    const notes = [];
    try {
        await client.query('BEGIN');

        // ---- What the data refers to: courses, grades, batches ------------
        const courses = (await client.query('SELECT id, name FROM courses')).rows;
        const courseId = (name) => {
            const c = courses.find(x => x.name.toLowerCase() === String(name).toLowerCase());
            if (!c) throw new Error(`Course not found: ${name}`);
            return c.id;
        };
        const grades = (await client.query('SELECT id, course_id, name, monthly_fee FROM grades WHERE is_active = true')).rows;
        const gradeOf = (cid, name) => {
            const g = grades.find(x => x.course_id === cid && x.name.toLowerCase() === String(name).toLowerCase());
            if (!g) throw new Error(`Grade "${name}" not found for course #${cid}`);
            return g;
        };
        const batches = (await client.query('SELECT id, batch_name, course_id, student_ids, monthly_fee FROM batches')).rows;
        // "Batch 1" matches "Batch 1 · Gurupriya" but never "Batch 10"; must be exactly one.
        const batchOf = (cid, key) => {
            const re = new RegExp(`^${esc(key)}(?![0-9A-Za-z])`, 'i');
            const hit = batches.filter(b => b.course_id === cid && re.test(b.batch_name.trim()));
            if (hit.length !== 1) throw new Error(`Batch "${key}" (course #${cid}) matched ${hit.length} batches`);
            return hit[0];
        };
        // Check every reference before writing anything.
        for (const s of [...DATA.new_students, ...DATA.updates]) {
            for (const e of s.enrolments) {
                const cid = courseId(e.course);
                if (e.grade) gradeOf(cid, e.grade);
                if (e.batch) batchOf(cid, e.batch);
            }
        }

        const findStudent = async (name, phone) => (await client.query(
            `SELECT id, name, courses FROM users
              WHERE LOWER(TRIM(role)) = 'student' AND is_deleted = false
                AND RIGHT(regexp_replace(COALESCE(contact_number, ''), '\\D', '', 'g'), 10) = $2
                AND LOWER(regexp_replace(name, '[^a-zA-Z]', '', 'g')) = $1`,
            [letters(name), digits(phone)])).rows;

        // Grade + batch for one course; returns true when something changed.
        const enrol = async (sid, e, { isNew }) => {
            const cid = courseId(e.course);
            let changed = false;
            if (e.grade) {
                const g = gradeOf(cid, e.grade);
                const cur = (await client.query('SELECT grade_id FROM student_course_grades WHERE student_id = $1 AND course_id = $2', [sid, cid])).rows[0];
                if (!cur || cur.grade_id !== g.id) {
                    await client.query(
                        `INSERT INTO student_course_grades (student_id, course_id, grade_id, created_at) VALUES ($1, $2, $3, $4)
                         ON CONFLICT (student_id, course_id) DO UPDATE SET grade_id = EXCLUDED.grade_id`,
                        [sid, cid, g.id, JOINED]);   // a course added now is billed from JOINED too (ON CONFLICT keeps the original date)
                    changed = true;
                    count(isNew ? 'grades set (new)' : 'grades changed (existing)');
                }
            }
            if (e.batch) {
                const target = batchOf(cid, e.batch);
                for (const b of batches.filter(x => x.course_id === cid && x.id !== target.id && (x.student_ids || []).includes(sid))) {
                    b.student_ids = b.student_ids.filter(x => x !== sid);
                    await client.query('UPDATE batches SET student_ids = $1, updated_at = NOW() WHERE id = $2', [b.student_ids, b.id]);
                    notes.push(`   moved out of ${b.batch_name}`);
                    changed = true;
                }
                if (!(target.student_ids || []).includes(sid)) {
                    target.student_ids = [...(target.student_ids || []), sid];
                    await client.query('UPDATE batches SET student_ids = $1, updated_at = NOW() WHERE id = $2', [target.student_ids, target.id]);
                    changed = true;
                    count(isNew ? 'batch places (new)' : 'batch places changed (existing)');
                }
            }
            return changed;
        };
        const addCourses = async (sid, names) => {
            const row = (await client.query('SELECT courses FROM users WHERE id = $1', [sid])).rows[0];
            let list = [];
            try { list = Array.isArray(row.courses) ? row.courses : JSON.parse(row.courses || '[]'); } catch { list = []; }
            const next = [...new Set([...list, ...names])];
            if (next.length !== list.length) {
                await client.query('UPDATE users SET courses = $1 WHERE id = $2', [JSON.stringify(next), sid]);
                count('courses added to students', next.length - list.length);
            }
        };
        // This month's unpaid bill for a course, priced again from the grade
        // (or the batch's own fee), keeping its pro-rata and discount.
        const now = new Date();
        const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const reprice = async (sid, courseName) => {
            const cid = courseId(courseName);
            const inv = (await client.query(
                `SELECT i.id, i.amount, i.prorated_from, i.discount_percentage FROM invoices i
                  WHERE i.student_id = $1 AND i.course_id = $2 AND i.billing_period = $3 AND LOWER(COALESCE(i.status, '')) <> 'paid'
                    AND NOT EXISTS (SELECT 1 FROM invoice_payments p WHERE p.invoice_id = i.id AND p.status IN ('approved', 'submitted'))`,
                [sid, cid, period])).rows[0];
            if (!inv) return;
            const scg = (await client.query(
                `SELECT g.id, g.name, g.monthly_fee FROM student_course_grades s JOIN grades g ON g.id = s.grade_id
                  WHERE s.student_id = $1 AND s.course_id = $2`, [sid, cid])).rows[0];
            const batch = batches.find(b => b.course_id === cid && (b.student_ids || []).includes(sid));
            const monthly = batch && Number(batch.monthly_fee) > 0 ? Number(batch.monthly_fee) : Number(scg ? scg.monthly_fee : 0);
            if (!(monthly > 0)) return;
            let factor = 1;
            if (inv.prorated_from) {
                const day = inv.prorated_from instanceof Date ? inv.prorated_from.getDate() : Number(String(inv.prorated_from).slice(8, 10));
                factor = (daysInMonth - day + 1) / daysInMonth;
            }
            const base = Math.round(monthly * factor);
            const pct = inv.discount_percentage != null ? Number(inv.discount_percentage) : 0;
            const off = pct > 0 ? Math.round((base * pct) / 100) : null;
            const final = base - (off || 0);
            await client.query(
                `UPDATE invoices SET amount = $1, original_amount = $2, discount_amount = $3, grade_id = $4, batch_id = $5,
                        course_name = $6 WHERE id = $7`,
                [final, base, off, scg ? scg.id : null, batch ? batch.id : null, `${courseName} - ${scg ? scg.name : ''}`.replace(/ - $/, ''), inv.id]);
            if (final !== Number(inv.amount)) { count('this month\'s unpaid bills re-priced'); notes.push(`   bill #${inv.id}: ₹${Number(inv.amount)} -> ₹${final}`); }
        };

        // ---- 1. Teacher renames -------------------------------------------
        for (const t of DATA.teacher_renames || []) {
            const r = await client.query(
                `UPDATE users SET name = $1::text, display_name = $1::text, updated_at = NOW()
                  WHERE LOWER(TRIM(role)) = 'teacher' AND is_deleted = false AND LOWER(TRIM(name)) = LOWER($2)
                    AND RIGHT(regexp_replace(COALESCE(contact_number, ''), '\\D', '', 'g'), 10) = $3 RETURNING id`,
                [t.name_to, t.name_from, digits(t.phone)]);
            log(`Teacher ${t.name_from} -> ${t.name_to}: ${r.rowCount ? 'renamed' : 'not found (already renamed?)'}`);
            if (r.rowCount) count('teachers renamed');
        }

        // ---- 2. New students ------------------------------------------------
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        const year = new Date().getFullYear();
        const nextUserId = async () => `NDA-${year}-${String((await client.query(`SELECT nextval('user_id_seq') AS seq`)).rows[0].seq).padStart(4, '0')}`;
        const emailFree = async (email) => email && !(await client.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email])).rows.length;
        const insertUser = async (u) => {
            const uid = await nextUserId();
            const email = (await emailFree(u.email)) ? u.email : `${uid.toLowerCase()}@${u.placeholderDomain}.nadanaloga.local`;
            const r = await client.query(
                `INSERT INTO users (name, email, password, role, status, class_preference, dob, contact_number, address,
                                    date_of_joining, courses, father_name, standard, school_name, user_id, parent_id,
                                    display_name, is_primary, must_change_password, grade)
                 VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,$18) RETURNING id`,
                [u.name, email, passwordHash, u.role, u.mode || 'Offline', u.dob || null, u.phone || null, u.address || null,
                 JOINED, JSON.stringify(u.courses || []), u.father_name || null,
                 u.standard ? u.standard.slice(0, 50) : null, u.standard && u.standard.length > 50 ? u.standard : null,
                 uid, u.parent_id || null, u.name, u.is_primary, u.grade || null]);
            return { id: r.rows[0].id, user_id: uid };
        };
        log('\nNew students');
        for (const s of DATA.new_students) {
            if ((await findStudent(s.name, s.phone)).length) { log(`   skip (already there): ${s.name}`); count('new students skipped (already there)'); continue; }
            let parent = (await client.query(
                `SELECT id, name FROM users WHERE LOWER(TRIM(role)) = 'parent' AND is_deleted = false
                   AND RIGHT(regexp_replace(COALESCE(contact_number, ''), '\\D', '', 'g'), 10) = $1
                 ORDER BY is_primary DESC NULLS LAST, id LIMIT 1`, [digits(s.phone)])).rows[0];
            if (!parent) {
                const p = await insertUser({ name: s.parent_name || s.name, email: s.email, phone: s.phone, role: 'Parent',
                    address: s.address, mode: s.mode, is_primary: true, placeholderDomain: 'parent' });
                parent = { id: p.id, name: s.parent_name };
                count('families created (new phone)');
            } else count('added to an existing family');
            const courseNames = [...new Set(s.enrolments.map(e => e.course))];
            const child = await insertUser({ name: s.name, email: null, phone: s.phone, role: 'Student', dob: s.dob,
                address: s.address, mode: s.mode, courses: courseNames, father_name: s.parent_name, standard: s.standard,
                parent_id: parent.id, is_primary: false, placeholderDomain: 'child', grade: s.enrolments[0]?.grade });
            for (const e of s.enrolments) await enrol(child.id, e, { isNew: true });
            log(`   + ${child.user_id} ${s.name} — ${s.enrolments.map(e => `${e.course}${e.grade ? ` ${e.grade}` : ''}${e.batch ? ` (${e.batch})` : ' (no batch)'}`).join(', ')}`);
            count('students added');
        }

        // ---- 3. Existing students ------------------------------------------
        log('\nExisting students');
        for (const u of DATA.updates) {
            const found = await findStudent(u.name, u.phone);
            if (found.length !== 1) { log(`   NOT FOUND (${found.length}): ${u.name} ${u.phone}`); count('existing students not found'); continue; }
            const sid = found[0].id;
            notes.length = 0;
            const changes = [];
            if (u.dob) {
                const r = await client.query(`UPDATE users SET dob = $1::date, updated_at = NOW() WHERE id = $2 AND (dob IS NULL OR dob::date <> $1::date)`, [u.dob, sid]);
                if (r.rowCount) { changes.push(`date of birth -> ${u.dob}`); count('dates of birth fixed'); }
            }
            await addCourses(sid, u.enrolments.map(e => e.course));
            for (const e of u.enrolments) {
                if (await enrol(sid, e, { isNew: false })) { changes.push(`${e.course}: ${e.grade || 'grade kept'}${e.batch ? `, ${e.batch}` : ''}`); await reprice(sid, e.course); }
            }
            log(`   ${changes.length ? '~' : '='} ${found[0].name}${changes.length ? ` — ${changes.join('; ')}` : ' (no change)'}`);
            notes.forEach(n => log(n));
            count(changes.length ? 'existing students updated' : 'existing students unchanged');
        }

        log('\nSummary');
        for (const [k, v] of Object.entries(summary)) log(`   ${k.padEnd(42)} ${v}`);
        if (DRY_RUN) { await client.query('ROLLBACK'); log('\nDRY RUN — nothing was changed.'); }
        else { await client.query('COMMIT'); log('\nCOMMITTED.'); }
    } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('\nFAILED — rolled back, nothing changed:', e.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
})();
