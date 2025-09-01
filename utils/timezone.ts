export const IST_TIMEZONE = 'Asia/Kolkata';

export interface TimezoneInfo {
  value: string;
  label: string;
  offset: string;
}

export const SUPPORTED_TIMEZONES: TimezoneInfo[] = [
  { value: 'Asia/Kolkata', label: 'IST (India Standard Time)', offset: 'GMT+5:30' },
  { value: 'Europe/London', label: 'GMT/BST (London, Dublin)', offset: 'GMT+0/1' },
  { value: 'Europe/Berlin', label: 'CET/CEST (Berlin, Paris)', offset: 'GMT+1/2' },
  { value: 'Asia/Dubai', label: 'GST (Dubai)', offset: 'GMT+4' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore)', offset: 'GMT+8' },
  { value: 'Australia/Sydney', label: 'AEST/AEDT (Sydney)', offset: 'GMT+10/11' },
  { value: 'America/New_York', label: 'ET (New York)', offset: 'GMT-5/4' },
  { value: 'America/Chicago', label: 'CT (Chicago)', offset: 'GMT-6/5' },
  { value: 'America/Denver', label: 'MT (Denver)', offset: 'GMT-7/6' },
  { value: 'America/Los_Angeles', label: 'PT (Los Angeles)', offset: 'GMT-8/7' },
];

export function parseTimeSlot(timeSlot: string): { start: string; end: string } {
  const [start, end] = timeSlot.split(' - ');
  return { start: start.trim(), end: end.trim() };
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

export function createDualTimezoneDisplay(
  istTime: string,
  userTimezone: string = IST_TIMEZONE
): string {
  if (userTimezone === IST_TIMEZONE) {
    return `${istTime} IST`;
  }
  
  // For now, return basic format - this can be enhanced later
  return `${istTime} IST (${getTimezoneAbbreviation(userTimezone)})`;
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