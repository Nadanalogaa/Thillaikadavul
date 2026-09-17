import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import type { Batch, Course, FeeRoster, FeeRosterBill, FeeRosterRow, FeeRosterStatus } from '../../../types';
import { generateMonthlyInvoicesApi, getBatches, getCourses, getFeesRoster, sendInvoiceReminders } from '../../../api';
import { useTheme } from '../../../contexts/ThemeContext';
import CollectCashModal from './CollectCashModal';
import ReceiptModal from './ReceiptModal';
import AddBillModal from './AddBillModal';
import { STATUS_LABEL, StatusBadge, formatDateTime, formatDayMonth, formatRupees, recentBillingPeriods } from './feeUi';

interface ReminderLink {
    invoice_id: number;
    student_name: string;
    phone: string | null;
    amount: string | number;
    message: string;
    wa_link: string | null;
}

const CHIPS: { key: FeeRosterStatus | ''; label: string }[] = [
    { key: '', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'pending', label: 'Pending' },
    { key: 'partly_paid', label: 'Partly paid' },
    { key: 'paid', label: 'Paid' },
    { key: 'no_bill', label: STATUS_LABEL.no_bill },
    { key: 'not_set_up', label: STATUS_LABEL.not_set_up },
];

const unpaidBills = (row: FeeRosterRow): FeeRosterBill[] => row.bills.filter(b => b.status !== 'paid');

const methodText = (bill: FeeRosterBill): string => {
    const m = (bill.payment_method || '').toLowerCase();
    const who = bill.collected_by_name ? ` by ${bill.collected_by_name}` : '';
    if (m === 'cash') return `Cash${who}`;
    if (m === 'razorpay') return 'Online';
    return `${bill.payment_method || 'Paid'}${who}`;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const FeesRosterPanel: React.FC = () => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const periods = useMemo(() => recentBillingPeriods(12), []);

    // Filters
    const [period, setPeriod] = useState(periods[0]);
    const [status, setStatus] = useState<FeeRosterStatus | ''>('');
    const [courseId, setCourseId] = useState('');
    const [batchId, setBatchId] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    // Data
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [roster, setRoster] = useState<FeeRoster | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);

    // UI
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [generating, setGenerating] = useState(false);
    const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [sending, setSending] = useState(false);
    const [reminders, setReminders] = useState<ReminderLink[] | null>(null);
    const [collectFor, setCollectFor] = useState<{ student_id: number; name: string } | null>(null);
    const [receiptNo, setReceiptNo] = useState<string | null>(null);
    const [addBillFor, setAddBillFor] = useState<{ student_id: number; name: string } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [c, b] = await Promise.all([getCourses(), getBatches()]);
                setCourses(c.filter((x, i, a) => a.findIndex(y => y.name === x.name) === i));
                setBatches(b);
            } catch {
                /* dropdowns stay empty; the roster still works */
            }
        })();
    }, []);

    // Debounce the search box.
    useEffect(() => {
        const t = window.setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    const load = useCallback(async () => {
        const id = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            const data = await getFeesRoster({ period, status, course_id: courseId, batch_id: batchId, search });
            if (id !== requestId.current) return;
            setRoster(data);
        } catch (e) {
            if (id !== requestId.current) return;
            setError(e instanceof Error ? e.message : 'Could not load the fees list.');
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [period, status, courseId, batchId, search]);

    useEffect(() => { load(); }, [load]);

    // A new month is a new set of bills: start with a clean slate.
    useEffect(() => { setSelected(new Set()); setExpanded(new Set()); }, [period]);

    const rows = roster?.rows || [];
    const summary = roster?.summary;
    const batchesForCourse = courseId ? batches.filter(b => String(b.courseId) === String(courseId)) : batches;

    const selectableRows = rows.filter(r => unpaidBills(r).length > 0);
    const selectedRows = selectableRows.filter(r => selected.has(r.student_id));
    const allSelected = selectableRows.length > 0 && selectedRows.length === selectableRows.length;

    const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) =>
        setter(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const toggleAll = () => {
        setSelected(prev => {
            const next = new Set(prev);
            if (allSelected) selectableRows.forEach(r => next.delete(r.student_id));
            else selectableRows.forEach(r => next.add(r.student_id));
            return next;
        });
    };

    const doGenerate = async () => {
        if (!window.confirm(`Generate this month's bills for all students? Students who already have a bill for this month are skipped.`)) return;
        setGenerating(true);
        setNotice(null);
        try {
            const r = await generateMonthlyInvoicesApi();
            const created = Number(r.created || 0);
            const prorated = Number(r.prorated || 0);
            const noGrade = Number(r.noGrade || 0);
            let text = `Created ${plural(created, 'bill', 'bills')}${prorated ? ` (${prorated} pro-rata)` : ''}.`;
            if (noGrade) text += ` ${plural(noGrade, 'student has', 'students have')} no grade.`;
            setNotice({ kind: 'success', text });
            await load();
        } catch (e) {
            setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not generate bills.' });
        } finally {
            setGenerating(false);
        }
    };

    const doSendReminders = async () => {
        const ids = selectedRows.flatMap(r => unpaidBills(r).map(b => b.id));
        if (ids.length === 0) return;
        setSending(true);
        setNotice(null);
        try {
            const r = await sendInvoiceReminders(ids);
            setReminders(Array.isArray(r?.reminders) ? r.reminders : Array.isArray(r) ? r : []);
            setSelected(new Set());
        } catch (e) {
            setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not send reminders.' });
        } finally {
            setSending(false);
        }
    };

    // --- styles ---
    const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const strong = dark ? 'text-white' : 'text-gray-900';
    const input = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        dark ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
    }`;
    const secondaryBtn = `rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap disabled:opacity-50 ${
        dark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
    }`;

    const amountText = (row: FeeRosterRow): string | null => {
        if (row.status === 'paid') return `Paid ${formatRupees(row.paid)}`;
        if (row.status === 'pending' || row.status === 'overdue' || row.status === 'partly_paid') {
            return `${formatRupees(row.due)} due${row.due_date ? ` · due ${formatDayMonth(row.due_date)}` : ''}`;
        }
        return null;
    };

    const rowAction = (row: FeeRosterRow) => {
        const stop = (e: React.MouseEvent) => e.stopPropagation();
        switch (row.status) {
            case 'pending':
            case 'overdue':
            case 'partly_paid':
                return (
                    <button
                        type="button"
                        onClick={e => { stop(e); setCollectFor({ student_id: row.student_id, name: row.name }); }}
                        className="w-32 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Collect cash
                    </button>
                );
            case 'paid': {
                const receipt = row.bills.find(b => b.receipt_number)?.receipt_number;
                return receipt ? (
                    <button type="button" onClick={e => { stop(e); setReceiptNo(receipt); }} className={`w-32 ${secondaryBtn}`}>
                        Receipt
                    </button>
                ) : <span className={`inline-block w-32 text-center text-xs ${muted}`}>No receipt</span>;
            }
            case 'not_set_up':
                return (
                    <Link to={`/admin/student/${row.student_id}`} onClick={stop} className={`inline-block w-32 text-center ${secondaryBtn}`}>
                        Set grade
                    </Link>
                );
            default:
                return <span className={`inline-block w-32 text-center text-xs ${muted}`}>Bill not generated</span>;
        }
    };

    return (
        <div>
            {/* Month + generate */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <label htmlFor="fees-period" className={`text-sm font-medium ${muted}`}>Month</label>
                    <select id="fees-period" value={period} onChange={e => setPeriod(e.target.value)} className={`${input} font-medium`}>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <button type="button" onClick={doGenerate} disabled={generating} className={secondaryBtn}>
                    {generating ? 'Generating…' : "Generate this month's bills"}
                </button>
            </div>

            {notice && (
                <div className={`mt-3 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                    notice.kind === 'success'
                        ? dark ? 'border-green-800 bg-green-900/30 text-green-300' : 'border-green-200 bg-green-50 text-green-800'
                        : dark ? 'border-red-800 bg-red-900/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                    <span>{notice.text}</span>
                    <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Summary */}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                    { label: 'Billed', value: summary?.billed, cls: strong },
                    { label: 'Collected', value: summary?.collected, cls: dark ? 'text-green-400' : 'text-green-700' },
                    { label: 'Outstanding', value: summary?.outstanding, cls: (summary?.outstanding || 0) > 0 ? (dark ? 'text-red-400' : 'text-red-700') : strong },
                ].map(t => (
                    <div key={t.label} className={`min-w-0 rounded-xl border px-3 py-3 sm:px-4 ${card}`}>
                        <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>{t.label}</p>
                        <p className={`mt-1 truncate text-lg font-semibold tabular-nums sm:text-2xl ${t.cls}`}>
                            {summary ? formatRupees(t.value) : '—'}
                        </p>
                    </div>
                ))}
            </div>

            {/* Status chips */}
            <div className="mt-4 flex flex-wrap gap-2">
                {CHIPS.map(chip => {
                    const active = status === chip.key;
                    const count = summary ? (chip.key === '' ? summary.students : summary.counts[chip.key] ?? 0) : null;
                    return (
                        <button
                            key={chip.key || 'all'}
                            type="button"
                            onClick={() => setStatus(chip.key)}
                            aria-pressed={active}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                active
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : dark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                        >
                            {chip.label}
                            {count !== null && (
                                <span className={`rounded-full px-1.5 text-xs tabular-nums ${
                                    active ? 'bg-white/20 text-white' : dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                }`}>{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search + filters */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
                    <input
                        type="search"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search name, phone or ID"
                        className={`w-full pl-9 ${input}`}
                    />
                </div>
                <select value={courseId} onChange={e => { setCourseId(e.target.value); setBatchId(''); }} className={input} aria-label="Course">
                    <option value="">All courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={batchId} onChange={e => setBatchId(e.target.value)} className={input} aria-label="Batch">
                    <option value="">All batches</option>
                    {batchesForCourse.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>

            {/* WhatsApp reminder links */}
            {reminders && (
                <div className={`mt-4 rounded-xl border p-4 ${card}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className={`text-sm font-semibold ${strong}`}>
                                Reminders sent in the app to {plural(reminders.length, 'bill', 'bills')}.
                            </p>
                            <p className={`text-xs ${muted}`}>Open WhatsApp for each parent to send the message.</p>
                        </div>
                        <button type="button" onClick={() => setReminders(null)} aria-label="Dismiss" className={muted}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {reminders.length > 0 && (
                        <ul className={`mt-3 divide-y text-sm ${dark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {reminders.map(r => (
                                <li key={r.invoice_id} className="flex items-center justify-between gap-3 py-2">
                                    <span className="min-w-0">
                                        <span className={`font-medium ${strong}`}>{r.student_name}</span>
                                        <span className={muted}> · {formatRupees(r.amount)}{r.phone ? ` · ${r.phone}` : ''}</span>
                                    </span>
                                    {r.wa_link ? (
                                        <a
                                            href={r.wa_link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="whitespace-nowrap rounded-lg border border-green-600 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
                                        >
                                            Open WhatsApp
                                        </a>
                                    ) : (
                                        <span className={`text-xs ${muted}`}>No phone number</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* List */}
            <div className={`mt-4 overflow-hidden rounded-xl border ${card}`}>
                <div className={`flex items-center gap-3 border-b px-4 py-2 text-xs ${dark ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'} ${muted}`}>
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        disabled={selectableRows.length === 0}
                        aria-label="Select all students with unpaid bills"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                    />
                    <span>
                        {roster ? `${plural(rows.length, 'student', 'students')} · ${roster.period}` : 'Students'}
                        {loading && roster ? ' · updating…' : ''}
                    </span>
                </div>

                {error && (
                    <div className="px-4 py-10 text-center">
                        <p className={`text-sm ${dark ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
                        <button type="button" onClick={load} className={`mt-3 ${secondaryBtn}`}>Try again</button>
                    </div>
                )}

                {!error && loading && !roster && (
                    <ul className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {[0, 1, 2, 3].map(i => (
                            <li key={i} className="flex items-center gap-4 px-4 py-4 animate-pulse">
                                <div className="flex-1 space-y-2">
                                    <div className={`h-4 w-40 rounded ${dark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                                    <div className={`h-3 w-64 rounded ${dark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                                </div>
                                <div className={`h-9 w-32 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                            </li>
                        ))}
                    </ul>
                )}

                {!error && roster && rows.length === 0 && (
                    <div className="px-4 py-12 text-center">
                        <p className={`text-sm font-medium ${strong}`}>No students match.</p>
                        <p className={`mt-1 text-sm ${muted}`}>
                            {status || search || courseId || batchId ? 'Try a different status, search or filter.' : `No students found for ${roster.period}.`}
                        </p>
                    </div>
                )}

                {!error && roster && rows.length > 0 && (
                    <ul className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-100'} ${loading ? 'opacity-60' : ''}`}>
                        {rows.map(row => {
                            const isOpen = expanded.has(row.student_id);
                            const canSelect = unpaidBills(row).length > 0;
                            const amount = amountText(row);
                            const meta = [row.user_id, row.phone, row.parent_name ? `Parent: ${row.parent_name}` : null].filter(Boolean).join(' · ');
                            const gradesText = row.grades.map(g => `${g.course_name} · ${g.grade_name}`).join(', ');
                            return (
                                <li key={row.student_id} className={selected.has(row.student_id) ? (dark ? 'bg-indigo-900/20' : 'bg-indigo-50/60') : ''}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isOpen}
                                        onClick={() => toggleSet(setExpanded, row.student_id)}
                                        onKeyDown={e => {
                                            if (e.target !== e.currentTarget) return;
                                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSet(setExpanded, row.student_id); }
                                        }}
                                        className={`flex cursor-pointer flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center ${dark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <div className="flex h-5 w-4 items-center" onClick={e => e.stopPropagation()}>
                                                {canSelect && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(row.student_id)}
                                                        onChange={() => toggleSet(setSelected, row.student_id)}
                                                        aria-label={`Select ${row.name} for a WhatsApp reminder`}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                )}
                                            </div>
                                            {isOpen
                                                ? <ChevronDown className={`mt-0.5 h-4 w-4 flex-shrink-0 ${muted}`} />
                                                : <ChevronRight className={`mt-0.5 h-4 w-4 flex-shrink-0 ${muted}`} />}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`font-medium ${strong}`}>{row.name}</span>
                                                    {row.inactive && (
                                                        <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${dark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                {meta && <p className={`text-xs ${muted}`}>{meta}</p>}
                                                <p className={`text-xs ${gradesText ? (dark ? 'text-gray-300' : 'text-gray-600') : muted}`}>
                                                    {gradesText || 'No grade assigned'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 pl-7 sm:justify-end sm:pl-0">
                                            <div className="text-left sm:text-right">
                                                <StatusBadge status={row.status} label={row.status === 'no_bill' ? 'No bill' : undefined} />
                                                {amount && (
                                                    <p className={`mt-1 text-sm tabular-nums ${
                                                        row.status === 'overdue' ? (dark ? 'text-red-300' : 'text-red-700') : strong
                                                    }`}>{amount}</p>
                                                )}
                                            </div>
                                            {rowAction(row)}
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div className={`border-t px-4 py-3 sm:pl-16 ${dark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-100 bg-gray-50/70'}`}>
                                            {row.batch_names.length > 0 && (
                                                <p className={`mb-2 text-xs ${muted}`}>Batches: {row.batch_names.join(', ')}</p>
                                            )}
                                            {row.bills.length === 0 ? (
                                                <p className={`text-sm ${muted}`}>
                                                    {row.status === 'not_set_up'
                                                        ? 'No grade is assigned, so there is no monthly fee. Set a grade on the student profile.'
                                                        : `No bill for ${roster.period} yet.`}
                                                </p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {row.bills.map(bill => {
                                                        const original = Number(bill.original_amount || 0);
                                                        const discounted = Number(bill.discount_percentage || 0) > 0 && original > Number(bill.amount);
                                                        return (
                                                            <li key={bill.id} className={`rounded-lg border px-3 py-2 ${card}`}>
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <p className={`text-sm font-medium ${strong}`}>{bill.course_name}</p>
                                                                        <p className={`text-xs ${muted}`}>
                                                                            {[
                                                                                bill.prorated_from ? `Pro-rata from ${formatDayMonth(bill.prorated_from)}` : null,
                                                                                bill.due_date ? `Due ${formatDayMonth(bill.due_date)}` : null,
                                                                                discounted ? `${Number(bill.discount_percentage)}% discount` : null,
                                                                            ].filter(Boolean).join(' · ')}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-sm tabular-nums">
                                                                            {discounted && <span className={`mr-1.5 line-through ${muted}`}>{formatRupees(original)}</span>}
                                                                            <span className={`font-semibold ${strong}`}>{formatRupees(bill.amount)}</span>
                                                                        </span>
                                                                        <StatusBadge status={bill.status} />
                                                                    </div>
                                                                </div>
                                                                {bill.status === 'paid' && bill.receipt_number && (
                                                                    <p className={`mt-1.5 text-xs ${muted}`}>
                                                                        Receipt {bill.receipt_number} · {methodText(bill)}
                                                                        {bill.paid_at ? ` · ${formatDateTime(bill.paid_at, false)}` : ''}
                                                                        {' '}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setReceiptNo(bill.receipt_number)}
                                                                            className="ml-1 font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                                                        >
                                                                            View
                                                                        </button>
                                                                    </p>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                            <div className="mt-3">
                                                <button type="button" onClick={() => setAddBillFor({ student_id: row.student_id, name: row.name })}
                                                    className={secondaryBtn}>
                                                    + Add a bill
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Sticky reminder bar */}
            {selectedRows.length > 0 && (
                <div className="sticky bottom-4 z-20 mt-4">
                    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg ${card}`}>
                        <span className={`text-sm ${strong}`}>{plural(selectedRows.length, 'student', 'students')} selected</span>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setSelected(new Set())} className={secondaryBtn}>Clear</button>
                            <button
                                type="button"
                                onClick={doSendReminders}
                                disabled={sending}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {sending ? 'Sending…' : `Send WhatsApp reminder (${selectedRows.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CollectCashModal
                student={collectFor}
                onClose={collected => { setCollectFor(null); if (collected) load(); }}
                onViewReceipt={no => { setCollectFor(null); load(); setReceiptNo(no); }}
            />
            <AddBillModal
                student={addBillFor}
                period={roster?.period || period}
                onClose={created => { setAddBillFor(null); if (created) load(); }}
            />
            <ReceiptModal
                receiptNumber={receiptNo}
                onClose={() => setReceiptNo(null)}
                canReverse
                onReversed={() => load()}
            />
        </div>
    );
};

export default FeesRosterPanel;
