import type { DemoBooking } from '../types';

// One-tap WhatsApp for demo bookings: the admin's own WhatsApp (the academy
// number) opens with the message typed in; nothing is sent by the server.
// Keep the texts in step with nadanaloga_mobile/.../demos/demo_whatsapp.dart.

const ACADEMY = 'Nadanaloga Fine Arts Academy';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** wa.me number (country code, digits only), or null when the phone can't be used. */
export const whatsAppNumber = (phone?: string): string | null => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
};

/** "Sat, 27 Sep 2026" from YYYY-MM-DD; anything else is shown as typed. */
export const formatDemoDate = (value?: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!m) return value || '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** "5:00 PM" from HH:MM[:SS]; anything else is shown as typed. */
export const formatDemoTime = (value?: string): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || '');
  if (!m) return value || '';
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};

const greetingName = (b: DemoBooking) => b.parentName || b.name || 'there';
const forCourse = (b: DemoBooking) => (b.courseName ? ` for ${b.courseName}` : '');

export const ackMessage = (b: DemoBooking): string =>
  `Hello ${greetingName(b)}, thank you for booking a demo class${forCourse(b)} at ${ACADEMY}. ` +
  `We have received your request and our team will call you shortly to confirm the date and time.\n\n— ${ACADEMY}`;

export const confirmMessage = (b: DemoBooking): string => {
  const date = formatDemoDate(b.scheduledDate || b.preferredDate);
  const time = formatDemoTime(b.scheduledTime || b.preferredTime);
  const when = date && time ? ` on ${date} at ${time}` : date ? ` on ${date}` : '';
  return `Hello ${greetingName(b)}, your demo class${forCourse(b)} at ${ACADEMY} is confirmed${when}. ` +
    `We look forward to seeing you! Reply here if you have any questions.\n\n— ${ACADEMY}`;
};

/** Opens WhatsApp (app on phones, WhatsApp Web/Desktop on computers). */
export const openWhatsApp = (number: string, text: string) => {
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
};
