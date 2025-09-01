export const IST_TIMEZONE = 'Asia/Kolkata';

export interface TimezoneInfo {
  value: string;
  label: string;
  offset: string;
}

// Common IANA timezones for quick selection (searchable picker will have all)
export const COMMON_TIMEZONES: TimezoneInfo[] = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: 'GMT+5:30' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)', offset: 'GMT+0/1' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET/CEST)', offset: 'GMT+1/2' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: 'GMT+4' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', offset: 'GMT+8' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)', offset: 'GMT+10/11' },
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'GMT-5/4' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'GMT-6/5' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'GMT-7/6' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'GMT-8/7' },
  { value: 'America/Toronto', label: 'Eastern Time - Canada (ET)', offset: 'GMT-5/4' },
  { value: 'America/Vancouver', label: 'Pacific Time - Canada (PT)', offset: 'GMT-8/7' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 'GMT+9' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: 'GMT+8' },
  { value: 'Europe/Paris', label: 'Central European Time - France (CET)', offset: 'GMT+1/2' },
];

// Get all IANA timezones (this would be imported from a comprehensive list in a real app)
export function getAllTimezones(): TimezoneInfo[] {
  // This would ideally come from a comprehensive IANA timezone list
  // For now, using common ones + some additional ones
  const additionalTimezones = [
    { value: 'Africa/Cairo', label: 'Egypt Standard Time', offset: 'GMT+2' },
    { value: 'Asia/Bangkok', label: 'Indochina Time', offset: 'GMT+7' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong Time', offset: 'GMT+8' },
    { value: 'Asia/Seoul', label: 'Korea Standard Time', offset: 'GMT+9' },
    { value: 'Europe/Amsterdam', label: 'Central European Time - Netherlands', offset: 'GMT+1/2' },
    { value: 'Europe/Rome', label: 'Central European Time - Italy', offset: 'GMT+1/2' },
    { value: 'Europe/Madrid', label: 'Central European Time - Spain', offset: 'GMT+1/2' },
    { value: 'Pacific/Auckland', label: 'New Zealand Standard Time', offset: 'GMT+12/13' },
    { value: 'America/Sao_Paulo', label: 'Brasilia Time', offset: 'GMT-3' },
    { value: 'America/Mexico_City', label: 'Central Standard Time - Mexico', offset: 'GMT-6' },
  ];
  
  return [...COMMON_TIMEZONES, ...additionalTimezones].sort((a, b) => a.label.localeCompare(b.label));
}

export function parseTimeSlot(timeSlot: string): { start: string; end: string } {
  if (!timeSlot || typeof timeSlot !== 'string') {
    return { start: '09:00', end: '10:00' }; // Default fallback
  }
  const parts = timeSlot.split(' - ');
  const start = parts[0]?.trim() || '09:00';
  const end = parts[1]?.trim() || '10:00';
  return { start, end };
}

export function createISTDateTime(dayName: string, timeStr: string): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const targetDay = getDayNumber(dayName);
  
  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7; // Next occurrence of the same day
  }
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);
  
  return targetDate;
}

function getDayNumber(dayName: string): number {
  const dayMap: { [key: string]: number } = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return dayMap[dayName] || 0;
}

export function convertISTToUserTimezone(
  dayName: string,
  timeSlot: string,
  userTimezone: string = IST_TIMEZONE
): {
  localDay: string;
  localTime: string;
  localTimeSlot: string;
  originalISTTime: string;
} {
  if (userTimezone === IST_TIMEZONE) {
    return {
      localDay: dayName,
      localTime: timeSlot,
      localTimeSlot: timeSlot,
      originalISTTime: timeSlot,
    };
  }

  const { start, end } = parseTimeSlot(timeSlot);
  
  const istStartDate = createISTDateTime(dayName, start);
  const istEndDate = createISTDateTime(dayName, end);

  const localStartTime = istStartDate.toLocaleString('en-US', {
    timeZone: userTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const localEndTime = istEndDate.toLocaleString('en-US', {
    timeZone: userTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const localDayName = istStartDate.toLocaleDateString('en-US', {
    timeZone: userTimezone,
    weekday: 'long',
  });

  return {
    localDay: localDayName,
    localTime: localStartTime,
    localTimeSlot: `${localStartTime} - ${localEndTime}`,
    originalISTTime: timeSlot,
  };
}

export function formatTimeWithTimezone(
  dayName: string,
  timeSlot: string,
  userTimezone: string = IST_TIMEZONE,
  showOriginal: boolean = true
): string {
  const conversion = convertISTToUserTimezone(dayName, timeSlot, userTimezone);
  
  if (userTimezone === IST_TIMEZONE || !showOriginal) {
    return `${conversion.localDay} ${conversion.localTimeSlot}`;
  }
  
  return `${conversion.localDay} ${conversion.localTimeSlot} (${dayName} ${timeSlot} IST)`;
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return IST_TIMEZONE;
  }
}

export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

// Re-export CourseTimingSlot from types
export type { CourseTimingSlot } from '../types';

// UTC conversion utilities for proper time storage
export interface UtcTimeSlot {
  startUtc: string; // ISO string
  endUtc: string;   // ISO string
  dayOfWeek: number; // 0-6, Sunday = 0
}

// Helper function to create UTC time from timezone-aware input
function createUtcFromTimezone(year: number, month: number, day: number, hours: number, minutes: number, timezone: string): Date {
  // If it's IST, we know the input time is in IST and need to convert to UTC
  if (timezone === IST_TIMEZONE) {
    // Create UTC date by subtracting IST offset (UTC+5:30)
    // We create the date as if it's UTC first, then adjust
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, 0));
    // Subtract 5.5 hours to get actual UTC from IST
    return new Date(utcDate.getTime() - (5.5 * 60 * 60 * 1000));
  }
  
  // For other timezones, create as UTC (this can be enhanced later for other specific timezones)
  return new Date(Date.UTC(year, month, day, hours, minutes, 0));
}

export function createUtcTimeSlot(dayName: string, timeSlot: string, sourceTimezone: string = IST_TIMEZONE): UtcTimeSlot {
  if (!dayName || !timeSlot) {
    // Return default UTC slot if inputs are invalid
    return {
      startUtc: new Date().toISOString(),
      endUtc: new Date(Date.now() + 3600000).toISOString(), // +1 hour
      dayOfWeek: 1 // Monday
    };
  }
  
  const { start, end } = parseTimeSlot(timeSlot);
  
  // Create a date for next occurrence of this day
  const today = new Date();
  const currentDay = today.getDay();
  const targetDay = getDayNumber(dayName);
  
  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7; // Next occurrence of the same day
  }
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);
  
  // Parse time components
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  
  const startUtc = createUtcFromTimezone(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    startHours,
    startMinutes,
    sourceTimezone
  );
  
  const endUtc = createUtcFromTimezone(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    endHours,
    endMinutes,
    sourceTimezone
  );
  
  return {
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
    dayOfWeek: targetDay
  };
}

export function formatTimeInTimezone(utcTimeString: string, timezone: string): string {
  try {
    const date = new Date(utcTimeString);
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return 'Invalid time';
  }
}

export function createDualTimezoneDisplay(
  startUtc: string,
  endUtc: string,
  userTimezone: string = IST_TIMEZONE
): { localTime: string; istTime: string; isNextDay?: boolean } {
  if (!startUtc || !endUtc) {
    return {
      localTime: '09:00–10:00',
      istTime: '09:00–10:00',
      isNextDay: false
    };
  }

  const safeUserTimezone = userTimezone || IST_TIMEZONE;
  const localStart = formatTimeInTimezone(startUtc, safeUserTimezone);
  const localEnd = formatTimeInTimezone(endUtc, safeUserTimezone);
  const istStart = formatTimeInTimezone(startUtc, IST_TIMEZONE);
  const istEnd = formatTimeInTimezone(endUtc, IST_TIMEZONE);
  
  // Check if local time crosses to next day
  const userDate = new Date(startUtc).toLocaleDateString('en-US', { timeZone: safeUserTimezone });
  const istDate = new Date(startUtc).toLocaleDateString('en-US', { timeZone: IST_TIMEZONE });
  const isNextDay = userDate !== istDate;
  
  return {
    localTime: `${localStart}–${localEnd}`,
    istTime: `${istStart}–${istEnd}`,
    isNextDay
  };
}

// Enhanced timezone detection with confirmation
export function detectUserTimezone(): { timezone: string; confidence: 'high' | 'low' } {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if it's a valid IANA timezone
    const isValid = getAllTimezones().some(tz => tz.value === detected) || 
                   COMMON_TIMEZONES.some(tz => tz.value === detected);
    
    return {
      timezone: detected,
      confidence: isValid ? 'high' : 'low'
    };
  } catch {
    return {
      timezone: IST_TIMEZONE,
      confidence: 'low'
    };
  }
}

export function doSlotsOverlap(
  slot1: { day: string; timeSlot: string },
  slot2: { day: string; timeSlot: string }
): boolean {
  if (slot1.day !== slot2.day) {
    return false;
  }
  
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const { start: start1, end: end1 } = parseTimeSlot(slot1.timeSlot);
  const { start: start2, end: end2 } = parseTimeSlot(slot2.timeSlot);
  
  const start1Minutes = parseTime(start1);
  const end1Minutes = parseTime(end1);
  const start2Minutes = parseTime(start2);
  const end2Minutes = parseTime(end2);
  
  return !(end1Minutes <= start2Minutes || end2Minutes <= start1Minutes);
}