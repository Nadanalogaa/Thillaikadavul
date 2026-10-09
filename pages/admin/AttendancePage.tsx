import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
    getAttendanceClasses, getAttendanceRoster, markAttendance, cancelClass,
    getOwedMakeups, scheduleMakeup, getAttendanceReport, getBatches,
    type AttendanceClass, type AttendanceRoster, type OwedMakeup, type AttendanceReport,
} from '../../api';
import type { Batch } from '../../types';

// Teachers mark their own classes in the app; this page is for the office:
// correcting a day, seeing the month, and giving back classes the academy
// cancelled.

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthIso = () => todayIso().slice(0, 7);

const formatDate = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return iso || '';
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (value?: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(value || '');
    if (!m) return '';
    const h = Number(m[1]);
    return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};

const STATUS_LABEL: Record<string, string> = {
    present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused',
};

type Tab = 'day' | 'month' | 'makeups';

const AttendancePage: React.FC = () => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [tab, setTab] = useState<Tab>('day');
    const [date, setDate] = useState(todayIso());
    const [classes, setClasses] = useState<AttendanceClass[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [roster, setRoster] = useState<AttendanceRoster | null>(null);
    const [marks, setMarks] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const [batches, setBatches] = useState<Batch[]>([]);
    const [reportBatch, setReportBatch] = useState('');
    const [month, setMonth] = useState(monthIso());
    const [report, setReport] = useState<AttendanceReport | null>(null);

    const [owed, setOwed] = useState<OwedMakeup[]>([]);
    const [makeupDates, setMakeupDates] = useState<Record<number, string>>({});

    const card = `rounded-xl border p-4 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;
    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const strong = dark ? 'text-white' : 'text-gray-900';

    useEffect(() => { getBatches().then(setBatches).catch(() => {}); }, []);

    useEffect(() => {
        if (tab !== 'day') return;
        setLoading(true);
        setError('');
        getAttendanceClasses(date)
            .then(setClasses)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [tab, date]);

    useEffect(() => {
        if (tab !== 'makeups') return;
        getOwedMakeups().then(setOwed).catch(e => setError(e.message));
    }, [tab]);

    const openRoster = async (batchId: number) => {
        setError('');
        try {
            const data = await getAttendanceRoster(String(batchId), date);
            setRoster(data);
            setMarks(Object.fromEntries(data.students.map(s => [s.id, s.status])));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not open the class');
        }
    };

    const save = async () => {
        if (!roster) return;
        setSaving(true);
        try {
            const result = await markAttendance(
                String(roster.batch.id), date,
                roster.students.map(s => ({ student_id: s.id, status: marks[s.id] || 'present' }))
            );
            setRoster(null);
            setClasses(await getAttendanceClasses(date));
            alert(result.notified ? `Attendance saved. ${result.notified} parent(s) notified.` : 'Attendance saved.');
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Could not save attendance');
        } finally {
            setSaving(false);
        }
    };

    const cancel = async (batchId: number, batchName: string) => {
        const reason = window.prompt(`Cancel "${batchName}" on ${formatDate(date)}?\n\nEvery family is told a make-up is owed.\n\nReason (shown to parents):`, '');
        if (reason === null) return;
        try {
            await cancelClass(String(batchId), date, reason);
            setRoster(null);
            setClasses(await getAttendanceClasses(date));
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Could not cancel the class');
        }
    };

    const runReport = async () => {
        if (!reportBatch) return;
        setLoading(true);
        setError('');
        try {
            setReport(await getAttendanceReport(reportBatch, month));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not build the report');
        } finally {
            setLoading(false);
        }
    };

    const giveBack = async (row: OwedMakeup) => {
        const newDate = makeupDates[row.id];
        if (!newDate) { alert('Pick the date of the make-up class first.'); return; }
        try {
            await scheduleMakeup(row.id, newDate);
            setOwed(await getOwedMakeups());
            alert('Make-up class scheduled. Families have been told.');
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Could not schedule the make-up class');
        }
    };

    const csv = useMemo(() => {
        if (!report) return '';
        const head = ['Student', 'Classes', 'Present', 'Absent', 'Late', 'Attendance %'];
        const rows = report.students.map(s => [s.name, s.classes, s.present, s.absent, s.late, s.percentage ?? '']);
        return [head, ...rows].map(r => r.join(',')).join('\n');
    }, [report]);

    const downloadCsv = () => {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const statusPill = (status: string) => {
        const map: Record<string, string> = {
            held: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            makeup: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
            not_marked: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        };
        const label: Record<string, string> = {
            held: 'Marked', cancelled: 'Cancelled', makeup: 'Make-up class', not_marked: 'Not marked',
        };
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || map.not_marked}`}>{label[status] || status}</span>;
    };

    return (
        <AdminLayout>
            <AdminPageHeader title="Attendance" subtitle="Teachers mark their classes in the app; correct and review them here." />

            <div className={`mb-4 flex gap-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                {([['day', 'By day'], ['month', 'Monthly report'], ['makeups', 'Classes owed']] as [Tab, string][]).map(([id, label]) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`-mb-px border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                            tab === id
                                ? 'border-brand-primary text-brand-primary dark:border-indigo-400 dark:text-indigo-300'
                                : `border-transparent ${muted} hover:${strong}`
                        }`}
                    >
                        {label}
                        {id === 'makeups' && owed.length > 0 && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{owed.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

            {tab === 'day' && (
                <div className="space-y-4">
                    <div className={`${card} flex flex-wrap items-center gap-3`}>
                        <label className={`text-sm font-medium ${strong}`}>Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input text-sm" />
                        <button onClick={() => setDate(todayIso())} className={`text-sm ${muted} underline`}>Today</button>
                        <span className={`text-sm ${muted}`}>{formatDate(date)}</span>
                    </div>

                    {loading ? (
                        <p className={muted}>Loading…</p>
                    ) : classes.length === 0 ? (
                        <p className={muted}>No classes scheduled on this day.</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {classes.map(c => (
                                <div key={c.batch_id} className={card}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className={`truncate font-medium ${strong}`}>{c.batch_name}</p>
                                            <p className={`text-xs ${muted}`}>
                                                {[formatTime(c.start_time), formatTime(c.end_time)].filter(Boolean).join(' – ')}
                                                {c.teacher_name ? ` · ${c.teacher_name}` : ''}
                                            </p>
                                            <p className={`text-xs ${muted}`}>{c.student_count} students</p>
                                        </div>
                                        {statusPill(c.status)}
                                    </div>
                                    {c.cancel_reason && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{c.cancel_reason}</p>}
                                    <div className="mt-3 flex gap-2">
                                        <button onClick={() => openRoster(c.batch_id)} className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">
                                            {c.status === 'held' ? 'Edit attendance' : 'Mark attendance'}
                                        </button>
                                        {c.status !== 'cancelled' && (
                                            <button onClick={() => cancel(c.batch_id, c.batch_name)} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                                                Class off
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'month' && (
                <div className="space-y-4">
                    <div className={`${card} flex flex-wrap items-end gap-3`}>
                        <div>
                            <label className={`mb-1 block text-xs font-medium ${muted}`}>Batch</label>
                            <select value={reportBatch} onChange={e => setReportBatch(e.target.value)} className="form-select text-sm">
                                <option value="">Choose a batch…</option>
                                {batches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.courseName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`mb-1 block text-xs font-medium ${muted}`}>Month</label>
                            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="form-input text-sm" />
                        </div>
                        <button onClick={runReport} disabled={!reportBatch} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                            Show
                        </button>
                        {report && <button onClick={downloadCsv} className={`rounded-md border px-3 py-2 text-sm ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>Download CSV</button>}
                    </div>

                    {report && (
                        <div className={`${card} overflow-x-auto`}>
                            <p className={`mb-3 text-sm ${muted}`}>
                                {report.sessions.filter(s => s.status !== 'cancelled').length} classes held
                                {report.sessions.some(s => s.status === 'cancelled') && `, ${report.sessions.filter(s => s.status === 'cancelled').length} cancelled`}
                            </p>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className={`text-left text-xs uppercase ${muted}`}>
                                        <th className="py-2 pr-4">Student</th>
                                        <th className="py-2 pr-4">Classes</th>
                                        <th className="py-2 pr-4">Present</th>
                                        <th className="py-2 pr-4">Absent</th>
                                        <th className="py-2 pr-4">Late</th>
                                        <th className="py-2">Attendance</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                    {report.students.map(s => (
                                        <tr key={s.id}>
                                            <td className={`py-2 pr-4 font-medium ${strong}`}>{s.name}</td>
                                            <td className="py-2 pr-4">{s.classes}</td>
                                            <td className="py-2 pr-4 text-green-600 dark:text-green-400">{s.present}</td>
                                            <td className="py-2 pr-4 text-red-600 dark:text-red-400">{s.absent}</td>
                                            <td className="py-2 pr-4 text-amber-600 dark:text-amber-400">{s.late}</td>
                                            <td className={`py-2 font-medium ${s.percentage !== null && s.percentage < 75 ? 'text-amber-600 dark:text-amber-400' : strong}`}>
                                                {s.percentage === null ? '—' : `${s.percentage}%`}
                                            </td>
                                        </tr>
                                    ))}
                                    {report.students.length === 0 && (
                                        <tr><td colSpan={6} className={`py-4 ${muted}`}>No students in this batch.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'makeups' && (
                <div className="space-y-3">
                    <p className={`text-sm ${muted}`}>
                        Classes the academy cancelled and hasn't given back yet. Pick a date and the families are told.
                    </p>
                    {owed.length === 0 ? (
                        <p className={muted}>Nothing owed. Every cancelled class has a make-up.</p>
                    ) : owed.map(row => (
                        <div key={row.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                            <div className="min-w-0">
                                <p className={`font-medium ${strong}`}>{row.batch_name}</p>
                                <p className={`text-xs ${muted}`}>
                                    Cancelled {formatDate(row.session_date)}
                                    {row.cancel_reason ? ` · ${row.cancel_reason}` : ''} · {row.student_count} students
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={makeupDates[row.id] || ''}
                                    onChange={e => setMakeupDates(prev => ({ ...prev, [row.id]: e.target.value }))}
                                    className="form-input text-sm"
                                />
                                <button onClick={() => giveBack(row)} className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                                    Schedule make-up
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {roster && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRoster(null)}>
                    <div className={`max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl ${dark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                        <div className={`border-b p-4 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h3 className={`font-semibold ${strong}`}>{roster.batch.batch_name}</h3>
                            <p className={`text-xs ${muted}`}>{formatDate(date)} · {roster.students.length} students</p>
                        </div>
                        <div className="max-h-[55vh] overflow-y-auto p-4">
                            {roster.students.length === 0 && <p className={muted}>No students in this batch.</p>}
                            {roster.students.map(s => (
                                <div key={s.id} className={`flex items-center justify-between gap-3 border-b py-2 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <span className={strong}>{s.name}</span>
                                    <div className="flex gap-1">
                                        {['present', 'late', 'absent'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setMarks(prev => ({ ...prev, [s.id]: status }))}
                                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                                    (marks[s.id] || 'present') === status
                                                        ? status === 'present' ? 'bg-green-600 text-white'
                                                            : status === 'late' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                                                        : dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {STATUS_LABEL[status]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={`flex justify-end gap-2 border-t p-4 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <button onClick={() => setRoster(null)} className={`rounded-md border px-4 py-2 text-sm ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>Close</button>
                            <button onClick={save} disabled={saving || roster.students.length === 0} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                                {saving ? 'Saving…' : 'Save attendance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AttendancePage;
