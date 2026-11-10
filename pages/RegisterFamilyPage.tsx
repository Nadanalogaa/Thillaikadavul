import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff, Plus, Trash2, ArrowRight, CalendarCheck, Globe, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getCourses, getLocations, registerFamily } from '../api';
import type { Course, Location } from '../types';

// Sign-up for families: one page, three short blocks, one button.
//   You            – name, phone, email, password (country filled in from the browser)
//   Who's learning – one card per learner: name, date of birth, courses, online / at the academy
//   Create account
// Everything else (address, photo, school, timings) is filled later, in the
// profile or by the academy when the student is placed in a batch. Teachers
// apply through the separate instructor form.

const COUNTRIES: { code: string; name: string; currency: string | null; dial: string }[] = [
    { code: 'IN', name: 'India', currency: null, dial: '+91' },
    { code: 'US', name: 'United States', currency: 'USD', dial: '+1' },
    { code: 'CA', name: 'Canada', currency: 'CAD', dial: '+1' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP', dial: '+44' },
    { code: 'AU', name: 'Australia', currency: 'AUD', dial: '+61' },
    { code: 'NZ', name: 'New Zealand', currency: 'NZD', dial: '+64' },
    { code: 'SG', name: 'Singapore', currency: 'SGD', dial: '+65' },
    { code: 'MY', name: 'Malaysia', currency: 'MYR', dial: '+60' },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED', dial: '+971' },
    { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', dial: '+966' },
    { code: 'QA', name: 'Qatar', currency: 'QAR', dial: '+974' },
    { code: 'OM', name: 'Oman', currency: 'OMR', dial: '+968' },
    { code: 'KW', name: 'Kuwait', currency: 'KWD', dial: '+965' },
    { code: 'BH', name: 'Bahrain', currency: 'BHD', dial: '+973' },
    { code: 'LK', name: 'Sri Lanka', currency: 'LKR', dial: '+94' },
    { code: 'DE', name: 'Germany', currency: 'EUR', dial: '+49' },
    { code: 'FR', name: 'France', currency: 'EUR', dial: '+33' },
    { code: 'NL', name: 'Netherlands', currency: 'EUR', dial: '+31' },
    { code: 'IE', name: 'Ireland', currency: 'EUR', dial: '+353' },
    { code: 'IT', name: 'Italy', currency: 'EUR', dial: '+39' },
    { code: 'ES', name: 'Spain', currency: 'EUR', dial: '+34' },
    { code: 'CH', name: 'Switzerland', currency: 'CHF', dial: '+41' },
    { code: 'HK', name: 'Hong Kong', currency: 'HKD', dial: '+852' },
    { code: 'JP', name: 'Japan', currency: 'JPY', dial: '+81' },
    { code: 'XX', name: 'Other country', currency: 'USD', dial: '' },
];

// A guess from the browser's time zone; the family can change it.
const countryFromTimezone = (): string => {
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })();
    const exact: Record<string, string> = {
        'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
        'Europe/Amsterdam': 'NL', 'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Zurich': 'CH', 'Pacific/Auckland': 'NZ',
        'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Muscat': 'OM',
        'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Colombo': 'LK', 'Asia/Hong_Kong': 'HK', 'Asia/Tokyo': 'JP',
    };
    if (exact[tz]) return exact[tz];
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Calgary)/.test(tz)) return 'CA';
    if (/^America\//.test(tz)) return 'US';
    if (/^Australia\//.test(tz)) return 'AU';
    if (/^Europe\//.test(tz)) return 'XX';
    return 'IN';
};

type Learner = { key: number; name: string; dob: string; courses: string[]; mode: 'online' | 'academy'; location_id: string };
const newLearner = (key: number, mode: 'online' | 'academy'): Learner => ({ key, name: '', dob: '', courses: [], mode, location_id: '' });

const RegisterFamilyPage: React.FC<{ onLoginNeeded: (email: string) => void }> = ({ onLoginNeeded }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [courses, setCourses] = useState<Course[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [country, setCountry] = useState(countryFromTimezone);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selfLearner, setSelfLearner] = useState(false);
    const [learners, setLearners] = useState<Learner[]>([newLearner(1, countryFromTimezone() === 'IN' ? 'academy' : 'online')]);
    const [agree, setAgree] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ login: string; phone: string; names: string[] } | null>(null);

    const info = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];
    const abroad = info.currency !== null;

    useEffect(() => {
        getCourses().then(list => setCourses(list.filter((c, i, a) => a.findIndex(x => x.name === c.name) === i))).catch(() => {});
        getLocations().then(setLocations).catch(() => {});
    }, []);
    // Outside India, classes are online; switching back to India restores the in-person choice.
    useEffect(() => { setLearners(ls => ls.map(l => ({ ...l, mode: abroad ? 'online' : l.mode }))); }, [abroad]);
    // "I'm the learner": the first card carries the adult's own name.
    useEffect(() => { if (selfLearner) setLearners(ls => ls.map((l, i) => i === 0 ? { ...l, name } : l)); }, [selfLearner, name]);

    const update = (key: number, patch: Partial<Learner>) => setLearners(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l));
    const toggleCourse = (key: number, course: string) => setLearners(ls => ls.map(l => l.key !== key ? l
        : { ...l, courses: l.courses.includes(course) ? l.courses.filter(c => c !== course) : [...l.courses, course] }));
    const add = () => setLearners(ls => [...ls, newLearner(Date.now(), abroad ? 'online' : 'academy')]);
    const remove = (key: number) => setLearners(ls => ls.length > 1 ? ls.filter(l => l.key !== key) : ls);

    const problems = useMemo(() => {
        const list: string[] = [];
        if (name.trim().length < 2) list.push('your name');
        if (phone.replace(/\D/g, '').length < 7) list.push('your phone number');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) list.push('a valid email');
        if (password.length < 6) list.push('a password of 6+ characters');
        learners.forEach((l, i) => {
            const who = selfLearner && i === 0 ? 'you' : l.name.trim() || `learner ${i + 1}`;
            if (!l.name.trim()) list.push(`learner ${i + 1}'s name`);
            if (!l.dob) list.push(`${who === 'you' ? 'your' : `${who}'s`} date of birth`);
            if (!l.courses.length) list.push(`a course for ${who}`);
            if (l.mode === 'academy' && locations.length > 0 && !l.location_id) list.push(`a centre for ${who}`);
        });
        return list;
    }, [name, phone, email, password, learners, selfLearner, locations.length]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (problems.length) { setError(`Please add ${problems[0]}.`); return; }
        if (!agree) { setError('Please accept the terms to continue.'); return; }
        setBusy(true);
        try {
            const r = await registerFamily({
                guardian: { name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), password, self_learner: selfLearner },
                learners: learners.map(l => ({ name: l.name.trim(), dob: l.dob, courses: l.courses, mode: l.mode, location_id: l.mode === 'academy' && l.location_id ? l.location_id : null })),
                country: info.code === 'XX' ? 'Other' : info.name,
                billing_currency: info.currency,
            });
            setDone({ login: r.login, phone: r.phone, names: r.learners.map(x => x.name) });
            window.scrollTo({ top: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create your account.');
        } finally { setBusy(false); }
    };

    // --- styles ---------------------------------------------------------------
    const page = `min-h-screen ${dark ? 'bg-gray-900' : 'bg-gradient-to-b from-indigo-50 via-white to-white'}`;
    const card = `rounded-2xl border shadow-sm ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`;
    const label = `mb-1 block text-xs font-semibold uppercase tracking-wide ${dark ? 'text-gray-400' : 'text-gray-500'}`;
    const input = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${dark ? 'border-gray-600 bg-gray-900 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`;
    const strong = dark ? 'text-white' : 'text-gray-900';
    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const chip = (on: boolean) => `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on
        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
        : dark ? 'border-gray-600 text-gray-200 hover:border-indigo-400' : 'border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'}`;
    const seg = (on: boolean) => `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${on
        ? 'bg-indigo-600 text-white shadow-sm' : dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`;

    if (done) {
        return (
            <div className={`${page} flex items-center justify-center px-4 py-16`}>
                <div className={`${card} w-full max-w-lg p-8 text-center`}>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300"><Check className="h-8 w-8" /></div>
                    <h1 className={`mt-4 text-2xl font-bold ${strong}`}>Welcome to Nadanaloga, {name.split(' ')[0]}!</h1>
                    <p className={`mt-2 text-sm ${muted}`}>Your account is ready for {done.names.join(', ')}.</p>
                    <div className={`mt-6 rounded-xl p-4 text-left text-sm ${dark ? 'bg-gray-900/60' : 'bg-indigo-50'}`}>
                        <p className={`font-semibold ${strong}`}>What happens next</p>
                        <ol className={`mt-2 list-decimal space-y-1 pl-5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                            <li>We call or WhatsApp you within a day to fix a <b>free demo class</b>.</li>
                            <li>After the demo, we place {done.names.length === 1 ? done.names[0] : 'each learner'} in a batch and confirm the timings.</li>
                            <li>Fees start only once classes begin{abroad ? `, billed in ${info.currency} and paid online by card` : ''}.</li>
                        </ol>
                    </div>
                    <p className={`mt-5 text-sm ${muted}`}>Sign in with your phone number <b>{done.phone}</b> or email <b>{done.login}</b>, on this website or the Nadanaloga app.</p>
                    <button type="button" onClick={() => onLoginNeeded(done.login)}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
                        Sign in now <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={page}>
            <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 lg:grid lg:grid-cols-[1fr_1.6fr] lg:gap-10">
                {/* Why join */}
                <aside className="mb-8 lg:mb-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Nadanaloga Fine Arts Academy</p>
                    <h1 className={`mt-2 text-3xl font-bold leading-tight sm:text-4xl ${strong}`}>Join in two minutes</h1>
                    <p className={`mt-3 text-sm sm:text-base ${muted}`}>Bharatanatyam, Carnatic vocal, instruments, drawing and more — at our Chennai centres or online anywhere in the world.</p>
                    <ul className="mt-6 space-y-4">
                        {[
                            [CalendarCheck, 'Free demo class first', 'We fix a demo and timings with you before anything starts.'],
                            [ShieldCheck, 'No fees until classes begin', 'Fees are billed monthly only once your learner is in a batch.'],
                            [Globe, 'Learning from abroad?', 'Classes are online, timings suit your time zone, and fees are billed in your own currency.'],
                        ].map(([Icon, title, text]) => {
                            const I = Icon as React.ElementType;
                            return (
                                <li key={title as string} className="flex gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200"><I className="h-5 w-5" /></span>
                                    <span><span className={`block text-sm font-semibold ${strong}`}>{title as string}</span><span className={`block text-sm ${muted}`}>{text as string}</span></span>
                                </li>
                            );
                        })}
                    </ul>
                    <p className={`mt-8 text-sm ${muted}`}>Already have an account? <button type="button" onClick={() => onLoginNeeded('')} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">Sign in</button></p>
                </aside>

                {/* The form */}
                <form onSubmit={submit} noValidate className="space-y-5">
                    <section className={`${card} p-5 sm:p-6`}>
                        <h2 className={`text-lg font-semibold ${strong}`}>You</h2>
                        <p className={`mt-0.5 text-sm ${muted}`}>The parent or guardian — or yourself, if you are the one learning.</p>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className={label} htmlFor="r-name">Full name</label>
                                <input id="r-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="e.g. Priya Raman" className={input} />
                            </div>
                            <div>
                                <label className={label} htmlFor="r-country">Country</label>
                                <select id="r-country" value={country} onChange={e => setCountry(e.target.value)} className={input}>
                                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={label} htmlFor="r-phone">Phone (WhatsApp)</label>
                                <input id="r-phone" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel"
                                    placeholder={info.dial ? `${info.dial} …` : '+ country code and number'} className={input} />
                                <p className={`mt-1 text-xs ${muted}`}>Your family signs in with this number.</p>
                            </div>
                            <div>
                                <label className={label} htmlFor="r-email">Email</label>
                                <input id="r-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" className={input} />
                            </div>
                            <div>
                                <label className={label} htmlFor="r-password">Password</label>
                                <div className="relative">
                                    <input id="r-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" className={`${input} pr-10`} />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 ${muted}`}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                                </div>
                            </div>
                        </div>
                        {abroad && (
                            <p className={`mt-4 rounded-xl px-3 py-2 text-sm ${dark ? 'bg-indigo-900/30 text-indigo-200' : 'bg-indigo-50 text-indigo-800'}`}>
                                Outside India: classes are <b>online</b>, and fees are billed in <b>{info.currency}</b> and paid online by card.
                            </p>
                        )}
                        <label className={`mt-4 flex cursor-pointer items-center gap-3 text-sm ${strong}`}>
                            <input type="checkbox" checked={selfLearner} onChange={e => setSelfLearner(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            I'm the learner myself (adult classes)
                        </label>
                    </section>

                    <section className={`${card} p-5 sm:p-6`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className={`text-lg font-semibold ${strong}`}>Who's learning</h2>
                                <p className={`mt-0.5 text-sm ${muted}`}>{selfLearner ? 'You, and any children who are joining too.' : 'One card for each child.'}</p>
                            </div>
                            <button type="button" onClick={add} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30">
                                <Plus className="h-4 w-4" /> Add {selfLearner || learners.length ? 'a child' : 'learner'}
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            {learners.map((l, i) => {
                                const isSelf = selfLearner && i === 0;
                                return (
                                    <div key={l.key} className={`rounded-xl border p-4 ${dark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50/60'}`}>
                                        <div className="flex items-center justify-between">
                                            <p className={`text-sm font-semibold ${strong}`}>{isSelf ? 'You' : `Child ${selfLearner ? i : i + 1}`}</p>
                                            {learners.length > 1 && !isSelf && (
                                                <button type="button" onClick={() => remove(l.key)} aria-label="Remove learner" className={`rounded-md p-1 ${muted} hover:text-red-600`}><Trash2 className="h-4 w-4" /></button>
                                            )}
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className={label} htmlFor={`l-name-${l.key}`}>{isSelf ? 'Your name' : "Child's name"}</label>
                                                <input id={`l-name-${l.key}`} value={isSelf ? name : l.name} readOnly={isSelf} onChange={e => update(l.key, { name: e.target.value })}
                                                    placeholder="Full name" className={`${input} ${isSelf ? 'opacity-70' : ''}`} />
                                            </div>
                                            <div>
                                                <label className={label} htmlFor={`l-dob-${l.key}`}>Date of birth</label>
                                                <input id={`l-dob-${l.key}`} type="date" value={l.dob} max={new Date().toISOString().slice(0, 10)} onChange={e => update(l.key, { dob: e.target.value })} className={input} />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <p className={label}>Courses <span className="font-normal normal-case tracking-normal">(choose one or more)</span></p>
                                            <div className="flex flex-wrap gap-2">
                                                {courses.length === 0 && <span className={`text-sm ${muted}`}>Loading courses…</span>}
                                                {courses.map(c => (
                                                    <button type="button" key={c.id} onClick={() => toggleCourse(l.key, c.name)} className={chip(l.courses.includes(c.name))} aria-pressed={l.courses.includes(c.name)}>{c.name}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <p className={label}>Where</p>
                                                <div className={`flex rounded-xl border p-1 ${dark ? 'border-gray-600' : 'border-gray-300 bg-white'}`}>
                                                    <button type="button" className={seg(l.mode === 'academy')} onClick={() => update(l.key, { mode: 'academy' })} disabled={abroad}>In person</button>
                                                    <button type="button" className={seg(l.mode === 'online')} onClick={() => update(l.key, { mode: 'online' })}>Online</button>
                                                </div>
                                            </div>
                                            {l.mode === 'academy' && locations.length > 0 && (
                                                <div>
                                                    <label className={label} htmlFor={`l-loc-${l.key}`}>Centre</label>
                                                    <select id={`l-loc-${l.key}`} value={l.location_id} onChange={e => update(l.key, { location_id: e.target.value })} className={input}>
                                                        <option value="">Choose a centre…</option>
                                                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

                    <section className={`${card} p-5 sm:p-6`}>
                        <label className={`flex cursor-pointer items-start gap-3 text-sm ${muted}`}>
                            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <span>I agree to the academy's terms and to be contacted about classes by phone, WhatsApp or email.</span>
                        </label>
                        <button type="submit" disabled={busy}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60">
                            {busy ? 'Creating your account…' : 'Create account'} {!busy && <ArrowRight className="h-5 w-5" />}
                        </button>
                        <p className={`mt-3 text-center text-xs ${muted}`}>Address, photo and other details can be added later in your profile.</p>
                    </section>

                    <p className={`pb-6 text-center text-sm ${muted}`}>Are you a teacher? <Link to="/register/teacher" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">Apply to teach with us</Link></p>
                </form>
            </div>
        </div>
    );
};

export default RegisterFamilyPage;
