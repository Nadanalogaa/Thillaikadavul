import React, { useCallback, useEffect, useState } from 'react';
import { BILLING_CURRENCIES } from '../PersonEditModal';
import { isSuperAdmin } from '../../../utils/adminRole';

// Monthly fees for overseas families, per currency and course. A student whose
// "Fees billed in" is set to a currency is billed from this list (the grade's
// row if there is one, else the course's row) and pays online by card. Indian
// families are untouched: rupees from the grade fee, UPI screenshot.

interface Row { id: number; currency: string; course_id: number; course_name: string | null; grade_id: number | null; grade_name: string | null; monthly_fee: number }
interface Course { id: number | string; name: string }
interface Grade { id: number | string; course_id: number | string; name: string }

const OverseasFeesPanel: React.FC<{ courses: Course[]; grades: Grade[] }> = ({ courses, grades }) => {
    const [rows, setRows] = useState<Row[]>([]);
    const [students, setStudents] = useState<{ currency: string; students: number }[]>([]);
    const [symbols, setSymbols] = useState<Record<string, string>>({});
    const [currency, setCurrency] = useState('USD');
    const [courseId, setCourseId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [fee, setFee] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const canDelete = isSuperAdmin();

    const load = useCallback(async () => {
        const r = await fetch('/api/overseas-fees', { credentials: 'include' });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setMessage(d.message || 'Could not load overseas fees.'); return; }
        setRows(d.rows || []); setStudents(d.students || []); setSymbols(d.symbols || {});
    }, []);
    useEffect(() => { load(); }, [load]);

    const sym = (c: string) => symbols[c] || `${c} `;
    const fmt = (c: string, n: number) => `${sym(c)}${(Math.round(n * 100) / 100).toLocaleString('en-US')}`;

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) { setMessage('Choose a course.'); return; }
        if (!(Number(fee) > 0)) { setMessage('Enter the monthly fee.'); return; }
        setBusy(true); setMessage(null);
        try {
            const r = await fetch('/api/overseas-fees', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currency, course_id: Number(courseId), grade_id: gradeId ? Number(gradeId) : null, monthly_fee: Number(fee) }) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.message || 'Could not save.');
            setFee(''); setGradeId('');
            setMessage('Saved. New bills from next month use it; this month\'s bills are not changed.');
            await load();
        } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save.'); }
        finally { setBusy(false); }
    };
    const remove = async (row: Row) => {
        if (!window.confirm(`Remove the ${row.currency} fee for ${row.course_name}${row.grade_name ? ` · ${row.grade_name}` : ''}?`)) return;
        const r = await fetch(`/api/overseas-fees/${row.id}`, { method: 'DELETE', credentials: 'include' });
        if (!r.ok) { setMessage((await r.json().catch(() => ({}))).message || 'Could not remove.'); return; }
        await load();
    };

    const courseGrades = grades.filter(g => String(g.course_id) === String(courseId));
    const byCurrency = new Map<string, Row[]>();
    for (const r of rows) byCurrency.set(r.currency, [...(byCurrency.get(r.currency) || []), r]);
    const studentsIn = (c: string) => students.find(s => s.currency === c)?.students || 0;

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-gray-700 dark:border-indigo-900/50 dark:bg-indigo-900/10 dark:text-gray-200">
                <p className="font-semibold text-gray-900 dark:text-white">How overseas fees work</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>On a student's edit form, set <b>Fees billed in</b> to their country's currency. That makes them an overseas student.</li>
                    <li>Their monthly bill is made from this list: the row for their course and grade, or the course's row when no grade row exists. No row = no bill (they show as "Fee not set up").</li>
                    <li>They pay online by card in their own currency (Razorpay international). Indian families are not affected: rupees, UPI screenshot, no online payment.</li>
                </ul>
            </div>

            {message && <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">{message}</div>}

            <form onSubmit={save} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-5 dark:border-gray-700 dark:bg-gray-800">
                <label className="text-xs font-medium text-gray-500">Currency
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="form-select mt-1 w-full text-sm">
                        {BILLING_CURRENCIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                </label>
                <label className="text-xs font-medium text-gray-500">Course
                    <select value={courseId} onChange={e => { setCourseId(e.target.value); setGradeId(''); }} className="form-select mt-1 w-full text-sm">
                        <option value="">Choose…</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                <label className="text-xs font-medium text-gray-500">Grade (optional)
                    <select value={gradeId} onChange={e => setGradeId(e.target.value)} className="form-select mt-1 w-full text-sm" disabled={!courseId}>
                        <option value="">All grades</option>
                        {courseGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </label>
                <label className="text-xs font-medium text-gray-500">Monthly fee ({sym(currency).trim() || currency})
                    <input type="number" min="1" step="0.01" value={fee} onChange={e => setFee(e.target.value)} placeholder="e.g. 60" className="form-input mt-1 w-full text-sm" />
                </label>
                <div className="flex items-end">
                    <button type="submit" disabled={busy} className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{busy ? 'Saving…' : 'Save fee'}</button>
                </div>
            </form>

            {rows.length === 0 ? (
                <p className="rounded-lg border-2 border-dashed py-8 text-center text-sm text-gray-500">No overseas fees yet. Add one above for each course you teach online.</p>
            ) : [...byCurrency.entries()].map(([c, list]) => (
                <div key={c} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-sm dark:bg-gray-900/40">
                        <span className="font-semibold text-gray-900 dark:text-white">{BILLING_CURRENCIES.find(([code]) => code === c)?.[1] || c}</span>
                        <span className="text-xs text-gray-500">{studentsIn(c)} student{studentsIn(c) === 1 ? '' : 's'} billed in {c}</span>
                    </div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {list.map(r => (
                                <tr key={r.id}>
                                    <td className="px-4 py-2 text-gray-900 dark:text-white">{r.course_name || `Course #${r.course_id}`}</td>
                                    <td className="px-4 py-2 text-gray-500">{r.grade_name || 'All grades'}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">{fmt(c, r.monthly_fee)} / month</td>
                                    <td className="px-4 py-2 text-right">
                                        {canDelete && <button type="button" onClick={() => remove(r)} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

export default OverseasFeesPanel;
