# API Optimization Summary

## Problem
The website was making excessive API calls to Supabase, causing rapid credit depletion ($5 drained quickly).

## Root Causes Identified

### 1. **Aggressive Notification Polling** (PRIMARY ISSUE)
- **3 notification bell components** polling every 30 seconds
- Each poll made **3 API calls** (getUserNotifications, getEventNotifications, getUnreadNotificationCount)
- **Total: 9 API calls every 30 seconds per logged-in user**
- Impact: 1,080 API calls per user per hour

### 2. **No Caching for Public Data**
- Course data fetched from Supabase on every page load
- No localStorage caching
- Public data being repeatedly fetched

### 3. **Multiple Dashboard Pages**
- 5 dashboard pages with 35+ useEffect calls
- 95 Supabase queries defined in api.ts
- Redundant data fetching

## Optimizations Implemented

### 1. **Notification Polling Optimization** (90% reduction)
**Files Modified:**
- `components/UnifiedNotificationBell.tsx`
- `components/NotificationBell.tsx`
- `components/EventNotificationBell.tsx`

**Changes:**
- Polling interval: **30 seconds → 5 minutes** (300,000ms)
- Added **tab visibility detection** - only polls when tab is active
- Fetch notifications when tab becomes visible after being hidden
- **Result: 90% reduction in notification API calls**

**Before:** 1,080 calls/hour per user
**After:** 108 calls/hour per user (when tab active)

### 2. **Course Data Caching**
**New File Created:**
- `utils/cache.ts` - Comprehensive caching utility

**Files Modified:**
- `components/home/CoursesSection.tsx`
- `components/DemoBookingModal.tsx`

**Features:**
- 1-hour cache for course data
- localStorage-based caching with TTL
- Automatic cache expiry and refresh
- Reusable utility functions

**Cache Keys:**
```typescript
CACHE_KEYS = {
  COURSES: 'nadanaloga_courses',
  GALLERY: 'nadanaloga_gallery',
  EVENTS: 'nadanaloga_events',
}
```

**Cache Durations:**
```typescript
CACHE_DURATIONS = {
  ONE_HOUR: 3600000,
  SIX_HOURS: 21600000,
  ONE_DAY: 86400000,
  ONE_WEEK: 604800000,
}
```

## Impact Analysis

### Before Optimization
- Notification bells: **9 calls every 30s** per user
- Course data: **1 call per page visit** (no cache)
- Multiple users × multiple tabs = exponential growth

**Example:**
- 10 users online for 1 hour = 10,800 notification API calls
- 100 homepage visitors = 100 course API calls
- **Total: ~11,000 API calls in 1 hour**

### After Optimization
- Notification bells: **3 calls every 5 min** per active user
- Course data: **1 call per hour** (cached)
- Tab visibility prevents background polling

**Example:**
- 10 users online for 1 hour = 360 notification API calls (67% reduction)
- 100 homepage visitors = 1 course API call (99% reduction)
- **Total: ~400 API calls in 1 hour (96% reduction)**

## Expected Cost Reduction
- **Notification API calls: 90% reduction**
- **Course data calls: 99% reduction**
- **Overall estimated reduction: 85-95%**

## Additional Recommendations

### Short-term (Already Implemented)
✅ Increase polling intervals
✅ Add tab visibility detection
✅ Implement localStorage caching

### Medium-term (Future Implementation)
1. **WebSockets/Server-Sent Events** for real-time notifications
   - Replace polling with push notifications
   - Further reduce API calls

2. **React Query or SWR**
   - Smart caching and background refetching
   - Better state management
   - Automatic retry logic

3. **Service Worker**
   - Background sync
   - Offline caching
   - Better performance

4. **Database Query Optimization**
   - Review Supabase RLS policies
   - Optimize query filters
   - Add database indexes

### Long-term (Major Changes)
1. **Self-Hosted PostgreSQL**
   - Your `.env` shows you have local PostgreSQL
   - Direct database connections (no API calls)
   - Zero Supabase API costs
   - Better performance

2. **Redis/Memcached**
   - Server-side caching
   - Faster data access
   - Reduce database load

## Monitoring Recommendations

1. **Track API Usage**
   - Monitor Supabase dashboard for API call metrics
   - Set up alerts for unusual spikes

2. **Cache Hit Rate**
   - Add logging to track cache effectiveness
   - Monitor localStorage usage

3. **User Behavior**
   - Track average session duration
   - Monitor notification click-through rates
   - Adjust polling intervals based on usage

## Testing Checklist

- [x] Notifications still fetch when user opens dropdown
- [x] Notifications refresh when tab becomes visible
- [x] Course data loads from cache on subsequent visits
- [x] Cache expires after 1 hour and refetches
- [ ] Test with multiple users simultaneously
- [ ] Monitor Supabase API usage dashboard
- [ ] Verify no degradation in user experience

## Configuration

### To Adjust Polling Interval
Edit the following value in notification bell components:
```typescript
const interval = setInterval(() => {
  if (document.visibilityState === 'visible') {
    fetchNotifications();
  }
}, 300000); // Change this value (in milliseconds)
```

### To Adjust Cache Duration
Edit `utils/cache.ts`:
```typescript
export const CACHE_DURATIONS = {
  ONE_HOUR: 1000 * 60 * 60, // Adjust as needed
  // ... other durations
}
```

## Rollback Plan

If issues arise, to revert optimizations:

1. **Notification Polling:**
   ```bash
   git checkout main -- components/UnifiedNotificationBell.tsx
   git checkout main -- components/NotificationBell.tsx
   git checkout main -- components/EventNotificationBell.tsx
   ```

2. **Caching:**
   ```bash
   git checkout main -- components/home/CoursesSection.tsx
   git checkout main -- components/DemoBookingModal.tsx
   rm utils/cache.ts
   ```

## Support

For questions or issues:
1. Check Supabase dashboard for API metrics
2. Review browser console for cache-related errors
3. Monitor localStorage size (shouldn't exceed 5-10MB)
4. Check network tab for API call frequency

---

**Date:** 2025-01-01
**Branch:** sub
**Estimated Savings:** 85-95% reduction in API costs
