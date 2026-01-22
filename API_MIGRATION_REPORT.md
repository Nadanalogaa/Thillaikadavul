# API.TS Migration Report - Supabase to Express API

## Migration Status: IN PROGRESS

**Date:** 2026-01-22
**Original Supabase calls:** 90+
**Remaining Supabase calls:** 65
**Progress:** ~28% Complete

---

## ✅ COMPLETED MIGRATIONS

### Authentication & User Management
- ✅ **loginUser** - Migrated to `POST /api/users/by-email`
- ✅ **refreshCurrentUser** - Migrated to `GET /api/users/:id`
- ✅ **registerUser** - Migrated to `POST /api/users` (with fallbacks)
- ✅ **registerAdmin** - Migrated to `POST /api/users`
- ✅ **getAdminStats** - Migrated to `GET /api/stats/admin`
- ✅ **getAdminUsers** - Migrated to `GET /api/users`
- ✅ **getAdminUserById** - Migrated to `GET /api/users/:id`
- ✅ **deleteUserByAdmin** - Migrated to `DELETE /api/users/:id` (soft delete)
- ✅ **getTrashedUsers** - Migrated to `GET /api/users/trashed/all`
- ✅ **restoreUser** - Migrated to `POST /api/users/:id/restore`
- ✅ **deleteUserPermanently** - Migrated to `DELETE /api/users/:id/permanent`
- ✅ **getUsersByIds** - Migrated to `POST /api/users/by-ids`

### Course Management
- ✅ **getCourses** - Already migrated to `GET /api/courses`
- ✅ **initializeBasicCourses** - Migrated to `POST /api/courses`

### Batch Management
- ✅ **getBatches** - Migrated to `GET /api/batches`
- ✅ **addBatch** - Migrated to `POST /api/batches`
- ✅ **updateBatch** - Migrated to `PUT /api/batches/:id`
- ✅ **deleteBatch** - Migrated to `DELETE /api/batches/:id`

### Notifications
- ✅ **getNotifications** - Migrated to `GET /api/notifications/:userId`
- ✅ **markNotificationAsRead** - Migrated to `PUT /api/notifications/:id/mark-read`

### Fee Structures
- ✅ **getFeeStructures** - Migrated to `GET /api/fee-structures`
- ✅ **addFeeStructure** - Partially migrated to `POST /api/fee-structures`

### Other
- ✅ **checkEmailExists** - Already migrated to `POST /api/check-email`
- ✅ **getPublicLocations** - Already migrated to `GET /api/locations`

---

## 🚧 REMAINING MIGRATIONS (High Priority)

### User Management Functions (Line ~950-1400)
- ⏳ **updateUserByAdmin** (line ~950) - Needs `PUT /api/users/:id`
  - Currently uses supabase for fetching current user data
  - Complex update logic with teacher-specific handling

### Course Management Functions (Line ~1247-1400)
- ⏳ **addCourseByAdmin** (line ~1247) - Needs `POST /api/courses`
- ⏳ **updateCourseByAdmin** (line ~1321) - Needs `PUT /api/courses/:id`
- ⏳ **deleteCourseByAdmin** (line ~1380) - Needs `DELETE /api/courses/:id`

### Fee Structure Functions (Line ~1760-1919)
- ⏳ **updateFeeStructure** (line ~1787) - Needs `PUT /api/fee-structures/:id`
- ⏳ **deleteFeeStructure** (line ~1892) - Needs `DELETE /api/fee-structures/:id`

### Invoice Functions (Line ~1935-2027)
- ⏳ **getAdminInvoices** (line ~1935) - Needs Express API endpoint
- ⏳ **getStudentInvoicesForFamily** (line ~2027) - Needs Express API endpoint

### Location Functions (Line ~2237-2460)
- ⏳ **addLocation** (line ~2402) - Needs `POST /api/locations`
- ⏳ **updateLocation** (line ~2431) - Needs `PUT /api/locations/:id`
- ⏳ **deleteLocation** (line ~2460) - Needs `DELETE /api/locations/:id`

### Event Functions (Line ~2528-2687)
- ⏳ **getEvents** (line ~2528) - Needs `GET /api/events`
- ⏳ **getPublicEvents** (line ~2556) - Needs `GET /api/events?isPublic=true`
- ⏳ **addEvent** (line ~2556+) - Needs `POST /api/events`
- ⏳ **updateEvent** (line ~2657) - Needs `PUT /api/events/:id`
- ⏳ **deleteEvent** (line ~2687) - Needs `DELETE /api/events/:id`

### Grade Exam Functions (Line ~2704+)
- ⏳ **getGradeExams** - Needs `GET /api/grade-exams`
- ⏳ **addGradeExam** - Needs `POST /api/grade-exams`
- ⏳ **updateGradeExam** - Needs `PUT /api/grade-exams/:id`
- ⏳ **deleteGradeExam** - Needs `DELETE /api/grade-exams/:id`

### Book Material Functions
- ⏳ **getBookMaterials** - Needs `GET /api/book-materials`
- ⏳ **addBookMaterial** - Needs `POST /api/book-materials`
- ⏳ **updateBookMaterial** - Needs `PUT /api/book-materials/:id`
- ⏳ **deleteBookMaterial** - Needs `DELETE /api/book-materials/:id`
- ⏳ **sendBookMaterial** - Needs special handling

### Notice Functions
- ⏳ **getNotices** - Needs `GET /api/notices`
- ⏳ **addNotice** - Needs `POST /api/notices`
- ⏳ **updateNotice** - Needs `PUT /api/notices/:id`
- ⏳ **deleteNotice** - Needs `DELETE /api/notices/:id`
- ⏳ **sendNotice** - Needs special handling

### Event Response & Notification Functions
- ⏳ **submitEventResponse** - Needs `POST /api/event-responses`
- ⏳ **getEventResponse** - Needs `GET /api/event-responses/:eventId/user/:userId`
- ⏳ **getEventResponseStats** - Needs `GET /api/event-responses/:eventId`
- ⏳ **getEventNotifications** - Needs `GET /api/event-notifications/:userId`
- ⏳ **markEventNotificationAsRead** - Needs `PUT /api/event-notifications/:id/mark-read`

### Demo Booking Functions
- ⏳ **createDemoBooking** - Needs `POST /api/demo-bookings`
- ⏳ **getDemoBookings** - Needs `GET /api/demo-bookings`
- ⏳ **updateDemoBookingStatus** - Needs `PUT /api/demo-bookings/:id`
- ⏳ **deleteDemoBooking** - Needs `DELETE /api/demo-bookings/:id`
- ⏳ **getDemoBookingStats** - Needs `GET /api/demo-bookings/stats`

### Content Notification Functions
- ⏳ **sendContentNotification** - Complex function with supabase inserts
- ⏳ **getUserNotifications** - Needs `GET /api/notifications/:userId`
- ⏳ **getUnreadNotificationCount** - Needs `GET /api/notifications/:userId/unread-count`

---

## 📋 MIGRATION PATTERNS & EXAMPLES

### Pattern 1: Simple GET Request
```typescript
// OLD
const { data, error } = await supabase
  .from('table_name')
  .select('*');

// NEW
const response = await fetch('/api/endpoint', {
  credentials: 'include'
});

if (!response.ok) {
  console.error('Error:', response.statusText);
  return [];
}

const data = await response.json();
```

### Pattern 2: GET by ID
```typescript
// OLD
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// NEW
const response = await fetch(`/api/users/${userId}`, {
  credentials: 'include'
});

if (!response.ok) {
  throw new Error(`Failed to fetch: ${response.statusText}`);
}

const users = await response.json();
const data = users[0]; // Express returns array
```

### Pattern 3: POST (Create)
```typescript
// OLD
const { data, error } = await supabase
  .from('table_name')
  .insert([insertData])
  .select()
  .single();

// NEW
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(insertData)
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Failed: ${errorText}`);
}

const data = await response.json();
```

### Pattern 4: PUT (Update)
```typescript
// OLD
const { data, error } = await supabase
  .from('table_name')
  .update(updateData)
  .eq('id', id)
  .select()
  .single();

// NEW
const response = await fetch(`/api/endpoint/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(updateData)
});

if (!response.ok) {
  throw new Error(response.statusText);
}

const data = await response.json();
```

### Pattern 5: DELETE
```typescript
// OLD (soft delete)
const { error } = await supabase
  .from('users')
  .update({ is_deleted: true })
  .eq('id', userId);

// NEW
const response = await fetch(`/api/users/${userId}`, {
  method: 'DELETE',
  credentials: 'include'
});

const error = !response.ok ? new Error(response.statusText) : null;
```

---

## 🔧 MIGRATION CHECKLIST

For each function migration:

1. ✅ Replace `supabase.from()` with appropriate `fetch()` call
2. ✅ Add `credentials: 'include'` to all fetch requests
3. ✅ Add `'Content-Type': 'application/json'` header for POST/PUT
4. ✅ Add `method` parameter for POST/PUT/DELETE
5. ✅ Wrap data in `JSON.stringify()` for request body
6. ✅ Check `response.ok` before parsing JSON
7. ✅ Handle errors appropriately
8. ✅ Maintain existing error handling patterns
9. ✅ Test the migrated function

---

## 📁 BACKUP FILES

The following backup files have been created during migration:

- `api.ts.backup` - Original backup before any changes
- `api.ts.pre-bulk-migration` - Before bulk script run
- `api.ts.pre-aggressive` - Before aggressive script run

---

## 🚀 NEXT STEPS

### Immediate Priority (Complete These First):
1. Migrate **updateUserByAdmin** - Complex but critical
2. Migrate all **course management** functions (add, update, delete)
3. Migrate all **event** functions (high user visibility)
4. Migrate all **grade exam** functions
5. Migrate all **book material** functions
6. Migrate all **notice** functions

### Medium Priority:
7. Migrate **location** functions (add, update, delete)
8. Migrate **demo booking** functions
9. Migrate **event response** functions
10. Migrate **content notification** functions

### Final Steps:
11. Test all migrated functions thoroughly
12. Remove `import { supabase }` line if no longer needed (keep for auth)
13. Verify no direct Supabase calls remain except `supabase.auth.*`

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT** remove or change supabase.auth calls - authentication still uses Supabase
2. **DO NOT** modify already migrated functions (getCourses, getPublicLocations, etc.)
3. **ALWAYS** include `credentials: 'include'` for cookie-based auth
4. **TEST** each migration before moving to the next
5. Express API returns arrays even for single items - use `data[0]` when needed

---

## 📊 FUNCTION COMPLETION TRACKING

### User Functions: 12/15 (80%)
### Course Functions: 2/6 (33%)
### Batch Functions: 4/4 (100%) ✅
### Notification Functions: 2/5 (40%)
### Fee Structure Functions: 2/3 (67%)
### Location Functions: 1/4 (25%)
### Event Functions: 0/5 (0%)
### Grade Exam Functions: 0/4 (0%)
### Book Material Functions: 0/5 (0%)
### Notice Functions: 0/5 (0%)
### Demo Booking Functions: 0/5 (0%)

**Overall Progress: ~28% Complete**

---

Generated: 2026-01-22
Last Updated: After aggressive migration script
