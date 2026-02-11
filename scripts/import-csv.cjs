#!/usr/bin/env node
/**
 * CSV Import Script for Nadanaloga
 * Reads NadanalogaDatas.csv and imports courses, students, and batches via API
 *
 * Usage: node scripts/import-csv.js
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://www.nadanaloga.com/api';
const ADMIN_EMAIL = 'admin@nadanaloga.com';
const ADMIN_PASSWORD = 'admin123';
const DEFAULT_STUDENT_PASSWORD = 'nadanaloga123';

let sessionCookie = '';

// ─── HTTP Helper ───────────────────────────────────────────────
async function api(method, endpoint, body = null) {
  const url = `${API_BASE}${endpoint}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    redirect: 'manual',
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);

  // Capture session cookie
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) {
    const match = c.match(/connect\.sid=[^;]+/);
    if (match) sessionCookie = match[0];
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok && res.status !== 302) {
    const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : data;
    return { ok: false, status: res.status, error: msg, data };
  }
  return { ok: true, status: res.status, data };
}

// ─── CSV Parser (handles quoted fields with commas) ────────────
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Data Normalization ────────────────────────────────────────
function normalizeEmail(email) {
  if (!email || email.toLowerCase() === 'no') return null;
  return email.trim().replace(/\s+/g, '').toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return '';
  // Take the first phone number if multiple
  const first = phone.split('/')[0].split('&')[0].trim();
  // Remove non-digit characters except + at start
  return first.replace(/[^0-9+]/g, '').slice(0, 15);
}

function normalizeCourses(coursesStr) {
  if (!coursesStr) return [];
  return coursesStr.split(',').map(c => {
    let name = c.trim();
    // Normalize variants
    if (name.toLowerCase() === 'carnatic music vocal') name = 'Carnatic music (vocal)';
    if (name.toLowerCase() === 'bharatham') name = 'Bharatham';
    return name;
  }).filter(Boolean);
}

function normalizeBatches(batchStr) {
  if (!batchStr) return [];
  return batchStr.split(',').map(b => b.trim()).filter(Boolean);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Input format: M/D/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  const month = m.padStart(2, '0');
  const day = d.padStart(2, '0');
  return `${y}-${month}-${day}`;
}

// ─── Main Import Logic ─────────────────────────────────────────
async function main() {
  console.log('=== Nadanaloga CSV Import Script ===\n');

  // 1. Read CSV
  const csvPath = path.join(__dirname, '..', 'docs', 'NadanalogaDatas.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }
  const rows = parseCSV(csvPath);
  console.log(`Read ${rows.length} rows from CSV\n`);

  // 2. Login as admin
  console.log('--- Logging in as admin ---');
  const loginRes = await api('POST', '/login', {
    identifier: ADMIN_EMAIL,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.error);
    process.exit(1);
  }
  console.log('Logged in successfully\n');

  // 3. Get existing data
  console.log('--- Fetching existing data ---');
  const existingUsers = await api('GET', '/users');
  const existingCourses = await api('GET', '/courses');
  const existingBatches = await api('GET', '/batches');

  const userList = existingUsers.ok ? (existingUsers.data || []) : [];
  const courseList = existingCourses.ok ? (existingCourses.data || []) : [];
  const batchList = existingBatches.ok ? (existingBatches.data || []) : [];

  console.log(`  Existing users: ${userList.length}`);
  console.log(`  Existing courses: ${courseList.length}`);
  console.log(`  Existing batches: ${batchList.length}\n`);

  // 4. Permanently delete trashed (soft-deleted) users first
  console.log('--- Cleaning up trashed users ---');
  const trashedRes = await api('GET', '/users/trashed/all');
  const trashedUsers = trashedRes.ok ? (trashedRes.data || []) : [];
  console.log(`  Found ${trashedUsers.length} trashed users`);
  let permanentlyDeleted = 0;
  for (const user of trashedUsers) {
    if (user.role === 'Admin') continue; // Skip admin users
    const res = await api('DELETE', `/users/${user.id}/permanent`);
    if (res.ok) permanentlyDeleted++;
    else console.log(`  Failed to permanently delete ${user.email}: ${res.error}`);
  }
  console.log(`  Permanently deleted ${permanentlyDeleted}/${trashedUsers.length} trashed users\n`);

  // 5. Delete existing batches (depends on courses/users)
  console.log('--- Deleting existing batches ---');
  let deletedBatches = 0;
  for (const batch of batchList) {
    const res = await api('DELETE', `/batches/${batch.id}`);
    if (res.ok) deletedBatches++;
    else console.log(`  Failed to delete batch ${batch.id}: ${res.error}`);
  }
  console.log(`  Deleted ${deletedBatches}/${batchList.length} batches\n`);

  // 6. Build email->id map from existing active users
  console.log('--- Mapping existing students ---');
  const existingEmailMap = {};
  for (const u of userList) {
    if (u.email) existingEmailMap[u.email.toLowerCase().trim()] = u.id;
  }
  console.log(`  Found ${Object.keys(existingEmailMap).length} existing users by email\n`);

  // 7. Delete existing courses
  console.log('--- Deleting existing courses ---');
  let deletedCourses = 0;
  for (const course of courseList) {
    const res = await api('DELETE', `/courses/${course.id}`);
    if (res.ok) deletedCourses++;
    else console.log(`  Failed to delete course ${course.id}: ${res.error}`);
  }
  console.log(`  Deleted ${deletedCourses}/${courseList.length} courses\n`);

  // 8. Extract unique courses from CSV
  console.log('--- Creating courses ---');
  const allCourseNames = new Set();
  for (const row of rows) {
    const courses = normalizeCourses(row['What are classes are you studying']);
    courses.forEach(c => allCourseNames.add(c));
  }
  console.log(`  Found ${allCourseNames.size} unique courses: ${[...allCourseNames].join(', ')}`);

  const courseMap = {}; // name -> id
  for (const name of allCourseNames) {
    const res = await api('POST', '/courses', { name, description: '' });
    if (res.ok && res.data?.id) {
      courseMap[name] = res.data.id;
      console.log(`  Created course: ${name} (${res.data.id})`);
    } else {
      console.log(`  Failed to create course "${name}": ${res.error}`);
    }
  }
  console.log();

  // 9. Group students by parent email (KEEP ALL STUDENTS, NO DEDUPLICATION)
  console.log('--- Processing students and parent relationships ---');
  const studentsByParentEmail = new Map(); // email -> [ student1, student2, ... ]

  for (const row of rows) {
    const email = normalizeEmail(row['Email id']);
    if (!email) {
      console.log(`  Skipping row (invalid email): ${row['Name of the student']} - ${row['Email id']}`);
      continue;
    }

    const courses = normalizeCourses(row['What are classes are you studying']);
    const batches = normalizeBatches(row['Select the batch']);
    const mode = row['Select mode of class'] || 'Offline';

    const student = {
      name: row['Name of the student']?.trim(),
      parentEmail: email, // Store original parent email
      dob: parseDate(row['Date of birth students']),
      fatherName: row['Parents Name']?.trim(),
      dateOfJoining: parseDate(row['Date of joining']),
      phone: normalizePhone(row['Phone Number']),
      classPreference: mode,
      courseEntries: [], // { courseName, batchDay, mode }
    };

    // Collect course entries
    for (let i = 0; i < courses.length; i++) {
      const courseName = courses[i];
      const batchDay = batches[i] || batches[0] || '';
      student.courseEntries.push({ courseName, batchDay, mode });
    }

    // Group students by parent email
    if (!studentsByParentEmail.has(email)) {
      studentsByParentEmail.set(email, []);
    }
    studentsByParentEmail.get(email).push(student);
  }

  const totalStudents = Array.from(studentsByParentEmail.values()).reduce((sum, arr) => sum + arr.length, 0);
  const parentsWithMultipleKids = Array.from(studentsByParentEmail.values()).filter(arr => arr.length > 1).length;
  console.log(`  Total students: ${totalStudents}`);
  console.log(`  Parent emails: ${studentsByParentEmail.size}`);
  console.log(`  Parents with multiple children: ${parentsWithMultipleKids}\n`);

  console.log('--- Creating parent accounts and students ---');
  const userMap = {}; // studentEmail -> studentId
  const parentMap = {}; // parentEmail -> parentId
  let createdStudents = 0;
  let createdParents = 0;
  let failedCount = 0;

  for (const [parentEmail, students] of studentsByParentEmail) {
    const isMultipleChildren = students.length > 1;

    if (isMultipleChildren) {
      // Create parent account for multiple children
      console.log(`\n  👨‍👩‍👧‍👦 Parent: ${parentEmail} (${students.length} children)`);

      let parentId = parentMap[parentEmail];

      // Create parent account if doesn't exist
      if (!parentId) {
        const parentPayload = {
          name: students[0].fatherName || `Parent (${students[0].name})`,
          email: parentEmail,
          password: DEFAULT_STUDENT_PASSWORD,
          role: 'Parent',
          contactNumber: students[0].phone,
        };

        const parentRes = await api('POST', '/register', parentPayload);
        if (parentRes.ok && parentRes.data?.id) {
          parentId = parentRes.data.id;
          parentMap[parentEmail] = parentId;
          createdParents++;
          console.log(`    ✅ Created parent account: ${parentEmail}`);
        } else {
          console.log(`    ❌ Failed to create parent: ${parentRes.error}`);
          failedCount += students.length;
          continue;
        }
      }

      // Create each child with unique email
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const childIndex = i + 1;
        const studentEmail = parentEmail.replace('@', `+child${childIndex}@`);

        const courseIds = [...new Set(
          student.courseEntries.map(e => courseMap[e.courseName]).filter(Boolean)
        )];

        const studentPayload = {
          name: student.name,
          email: studentEmail,
          password: DEFAULT_STUDENT_PASSWORD,
          role: 'Student',
          dob: student.dob,
          fatherName: student.fatherName,
          dateOfJoining: student.dateOfJoining,
          contactNumber: student.phone,
          classPreference: student.classPreference,
          courses: courseIds,
          displayName: student.name,
          parentId: parentId,
          isPrimary: false, // Children can't self-login, only via parent
        };

        const res = await api('POST', '/register', studentPayload);
        if (res.ok && res.data?.id) {
          userMap[studentEmail] = res.data.id;
          createdStudents++;
          console.log(`    ├─ ✅ ${student.name} (${studentEmail})`);
        } else {
          failedCount++;
          console.log(`    ├─ ❌ Failed: ${student.name}: ${res.error}`);
        }
      }
    } else {
      // Single student - create as independent student (can self-login)
      const student = students[0];

      const courseIds = [...new Set(
        student.courseEntries.map(e => courseMap[e.courseName]).filter(Boolean)
      )];

      const studentPayload = {
        name: student.name,
        email: parentEmail, // Use parent email as student email
        password: DEFAULT_STUDENT_PASSWORD,
        role: 'Student',
        dob: student.dob,
        fatherName: student.fatherName,
        dateOfJoining: student.dateOfJoining,
        contactNumber: student.phone,
        classPreference: student.classPreference,
        courses: courseIds,
        displayName: student.name,
        isPrimary: true, // Can self-login
      };

      const res = await api('POST', '/register', studentPayload);
      if (res.ok && res.data?.id) {
        userMap[parentEmail] = res.data.id;
        createdStudents++;
        if (createdStudents % 20 === 0) console.log(`  Created ${createdStudents} students...`);
      } else {
        failedCount++;
        console.log(`  ❌ Failed: ${student.name} (${parentEmail}): ${res.error}`);
      }
    }
  }
  console.log(`\n  📊 Summary:`);
  console.log(`    Parents created: ${createdParents}`);
  console.log(`    Students created: ${createdStudents}`);
  console.log(`    Failed: ${failedCount}\n`);

  // 10. Create batches (Course + Day + Mode combination)
  console.log('--- Creating batches ---');
  // Collect all unique batch combinations
  const batchCombos = new Map(); // "courseName|batchDay|mode" -> Set of studentEmails

  for (const [parentEmail, students] of studentsByParentEmail) {
    const isMultipleChildren = students.length > 1;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentEmail = isMultipleChildren
        ? parentEmail.replace('@', `+child${i + 1}@`)
        : parentEmail;

      for (const entry of student.courseEntries) {
        const key = `${entry.courseName}|${entry.batchDay}|${entry.mode}`;
        if (!batchCombos.has(key)) {
          batchCombos.set(key, new Set());
        }
        batchCombos.get(key).add(studentEmail);
      }
    }
  }

  console.log(`  Found ${batchCombos.size} unique batch combinations`);

  let createdBatches = 0;
  for (const [key, emails] of batchCombos) {
    const [courseName, batchDay, mode] = key.split('|');
    const courseId = courseMap[courseName];
    if (!courseId) {
      console.log(`  Skipping batch (no course found): ${key}`);
      continue;
    }

    const studentIds = [...emails]
      .map(e => userMap[e])
      .filter(Boolean);

    const batchName = `${courseName} - ${batchDay}${mode === 'Online' ? ' (Online)' : ''}`;

    const schedule = {
      timing: batchDay,
      studentIds: studentIds.map(String),
    };

    const payload = {
      batch_name: batchName,
      course_id: courseId,
      schedule: [schedule],
      student_ids: studentIds,
      mode: mode,
      start_date: null,
      end_date: null,
      max_students: studentIds.length + 10,
    };

    const res = await api('POST', '/batches', payload);
    if (res.ok) {
      createdBatches++;
      console.log(`  Created: ${batchName} (${studentIds.length} students)`);
    } else {
      console.log(`  Failed: ${batchName}: ${res.error}`);
    }
  }
  console.log(`\n  Created ${createdBatches}/${batchCombos.size} batches\n`);

  // 11. Summary
  console.log('=== Import Complete ===');
  console.log(`  Courses: ${Object.keys(courseMap).length}`);
  console.log(`  Parents: ${createdParents}`);
  console.log(`  Students: ${createdStudents}`);
  console.log(`  Batches: ${createdBatches}`);
  console.log(`  Default password: ${DEFAULT_STUDENT_PASSWORD}`);
  console.log(`\n📧 Login Instructions:`);
  console.log(`  - Parents: Login with your original email (e.g., parent@gmail.com)`);
  console.log(`  - Single students: Login with your email`);
  console.log(`  - After login, parents can switch between their children's profiles\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
