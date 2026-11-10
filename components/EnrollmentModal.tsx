import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

// "Enroll now" from a homepage course card. One wide card that fits the screen
// (no scrolling on a laptop): the course to join (Bharatanatyam or Carnatic
// Vocal first), who is joining, and how to reach them. The academy gets an
// email and the family a confirmation.

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseType?: 'instrument' | 'regular';
}

const COURSES = ['Bharatanatyam', 'Carnatic Vocal', 'Drawing', 'Instrument'] as const;
type CourseName = typeof COURSES[number];
const INSTRUMENTS = ['Violin', 'Keyboard', 'Veena', 'Other'];

// Which course a card title stands for ("Advanced Bharatanatyam" → Bharatanatyam).
const courseFromTitle = (title: string, type: 'instrument' | 'regular'): CourseName => {
  const t = title.toLowerCase();
  if (type === 'instrument' || t.includes('instrument')) return 'Instrument';
  if (t.includes('vocal') || t.includes('carnatic') || t.includes('music')) return 'Carnatic Vocal';
  if (t.includes('draw')) return 'Drawing';
  return 'Bharatanatyam';
};

interface Form {
  course: CourseName;
  instrument: string;
  otherInstrument: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  location: string;
  classMode: 'online' | 'offline';
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ isOpen, onClose, courseTitle, courseType = 'regular' }) => {
  const blank = (): Form => ({
    course: courseFromTitle(courseTitle, courseType), instrument: '', otherInstrument: '',
    name: '', email: '', phone: '', dateOfBirth: '', location: '', classMode: 'offline',
  });
  const [form, setForm] = useState<Form>(blank);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (isOpen) { setForm(blank()); setErrors({}); setDone(false); } }, [isOpen, courseTitle, courseType]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof Form, v: string) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (form.name.trim().length < 2) e.name = 'Please enter the learner\'s name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Please enter a valid email.';
    if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Please enter a valid phone number.';
    if (!form.dateOfBirth) e.dateOfBirth = 'Please enter the date of birth.';
    if (!form.location.trim()) e.location = 'Please enter your city.';
    if (form.course === 'Instrument') {
      if (!form.instrument) e.instrument = 'Please choose an instrument.';
      else if (form.instrument === 'Other' && form.otherInstrument.trim().length < 2) e.otherInstrument = 'Please name the instrument.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const instrument = form.course === 'Instrument' ? (form.instrument === 'Other' ? form.otherInstrument.trim() : form.instrument) : '';
    const courseLabel = instrument ? `${form.course} (${instrument})` : form.course;
    const mode = form.classMode === 'online' ? 'Online classes' : 'At the academy';
    const send = (to: string, subject: string, body: string, recipientName: string) =>
      fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body, recipientName }) }).catch(() => null);
    try {
      await send('nadanaloga2026@gmail.com', `New enrolment request – ${courseLabel}`,
        `New course enrolment request\n\nCourse: ${courseLabel}\nFrom card: ${courseTitle}\n\nLearner: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nDate of birth: ${form.dateOfBirth}\nCity: ${form.location}\nPreferred: ${mode}\n\nSubmitted ${new Date().toLocaleString('en-IN')} through the Nadanaloga website.`, 'Admin');
      await send(form.email.trim(), `We received your request – ${courseLabel}`,
        `Dear ${form.name},\n\nThank you for your interest in ${courseLabel} at Nadanaloga Fine Arts Academy. We will contact you within a day to arrange a free demo class and timings.\n\nPreferred: ${mode}\n\nWarm regards,\nNadanaloga Fine Arts Academy`, form.name);
      setDone(true);
      setTimeout(() => { onClose(); }, 3500);
    } finally { setBusy(false); }
  };

  const field = 'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500';
  const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
  const err = (k: keyof Form) => errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k]}</p> : null;
  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-medium transition ${on ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-600 dark:text-gray-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-900/30'}`;
  const seg = (on: boolean) => `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${on ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800 lg:overflow-visible">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 rounded-t-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-100">Nadanaloga Fine Arts Academy</p>
                <h2 className="mt-1 text-2xl font-bold">Enroll now</h2>
                <p className="mt-1 text-sm text-indigo-100">Tell us who is joining; we'll call you within a day to fix a free demo.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            {done ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300"><Check className="h-8 w-8" /></div>
                <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Thank you, {form.name.split(' ')[0]}!</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">We've received your request for <b>{form.course}</b>. A confirmation is on its way to {form.email}, and we'll be in touch within a day.</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="px-6 py-5">
                {/* Course */}
                <p className={label}>Which course?</p>
                <div className="flex flex-wrap gap-2">
                  {COURSES.map(c => (
                    <button type="button" key={c} onClick={() => set('course', c)} className={chip(form.course === c)} aria-pressed={form.course === c}>{c}</button>
                  ))}
                </div>
                {form.course === 'Instrument' && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={label} htmlFor="en-instrument">Instrument</label>
                      <select id="en-instrument" value={form.instrument} onChange={e => set('instrument', e.target.value)} className={field}>
                        <option value="">Choose…</option>
                        {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      {err('instrument')}
                    </div>
                    {form.instrument === 'Other' && (
                      <div>
                        <label className={label} htmlFor="en-other">Which instrument?</label>
                        <input id="en-other" value={form.otherInstrument} onChange={e => set('otherInstrument', e.target.value)} placeholder="e.g. Flute" className={field} />
                        {err('otherInstrument')}
                      </div>
                    )}
                  </div>
                )}

                {/* Learner + contact, side by side on a laptop */}
                <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="en-name">Learner's full name</label>
                    <input id="en-name" value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" placeholder="e.g. Anika Raman" className={field} />
                    {err('name')}
                  </div>
                  <div>
                    <label className={label} htmlFor="en-dob">Date of birth</label>
                    <input id="en-dob" type="date" value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={e => set('dateOfBirth', e.target.value)} className={field} />
                    {err('dateOfBirth')}
                  </div>
                  <div>
                    <label className={label} htmlFor="en-phone">Phone (WhatsApp)</label>
                    <input id="en-phone" value={form.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+91 …" className={field} />
                    {err('phone')}
                  </div>
                  <div>
                    <label className={label} htmlFor="en-email">Email</label>
                    <input id="en-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" placeholder="you@example.com" className={field} />
                    {err('email')}
                  </div>
                  <div>
                    <label className={label} htmlFor="en-city">City</label>
                    <input id="en-city" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Chennai, or your city abroad" className={field} />
                    {err('location')}
                  </div>
                  <div>
                    <p className={label}>Classes</p>
                    <div className="flex rounded-xl border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-900">
                      <button type="button" className={seg(form.classMode === 'offline')} onClick={() => set('classMode', 'offline')}>At the academy</button>
                      <button type="button" className={seg(form.classMode === 'online')} onClick={() => set('classMode', 'online')}>Online</button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">No payment now. Fees start only after the demo, once a batch is fixed.</p>
                  <button type="submit" disabled={busy}
                    className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto">
                    {busy ? 'Sending…' : 'Send enrolment request'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnrollmentModal;
