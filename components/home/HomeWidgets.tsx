import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Award, Bell, BookOpen, Cake, CalendarClock, CalendarDays, CheckCircle2, ChevronRight, Clock, ClipboardCheck,
    GraduationCap, Layers, MapPin, NotebookPen, Phone, PartyPopper, Sparkles, UserX, Users, Wallet,
} from 'lucide-react';
import Modal from '../Modal';

// Home dashboards for families and teachers (website). Data comes from
// /api/home/summary and /api/teacher/summary; the app shows the same.

export interface ClassSlot {
    date: string; day: string; start_time: string; end_time: string; batch_id: number; batch_name: string;
    course_name: string | null; teacher_name: string | null; mode: string | null; studio: string | null;
    location_name: string | null; cancelled: boolean; when: string;
}
interface Rate { classes: number; attended: number; percentage: number | null }
interface HomeStudent {
    id: number; name: string; courses: string[];
    batches: { id: number; name: string; course_name: string | null; teacher_name: string | null }[];
    next_class: ClassSlot | null; week: ClassSlot[];
    attendance: { month: Rate; last_90_days: Rate; recent: { date: string; status: string; batch_name: string }[] };
    last_note: { date: string; note: string; batch_name: string; status: string | null } | null;
    birthday: { date: string; in_days: number; turns: number } | null;
}
interface Exam { id: number; exam_name: string; course: string | null; exam_date: string; exam_time: string | null; location: string | null }
interface EventItem { id: number; title: string; event_date: string; event_time: string | null; location: string | null }
export interface HomeSummary {
    today: string; now: string; students: HomeStudent[]; exams: Exam[]; events: EventItem[];
    notices: { id: number; title: string; priority: string | null; created_at: string }[]; new_materials: number;
}

// --- small helpers -------------------------------------------------------------

export const clock = (t?: string | null) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const dayChip = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return { day: d.toLocaleDateString('en-IN', { day: 'numeric' }), mon: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase() };
};
const whenLabel = (c: ClassSlot) => (c.when === 'today' ? 'Today' : c.when === 'tomorrow' ? 'Tomorrow' : `${c.day.slice(0, 3)}, ${shortDate(c.date)}`);
const inHow = (c: ClassSlot, today: string, now: string) => {
    if (c.date !== today || !c.start_time) return null;
    const [h, m] = c.start_time.split(':').map(Number), [nh, nm] = now.split(':').map(Number);
    const mins = h * 60 + m - (nh * 60 + nm);
    if (mins <= 0) return 'On now';
    return mins < 60 ? `in ${mins} min` : `in ${Math.floor(mins / 60)} h ${mins % 60 ? `${mins % 60} min` : ''}`.trim();
};
const place = (c: { mode?: string | null; studio?: string | null; location_name?: string | null }) =>
    String(c.mode || '').toLowerCase() === 'online' ? 'Online' : [c.studio, c.location_name].filter(Boolean).join(' · ') || 'At the academy';

const useJson = <T,>(url: string) => {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(() => {
        setError(null);
        return fetch(url, { credentials: 'include' })
            .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || 'Could not load.'); setData(d); })
            .catch(e => setError(e.message));
    }, [url]);
    useEffect(() => { load(); }, [load]);
    return { data, error, load };
};

// --- building blocks ------------------------------------------------------------

export const Card: React.FC<{ title?: string; icon?: React.ElementType; action?: React.ReactNode; className?: string; children: React.ReactNode; tint?: string }> =
    ({ title, icon: Icon, action, className = '', children, tint }) => (
        <section className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
            {title && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        {Icon && <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tint || 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'}`}><Icon className="h-4 w-4" /></span>}
                        {title}
                    </h3>
                    {action}
                </div>
            )}
            {children}
        </section>
    );

export const MoreLink: React.FC<{ to: string; children?: React.ReactNode }> = ({ to, children = 'See all' }) => (
    <Link to={to} className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">{children}<ChevronRight className="h-3.5 w-3.5" /></Link>
);

const Ring: React.FC<{ pct: number | null; size?: number }> = ({ pct, size = 76 }) => {
    const r = (size - 10) / 2, c = 2 * Math.PI * r, v = pct == null ? 0 : pct;
    const color = pct == null ? '#9ca3af' : v >= 85 ? '#10b981' : v >= 70 ? '#f59e0b' : '#ef4444';
    return (
        <svg width={size} height={size} className="shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="8" className="stroke-gray-100 dark:stroke-gray-700" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="8" stroke={color} strokeLinecap="round"
                strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-gray-900 text-base font-bold dark:fill-white">{pct == null ? '—' : `${pct}%`}</text>
        </svg>
    );
};

const Dot: React.FC<{ status: string; title?: string }> = ({ status, title }) => (
    <span title={title} className={`inline-block h-3 w-3 rounded-full ${status === 'present' ? 'bg-emerald-500' : status === 'late' ? 'bg-amber-400' : 'bg-red-500'}`} />
);

export const QuickLinks: React.FC<{ items: { to: string; icon: React.ElementType; label: string; hint?: string; tone: string }[] }> = ({ items }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(it => (
            <Link key={it.to + it.label} to={it.to}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${it.tone}`}><it.icon className="h-5 w-5" /></span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{it.label}</span>
                {it.hint && <span className="-mt-1 text-xs text-gray-500 dark:text-gray-400">{it.hint}</span>}
            </Link>
        ))}
    </div>
);

const ClassRow: React.FC<{ c: ClassSlot; showTeacher?: boolean }> = ({ c, showTeacher = true }) => {
    const chip = dayChip(c.date);
    return (
        <li className={`flex items-center gap-3 rounded-xl px-2 py-2 ${c.cancelled ? 'opacity-60' : ''}`}>
            <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-indigo-50 py-1 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                <span className="text-[10px] font-semibold leading-none">{chip.mon}</span><span className="text-base font-bold leading-tight">{chip.day}</span>
            </span>
            <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium text-gray-900 dark:text-white ${c.cancelled ? 'line-through' : ''}`}>{c.batch_name}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {whenLabel(c)} · {clock(c.start_time)}{c.end_time ? `–${clock(c.end_time)}` : ''}{showTeacher && c.teacher_name ? ` · ${c.teacher_name}` : ''}
                </span>
            </span>
            {c.cancelled && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Cancelled</span>}
        </li>
    );
};

// --- Family -------------------------------------------------------------------

export const useHomeSummary = () => useJson<HomeSummary>('/api/home/summary');

export const FamilyHomeSummary: React.FC<{ summary: HomeSummary | null; error: string | null; reload: () => void; studentId: number | null }> = ({ summary, error, reload, studentId }) => {
    const [history, setHistory] = useState(false);
    if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Could not load: {error} <button type="button" onClick={reload} className="ml-2 font-semibold underline">Retry</button></p>;
    if (!summary) return <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;
    const s = summary.students.find(x => x.id === studentId) || summary.students[0];
    if (!s) return null;
    const next = s.next_class;
    const soon = next ? inHow(next, summary.today, summary.now) : null;
    const month = s.attendance.month.classes ? s.attendance.month : s.attendance.last_90_days;
    const monthLabel = s.attendance.month.classes ? 'this month' : 'last 90 days';
    const first = s.name.split(' ')[0];

    return (
        <div className="space-y-4">
            {s.birthday && (
                <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 p-4 text-white shadow-md">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">{s.birthday.in_days === 0 ? <PartyPopper className="h-6 w-6" /> : <Cake className="h-6 w-6" />}</span>
                    <div>
                        <div className="text-base font-bold">{s.birthday.in_days === 0 ? `Happy birthday, ${first}! 🎉` : `${first}'s birthday is ${s.birthday.in_days === 1 ? 'tomorrow' : `on ${shortDate(s.birthday.date)}`}`}</div>
                        {s.birthday.turns > 0 && <div className="text-sm text-white/90">Turning {s.birthday.turns} — from all of us at Nadanaloga</div>}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Next class */}
                <Link to="courses" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-5 text-white shadow-md transition hover:shadow-lg">
                    <Sparkles className="absolute -right-3 -top-3 h-24 w-24 text-white/10" />
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-100"><CalendarClock className="h-4 w-4" /> {first}'s next class</div>
                    {next ? (
                        <>
                            <div className="mt-2 text-2xl font-bold">{whenLabel(next)} · {clock(next.start_time)}</div>
                            {soon && <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{soon}</span>}
                            <div className="mt-3 text-sm font-medium">{next.batch_name}</div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-indigo-100">
                                {next.teacher_name && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{next.teacher_name}</span>}
                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{place(next)}</span>
                                {next.end_time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />till {clock(next.end_time)}</span>}
                            </div>
                        </>
                    ) : (
                        <div className="mt-3 text-sm text-indigo-100">{s.batches.length ? 'No classes in the next 7 days.' : 'Not in a batch yet — the academy will share timings soon.'}</div>
                    )}
                </Link>

                {/* Attendance */}
                <button type="button" onClick={() => setHistory(true)} className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"><ClipboardCheck className="h-4 w-4 text-emerald-500" /> Attendance · {monthLabel}</div>
                    <div className="mt-3 flex items-center gap-4">
                        <Ring pct={month.percentage} />
                        <div className="min-w-0">
                            <div className="text-sm text-gray-700 dark:text-gray-200">{month.classes ? <>Attended <b>{month.attended}</b> of <b>{month.classes}</b> classes</> : 'No classes marked yet'}</div>
                            {s.attendance.recent.length > 0 && (
                                <div className="mt-2 flex items-center gap-1.5">{[...s.attendance.recent].reverse().map((r, i) => <Dot key={i} status={r.status} title={`${shortDate(r.date)}: ${r.status}`} />)}</div>
                            )}
                            <div className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">See history →</div>
                        </div>
                    </div>
                </button>

                {/* Last class note */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"><NotebookPen className="h-4 w-4 text-amber-500" /> What was taught</div>
                    {s.last_note ? (
                        <>
                            <div className="mt-2 text-xs text-gray-500">{shortDate(s.last_note.date)} · {s.last_note.batch_name}</div>
                            <p className="mt-1 line-clamp-4 text-sm text-gray-800 dark:text-gray-100">{s.last_note.note}</p>
                            {s.last_note.status === 'absent' && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300"><UserX className="h-3.5 w-3.5" />{first} missed this class — practise at home</span>}
                        </>
                    ) : <p className="mt-3 text-sm text-gray-500">The teacher's notes from class will show here.</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card title="This week" icon={CalendarDays} className="lg:col-span-1" action={<MoreLink to="courses">Timetable</MoreLink>}>
                    {s.week.length === 0 ? <p className="py-4 text-center text-sm text-gray-500">No classes in the next 7 days.</p>
                        : <ul className="space-y-1">{s.week.slice(0, 6).map((c, i) => <ClassRow key={i} c={c} />)}</ul>}
                </Card>
                <Card title="Coming up" icon={Award} tint="bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" className="lg:col-span-2">
                    {summary.exams.length + summary.events.length === 0 && <p className="py-4 text-center text-sm text-gray-500">No exams or events in the coming weeks.</p>}
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {summary.exams.map(e => (
                            <li key={`x${e.id}`}><Link to="grade-exams" className="flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3 hover:bg-purple-50 dark:border-purple-900/50 dark:bg-purple-900/10">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200"><GraduationCap className="h-5 w-5" /></span>
                                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{e.exam_name}</span>
                                    <span className="block truncate text-xs text-gray-500">Exam · {shortDate(e.exam_date)}{e.exam_time ? ` · ${clock(String(e.exam_time).slice(0, 5))}` : ''}{e.location ? ` · ${e.location}` : ''}</span></span>
                            </Link></li>
                        ))}
                        {summary.events.map(e => (
                            <li key={`e${e.id}`}><Link to="events" className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 hover:bg-sky-50 dark:border-sky-900/50 dark:bg-sky-900/10">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200"><PartyPopper className="h-5 w-5" /></span>
                                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{e.title}</span>
                                    <span className="block truncate text-xs text-gray-500">Event · {shortDate(e.event_date)}{e.event_time ? ` · ${clock(String(e.event_time).slice(0, 5))}` : ''}{e.location ? ` · ${e.location}` : ''}</span></span>
                            </Link></li>
                        ))}
                    </ul>
                    {summary.notices.length > 0 && (
                        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                            <div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"><Bell className="h-3.5 w-3.5" /> Notices</span><MoreLink to="notices" /></div>
                            <ul className="space-y-1">{summary.notices.map(n => (
                                <li key={n.id}><Link to="notices" className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <span className="truncate text-gray-800 dark:text-gray-100">{String(n.priority || '').toLowerCase() === 'high' && <span className="mr-1 rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700">IMPORTANT</span>}{n.title}</span>
                                    <span className="shrink-0 text-xs text-gray-400">{shortDate(String(n.created_at).slice(0, 10))}</span>
                                </Link></li>
                            ))}</ul>
                        </div>
                    )}
                </Card>
            </div>

            {history && <AttendanceHistory student={s} onClose={() => setHistory(false)} />}
        </div>
    );
};

const AttendanceHistory: React.FC<{ student: HomeStudent; onClose: () => void }> = ({ student, onClose }) => {
    const { data } = useJson<{ summary: { classes: number; present: number; absent: number; late: number; percentage: number | null }; records: { session_date: string; session_status: string; status: string | null; batch_name: string; class_note: string | null; cancel_reason: string | null }[] }>(`/api/attendance/student/${student.id}`);
    return (
        <Modal isOpen onClose={onClose} size="2xl">
            <div className="max-h-[85vh] overflow-y-auto bg-white p-5 dark:bg-gray-800">
                <div className="mb-4 flex items-start justify-between">
                    <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{student.name} · attendance</h3><p className="text-sm text-gray-500">Last 90 days</p></div>
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:text-gray-200">Close</button>
                </div>
                {!data ? <p className="py-6 text-center text-gray-500">Loading…</p> : (
                    <>
                        <div className="mb-4 grid grid-cols-4 gap-2 text-center">
                            {[['Attended', data.summary.percentage == null ? '—' : `${data.summary.percentage}%`, 'text-indigo-700'], ['Present', data.summary.present, 'text-emerald-700'], ['Late', data.summary.late, 'text-amber-700'], ['Absent', data.summary.absent, 'text-red-700']].map(([l, v, c]) => (
                                <div key={l as string} className="rounded-xl bg-gray-50 p-2 dark:bg-gray-700/50"><div className={`text-lg font-bold ${c}`}>{v}</div><div className="text-xs text-gray-500">{l}</div></div>
                            ))}
                        </div>
                        {data.records.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No classes recorded yet.</p>}
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                            {data.records.map((r, i) => (
                                <li key={i} className="flex items-start gap-3 py-2 text-sm">
                                    <span className="w-16 shrink-0 text-gray-500">{shortDate(r.session_date)}</span>
                                    <span className="min-w-0 flex-1"><span className="text-gray-900 dark:text-white">{r.batch_name}</span>{r.class_note && <span className="block text-xs text-gray-500">{r.class_note}</span>}</span>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${r.session_status === 'cancelled' ? 'bg-amber-100 text-amber-800' : r.status === 'present' ? 'bg-emerald-100 text-emerald-700' : r.status === 'late' ? 'bg-amber-100 text-amber-800' : r.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {r.session_status === 'cancelled' ? 'Cancelled' : r.status || 'Not marked'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </Modal>
    );
};

export const familyQuickLinks = (s: HomeSummary | null) => [
    { to: 'payment-history', icon: Wallet, label: 'Fees', hint: 'Bills & receipts', tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { to: 'courses', icon: Layers, label: 'Classes', hint: 'Courses & timings', tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' },
    { to: 'grade-exams', icon: GraduationCap, label: 'Grade exams', hint: s?.exams.length ? `${s.exams.length} coming up` : 'Results & dates', tone: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300' },
    { to: 'book-materials', icon: BookOpen, label: 'Materials', hint: s?.new_materials ? `${s.new_materials} new` : 'Books & notes', tone: 'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300' },
    { to: 'events', icon: PartyPopper, label: 'Events', hint: s?.events.length ? `${s.events.length} coming up` : 'Shows & workshops', tone: 'bg-pink-50 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300' },
    { to: 'notices', icon: Bell, label: 'Notices', hint: s?.notices.length ? `${s.notices.length} recent` : 'From the academy', tone: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' },
];

// --- Teacher ------------------------------------------------------------------

interface TeacherClass { batch_id: number; batch_name: string; course_name: string | null; start_time: string; end_time: string; students: number; studio: string | null; location_name: string | null; mode: string | null; state: 'upcoming' | 'running' | 'not_marked' | 'marked' | 'cancelled' }
export interface TeacherSummary {
    today: string; now: string; counts: { batches: number; students: number; classes_this_week: number };
    today_classes: TeacherClass[]; next_class: (TeacherClass & Partial<ClassSlot>) | null;
    unmarked: { batch_id: number; batch_name: string; course_name: string | null; date: string; start_time: string }[];
    week: ClassSlot[];
    attendance: { classes: number; percentage: number | null; low: { student_id: number; name: string; user_id: string | null; phone: string | null; parent_name: string | null; batch_name: string; classes: number; attended: number; percentage: number; missed_in_a_row: number }[] };
    birthdays: { student_id: number; name: string; date: string; in_days: number; turns: number }[];
    exams: Exam[]; events: EventItem[];
    batches: { id: number; name: string; course_name: string | null; students: number; slots: { day: string; start_time: string; end_time: string }[] }[];
}

export const useTeacherSummary = () => useJson<TeacherSummary>('/api/teacher/summary');

const stateChip: Record<TeacherClass['state'], [string, string]> = {
    upcoming: ['Upcoming', 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'],
    running: ['In class', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200'],
    not_marked: ['Not marked', 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200'],
    marked: ['Marked', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200'],
    cancelled: ['Cancelled', 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'],
};

const Kpi: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; to?: string; onClick?: () => void; tone: string }> = ({ icon: Icon, label, value, to, onClick, tone }) => {
    const inner = (
        <>
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            <span><span className="block text-2xl font-bold text-gray-900 dark:text-white">{value}</span><span className="block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span></span>
        </>
    );
    const cls = 'flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800';
    return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
};

export const TeacherHome: React.FC<{ name: string; attendancePath: string; batchesPath: string; studentsPath: string }> = ({ name, attendancePath, batchesPath, studentsPath }) => {
    const { data, error, load } = useTeacherSummary();
    const [showLow, setShowLow] = useState(false);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Could not load: {error} <button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button></p>;
    if (!data) return <div className="space-y-4"><div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" /><div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" /></div>;
    const toMark = (batchId: number, date: string) => `${attendancePath}?batch=${batchId}&date=${date}`;
    const next = data.next_class;

    return (
        <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 p-6 text-white shadow-md">
                <Sparkles className="absolute -right-4 -top-4 h-32 w-32 text-white/10" />
                <p className="text-sm text-white/80">{new Date(`${data.today}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{greeting}, {name}</h1>
                <p className="mt-2 text-sm text-white/90">
                    {data.today_classes.length ? `${data.today_classes.length} class${data.today_classes.length === 1 ? '' : 'es'} today` : 'No classes today'}
                    {next && next.start_time ? ` · next: ${next.batch_name} at ${clock(next.start_time)}${next.date && next.date !== data.today ? ` (${whenLabel(next as ClassSlot)})` : ''}` : ''}
                </p>
                {data.unmarked.length > 0 && (
                    <Link to={toMark(data.unmarked[0].batch_id, data.unmarked[0].date)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow hover:bg-emerald-50">
                        <ClipboardCheck className="h-4 w-4" /> Mark attendance ({data.unmarked.length} pending)
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi icon={Layers} label="My batches" value={data.counts.batches} to={batchesPath} tone="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300" />
                <Kpi icon={Users} label="My students" value={data.counts.students} to={studentsPath} tone="bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300" />
                <Kpi icon={CalendarDays} label="Classes this week" value={data.counts.classes_this_week} to={attendancePath} tone="bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" />
                <Kpi icon={ClipboardCheck} label="Attendance · 30 days" value={data.attendance.percentage == null ? '—' : `${data.attendance.percentage}%`} onClick={() => setShowLow(true)} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card title="Today" icon={Clock} className="lg:col-span-2" action={<MoreLink to={attendancePath}>Attendance</MoreLink>}>
                    {data.today_classes.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">No classes today.{next && next.start_time ? ` Next: ${next.batch_name}, ${whenLabel(next as ClassSlot)} ${clock(next.start_time)}.` : ''}</p>
                    ) : (
                        <ul className="space-y-2">
                            {data.today_classes.map(c => (
                                <li key={`${c.batch_id}:${c.start_time}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-700">
                                    <span className="w-20 shrink-0 text-sm font-bold text-gray-900 dark:text-white">{clock(c.start_time)}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{c.batch_name}</span>
                                        <span className="block truncate text-xs text-gray-500">{[c.course_name, `${c.students} students`, place(c)].filter(Boolean).join(' · ')}</span>
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stateChip[c.state][1]}`}>{stateChip[c.state][0]}</span>
                                    {(c.state === 'running' || c.state === 'not_marked') && (
                                        <Link to={toMark(c.batch_id, data.today)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Mark attendance</Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="To mark" icon={ClipboardCheck} tint="bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                    {data.unmarked.length === 0 ? (
                        <p className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-600"><CheckCircle2 className="h-5 w-5" /> All attendance marked</p>
                    ) : (
                        <ul className="space-y-1">
                            {data.unmarked.slice(0, 8).map(u => (
                                <li key={`${u.batch_id}:${u.date}:${u.start_time}`}>
                                    <Link to={toMark(u.batch_id, u.date)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <span className="min-w-0"><span className="block truncate font-medium text-gray-900 dark:text-white">{u.batch_name}</span><span className="block text-xs text-gray-500">{shortDate(u.date)} · {clock(u.start_time)}</span></span>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card title="Missing classes" icon={UserX} tint="bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" action={data.attendance.low.length > 0 ? <button type="button" onClick={() => setShowLow(true)} className="text-xs font-semibold text-indigo-600">See all</button> : undefined}>
                    {data.attendance.low.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">Everyone is attending well.</p> : (
                        <ul className="space-y-2">{data.attendance.low.slice(0, 5).map(l => (
                            <li key={`${l.student_id}:${l.batch_name}`} className="flex items-center justify-between gap-2 text-sm">
                                <span className="min-w-0"><span className="block truncate font-medium text-gray-900 dark:text-white">{l.name}</span><span className="block truncate text-xs text-gray-500">{l.batch_name} · {l.attended}/{l.classes}{l.missed_in_a_row >= 3 ? ` · missed ${l.missed_in_a_row} in a row` : ''}</span></span>
                                <span className={`shrink-0 font-bold ${l.percentage < 50 ? 'text-red-600' : 'text-amber-600'}`}>{l.percentage}%</span>
                            </li>
                        ))}</ul>
                    )}
                </Card>
                <Card title="This week" icon={CalendarDays}>
                    {data.week.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">No more classes this week.</p>
                        : <ul className="space-y-1">{data.week.slice(0, 6).map((c, i) => <ClassRow key={i} c={c} showTeacher={false} />)}</ul>}
                </Card>
                <Card title="Coming up" icon={Award} tint="bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">
                    {data.birthdays.length + data.exams.length + data.events.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Nothing in the coming weeks.</p>}
                    <ul className="space-y-2 text-sm">
                        {data.birthdays.map(b => <li key={`b${b.student_id}`} className="flex items-center gap-2"><Cake className="h-4 w-4 shrink-0 text-pink-500" /><span className="truncate"><b>{b.name}</b> · {b.in_days === 0 ? 'birthday today 🎉' : `birthday ${shortDate(b.date)}`}{b.turns > 0 ? ` (${b.turns})` : ''}</span></li>)}
                        {data.exams.map(e => <li key={`x${e.id}`} className="flex items-center gap-2"><GraduationCap className="h-4 w-4 shrink-0 text-purple-500" /><span className="truncate"><b>{e.exam_name}</b> · {shortDate(e.exam_date)}</span></li>)}
                        {data.events.map(e => <li key={`e${e.id}`} className="flex items-center gap-2"><PartyPopper className="h-4 w-4 shrink-0 text-sky-500" /><span className="truncate"><b>{e.title}</b> · {shortDate(e.event_date)}</span></li>)}
                    </ul>
                </Card>
            </div>

            <Card title="My batches" icon={Layers} action={<MoreLink to={batchesPath} />}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.batches.map(b => (
                        <Link key={b.id} to={batchesPath} className="rounded-xl border border-gray-100 p-3 hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-gray-700 dark:hover:bg-gray-700/40">
                            <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{b.name}</span><span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">{b.students} students</span></div>
                            <div className="mt-1 text-xs text-gray-500">{b.course_name}</div>
                            <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{b.slots.map(s => `${s.day.slice(0, 3)} ${clock(s.start_time)}`).join(' · ') || 'Timings not set'}</div>
                        </Link>
                    ))}
                </div>
            </Card>

            {showLow && (
                <Modal isOpen onClose={() => setShowLow(false)} size="3xl">
                    <div className="max-h-[85vh] overflow-y-auto bg-white p-5 dark:bg-gray-800">
                        <div className="mb-4 flex items-start justify-between"><div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Students missing classes</h3><p className="text-sm text-gray-500">Last 30 days · below 75% or missed 3 in a row · your batches</p></div>
                            <button type="button" onClick={() => setShowLow(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:text-gray-200">Close</button></div>
                        {data.attendance.low.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">Everyone is attending well.</p> : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">{data.attendance.low.map(l => (
                                <li key={`${l.student_id}:${l.batch_name}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                    <span className="min-w-0"><span className="block font-medium text-gray-900 dark:text-white">{l.name}</span><span className="block text-xs text-gray-500">{[l.batch_name, l.parent_name && `Parent: ${l.parent_name}`].filter(Boolean).join(' · ')}</span></span>
                                    <span className="flex items-center gap-3">
                                        <span className={`font-bold ${l.percentage < 50 ? 'text-red-600' : 'text-amber-600'}`}>{l.percentage}% <span className="text-xs font-normal text-gray-500">({l.attended}/{l.classes})</span></span>
                                        {l.phone && <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-indigo-600 dark:border-gray-600"><Phone className="h-3.5 w-3.5" />Call</a>}
                                    </span>
                                </li>
                            ))}</ul>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};
