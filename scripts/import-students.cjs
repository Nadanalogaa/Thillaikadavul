#!/usr/bin/env node
/**
 * Replace the academy's data with the register in scripts/students-import.json
 * (made by scripts/export-students-xlsx.py from Nadanaloga_Students.xlsx).
 *
 * Writes straight to the database, in ONE transaction, bypassing the API —
 * so none of the registration, batch or fee code runs and nobody is notified.
 * It also switches every notification channel off, to be turned back on from
 * Admin → Notifications once the academy has checked the result.
 *
 * Keeps: admin accounts, the Google Play reviewer account, courses (realigned),
 * locations, events, notices, materials, grade exams and demo bookings.
 * Removes: every other user, all batches, grades, fee structures, invoices,
 * payments, attendance, notifications, logins (everyone signs in again).
 *
 *   DATABASE_URL=postgres://... node scripts/import-students.cjs --dry-run
 *   DATABASE_URL=postgres://... node scripts/import-students.cjs
 *
 * On the server, run it inside the app container, which has node and pg:
 *   docker cp scripts/import-students.cjs nadanaloga-main-app:/app/
 *   docker cp scripts/students-import.json nadanaloga-main-app:/app/
 *   docker exec -w /app nadanaloga-main-app node import-students.cjs --dry-run
 */
const fs = require('fs');
const path = require('path');

// pg and bcryptjs live under server/node_modules. Look there relative to this
// file (repo checkout) and under /app (the container), whichever exists.
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
const DATA = JSON.parse(fs.readFileSync(
    process.argv.find(a => a.endsWith('.json')) || path.join(__dirname, 'students-import.json'), 'utf8'));

const DEFAULT_PASSWORD = 'nadanaloga123';      // every imported login; changed on first sign-in
const JOINED = '2026-10-01';                   // all are paid for October, so joined by then
const BILLED_PERIOD = 'October 2026';
const KEEP_EMAILS = ['playreview@nadanaloga.com'];
const EVENT_KEYS = [
    'registration.new_student', 'registration.welcome', 'profile.updated',
    'batch.allocation', 'batch.transfer', 'batch.teacher_changed',
    'fees.invoice_ready', 'fees.reminder', 'fees.payment_received', 'fees.proof_rejected',
    'attendance.absent_late', 'attendance.class_note', 'attendance.class_off',
    'content.event', 'content.notice', 'content.material', 'content.grade_exam',
];

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const log = (...a) => console.log(...a);
const summary = {};
const count = (k, n = 1) => { summary[k] = (summary[k] || 0) + n; };

(async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("SET LOCAL statement_timeout = '5min'");

        // ---- 0. What survives -------------------------------------------
        const keep = (await client.query(
            `SELECT id, name, email, role FROM users
              WHERE LOWER(TRIM(role)) = 'admin' OR is_super_admin = true OR LOWER(email) = ANY($1)`,
            [KEEP_EMAILS]
        )).rows;
        const keepIds = keep.map(r => r.id);
        log(`Keeping ${keep.length} account(s):`);
        keep.forEach(r => log(`   ${r.role.padEnd(8)} ${r.email}  (${r.name})`));

        // ---- 1. Wipe ----------------------------------------------------
        const before = {};
        for (const t of ['users', 'batches', 'invoices', 'invoice_payments', 'notifications', 'grades', 'fee_structures'])
            before[t] = Number((await client.query(`SELECT count(*) FROM ${t}`)).rows[0].count);

        const wipe = [
            'attendance', 'class_sessions',
            'invoice_payments', 'invoices', 'student_discounts', 'student_course_grades',
            'notifications', 'event_notifications', 'event_responses', 'user_fcm_tokens',
            'salary_payments', 'salaries', 'password_reset_otps', 'session',
            'batches', 'fee_structures', 'grades',
        ];
        for (const t of wipe) {
            const r = await client.query(`DELETE FROM ${t}`).catch(e => {
                if (e.code === '42P01') return { rowCount: 0 };   // table absent on this DB
                throw e;
            });
            if (r.rowCount) log(`   cleared ${t}: ${r.rowCount}`);
        }
        // Children first (parent_id references users), then everyone else.
        await client.query('UPDATE users SET parent_id = NULL WHERE NOT (id = ANY($1))', [keepIds]);
        const gone = await client.query('DELETE FROM users WHERE NOT (id = ANY($1))', [keepIds]);
        log(`   removed users: ${gone.rowCount}`);

        // ---- 2. Courses: the eight in the register, by their system names ----
        const courseId = {};
        for (const name of DATA.courses) {
            let r = await client.query('SELECT id FROM courses WHERE LOWER(name) = LOWER($1)', [name]);
            if (!r.rows.length) {
                r = await client.query('INSERT INTO courses (name) VALUES ($1) RETURNING id', [name]);
                count('courses created');
            }
            courseId[name] = r.rows[0].id;
        }
        const stale = await client.query(
            'DELETE FROM courses WHERE NOT (id = ANY($1)) RETURNING name', [Object.values(courseId)]);
        stale.rows.forEach(r => log(`   removed course with no data: ${r.name}`));

        // ---- 3. Grades, with the monthly fee on each ---------------------
        const gradeId = {};   // `${course}|${grade}` -> id
        for (const [course, tiers] of Object.entries(DATA.grades)) {
            for (const [grade, fee] of Object.entries(tiers)) {
                const r = await client.query(
                    `INSERT INTO grades (course_id, name, monthly_fee, currency, is_active)
                     VALUES ($1, $2, $3, 'INR', true) RETURNING id`,
                    [courseId[course], grade, fee]);
                gradeId[`${course}|${grade}`] = r.rows[0].id;
                count('grade tiers');
            }
        }

        // ---- helpers ----------------------------------------------------
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        const year = new Date().getFullYear();
        const nextUserId = async () => {
            const r = await client.query(`SELECT nextval('user_id_seq') AS seq`);
            return `NDA-${year}-${String(r.rows[0].seq).padStart(4, '0')}`;
        };
        const insertUser = async (u) => {
            const uid = await nextUserId();
            const email = u.email || `${uid.toLowerCase()}@${u.placeholderDomain}.nadanaloga.local`;
            const r = await client.query(
                `INSERT INTO users (name, email, password, role, status, class_preference, dob, contact_number,
                                    address, date_of_joining, courses, father_name, standard, school_name,
                                    course_expertise, user_id, parent_id, display_name, is_primary,
                                    must_change_password, grade)
                 VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
                 RETURNING id`,
                [u.name, email, passwordHash, u.role, u.mode || 'Offline', u.dob || null, u.phone || null,
                 u.address || null, JOINED, JSON.stringify(u.courses || []), u.father_name || null,
                 u.standard || null, u.school_name || null, JSON.stringify(u.course_expertise || []),
                 uid, u.parent_id || null, u.name, u.is_primary, true, u.grade || null]);
            return { id: r.rows[0].id, user_id: uid, email };
        };

        // ---- 4. Teachers ------------------------------------------------
        const teacherId = {};
        for (const t of DATA.teachers) {
            const row = await insertUser({
                name: t.name, email: t.email, phone: t.phone, role: 'Teacher',
                course_expertise: t.courses, is_primary: true, placeholderDomain: 'staff',
            });
            teacherId[t.key] = row.id;
            count('teachers');
        }

        // ---- 5. Families: one parent login per phone, children under it ----
        const studentsByBatch = {};        // batch key -> [student id]
        const enrolments = [];             // for invoices
        for (const f of DATA.families) {
            const parent = await insertUser({
                name: f.parent_name, email: f.email, phone: f.phone, role: 'Parent',
                address: f.address, mode: f.mode, is_primary: true, placeholderDomain: 'parent',
            });
            count('parents');
            for (const s of f.children) {
                const courses = [...new Set(s.enrolments.map(e => e.course))];
                const child = await insertUser({
                    name: s.name, email: null, phone: s.phone, role: 'Student', dob: s.dob,
                    address: s.address, mode: s.mode, courses, father_name: s.parent_name,
                    // "Class / Other" is sometimes class + school in one cell; the
                    // standard column holds 50 chars, so keep the long form as school.
                    standard: s.standard ? s.standard.slice(0, 50) : null,
                    school_name: s.standard && s.standard.length > 50 ? s.standard : null,
                    parent_id: parent.id, is_primary: false,
                    placeholderDomain: 'child', grade: s.enrolments[0]?.grade || null,
                });
                count('students');
                for (const e of s.enrolments) {
                    const gid = e.grade ? gradeId[`${e.course}|${e.grade}`] : null;
                    if (gid) {
                        await client.query(
                            `INSERT INTO student_course_grades (student_id, course_id, grade_id) VALUES ($1,$2,$3)
                             ON CONFLICT (student_id, course_id) DO UPDATE SET grade_id = EXCLUDED.grade_id`,
                            [child.id, courseId[e.course], gid]);
                    }
                    (studentsByBatch[e.batch_key] ||= []).push(child.id);
                    enrolments.push({ studentId: child.id, studentName: s.name, course: e.course,
                                      grade: e.grade, gradeId: gid, batchKey: e.batch_key });
                    count('enrolments');
                }
            }
        }

        // ---- 6. Batches, with their students ----------------------------
        const batchId = {};
        for (const b of DATA.batches) {
            const ids = studentsByBatch[b.key] || [];
            const schedule = b.days.length
                ? `${b.days.join(' & ')} ${b.start_time ? `${b.start_time}–${b.end_time}` : ''}`.trim()
                : null;
            const r = await client.query(
                `INSERT INTO batches (batch_name, course_id, teacher_id, mode, days, start_time, end_time,
                                      time_slots, student_ids, schedule, start_date)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
                [b.batch_name, courseId[b.course], b.teacher_key ? teacherId[b.teacher_key] : null, b.mode,
                 b.days, b.start_time, b.end_time, JSON.stringify(b.time_slots), ids, schedule, JOINED]);
            batchId[b.key] = r.rows[0].id;
            count('batches');
            if (!ids.length) log(`   batch with no students: ${b.batch_name} (${b.course})`);
        }

        // ---- 7. October bills, recorded as paid through the ledger -------
        let billed = 0;
        for (const e of enrolments) {
            if (!e.gradeId) { log(`   no fee for ${e.studentName} / ${e.course}: no grade`); continue; }
            const fee = DATA.grades[e.course][e.grade];
            const inv = await client.query(
                `INSERT INTO invoices (student_id, course_name, course_id, grade_id, batch_id, amount, currency,
                                       issue_date, due_date, billing_period, status)
                 VALUES ($1,$2,$3,$4,$5,$6,'INR','2026-10-01','2026-10-10',$7,'paid') RETURNING id`,
                [e.studentId, e.course, courseId[e.course], e.gradeId, batchId[e.batchKey], fee, BILLED_PERIOD]);
            await client.query(
                `INSERT INTO invoice_payments (invoice_id, student_id, amount, payment_method, payment_date, status,
                                               notes, approved_at, paid_at, receipt_number, collected_by_name)
                 VALUES ($1,$2,$3,'Cash','2026-10-01','approved',$4,NOW(),'2026-10-01',
                         'NDA-R-' || lpad(nextval('payment_receipt_seq')::text, 6, '0'), 'Register import')`,
                [inv.rows[0].id, e.studentId, fee, `Imported from the ${BILLED_PERIOD} register (Fee Status: Paid)`]);
            billed += fee;
            count('october bills (paid)');
        }
        summary['october total ₹'] = billed;

        // ---- 8. Every notification channel off until the academy says otherwise ----
        await client.query(`
            CREATE TABLE IF NOT EXISTS notification_settings (
                event_key VARCHAR(64) PRIMARY KEY,
                in_app BOOLEAN NOT NULL DEFAULT true, push BOOLEAN NOT NULL DEFAULT true,
                email BOOLEAN NOT NULL DEFAULT true,
                updated_at TIMESTAMPTZ DEFAULT NOW(), updated_by INTEGER)`);
        for (const k of EVENT_KEYS) {
            await client.query(
                `INSERT INTO notification_settings (event_key, in_app, push, email, updated_at)
                 VALUES ($1, false, false, false, NOW())
                 ON CONFLICT (event_key) DO UPDATE SET in_app=false, push=false, email=false, updated_at=NOW()`, [k]);
        }
        summary['notification events silenced'] = EVENT_KEYS.length;

        // ---- 9. Report ----------------------------------------------------
        const after = {};
        for (const t of Object.keys(before))
            after[t] = Number((await client.query(`SELECT count(*) FROM ${t}`)).rows[0].count);
        log('\nBefore -> after');
        for (const t of Object.keys(before)) log(`   ${t.padEnd(18)} ${String(before[t]).padStart(6)} -> ${after[t]}`);
        log('\nImported');
        for (const [k, v] of Object.entries(summary)) log(`   ${k.padEnd(30)} ${v}`);

        if (DRY_RUN) {
            await client.query('ROLLBACK');
            log('\nDRY RUN — nothing was changed.');
        } else {
            await client.query('COMMIT');
            log('\nCOMMITTED.');
        }
    } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('\nFAILED — rolled back, nothing changed:', e.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
})();
