// Timezone utility functions for course timing management

export interface TimezoneInfo {
  timezone: string;
  label: string;
  offset: string;
}

export interface CourseTimingSlot {
  id: string;
  courseId: string;
  courseName: string;
  day: string;
  timeSlot: string;
  utcTime: string;
  localTime: string;
  istTime: string;
  timezone: string;
}

// Common timezones with their labels
export const COMMON_TIMEZONES: TimezoneInfo[] = [
  { timezone: 'Asia/Kolkata', label: 'IST (India Standard Time)', offset: '+05:30' },
  { timezone: 'America/New_York', label: 'EST/EDT (Eastern Time)', offset: '-05:00/-04:00' },
  { timezone: 'America/Chicago', label: 'CST/CDT (Central Time)', offset: '-06:00/-05:00' },
  { timezone: 'America/Denver', label: 'MST/MDT (Mountain Time)', offset: '-07:00/-06:00' },
  { timezone: 'America/Los_Angeles', label: 'PST/PDT (Pacific Time)', offset: '-08:00/-07:00' },
  { timezone: 'Europe/London', label: 'GMT/BST (Greenwich Mean Time)', offset: '+00:00/+01:00' },
  { timezone: 'Europe/Berlin', label: 'CET/CEST (Central European Time)', offset: '+01:00/+02:00' },
  { timezone: 'Asia/Dubai', label: 'GST (Gulf Standard Time)', offset: '+04:00' },
  { timezone: 'Asia/Singapore', label: 'SGT (Singapore Time)', offset: '+08:00' },
  { timezone: 'Australia/Sydney', label: 'AEST/AEDT (Australian Eastern Time)', offset: '+10:00/+11:00' }
];

/**
 * Convert time slot to UTC
 */
export const convertToUTC = (day: string, timeSlot: string, timezone: string): Date => {
  // Parse time slot (e.g., "09:00 - 10:00" -> "09:00")
  const startTime = timeSlot.split(' - ')[0];
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Get next occurrence of the day
  const now = new Date();
  const dayIndex = getDayIndex(day);
  const currentDayIndex = now.getDay();
  
  let daysToAdd = dayIndex - currentDayIndex;
  if (daysToAdd <= 0) daysToAdd += 7; // Next week if day has passed
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysToAdd);
  targetDate.setHours(hours, minutes, 0, 0);
  
  // Convert to UTC using timezone
  const utcTime = new Date(targetDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  return utcTime;
};

/**
 * Format time in specific timezone
 */
export const formatTimeInTimezone = (utcTime: Date, timezone: string, includeDate: boolean = false): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  if (includeDate) {
    options.weekday = 'short';
  }
  
  return utcTime.toLocaleString('en-US', options);
};

/**
 * Get timezone abbreviation
 */
export const getTimezoneAbbr = (timezone: string): string => {
  const abbMap: { [key: string]: string } = {
    'Asia/Kolkata': 'IST',
    'America/New_York': 'EST/EDT',
    'America/Chicago': 'CST/CDT',
    'America/Denver': 'MST/MDT',
    'America/Los_Angeles': 'PST/PDT',
    'Europe/London': 'GMT/BST',
    'Europe/Berlin': 'CET/CEST',
    'Asia/Dubai': 'GST',
    'Asia/Singapore': 'SGT',
    'Australia/Sydney': 'AEST/AEDT'
  };
  
  return abbMap[timezone] || timezone;
};

/**
 * Get day index (0 = Sunday, 1 = Monday, etc.)
 */
const getDayIndex = (day: string): number => {
  const dayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  
  return dayMap[day] || 0;
};

/**
 * Create a dual timezone display string
 */
export const createDualTimezoneDisplay = (
  day: string,
  timeSlot: string,
  userTimezone: string,
  isAdminView: boolean = false
): string => {
  try {
    const utcTime = convertToUTC(day, timeSlot, userTimezone);
    const userTime = formatTimeInTimezone(utcTime, userTimezone);
    const istTime = formatTimeInTimezone(utcTime, 'Asia/Kolkata');
    
    const userTzAbbr = getTimezoneAbbr(userTimezone);
    const istAbbr = getTimezoneAbbr('Asia/Kolkata');
    
    // Admin view: IST first, then user timezone
    if (isAdminView) {
      if (userTimezone === 'Asia/Kolkata') {
        return `${day.substring(0, 3)} ${istTime} ${istAbbr}`;
      }
      return `${day.substring(0, 3)} ${istTime} ${istAbbr} (${userTime} ${userTzAbbr})`;
    }
    
    // Student view: User timezone first, then IST
    if (userTimezone === 'Asia/Kolkata') {
      return `${day.substring(0, 3)} ${userTime} ${userTzAbbr}`;
    }
    return `${day.substring(0, 3)} ${userTime} ${userTzAbbr} (${istTime} ${istAbbr})`;
  } catch (error) {
    console.error('Error creating timezone display:', error);
    return `${day.substring(0, 3)} ${timeSlot}`;
  }
};

/**
 * Detect user's timezone
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect user timezone, defaulting to IST');
    return 'Asia/Kolkata';
  }
};

/**
 * Check if two time slots overlap
 */
export const doSlotsOverlap = (slot1: CourseTimingSlot, slot2: CourseTimingSlot): boolean => {
  if (slot1.day !== slot2.day) return false;
  
  const parseTime = (timeSlot: string) => {
    const startTime = timeSlot.split(' - ')[0];
    const [hours, minutes] = startTime.split(':').map(Number);
    return hours * 60 + minutes; // Convert to minutes
  };
  
  const slot1Start = parseTime(slot1.timeSlot);
  const slot1End = slot1Start + 60; // 1-hour duration
  const slot2Start = parseTime(slot2.timeSlot);
  const slot2End = slot2Start + 60;
  
  return (slot1Start < slot2End && slot2Start < slot1End);
};