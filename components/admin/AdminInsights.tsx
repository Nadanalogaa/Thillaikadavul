import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../Modal';
import { placeStudent } from '../../services/batchAdminApi';

// Admin "needs attention": fees still to collect, students with low
// attendance, and students not placed in a batch for a course they take.
// One call (/api/admin/insights); each card opens its list.

interface Person { student_id: number; name: string; user_id: string | null; phone: string | null; parent_name: string | null }
interface LowAttendance extends Person {
    batch_id: number; batch_name: string; course_name: string; teacher_name: string | null;
    classes: number; attended: number; absent: number; percentage: number; missed_in_a_row: number; last_attended: string | null;
}
interface Owing extends Person { amount: number; overdue_amount: number; bills: number; verifying: number }
interface NotInBatch extends Person { course_id: number | null; course_name: string | null; grade_name: string | null; batches?: { id: number; name: string }[] }
export interface Insights {
    attendance: { days: number; threshold: number; count: number; students: LowAttendance[] };
    fees: {
        period: string; billed: number; collected: number; due: number; due_students: number; overdue: number; overdue_students: number;
        verifying: number; verifying_bills: number; older_due: number; older_bills: number; students: Owing[];
    };
    not_in_batch: { count: number; students_count: number; students: NotInBatch[] };
}

const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const showDate = (v?: string | null) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
const sub = (p: Person) => [p.user_id, p.parent_name && `Parent: ${p.parent_name}`].filter(Boolean).join(' · ');

export const fetchInsights = async (days = 30): Promise<Insights> => {
    const r = await fetch(`/api/admin/insights?days=${days}`, { credentials: 'include' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Could not load.');
    return d;
};

const Phone: React.FC<{ phone: string | null }> = ({ phone }) =>
    phone ? <a href={`tel:${phone}`} className="text-indigo-600 hover:underline">{phone}</a> : <span className="text-gray-400">—</span>;

const Search: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search name, ID, parent, phone"
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm sm:w-64 dark:border-gray-600 dark:bg-gray-900" />
);
const matches = (p: Person, q: string) => !q.trim()
    || `${p.name} ${p.user_id || ''} ${p.parent_name || ''} ${p.phone || ''}`.toLowerCase().includes(q.trim().toLowerCase());

const Sheet: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => (
    <Modal isOpen onClose={onClose} size="4xl">
        <div className="max-h-[85vh] overflow-y-auto bg-white p-5 dark:bg-gray-800">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
                <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Close</button>
            </div>
            {children}
        </div>
    </Modal>
);

// --- Dashboard cards ----------------------------------------------------------

const Card: React.FC<{ tone: 'amber' | 'red' | 'indigo'; title: string; value: string; lines: (string | false | null)[]; onClick: () => void }> =
    ({ tone, title, value, lines, onClick }) => {
        const ring = { amber: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20', red: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20', indigo: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20' }[tone];
        const text = { amber: 'text-amber-700 dark:text-amber-300', red: 'text-red-700 dark:text-red-300', indigo: 'text-indigo-700 dark:text-indigo-300' }[tone];
        return (
            <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md ${ring}`}>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</div>
                <div className={`mt-1 text-2xl font-bold ${text}`}>{value}</div>
                {lines.filter(Boolean).map((l, i) => <div key={i} className="text-xs text-gray-600 dark:text-gray-400">{l}</div>)}
                <div className={`mt-2 text-xs font-semibold ${text}`}>See details →</div>
            </button>
        );
    };

export const AdminInsightsCards: React.FC = () => {
    const [data, setData] = useState<Insights | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<'fees' | 'attendance' | 'batch' | null>(null);
    const load = useCallback(() => fetchInsights().then(d => { setData(d); setError(null); }).catch(e => setError(e.message)), []);
    useEffect(() => { load(); }, [load]);

    if (error) return <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Needs attention: {error}</p>;
    if (!data) return <p className="mb-4 text-sm text-gray-500">Loading what needs attention…</p>;
    const f = data.fees;
    return (
        <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Needs attention</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card tone={f.overdue > 0 ? 'red' : 'amber'} title={`Fees to collect · ${f.period}`} value={rupees(f.due)}
                    lines={[`${f.due_students} students · ${rupees(f.collected)} of ${rupees(f.billed)} collected`,
                        f.overdue > 0 && `Overdue ${rupees(f.overdue)} · ${f.overdue_students} students`,
                        f.verifying_bills > 0 && `${f.verifying_bills} screenshot${f.verifying_bills === 1 ? '' : 's'} to check (${rupees(f.verifying)})`,
                        f.older_bills > 0 && `Older / extra bills ${rupees(f.older_due)}`]}
                    onClick={() => setOpen('fees')} />
                <Card tone={data.attendance.count > 0 ? 'red' : 'indigo'} title={`Low attendance · last ${data.attendance.days} days`}
                    value={`${data.attendance.count} student${data.attendance.count === 1 ? '' : 's'}`}
                    lines={[`Below ${data.attendance.threshold}% or missed 3 classes in a row`]} onClick={() => setOpen('attendance')} />
                <Card tone={data.not_in_batch.students_count > 0 ? 'amber' : 'indigo'} title="Not in a batch"
                    value={`${data.not_in_batch.students_count} student${data.not_in_batch.students_count === 1 ? '' : 's'}`}
                    lines={['Taking a course but in no batch for it']} onClick={() => setOpen('batch')} />
            </div>
            {open === 'fees' && <FeesSheet data={data} onClose={() => setOpen(null)} />}
            {open === 'attendance' && <AttendanceSheet initial={data} onClose={() => setOpen(null)} />}
            {open === 'batch' && (
                <Sheet title="Not in a batch" subtitle="Students taking a course with no batch for it. Add each to a batch of that course." onClose={() => setOpen(null)}>
                    <NotInBatchList rows={data.not_in_batch.students} onChanged={load} />
                </Sheet>
            )}
        </div>
    );
};

// --- Fees -------------------------------------------------------------------

const FeesSheet: React.FC<{ data: Insights; onClose: () => void }> = ({ data, onClose }) => {
    const [q, setQ] = useState('');
    const [only, setOnly] = useState<'all' | 'overdue' | 'verifying'>('all');
    const rows = data.fees.students.filter(r => matches(r, q)
        && (only === 'all' || (only === 'overdue' ? r.overdue_amount > 0 : r.verifying > 0)));
    const total = rows.reduce((t, r) => t + r.amount, 0);
    return (
        <Sheet title="Fees to collect" subtitle={`All unpaid bills (this month, older months and extra bills) · ${rows.length} students · ${rupees(total)}`} onClose={onClose}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {(['all', 'overdue', 'verifying'] as const).map(k => (
                    <button key={k} type="button" onClick={() => setOnly(k)}
                        className={`rounded-full px-3 py-1 text-sm ${only === k ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {k === 'all' ? 'All' : k === 'overdue' ? 'Overdue' : 'Screenshot to check'}
                    </button>
                ))}
                <div className="ml-auto flex items-center gap-2"><Search value={q} onChange={setQ} />
                    <Link to="/admin/fees" className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white">Open Fees</Link></div>
            </div>
            <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-gray-500"><tr>{['Student', 'Phone', 'Bills', 'Due', 'Overdue', 'Being verified'].map(h => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-gray-500">Nothing to show.</td></tr>}
                    {rows.map(r => (
                        <tr key={r.student_id}>
                            <td className="px-2 py-2"><div className="font-medium text-gray-900 dark:text-white">{r.name}</div><div className="text-xs text-gray-500">{sub(r)}</div></td>
                            <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                            <td className="px-2 py-2">{r.bills}</td>
                            <td className="px-2 py-2 font-semibold">{rupees(r.amount)}</td>
                            <td className={`px-2 py-2 ${r.overdue_amount > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}`}>{r.overdue_amount > 0 ? rupees(r.overdue_amount) : '—'}</td>
                            <td className={`px-2 py-2 ${r.verifying > 0 ? 'text-sky-700' : 'text-gray-400'}`}>{r.verifying > 0 ? rupees(r.verifying) : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Sheet>
    );
};

// --- Attendance ---------------------------------------------------------------

const AttendanceSheet: React.FC<{ initial: Insights; onClose: () => void }> = ({ initial, onClose }) => {
    const [days, setDays] = useState(initial.attendance.days);
    const [att, setAtt] = useState(initial.attendance);
    const [busy, setBusy] = useState(false);
    const [q, setQ] = useState('');
    useEffect(() => {
        if (days === initial.attendance.days) { setAtt(initial.attendance); return; }
        setBusy(true);
        fetchInsights(days).then(d => setAtt(d.attendance)).finally(() => setBusy(false));
    }, [days, initial]);
    const rows = att.students.filter(r => matches(r, q));
    return (
        <Sheet title="Low attendance" subtitle={`Below ${att.threshold}% or missed the last 3 classes in a row · counts only classes where attendance was marked`} onClose={onClose}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {[30, 60, 90].map(d => (
                    <button key={d} type="button" onClick={() => setDays(d)}
                        className={`rounded-full px-3 py-1 text-sm ${days === d ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700'}`}>Last {d} days</button>
                ))}
                {busy && <span className="text-sm text-gray-500">Loading…</span>}
                <div className="ml-auto"><Search value={q} onChange={setQ} /></div>
            </div>
            <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-gray-500"><tr>{['Student', 'Batch', 'Attended', 'Missed in a row', 'Last attended', 'Phone'].map(h => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-gray-500">No one below {att.threshold}% in the last {att.days} days.</td></tr>}
                    {rows.map(r => (
                        <tr key={`${r.student_id}:${r.batch_id}`}>
                            <td className="px-2 py-2"><div className="font-medium text-gray-900 dark:text-white">{r.name}</div><div className="text-xs text-gray-500">{sub(r)}</div></td>
                            <td className="px-2 py-2"><div>{r.batch_name}</div><div className="text-xs text-gray-500">{[r.course_name, r.teacher_name].filter(Boolean).join(' · ')}</div></td>
                            <td className="px-2 py-2"><span className={`font-semibold ${r.percentage < 50 ? 'text-red-600' : 'text-amber-600'}`}>{r.percentage}%</span> <span className="text-xs text-gray-500">({r.attended} of {r.classes})</span></td>
                            <td className="px-2 py-2">{r.missed_in_a_row >= 3 ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{r.missed_in_a_row} in a row</span> : r.missed_in_a_row || '—'}</td>
                            <td className="px-2 py-2">{showDate(r.last_attended)}</td>
                            <td className="px-2 py-2"><Phone phone={r.phone} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Sheet>
    );
};

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
            {msg && <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
            {groups.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Everyone is in a batch.</p>}
            {groups.map(([course, list]) => (
                <div key={course} className="mb-4">
                    <h4 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{course} <span className="font-normal text-gray-500">· {list.length}</span></h4>
                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                        {list.map(r => (
                            <li key={`${r.student_id}:${r.course_id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white">{r.name}{r.grade_name ? <span className="ml-2 text-xs font-normal text-gray-500">{r.grade_name}</span> : null}</div>
                                    <div className="text-xs text-gray-500">{sub(r)}{r.phone ? ` · ${r.phone}` : ''}</div>
                                </div>
                                {r.course_id && (r.batches || []).length > 0 ? (
                                    <select disabled={busy !== null} defaultValue="" onChange={e => e.target.value && add(r, Number(e.target.value))}
                                        className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900">
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
