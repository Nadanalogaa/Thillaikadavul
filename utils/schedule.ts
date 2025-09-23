import type { BatchSchedule } from '../types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTimeRange = (startUtc?: string, endUtc?: string): string | null => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  };

  if (!startUtc && !endUtc) {
    return null;
  }

  try {
    const parts: string[] = [];
    if (startUtc) {
      const start = new Date(startUtc);
      if (!isNaN(start.getTime())) {
        parts.push(start.toLocaleTimeString([], options));
      }
    }
    if (endUtc) {
      const end = new Date(endUtc);
      if (!isNaN(end.getTime())) {
        parts.push(end.toLocaleTimeString([], options));
      }
    }

    if (parts.length === 1) {
      return parts[0];
    }

    if (parts.length === 2) {
      return `${parts[0]} - ${parts[1]}`;
    }

    return null;
  } catch (error) {
    console.warn('Failed to format schedule time range:', error);
    return null;
  }
};

export const formatBatchScheduleLabel = (schedule: BatchSchedule): string => {
  if (!schedule) {
    return 'Schedule details pending';
  }

  if (schedule.timing) {
    return schedule.timing;
  }

  const labelParts: string[] = [];

  if (typeof schedule.dayOfWeek === 'number' && DAY_NAMES[schedule.dayOfWeek]) {
    labelParts.push(DAY_NAMES[schedule.dayOfWeek]);
  }

  if ((schedule as any).day) {
    labelParts.push((schedule as any).day);
  }

  if ((schedule as any).timeSlot) {
    labelParts.push((schedule as any).timeSlot);
  }

  const range = formatTimeRange(schedule.startUtc, schedule.endUtc);
  if (range) {
    labelParts.push(range);
  }

  if (!labelParts.length) {
    return 'Schedule details pending';
  }

  return labelParts.join(' • ');
};
