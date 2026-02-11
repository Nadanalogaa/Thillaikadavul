# Parent-Student Model Deployment Guide

## Overview
This guide walks you through deploying the parent-student relationship model to production.

## What's Changed

### 1. **Database Schema**
- Added `parent_id` column to link students to parents
- Added `display_name` column for student identification
- Added `is_primary` column (true = can self-login, false = parent-only access)
- Added `student_id` column to notifications for context

### 2. **Import Script** (`scripts/import-csv.cjs`)
- Now creates parent accounts for duplicate emails
- Links children to parents with `+child1`, `+child2` email aliases
- **NO DATA LOSS** - All 267 students will be imported (previously lost ~41)

### 3. **Server API** (`server/server.js`)
- Register endpoint accepts `parentId`, `displayName`, `isPrimary` fields
- Course deletion improved with transaction handling
- Soft-delete reactivation enhanced

## Deployment Steps

### Step 1: Run Database Migration

**Option A: Via Docker (if using Docker Compose)**

```bash
# SSH into your VPS
ssh user@79.137.75.174

# Navigate to project directory
cd /path/to/Thillaikadavul

# Run migration via postgres container
docker exec nadanaloga-main-postgres psql -U nadanaloga_user -d nadanaloga -f /path/to/add-parent-student-columns.sql
```

**Option B: Via Portainer**

1. Go to Portainer → Containers → `nadanaloga-main-postgres`
2. Click "Console" → Connect
3. Run:
   ```bash
   psql -U nadanaloga_user -d nadanaloga
   ```
4. Copy-paste the contents of `deploy/add-parent-student-columns.sql`
5. Execute

**Option C: Direct psql (if port 5432 is exposed)**

```bash
psql -h 79.137.75.174 -U nadanaloga_user -d nadanaloga -f deploy/add-parent-student-columns.sql
```

**Migration SQL File:** `deploy/add-parent-student-columns.sql`

### Step 2: Commit and Push Changes

```bash
git add .
git commit -m "Add parent-student relationship model

- Add parent_id, display_name, is_primary columns
- Update import script to handle multiple students per parent email
- Enhance register API to support parent-student fields
- Fix course deletion with proper transaction handling
- Add API spec for parent-student features

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

### Step 3: Redeploy Server

**Option A: Via Portainer**

1. Go to Portainer → Stacks → `nadanaloga`
2. Click "Pull and redeploy"
3. Wait for rebuild

**Option B: Manual Docker Compose**

```bash
# SSH into VPS
ssh user@79.137.75.174

# Navigate to project
cd /path/to/Thillaikadavul

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build
```

### Step 4: Re-import CSV with Parent-Student Model

```bash
# On your local machine
cd /Users/ayyappanp/Documents/tk/Thillaikadavul

# Run the updated import script
node scripts/import-csv.cjs
```

**Expected Output:**
```
=== Nadanaloga CSV Import Script ===

Read 268 rows from CSV

--- Logging in as admin ---
Logged in successfully

--- Cleaning up trashed users ---
  Permanently deleted X trashed users

--- Deleting existing batches ---
  Deleted 36/36 batches

--- Creating parent accounts and students ---

  👨‍👩‍👧‍👦 Parent: mk.kidapp@gmail.com (2 children)
    ✅ Created parent account: mk.kidapp@gmail.com
    ├─ ✅ BAVATHARINI M (mk.kidapp+child1@gmail.com)
    └─ ✅ SHAGANAA M (mk.kidapp+child2@gmail.com)

  👨‍👩‍👧‍👦 Parent: bhuvikrish22@gmail.com (2 children)
    ✅ Created parent account: bhuvikrish22@gmail.com
    ├─ ✅ Child 1 (bhuvikrish22+child1@gmail.com)
    └─ ✅ Child 2 (bhuvikrish22+child2@gmail.com)

  📊 Summary:
    Parents created: 32
    Students created: 267
    Failed: 0

--- Creating batches ---
  Created 36/36 batches

=== Import Complete ===
  Courses: 9
  Parents: 32
  Students: 267
  Batches: 36
  Default password: nadanaloga123

📧 Login Instructions:
  - Parents: Login with your original email (e.g., parent@gmail.com)
  - Single students: Login with your email
  - After login, parents can switch between their children's profiles
```

### Step 5: Verify Data

**Check parent-student relationships:**

```bash
# SSH into VPS and connect to postgres
docker exec -it nadanaloga-main-postgres psql -U nadanaloga_user -d nadanaloga

# Query parent-student relationships
SELECT
    p.name as parent_name,
    p.email as parent_email,
    COUNT(s.id) as num_children
FROM users p
LEFT JOIN users s ON s.parent_id = p.id
WHERE p.role = 'Parent' AND p.is_deleted = false
GROUP BY p.id, p.name, p.email
ORDER BY num_children DESC;

# Check individual students
SELECT
    s.display_name as student_name,
    s.email as student_email,
    p.email as parent_email,
    s.is_primary,
    s.role
FROM users s
LEFT JOIN users p ON s.parent_id = p.id
WHERE s.role = 'Student' AND s.is_deleted = false
ORDER BY p.email, s.display_name;
```

## Next Steps (Backend Implementation)

After deployment, you'll need to implement these backend features:

### 1. **Update Login API**

Modify `POST /api/login` to return parent + children:

```javascript
// When parent logs in, return their children
if (user.role === 'Parent') {
    const children = await pool.query(
        'SELECT id, display_name, grade, courses, photo_url, status FROM users WHERE parent_id = $1 AND is_deleted = false',
        [user.id]
    );
    user.students = children.rows;
}
```

### 2. **Add Student-Context APIs**

Create endpoints for parents to access student-specific data:

- `GET /api/student/:studentId/batches`
- `GET /api/student/:studentId/materials`
- `GET /api/student/:studentId/exams`
- `GET /api/student/:studentId/fees`
- `GET /api/student/:studentId/notifications`

See `docs/PARENT_STUDENT_API_SPEC.md` for complete API specification.

### 3. **Update Notification System**

Enhance notifications to include student context:

```javascript
// When sending notification to parent about a student
await pool.query(
    'INSERT INTO notifications (user_id, student_id, title, message, type) VALUES ($1, $2, $3, $4, $5)',
    [parentId, studentId, 'Batch Changed', `${studentName}'s batch has been moved...`, 'Info']
);
```

### 4. **Update Admin Panel**

Modify `pages/admin/StudentListPage.tsx` to show parent information:

```typescript
// Display parent email for each student
{student.parentId && (
    <div className="text-xs text-gray-500">
        Parent: {parentEmail}
    </div>
)}
```

### 5. **Mobile App Changes**

Add student selector UI for parents (Flutter):

```dart
// Show student selector when parent logs in
if (user.role == 'Parent' && user.students.isNotEmpty) {
    return StudentSelectorScreen(
        students: user.students,
        onStudentSelected: (student) {
            // Navigate to student dashboard
        },
    );
}
```

## Testing Checklist

- [ ] Database migration completed successfully
- [ ] Server redeployed with new code
- [ ] CSV import completes without errors
- [ ] All 267 students created (not 226)
- [ ] 32 parent accounts created
- [ ] Parent login works
- [ ] Student login works (for isPrimary=true students)
- [ ] Course deletion works (no more "server error")
- [ ] Admin can see parent info for each student
- [ ] Notifications include student context

## Rollback Plan

If something goes wrong:

```bash
# Revert database changes
ALTER TABLE users DROP COLUMN IF EXISTS parent_id;
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
ALTER TABLE users DROP COLUMN IF EXISTS is_primary;
ALTER TABLE notifications DROP COLUMN IF EXISTS student_id;

# Revert code
git revert HEAD
git push origin main

# Redeploy previous version
docker compose up -d --build
```

## Support

For issues or questions:
- Check logs: `docker logs nadanaloga-main-app`
- Database console: `docker exec -it nadanaloga-main-postgres psql -U nadanaloga_user -d nadanaloga`
- API health: `curl https://www.nadanaloga.com/api/health`

## Files Changed

- `scripts/import-csv.cjs` - Parent-student import logic
- `server/server.js` - Register API + course deletion fixes
- `deploy/add-parent-student-columns.sql` - Database migration
- `deploy/migration-parent-student-model.sql` - Full migration with data transformation
- `docs/PARENT_STUDENT_API_SPEC.md` - Complete API specification
- `docs/PARENT_STUDENT_DEPLOYMENT.md` - This file
