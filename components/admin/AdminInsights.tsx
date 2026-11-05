import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AlertTriangle, BookOpen, CalendarCheck, CalendarX, Cake, ChevronRight, ClipboardList, GraduationCap,
    IndianRupee, Layers, MessageSquare, Receipt, RefreshCw, UserPlus, Users, UserX, Image as ImageIcon,
} from 'lucide-react';
import Modal from '../Modal';
import { placeStudent } from '../../services/batchAdminApi';

// Admin dashboard: today's classes, money, and what needs attention. One
// call (/api/admin/insights); every tile opens its details (a list here, or
// the page that handles it).

interface Person { student_id: number; name: string; user_id: string | null; phone: string | null; parent_name: string | null }
interface LowAttendance extends Person {
    batch_id: number; batch_name: string; course_name: string; teacher_name: string | null;
    classes: number; attended: number; absent: number; percentage: number; missed_in_a_row: number; last_attended: string | null;
}
interface Owing extends Person { amount: number; overdue_amount: number; bills: number; verifying: number }
interface NotInBatch extends Person { course_id: number | null; course_name: string | null; grade_name: string | null; batches?: { id: number; name: string }[] }
interface ClassRow { batch_id: number; batch_name: string; course_name: string | null; teacher_name: string | null; start_time: string; end_time: string; students: number }
interface TodayClass extends ClassRow { state: 'upcoming' | 'running' | 'not_marked' | 'marked' | 'cancelled' }
interface UnmarkedClass extends ClassRow { date: string }
interface Joiner extends Person { joined: string; fee_set: boolean; in_batch: boolean }
interface Leaver extends Person { state: string; changed: string }
interface Birthday extends Person { date: string; turns: number; in_days: number }
interface Demo { id: number; student_name: string; parent_name: string | null; phone: string | null; course: string | null; asked: string; preferred_date: string | null; stale: boolean }
interface Capacity { batch_id: number; batch_name: string; course_name: string | null; teacher_name: string | null; students: number; max_students: number | null; state: 'over' | 'full' | 'empty' | 'small' }
interface ExtraBill { id: number; title: string; category: string; mode: string; due_date: string | null; bills: number; paid: number; paid_amount: number; due_amount: number }
export interface Insights {
    counts: { students: number; batches: number; batches_with_students: number };
    attendance: { days: number; threshold: number; count: number; students: LowAttendance[] };
    fees: {
        period: string; billed: number; collected: number; due: number; due_students: number; overdue: number; overdue_students: number;
        verifying: number; verifying_bills: number; older_due: number; older_bills: number; students: Owing[];
    };
    not_in_batch: { count: number; students_count: number; students: NotInBatch[] };
    unmarked: { count: number; classes: UnmarkedClass[] };
    today: { date: string; weekday: string; now: string; classes: TodayClass[] };
    joiners: { month: string; count: number; fee_not_set: number; students: Joiner[]; leavers: Leaver[] };
    birthdays: { count: number; students: Birthday[] };
    demos: { pending: number; stale: number; bookings: Demo[] };
    capacity: { count: number; batches: Capacity[] };
    trend: { period: string; billed: number; collected: number }[];
    extra_bills: ExtraBill[];
}

const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const short = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : rupees(n));
const showDate = (v?: string | null) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
const dayLabel = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const clock = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const sub = (p: Person) => [p.user_id, p.parent_name && `Parent: ${p.parent_name}`].filter(Boolean).join(' · ');

export const fetchInsights = async (days = 30): Promise<Insights> => {
    const r = await fetch(`/api/admin/insights?days=${days}`, { credentials: 'include' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Could not load.');
    return d;
};

const Phone: React.FC<{ phone: string | null }> = ({ phone }) =>
    phone ? <a href={`tel:${phone}`} className="text-indigo-600 hover:underline dark:text-indigo-400">{phone}</a> : <span className="text-gray-400">—</span>;

const Search: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search name, ID, parent, phone"
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm sm:w-64 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
);
const matches = (p: Partial<Person>, q: string) => !q.trim()
    || `${p.name || ''} ${p.user_id || ''} ${p.parent_name || ''} ${p.phone || ''}`.toLowerCase().includes(q.trim().toLowerCase());

const Pills = <T extends string>({ value, options, onChange }: { value: T; options: [NoInfer<T>, string][]; onChange: (v: NoInfer<T>) => void }) => (
    <div className="flex flex-wrap gap-1.5">
        {options.map(([k, label]) => (
            <button key={k} type="button" onClick={() => onChange(k)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${value === k ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>{label}</button>
        ))}
    </div>
);

const Sheet: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => (
    <Modal isOpen onClose={onClose} size="4xl">
        <div className="bg-white p-5 dark:bg-gray-800">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
                </div>
                <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:text-gray-200">Close</button>
            </div>
            {children}
        </div>
    </Modal>
);

const Table: React.FC<{ head: string[]; empty: string; children: React.ReactNode; count: number }> = ({ head, empty, children, count }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-500"><tr>{head.map(h => <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 text-gray-800 dark:divide-gray-700 dark:text-gray-200">
                {count === 0 ? <tr><td colSpan={head.length} className="px-2 py-8 text-center text-gray-500">{empty}</td></tr> : children}
            </tbody>
        </table>
    </div>
);

const Who: React.FC<{ p: Person }> = ({ p }) => (
    <><div className="font-medium text-gray-900 dark:text-white">{p.name}</div><div className="text-xs text-gray-500">{sub(p)}</div></>
);

// --- Tiles -------------------------------------------------------------------

type Tone = 'neutral' | 'good' | 'warn' | 'bad';
const toneStyle: Record<Tone, { icon: string; value: string }> = {
    neutral: { icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300', value: 'text-gray-900 dark:text-white' },
    good: { icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300', value: 'text-gray-900 dark:text-white' },
    warn: { icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300', value: 'text-amber-700 dark:text-amber-300' },
    bad: { icon: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300', value: 'text-red-700 dark:text-red-300' },
};

const Tile: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone; onClick: () => void }> =
    ({ icon: Icon, label, value, hint, tone = 'neutral', onClick }) => (
        <button type="button" onClick={onClick}
            className="group flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-700">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyle[tone].icon}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
                <span className={`mt-0.5 block text-2xl font-bold leading-tight ${toneStyle[tone].value}`}>{value}</span>
                {hint && <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
        </button>
    );

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, action, children, className = '' }) => (
    <section className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
            {action}
        </div>
        {children}
    </section>
);

// --- The dashboard -------------------------------------------------------------

type Open = 'fees' | 'attendance' | 'batch' | 'unmarked' | 'joiners' | 'birthdays' | 'demos' | 'capacity' | 'extra' | null;

export const AdminDashboardView: React.FC<{ teacherCount?: number; courseCount?: number }> = ({ teacherCount, courseCount }) => {
    const navigate = useNavigate();
    const [data, setData] = useState<Insights | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState<Open>(null);
    const load = useCallback(() => {
        setLoading(true);
        return fetchInsights().then(d => { setData(d); setError(null); }).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    if (error && !data) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Could not load the dashboard: {error} <button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button></p>;
    if (!data) return <p className="py-12 text-center text-gray-500">Loading dashboard…</p>;

    const f = data.fees;
    const collectedPct = f.billed ? Math.round((f.collected / f.billed) * 100) : 0;
    const todayDone = data.today.classes.filter(c => c.state === 'marked').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(`${data.today.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{greeting}</h1>
                </div>
                <button type="button" onClick={load} disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
                <Tile icon={GraduationCap} label="Students" value={data.counts.students} hint="Active" onClick={() => navigate('/admin/students')} />
                <Tile icon={Users} label="Teachers" value={teacherCount ?? '—'} hint="Teaching staff" onClick={() => navigate('/admin/teachers')} />
                <Tile icon={Layers} label="Batches" value={data.counts.batches_with_students} hint={`${data.counts.batches} in all`} onClick={() => navigate('/admin/batches')} />
                <Tile icon={BookOpen} label="Courses" value={courseCount ?? '—'} hint="Add or edit" onClick={() => navigate('/admin/courses')} />
                <Tile icon={IndianRupee} label="Collected" value={short(f.collected)} hint={`${f.period.split(' ')[0].slice(0, 3)} · ${collectedPct}% of ${short(f.billed)}`} tone="good" onClick={() => setOpen('fees')} />
                <Tile icon={Receipt} label="To collect" value={short(f.due)} hint={`${f.due_students} students`} tone={f.overdue > 0 ? 'bad' : f.due > 0 ? 'warn' : 'good'} onClick={() => setOpen('fees')} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                {/* Today */}
                <Panel className="lg:col-span-3" title={`Today · ${data.today.weekday}`}
                    action={<span className="text-xs text-gray-500">{data.today.classes.length} classes · {todayDone} marked</span>}>
                    {data.today.classes.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No classes today.</p>}
                    <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                        {data.today.classes.map(c => {
                            const chip = {
                                upcoming: ['Upcoming', 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'],
                                running: ['On now', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200'],
                                not_marked: ['Not marked', 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200'],
                                marked: ['Marked', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200'],
                                cancelled: ['Cancelled', 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200'],
                            }[c.state];
                            return (
                                <li key={`${c.batch_id}:${c.start_time}`}>
                                    <button type="button" onClick={() => navigate(c.state === 'not_marked' || c.state === 'running' ? `/admin/attendance?date=${data.today.date}` : `/admin/batches/${c.batch_id}`)}
                                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <span className="w-20 shrink-0 text-sm font-semibold text-gray-900 dark:text-white">{clock(c.start_time)}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{c.batch_name}</span>
                                            <span className="block truncate text-xs text-gray-500">{[c.course_name, c.teacher_name, `${c.students} students`].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${chip[1]}`}>{chip[0]}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>

                {/* Fees trend */}
                <Panel className="lg:col-span-2" title="Monthly fees" action={<button type="button" onClick={() => setOpen('fees')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Details →</button>}>
                    <button type="button" onClick={() => setOpen('fees')} className="block w-full text-left">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{collectedPct}%</span>
                            <span className="text-xs text-gray-500">collected for {f.period}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${collectedPct}%` }} /></div>
                        <TrendChart trend={data.trend} />
                    </button>
                </Panel>
            </div>

            {/* Needs attention */}
            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Needs attention</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Tile icon={AlertTriangle} label="Overdue fees" value={rupees(f.overdue)} hint={f.overdue ? `${f.overdue_students} students past the due date` : 'Nothing overdue'} tone={f.overdue ? 'bad' : 'good'} onClick={() => setOpen('fees')} />
                    <Tile icon={ImageIcon} label="Screenshots to check" value={f.verifying_bills} hint={f.verifying_bills ? `${rupees(f.verifying)} waiting for approval` : 'All checked'} tone={f.verifying_bills ? 'warn' : 'good'} onClick={() => navigate('/admin/fees')} />
                    <Tile icon={CalendarX} label="Attendance not marked" value={data.unmarked.count} hint="Classes in the last 7 days" tone={data.unmarked.count ? 'bad' : 'good'} onClick={() => setOpen('unmarked')} />
                    <Tile icon={ClipboardList} label="Low attendance" value={data.attendance.count} hint={`Below ${data.attendance.threshold}% · last ${data.attendance.days} days`} tone={data.attendance.count ? 'warn' : 'good'} onClick={() => setOpen('attendance')} />
                    <Tile icon={UserX} label="Not in a batch" value={data.not_in_batch.students_count} hint="Taking a course, no batch" tone={data.not_in_batch.students_count ? 'warn' : 'good'} onClick={() => setOpen('batch')} />
                    <Tile icon={UserPlus} label={`New in ${data.joiners.month.split(' ')[0]}`} value={data.joiners.count} hint={data.joiners.fee_not_set ? `${data.joiners.fee_not_set} without a fee set` : `${data.joiners.leavers.length} left this month`} tone={data.joiners.fee_not_set ? 'warn' : 'neutral'} onClick={() => setOpen('joiners')} />
                    <Tile icon={MessageSquare} label="Demo enquiries" value={data.demos.pending} hint={data.demos.stale ? `${data.demos.stale} waiting over 2 days` : 'Pending'} tone={data.demos.stale ? 'warn' : 'neutral'} onClick={() => setOpen('demos')} />
                    <Tile icon={Layers} label="Batch sizes" value={data.capacity.count} hint="Full, over the limit or nearly empty" tone={data.capacity.batches.some(b => b.state === 'over') ? 'bad' : data.capacity.count ? 'warn' : 'good'} onClick={() => setOpen('capacity')} />
                    <Tile icon={Cake} label="Birthdays this week" value={data.birthdays.count} hint={data.birthdays.students[0] ? `${data.birthdays.students[0].name} · ${data.birthdays.students[0].in_days === 0 ? 'today' : showDate(data.birthdays.students[0].date)}` : 'None this week'} onClick={() => setOpen('birthdays')} />
                    <Tile icon={Receipt} label="Extra bills open" value={data.extra_bills.length} hint={data.extra_bills.length ? `${rupees(data.extra_bills.reduce((t, b) => t + b.due_amount, 0))} still unpaid` : 'None open'} onClick={() => setOpen('extra')} />
                    <Tile icon={CalendarCheck} label="Today's classes" value={data.today.classes.length} hint={`${todayDone} marked so far`} onClick={() => navigate(`/admin/attendance?date=${data.today.date}`)} />
                </div>
            </div>

            {open === 'fees' && <FeesSheet data={data} onClose={() => setOpen(null)} />}
            {open === 'attendance' && <AttendanceSheet initial={data} onClose={() => setOpen(null)} />}
            {open === 'batch' && (
                <Sheet title="Not in a batch" subtitle="Students taking a course with no batch for it. Add each to a batch of that course." onClose={() => setOpen(null)}>
                    <NotInBatchList rows={data.not_in_batch.students} onChanged={load} />
                </Sheet>
            )}
            {open === 'unmarked' && <UnmarkedSheet data={data} onClose={() => setOpen(null)} />}
            {open === 'joiners' && <JoinersSheet data={data} onClose={() => setOpen(null)} />}
            {open === 'birthdays' && <BirthdaysSheet data={data} onClose={() => setOpen(null)} />}
            {open === 'demos' && <DemosSheet data={data} onClose={() => setOpen(null)} />}
            {open === 'capacity' && <CapacitySheet data={data} onClose={() => setOpen(null)} />}
            {open === 'extra' && <ExtraBillsSheet data={data} onClose={() => setOpen(null)} />}
        </div>
    );
};

const TrendChart: React.FC<{ trend: Insights['trend'] }> = ({ trend }) => {
    const max = Math.max(1, ...trend.map(t => t.billed));
    return (
        <div className="mt-4">
            <div className="flex h-32 items-end gap-2">
                {trend.map(t => (
                    <div key={t.period} className="flex h-full flex-1 flex-col justify-end" title={`${t.period}: billed ${rupees(t.billed)}, collected ${rupees(t.collected)}`}>
                        <div className="relative w-full rounded-t-md bg-gray-200 dark:bg-gray-700" style={{ height: `${(t.billed / max) * 100}%`, minHeight: t.billed ? 4 : 0 }}>
                            <div className="absolute bottom-0 w-full rounded-t-md bg-emerald-500" style={{ height: t.billed ? `${(t.collected / t.billed) * 100}%` : 0 }} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-1 flex gap-2">{trend.map(t => <span key={t.period} className="flex-1 text-center text-[11px] text-gray-500">{t.period.slice(0, 3)}</span>)}</div>
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Collected</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gray-300 dark:bg-gray-600" /> Billed</span>
            </div>
        </div>
    );
};

// --- Detail sheets ---------------------------------------------------------------

const FeesSheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => {
    const [q, setQ] = useState('');
    const [only, setOnly] = useState<'all' | 'overdue' | 'verifying'>('all');
    const f = data.fees;
    const rows = f.students.filter(r => matches(r, q) && (only === 'all' || (only === 'overdue' ? r.overdue_amount > 0 : r.verifying > 0)));
    const total = rows.reduce((t, r) => t + r.amount, 0);
    return (
        <Sheet title="Fees" subtitle={`${f.period}: ${rupees(f.collected)} collected of ${rupees(f.billed)} · all unpaid bills below (this month, older months and extra bills)`} onClose={onClose}>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[['Billed', f.billed], ['Collected', f.collected], ['Still due', f.due], ['Overdue', f.overdue]].map(([l, v]) => (
                    <div key={l as string} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50"><div className="text-xs text-gray-500">{l}</div><div className="text-lg font-bold text-gray-900 dark:text-white">{rupees(v as number)}</div></div>
                ))}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pills value={only} onChange={setOnly} options={[['all', `All ${f.students.length}`], ['overdue', 'Overdue'], ['verifying', 'Screenshot to check']]} />
                <div className="ml-auto flex items-center gap-2"><Search value={q} onChange={setQ} />
                    <Link to="/admin/fees" className="whitespace-nowrap rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white">Open Fees</Link></div>
            </div>
            <p className="mb-2 text-xs text-gray-500">{rows.length} students · {rupees(total)}</p>
            <Table head={['Student', 'Phone', 'Bills', 'Due', 'Overdue', 'Being verified']} empty="Nothing to show." count={rows.length}>
                {rows.map(r => (
                    <tr key={r.student_id}>
                        <td className="px-2 py-2"><Who p={r} /></td>
                        <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                        <td className="px-2 py-2">{r.bills}</td>
                        <td className="px-2 py-2 font-semibold">{rupees(r.amount)}</td>
                        <td className={`px-2 py-2 ${r.overdue_amount > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}`}>{r.overdue_amount > 0 ? rupees(r.overdue_amount) : '—'}</td>
                        <td className={`px-2 py-2 ${r.verifying > 0 ? 'text-sky-700 dark:text-sky-300' : 'text-gray-400'}`}>{r.verifying > 0 ? rupees(r.verifying) : '—'}</td>
                    </tr>
                ))}
            </Table>
        </Sheet>
    );
};

const AttendanceSheet: React.FC<{ initial: Insights; onClose: () => void }> = ({ initial, onClose }) => {
    const [days, setDays] = useState<'30' | '60' | '90'>(String(initial.attendance.days) as '30');
    const [att, setAtt] = useState(initial.attendance);
    const [busy, setBusy] = useState(false);
    const [q, setQ] = useState('');
    useEffect(() => {
        if (Number(days) === initial.attendance.days) { setAtt(initial.attendance); return; }
        setBusy(true);
        fetchInsights(Number(days)).then(d => setAtt(d.attendance)).finally(() => setBusy(false));
    }, [days, initial]);
    const rows = att.students.filter(r => matches(r, q));
    return (
        <Sheet title="Low attendance" subtitle={`Below ${att.threshold}% or missed the last 3 classes in a row · only classes where attendance was marked`} onClose={onClose}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pills value={days} onChange={setDays} options={[['30', 'Last 30 days'], ['60', 'Last 60 days'], ['90', 'Last 90 days']]} />
                {busy && <span className="text-sm text-gray-500">Loading…</span>}
                <div className="ml-auto"><Search value={q} onChange={setQ} /></div>
            </div>
            <Table head={['Student', 'Batch', 'Attended', 'Missed in a row', 'Last attended', 'Phone']} empty={`No one below ${att.threshold}% in the last ${att.days} days.`} count={rows.length}>
                {rows.map(r => (
                    <tr key={`${r.student_id}:${r.batch_id}`}>
                        <td className="px-2 py-2"><Who p={r} /></td>
                        <td className="px-2 py-2"><div>{r.batch_name}</div><div className="text-xs text-gray-500">{[r.course_name, r.teacher_name].filter(Boolean).join(' · ')}</div></td>
                        <td className="px-2 py-2"><span className={`font-semibold ${r.percentage < 50 ? 'text-red-600' : 'text-amber-600'}`}>{r.percentage}%</span> <span className="text-xs text-gray-500">({r.attended} of {r.classes})</span></td>
                        <td className="px-2 py-2">{r.missed_in_a_row >= 3 ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{r.missed_in_a_row} in a row</span> : r.missed_in_a_row || '—'}</td>
                        <td className="px-2 py-2">{showDate(r.last_attended)}</td>
                        <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                    </tr>
                ))}
            </Table>
        </Sheet>
    );
};

const UnmarkedSheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => {
    const byDate = useMemo(() => {
        const m = new Map<string, UnmarkedClass[]>();
        for (const c of data.unmarked.classes) { if (!m.has(c.date)) m.set(c.date, []); m.get(c.date)!.push(c); }
        return [...m.entries()];
    }, [data]);
    return (
        <Sheet title="Attendance not marked" subtitle="Classes in the last 7 days with no attendance and not cancelled. Mark them, or cancel the class if it did not run." onClose={onClose}>
            {byDate.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Every class has been marked.</p>}
            {byDate.map(([date, list]) => (
                <div key={date} className="mb-4">
                    <div className="mb-1 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{dayLabel(date)} <span className="font-normal text-gray-500">· {list.length}</span></h4>
                        <Link to={`/admin/attendance?date=${date}`} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Mark this day →</Link>
                    </div>
                    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                        {list.map(c => (
                            <li key={`${c.batch_id}:${c.start_time}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <span className="w-24 shrink-0 font-medium text-gray-900 dark:text-white">{clock(c.start_time)}</span>
                                <span className="min-w-0 flex-1"><span className="block truncate text-gray-900 dark:text-white">{c.batch_name}</span><span className="block truncate text-xs text-gray-500">{[c.course_name, c.teacher_name, `${c.students} students`].filter(Boolean).join(' · ')}</span></span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </Sheet>
    );
};

const JoinersSheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => {
    const [tab, setTab] = useState<'new' | 'left'>('new');
    const j = data.joiners;
    return (
        <Sheet title={`New and left · ${j.month}`} subtitle="Joiners without a fee (grade) set get no monthly bill; set it under Students → Edit." onClose={onClose}>
            <div className="mb-3"><Pills value={tab} onChange={setTab} options={[['new', `Joined ${j.count}`], ['left', `Left ${j.leavers.length}`]]} /></div>
            {tab === 'new' ? (
                <Table head={['Student', 'Joined', 'Fee', 'Batch', 'Phone']} empty="No one joined this month." count={j.students.length}>
                    {j.students.map(r => (
                        <tr key={r.student_id}>
                            <td className="px-2 py-2"><Who p={r} /></td>
                            <td className="px-2 py-2">{showDate(r.joined)}</td>
                            <td className="px-2 py-2">{r.fee_set ? <span className="text-emerald-600">Set</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Not set</span>}</td>
                            <td className="px-2 py-2">{r.in_batch ? <span className="text-emerald-600">In a batch</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">No batch</span>}</td>
                            <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                        </tr>
                    ))}
                </Table>
            ) : (
                <Table head={['Student', 'Status', 'Changed', 'Phone']} empty="No one left this month." count={j.leavers.length}>
                    {j.leavers.map(r => (
                        <tr key={r.student_id}>
                            <td className="px-2 py-2"><Who p={r} /></td>
                            <td className="px-2 py-2 capitalize">{r.state}</td>
                            <td className="px-2 py-2">{showDate(r.changed)}</td>
                            <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                        </tr>
                    ))}
                </Table>
            )}
        </Sheet>
    );
};

const BirthdaysSheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => (
    <Sheet title="Birthdays this week" subtitle="Next 7 days" onClose={onClose}>
        <Table head={['Student', 'Birthday', 'Turns', 'Phone']} empty="No birthdays in the next 7 days." count={data.birthdays.students.length}>
            {data.birthdays.students.map(r => (
                <tr key={r.student_id}>
                    <td className="px-2 py-2"><Who p={r} /></td>
                    <td className="px-2 py-2">{r.in_days === 0 ? <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-700">Today</span> : `${dayLabel(r.date)} · in ${r.in_days} day${r.in_days === 1 ? '' : 's'}`}</td>
                    <td className="px-2 py-2">{r.turns > 0 ? r.turns : '—'}</td>
                    <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                </tr>
            ))}
        </Table>
    </Sheet>
);

const DemosSheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => (
    <Sheet title="Demo enquiries" subtitle="Pending enquiries, oldest first" onClose={onClose}>
        <div className="mb-3 flex justify-end"><Link to="/admin/demo-bookings" className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white">Open demo bookings</Link></div>
        <Table head={['Name', 'Course', 'Asked', 'Preferred date', 'Phone']} empty="No pending enquiries." count={data.demos.bookings.length}>
            {data.demos.bookings.map(r => (
                <tr key={r.id}>
                    <td className="px-2 py-2"><div className="font-medium text-gray-900 dark:text-white">{r.student_name}</div><div className="text-xs text-gray-500">{r.parent_name ? `Parent: ${r.parent_name}` : ''}</div></td>
                    <td className="px-2 py-2">{r.course || '—'}</td>
                    <td className="px-2 py-2">{showDate(r.asked)}{r.stale && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Waiting</span>}</td>
                    <td className="px-2 py-2">{showDate(r.preferred_date)}</td>
                    <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                </tr>
            ))}
        </Table>
    </Sheet>
);

const CapacitySheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => {
    const navigate = useNavigate();
    const label = { over: ['Over the limit', 'bg-red-100 text-red-700'], full: ['Full', 'bg-amber-100 text-amber-800'], empty: ['No students', 'bg-gray-100 text-gray-700'], small: ['1–2 students', 'bg-sky-100 text-sky-800'] };
    return (
        <Sheet title="Batch sizes" subtitle="Full or over the most-students limit, and batches with very few students" onClose={onClose}>
            <Table head={['Batch', 'Teacher', 'Students', '']} empty="Every batch is a healthy size." count={data.capacity.batches.length}>
                {data.capacity.batches.map(b => (
                    <tr key={b.batch_id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => navigate(`/admin/batches/${b.batch_id}`)}>
                        <td className="px-2 py-2"><div className="font-medium text-gray-900 dark:text-white">{b.batch_name}</div><div className="text-xs text-gray-500">{b.course_name}</div></td>
                        <td className="px-2 py-2">{b.teacher_name || '—'}</td>
                        <td className="px-2 py-2">{b.students}{b.max_students ? ` / ${b.max_students}` : ''}</td>
                        <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${label[b.state][1]}`}>{label[b.state][0]}</span></td>
                    </tr>
                ))}
            </Table>
        </Sheet>
    );
};

const ExtraBillsSheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => (
    <Sheet title="Extra bills open" subtitle="Costumes, exam fees, events, uniforms… and how many have paid" onClose={onClose}>
        <div className="mb-3 flex justify-end"><Link to="/admin/fees" className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white">Open Fees → Extra bills</Link></div>
        {data.extra_bills.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No extra bills open.</p>}
        <ul className="space-y-2">
            {data.extra_bills.map(b => {
                const pct = b.bills ? Math.round((b.paid / b.bills) * 100) : 0;
                return (
                    <li key={b.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">{b.title} <span className="text-xs font-normal text-gray-500">· {b.category}{b.mode === 'orderable' ? ' · ordered by families' : ''}</span></span>
                            <span className="text-gray-600 dark:text-gray-300">{b.paid} of {b.bills} paid</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                        <div className="mt-1 flex justify-between text-xs text-gray-500"><span>{rupees(b.paid_amount)} collected</span><span>{rupees(b.due_amount)} unpaid{b.due_date ? ` · due ${showDate(b.due_date)}` : ''}</span></div>
                    </li>
                );
            })}
        </ul>
    </Sheet>
);

// --- Not in a batch (dashboard and Batches page) -------------------------------

export const NotInBatchList: React.FC<{ rows: NotInBatch[]; onChanged: () => void | Promise<unknown> }> = ({ rows, onChanged }) => {
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const groups = useMemo(() => {
        const m = new Map<string, NotInBatch[]>();
        for (const r of rows.filter(r => matches(r, q))) {
            const k = r.course_name || 'No course yet';
            if (!m.has(k)) m.set(k, []);
            m.get(k)!.push(r);
        }
        return [...m.entries()];
    }, [rows, q]);
    const add = async (r: NotInBatch, batchId: number) => {
        const key = `${r.student_id}:${r.course_id}`;
        setBusy(key); setMsg(null);
        try {
            await placeStudent(r.student_id, batchId);
            const b = r.batches?.find(x => x.id === batchId);
            setMsg(`${r.name} added to ${b ? b.name : 'the batch'}.`);
            await onChanged();
        } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not add.'); }
        finally { setBusy(null); }
    };
    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">{rows.length} to place</span>
                <Search value={q} onChange={setQ} />
            </div>
            {msg && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
            {groups.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Everyone is in a batch.</p>}
            {groups.map(([course, list]) => (
                <div key={course} className="mb-4">
                    <h4 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{course} <span className="font-normal text-gray-500">· {list.length}</span></h4>
                    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                        {list.map(r => (
                            <li key={`${r.student_id}:${r.course_id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white">{r.name}{r.grade_name ? <span className="ml-2 text-xs font-normal text-gray-500">{r.grade_name}</span> : null}</div>
                                    <div className="text-xs text-gray-500">{sub(r)}{r.phone ? ` · ${r.phone}` : ''}</div>
                                </div>
                                {r.course_id && (r.batches || []).length > 0 ? (
                                    <select disabled={busy !== null} defaultValue="" onChange={e => e.target.value && add(r, Number(e.target.value))}
                                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                                        <option value="">{busy === `${r.student_id}:${r.course_id}` ? 'Adding…' : 'Add to batch…'}</option>
                                        {r.batches!.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                ) : (
                                    <span className="text-xs text-gray-500">{r.course_id ? 'No batch for this course yet' : 'Set a course first (Students → Edit)'}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};
