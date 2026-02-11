# Parent-Student API Specification

## Overview
This document outlines the API changes needed to support the parent-student relationship model.

---

## 1. Authentication & Login

### `POST /api/login`

**Response for Parent:**
```json
{
  "user": {
    "id": "parent-uuid",
    "name": "Parent Name",
    "email": "parent@gmail.com",
    "role": "Parent",
    "students": [
      {
        "id": "student1-uuid",
        "displayName": "Sarah",
        "grade": "7th",
        "courses": ["Bharatham", "Drawing"],
        "photoUrl": "...",
        "status": "Active"
      },
      {
        "id": "student2-uuid",
        "displayName": "John",
        "grade": "5th",
        "courses": ["Violin"],
        "photoUrl": "...",
        "status": "Active"
      }
    ]
  }
}
```

**Response for Student (self-login):**
```json
{
  "user": {
    "id": "student-uuid",
    "name": "Sarah",
    "email": "sarah@gmail.com",
    "role": "Student",
    "parentId": null,
    "isPrimary": true
  }
}
```

---

## 2. Student Context APIs

All student-specific APIs should accept a `student_id` parameter when called by parents.

### `GET /api/student/:studentId/batches`
Get batches for a specific student.

**Headers:**
```
Authorization: Bearer <parent_session_token>
```

**Response:**
```json
{
  "studentId": "student1-uuid",
  "studentName": "Sarah",
  "batches": [
    {
      "id": "batch-uuid",
      "name": "Bharatham - Monday & Wednesday",
      "courseName": "Bharatham",
      "schedule": [...],
      "teacherName": "Teacher Name"
    }
  ]
}
```

---

### `GET /api/student/:studentId/materials`
Get learning materials for a specific student.

---

### `GET /api/student/:studentId/exams`
Get exams for a specific student.

---

### `GET /api/student/:studentId/fees`
Get fee invoices for a specific student.

---

### `GET /api/student/:studentId/notifications`
Get notifications for a specific student.

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-uuid",
      "title": "Batch Changed",
      "message": "Sarah's batch has been moved to Tuesday & Thursday",
      "studentId": "student1-uuid",
      "studentName": "Sarah",
      "type": "Info",
      "createdAt": "2026-02-11T10:00:00Z"
    }
  ]
}
```

---

## 3. Admin APIs

### `GET /api/admin/students`
List all students (including children of parents).

**Query Parameters:**
- `role`: Filter by role (Student only, not Parent)
- `course_expertise`: Filter by course
- `search`: Search by student name, parent email, etc.

**Response:**
```json
{
  "students": [
    {
      "id": "student1-uuid",
      "displayName": "Sarah",
      "email": "parent+child1@gmail.com",
      "parentId": "parent-uuid",
      "parentName": "Parent Name",
      "parentEmail": "parent@gmail.com",
      "grade": "7th",
      "courses": ["Bharatham", "Drawing"],
      "batches": [...]
    },
    {
      "id": "student2-uuid",
      "displayName": "John",
      "email": "parent+child2@gmail.com",
      "parentId": "parent-uuid",
      "parentName": "Parent Name",
      "parentEmail": "parent@gmail.com",
      "grade": "5th",
      "courses": ["Violin"],
      "batches": [...]
    }
  ]
}
```

---

### `POST /api/admin/students/:studentId/notify`
Send notification to a specific student (and their parent).

**Request:**
```json
{
  "title": "Batch Change",
  "message": "Sarah's batch has been moved to Tuesday & Thursday",
  "type": "Info"
}
```

**Behavior:**
- Creates notification for student
- If student has parent, ALSO creates notification for parent (with student context)
- Sends push notification to parent's device: "Sarah: Batch Change - ..."
- Sends email to parent email

---

## 4. Notification Context

### Enhanced Notification Model

```typescript
interface Notification {
  id: string;
  userId: string;          // Parent or student user ID
  studentId?: string;      // If userId is parent, which child is this about?
  title: string;
  message: string;
  type: 'Info' | 'Warning' | 'Success' | 'Error';
  createdAt: Date;
  readAt?: Date;
}
```

### Notification Display

**For Parents:**
```
[Sarah] Batch Change
Your daughter's batch has been moved to Tuesday & Thursday

[John] Exam Tomorrow
Your son has a violin exam tomorrow at 10 AM
```

**For Students (self-login):**
```
Batch Change
Your batch has been moved to Tuesday & Thursday
```

---

## 5. Import Script Changes

### `scripts/import-csv.cjs`

**Logic:**
1. Group students by parent email
2. For first student → Create parent account OR find existing parent
3. For subsequent students → Link to parent with `+child2`, `+child3` emails
4. Set `parent_id` for all children
5. Set `is_primary = false` for children (only parent can login)

**Output:**
```
Creating parent account: mom@gmail.com (2 children)
  ├─ Sarah (mom+child1@gmail.com) → Bharatham, Drawing
  └─ John (mom+child2@gmail.com) → Violin

Creating parent account: dad@gmail.com (3 children)
  ├─ Emily (dad+child1@gmail.com) → Abacus
  ├─ Michael (dad+child2@gmail.com) → Keyboard
  └─ Lisa (dad+child3@gmail.com) → Western dance
```

---

## 6. Mobile App Changes

### Student Selector UI

**Parent Login → Home Screen:**
```
┌─────────────────────────────────┐
│  👤 Welcome, Parent Name        │
│                                 │
│  Select Student:                │
│                                 │
│  ┌─────────────────────────┐  │
│  │  👧 Sarah (7th Grade)   │  │
│  │  Bharatham, Drawing      │  │
│  └─────────────────────────┘  │
│                                 │
│  ┌─────────────────────────┐  │
│  │  👦 John (5th Grade)    │  │
│  │  Violin                  │  │
│  └─────────────────────────┘  │
└─────────────────────────────────┘
```

**After Selecting Sarah:**
```
┌─────────────────────────────────┐
│  [< Back] Sarah's Dashboard     │
│                                 │
│  📚 Courses: Bharatham, Drawing│
│  📅 Batches: Monday & Wednesday│
│  🔔 Notifications (3)          │
│  📄 Materials (5)              │
│  💰 Fees Due: $100             │
└─────────────────────────────────┘
```

### State Management

```dart
class ParentState {
  User parentUser;
  List<Student> students;
  Student? selectedStudent;  // Currently viewing
}
```

---

## 7. Permission Model

### Who Can Access What?

| Action | Parent | Student (self) | Admin | Teacher |
|--------|--------|----------------|-------|---------|
| View own students | ✅ All children | ✅ Self only | ✅ All | ✅ Assigned |
| Edit student profile | ✅ Own children | ❌ | ✅ All | ❌ |
| View notifications | ✅ All children's | ✅ Self only | ✅ All | ✅ Assigned |
| Pay fees | ✅ Own children | ✅ Self | ✅ All | ❌ |
| Download materials | ✅ Own children | ✅ Self | ✅ All | ✅ Assigned |

---

## Summary

### Database:
- ✅ `parent_id` column links students to parents
- ✅ `display_name` for student identification
- ✅ `student_id` in notifications for context
- ✅ Migration script handles existing data

### Backend:
- ✅ Login returns parent + children array
- ✅ Student-specific APIs accept `student_id`
- ✅ Notifications include student context
- ✅ Admin sees individual students

### Frontend:
- ✅ Student selector for parents
- ✅ Student-specific dashboards
- ✅ Notifications show which child
- ✅ Tab/card UI for multiple children

### Admin:
- ✅ Individual student listing
- ✅ Parent info shown for each student
- ✅ Send notifications per student
- ✅ Filter/search by parent or student
