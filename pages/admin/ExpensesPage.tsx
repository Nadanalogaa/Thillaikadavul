import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Car, Coffee, FileText, Hammer, Home, Lightbulb, Megaphone, Package, Paperclip, Plus, Receipt, Search,
    Shirt, ShoppingCart, Sparkles, Trash2, Users, Wifi, Droplets, CreditCard, CalendarDays, MonitorSmartphone, PartyPopper,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/Modal';
import { isSuperAdmin } from '../../utils/adminRole';

// Admin -> Expenses: everything the academy spends (teacher fees, rent,
// electricity, travel, materials, tea & snacks, procurement…). Any admin adds
// and edits; only the super admin deletes. Recurring costs paid last month but
// not yet this month are listed with a one-click "Add".

interface Expense {
    id: number; expense_date: string; category: string; particulars: string; amount: number; paid_to: string | null;
    payment_mode: string | null; location_id: number | null; location_name: string | null; teacher_id: number | null;
    teacher_name: string | null; for_month: string | null; reference_no: string | null; reference_url: string | null;
    reference_name: string | null; notes: string | null; created_by_name: string | null; created_at: string;
    updated_by_name: string | null; updated_at: string | null;
}
interface Group { key: string; total: number; count: number }
interface Meta {
    categories: string[]; recurring: string[]; payment_modes: string[]; locations: { id: number; name: string }[];
    teachers: { id: number; name: string }[]; paid_to: string[]; this_month: string;
    due: (Expense & { last_month: string })[];
}
interface ListData { rows: Expense[]; total: number; count: number; by_category: Group[]; by_month: Group[]; by_location: Group[]; by_mode: Group[] }

const rupees = (n: number) => `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const shortMonth = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' });
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const addMonths = (m: string, n: number) => { const d = new Date(`${m}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const lastDay = (m: string) => { const d = new Date(`${addMonths(m, 1)}-01T12:00:00Z`); d.setUTCDate(0); return d.toISOString().slice(0, 10); };

const ICONS: [RegExp, React.ElementType, string][] = [
    [/teacher|salary/i, Users, 'bg-indigo-50 text-indigo-600'], [/rent/i, Home, 'bg-amber-50 text-amber-600'],
    [/electric/i, Lightbulb, 'bg-yellow-50 text-yellow-600'], [/water|maint/i, Droplets, 'bg-sky-50 text-sky-600'],
    [/internet|phone/i, Wifi, 'bg-cyan-50 text-cyan-600'], [/travel|convey/i, Car, 'bg-orange-50 text-orange-600'],
    [/material|suppl/i, Package, 'bg-emerald-50 text-emerald-600'], [/costume|prop/i, Shirt, 'bg-pink-50 text-pink-600'],
    [/tea|snack/i, Coffee, 'bg-rose-50 text-rose-600'], [/procure|equip/i, ShoppingCart, 'bg-violet-50 text-violet-600'],
    [/repair/i, Hammer, 'bg-stone-100 text-stone-600'], [/event|programme/i, PartyPopper, 'bg-fuchsia-50 text-fuchsia-600'],
    [/print|market/i, Megaphone, 'bg-lime-50 text-lime-700'], [/software|subscri/i, MonitorSmartphone, 'bg-blue-50 text-blue-600'],
    [/bank|charge/i, CreditCard, 'bg-slate-100 text-slate-600'], [/house/i, Sparkles, 'bg-teal-50 text-teal-600'],
];
const iconFor = (cat: string) => ICONS.find(([re]) => re.test(cat)) || [/./, Receipt, 'bg-gray-100 text-gray-600'] as const;
const CatIcon: React.FC<{ cat: string; size?: string }> = ({ cat, size = 'h-9 w-9' }) => {
    const [, Icon, tone] = iconFor(cat);
    return <span className={`flex ${size} shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>;
};

const ExpensesPage: React.FC = () => {
    const canDelete = isSuperAdmin();
    const [meta, setMeta] = useState<Meta | null>(null);
    const [data, setData] = useState<ListData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<'month' | 'custom'>('month');
    const [month, setMonth] = useState(today().slice(0, 7));
    const [from, setFrom] = useState(`${today().slice(0, 7)}-01`);
    const [to, setTo] = useState(today());
    const [category, setCategory] = useState('');
    const [locationId, setLocationId] = useState('');
    const [q, setQ] = useState('');
    const [editing, setEditing] = useState<Partial<Expense> | null>(null);
    const [viewing, setViewing] = useState<Expense | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const period = range === 'month' ? { from: `${month}-01`, to: lastDay(month) } : { from, to };
    const loadMeta = useCallback(() => fetch('/api/expenses/meta', { credentials: 'include' }).then(r => r.json()).then(setMeta).catch(() => {}), []);
    const load = useCallback(() => {
        const p = new URLSearchParams({ from: period.from, to: period.to });
        if (category) p.set('category', category);
        if (locationId) p.set('location_id', locationId);
        if (q.trim()) p.set('q', q.trim());
        return fetch(`/api/expenses?${p}`, { credentials: 'include' })
            .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Could not load.'); setData(d); setError(null); })
            .catch(e => setError(e.message));
    }, [period.from, period.to, category, locationId, q]);
    useEffect(() => { loadMeta(); }, [loadMeta]);
    useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

    const byDate = useMemo(() => {
        const m = new Map<string, Expense[]>();
        for (const r of data?.rows || []) { if (!m.has(r.expense_date)) m.set(r.expense_date, []); m.get(r.expense_date)!.push(r); }
        return [...m.entries()];
    }, [data]);
    const maxCat = Math.max(1, ...(data?.by_category || []).map(c => c.total));

    const afterSave = (msg: string) => { setEditing(null); setViewing(null); setNotice(msg); load(); loadMeta(); };
    const del = async (e: Expense) => {
        if (!window.confirm(`Delete "${e.particulars}" (${rupees(e.amount)})? It is removed from all totals.`)) return;
        const r = await fetch(`/api/expenses/${e.id}`, { method: 'DELETE', credentials: 'include' });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { window.alert(d.message || 'Could not delete.'); return; }
        afterSave('Expense deleted.');
    };

    const input = 'rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';
    return (
        <AdminLayout>
            <AdminPageHeader title="Expenses" subtitle="Teacher fees, rent, electricity, travel, materials, tea & snacks, procurement…" />

            {notice && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{notice}</p>}

            {/* Period, filters, add */}
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    {(['month', 'custom'] as const).map(k => (
                        <button key={k} type="button" onClick={() => setRange(k)}
                            className={`rounded-md px-3 py-1 text-sm font-medium ${range === k ? 'bg-white text-brand-primary shadow-sm dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300'}`}>{k === 'month' ? 'Month' : 'Dates'}</button>
                    ))}
                </div>
                {range === 'month' ? (
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="rounded-md px-2 py-1 text-lg text-gray-500 hover:bg-gray-100" aria-label="Previous month">‹</button>
                        <span className="min-w-[9rem] text-center text-sm font-semibold text-gray-900 dark:text-white">{monthLabel(month)}</span>
                        <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= today().slice(0, 7)} className="rounded-md px-2 py-1 text-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Next month">›</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-sm"><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={input} /> to <input type="date" value={to} onChange={e => setTo(e.target.value)} className={input} /></div>
                )}
                <select value={category} onChange={e => setCategory(e.target.value)} className={input}>
                    <option value="">All categories</option>
                    {(meta?.categories || []).map(c => <option key={c}>{c}</option>)}
                </select>
                {(meta?.locations.length || 0) > 0 && (
                    <select value={locationId} onChange={e => setLocationId(e.target.value)} className={input}>
                        <option value="">All locations</option>
                        {meta!.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                )}
                <label className="relative flex-1 min-w-[10rem]"><Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search particulars, payee, bill no." className={`${input} w-full pl-8`} /></label>
                <button type="button" onClick={() => setEditing({ expense_date: today() })}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"><Plus className="h-4 w-4" /> Add expense</button>
            </div>

            {/* Recurring costs not yet entered this month */}
            {meta && meta.due.length > 0 && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200"><CalendarDays className="h-4 w-4" /> Not yet entered for {monthLabel(meta.this_month)}</div>
                    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {meta.due.map((d, i) => (
                            <li key={i} className="flex items-center gap-3 rounded-xl bg-white p-2.5 dark:bg-gray-800">
                                <CatIcon cat={d.category} size="h-8 w-8" />
                                <span className="min-w-0 flex-1 text-sm">
                                    <span className="block truncate font-medium text-gray-900 dark:text-white">{[d.category, d.teacher_name, d.location_name, d.paid_to].filter(Boolean).join(' · ')}</span>
                                    <span className="block text-xs text-gray-500">Last {rupees(d.amount)} for {shortMonth(d.last_month)}</span>
                                </span>
                                <button type="button" onClick={() => setEditing({
                                    expense_date: today(), category: d.category, particulars: d.particulars, amount: d.amount, paid_to: d.paid_to,
                                    payment_mode: d.payment_mode, location_id: d.location_id, teacher_id: d.teacher_id, for_month: meta.this_month,
                                })} className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200">Add</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Totals */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:order-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Spent · {range === 'month' ? monthLabel(month) : `${dayLabel(from)} – ${dayLabel(to)}`}</div>
                    <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{data ? rupees(data.total) : '…'}</div>
                    <div className="text-xs text-gray-500">{data?.count || 0} entries</div>
                    <ul className="mt-4 space-y-2">
                        {(data?.by_category || []).map(c => (
                            <li key={c.key}>
                                <button type="button" onClick={() => setCategory(category === c.key ? '' : c.key)} className="block w-full text-left">
                                    <div className="flex items-center justify-between text-sm"><span className={`truncate ${category === c.key ? 'font-semibold text-brand-primary' : 'text-gray-700 dark:text-gray-200'}`}>{c.key}</span><span className="font-semibold text-gray-900 dark:text-white">{rupees(c.total)}</span></div>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {(data?.by_location.length || 0) > 1 && (
                        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">By location</div>
                            {data!.by_location.map(l => <div key={l.key} className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{l.key === '—' ? 'Not set' : l.key}</span><span className="font-medium">{rupees(l.total)}</span></div>)}
                        </div>
                    )}
                    {(data?.by_mode.length || 0) > 0 && (
                        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Paid by</div>
                            {data!.by_mode.map(l => <div key={l.key} className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{l.key === '—' ? 'Not set' : l.key}</span><span className="font-medium">{rupees(l.total)}</span></div>)}
                        </div>
                    )}
                </section>

                {/* List */}
                <section className="space-y-4 lg:order-1 lg:col-span-2">
                    {data && data.rows.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
                            No expenses for this period yet. <button type="button" onClick={() => setEditing({ expense_date: today() })} className="font-semibold text-brand-primary">Add one</button>
                        </div>
                    )}
                    {byDate.map(([date, rows]) => (
                        <div key={date}>
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <span>{dayLabel(date)}</span><span>{rupees(rows.reduce((t, r) => t + r.amount, 0))}</span>
                            </div>
                            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                                {rows.map(r => (
                                    <li key={r.id}>
                                        <button type="button" onClick={() => setViewing(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <CatIcon cat={r.category} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{r.particulars}</span>
                                                <span className="block truncate text-xs text-gray-500">{[r.category, r.teacher_name, r.paid_to, r.location_name, r.payment_mode, r.for_month && `for ${shortMonth(r.for_month)}`].filter(Boolean).join(' · ')}</span>
                                            </span>
                                            {r.reference_url && <Paperclip className="h-4 w-4 shrink-0 text-gray-400" aria-label="Has a document" />}
                                            <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">{rupees(r.amount)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>
            </div>

            {viewing && (
                <Modal isOpen onClose={() => setViewing(null)} size="lg">
                    <div className="bg-white p-5 dark:bg-gray-800">
                        <div className="flex items-start gap-3">
                            <CatIcon cat={viewing.category} size="h-11 w-11" />
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{viewing.particulars}</h3>
                                <p className="text-sm text-gray-500">{viewing.category} · {dayLabel(viewing.expense_date)}</p>
                            </div>
                            <div className="text-right text-xl font-bold text-gray-900 dark:text-white">{rupees(viewing.amount)}</div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {([['Paid to', viewing.paid_to], ['Paid by', viewing.payment_mode], ['Location', viewing.location_name], ['Teacher', viewing.teacher_name],
                                ['For month', viewing.for_month && monthLabel(viewing.for_month)], ['Bill / ref no.', viewing.reference_no]] as [string, string | null][])
                                .filter(([, v]) => v).map(([k, v]) => <React.Fragment key={k}><dt className="text-gray-500">{k}</dt><dd className="text-gray-900 dark:text-white">{v}</dd></React.Fragment>)}
                        </dl>
                        {viewing.notes && <p className="mt-3 rounded-lg bg-gray-50 p-2 text-sm text-gray-700 dark:bg-gray-700/50 dark:text-gray-200">{viewing.notes}</p>}
                        {viewing.reference_url && (
                            <a href={viewing.reference_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:text-indigo-300">
                                <FileText className="h-4 w-4" /> {viewing.reference_name || 'View document'}
                            </a>
                        )}
                        <p className="mt-3 text-xs text-gray-500">Added by {viewing.created_by_name || '—'}{viewing.updated_by_name ? ` · edited by ${viewing.updated_by_name}` : ''}</p>
                        <div className="mt-4 flex justify-end gap-2">
                            {canDelete && <button type="button" onClick={() => del(viewing)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button>}
                            <button type="button" onClick={() => setViewing(null)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:text-gray-200">Close</button>
                            <button type="button" onClick={() => { setEditing(viewing); setViewing(null); }} className="rounded-lg bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white">Edit</button>
                        </div>
                        {!canDelete && <p className="mt-2 text-right text-xs text-gray-400">Only the super admin can delete an expense.</p>}
                    </div>
                </Modal>
            )}
            {editing && meta && <ExpenseForm expense={editing} meta={meta} onClose={() => setEditing(null)} onSaved={afterSave} />}
        </AdminLayout>
    );
};

// --- Add / edit -----------------------------------------------------------------

const ExpenseForm: React.FC<{ expense: Partial<Expense>; meta: Meta; onClose: () => void; onSaved: (msg: string) => void }> = ({ expense, meta, onClose, onSaved }) => {
    const known = !expense.category || meta.categories.includes(expense.category);
    const [f, setF] = useState({
        expense_date: expense.expense_date || today(), category: known ? (expense.category || '') : '__other', other: known ? '' : (expense.category || ''),
        particulars: expense.particulars || '', amount: expense.amount ? String(expense.amount) : '', paid_to: expense.paid_to || '',
        payment_mode: expense.payment_mode || '', location_id: expense.location_id ? String(expense.location_id) : '',
        teacher_id: expense.teacher_id ? String(expense.teacher_id) : '', for_month: expense.for_month || '', reference_no: expense.reference_no || '', notes: expense.notes || '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [removeRef, setRemoveRef] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }));
    const category = f.category === '__other' ? f.other.trim() : f.category;
    const isTeacher = /teacher|salary/i.test(category);
    const isRecurring = meta.recurring.includes(category);

    const submit = async (e: React.FormEvent, confirmDuplicate = false) => {
        e.preventDefault();
        setBusy(true); setError(null);
        const fd = new FormData();
        fd.append('expense_date', f.expense_date); fd.append('category', category); fd.append('particulars', f.particulars);
        fd.append('amount', f.amount); fd.append('paid_to', f.paid_to); fd.append('payment_mode', f.payment_mode);
        fd.append('location_id', f.location_id); fd.append('teacher_id', isTeacher ? f.teacher_id : ''); fd.append('for_month', f.for_month);
        fd.append('reference_no', f.reference_no); fd.append('notes', f.notes);
        if (file) fd.append('reference', file);
        if (removeRef) fd.append('remove_reference', 'yes');
        if (confirmDuplicate) fd.append('confirm_duplicate', 'yes');
        try {
            const r = await fetch(expense.id ? `/api/expenses/${expense.id}` : '/api/expenses', { method: expense.id ? 'PUT' : 'POST', credentials: 'include', body: fd });
            const d = await r.json().catch(() => ({}));
            if (r.status === 409 && d.duplicate) {
                setBusy(false);
                if (window.confirm(d.message)) submit(e, true);
                return;
            }
            if (!r.ok) throw new Error(d.message || 'Could not save.');
            onSaved(expense.id ? 'Expense updated.' : `Added ${f.particulars} · ₹${Number(f.amount).toLocaleString('en-IN')}.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.');
            setBusy(false);
        }
    };

    const fld = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';
    const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-200';
    return (
        <Modal isOpen onClose={onClose} size="2xl">
            <form onSubmit={submit} className="max-h-[88vh] overflow-y-auto bg-white p-5 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{expense.id ? 'Edit expense' : 'Add expense'}</h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={lbl}>Date of purchase / payment
                        <input type="date" required max={today()} value={f.expense_date} onChange={e => set('expense_date', e.target.value)} className={fld} /></label>
                    <label className={lbl}>Amount (₹)
                        <input type="number" required min="0.01" step="0.01" inputMode="decimal" value={f.amount} onChange={e => set('amount', e.target.value)} className={fld} placeholder="0" /></label>
                    <label className={lbl}>Category
                        <select required value={f.category} onChange={e => set('category', e.target.value)} className={fld}>
                            <option value="">Choose…</option>
                            {meta.categories.map(c => <option key={c}>{c}</option>)}
                            <option value="__other">Other (type a new one)…</option>
                        </select></label>
                    {f.category === '__other'
                        ? <label className={lbl}>New category<input required value={f.other} onChange={e => set('other', e.target.value)} className={fld} placeholder="e.g. Annual day hall booking" /></label>
                        : <label className={lbl}>Payment mode
                            <select value={f.payment_mode} onChange={e => set('payment_mode', e.target.value)} className={fld}>
                                <option value="">—</option>{meta.payment_modes.map(m => <option key={m}>{m}</option>)}
                            </select></label>}
                    <label className={`${lbl} sm:col-span-2`}>Particulars (what was bought or paid for)
                        <input required value={f.particulars} onChange={e => set('particulars', e.target.value)} className={fld} placeholder="e.g. Studio rent, EB bill, ghungroos x 6, tea & biscuits" /></label>
                    <label className={lbl}>Paid to (person / shop)
                        <input list="xp-payees" value={f.paid_to} onChange={e => set('paid_to', e.target.value)} className={fld} placeholder="e.g. TNEB, landlord, Saravana Stores" />
                        <datalist id="xp-payees">{meta.paid_to.map(p => <option key={p} value={p} />)}</datalist></label>
                    {f.category === '__other' && (
                        <label className={lbl}>Payment mode
                            <select value={f.payment_mode} onChange={e => set('payment_mode', e.target.value)} className={fld}>
                                <option value="">—</option>{meta.payment_modes.map(m => <option key={m}>{m}</option>)}
                            </select></label>
                    )}
                    <label className={lbl}>Location
                        <select value={f.location_id} onChange={e => set('location_id', e.target.value)} className={fld}>
                            <option value="">Not specific</option>{meta.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select></label>
                    {isTeacher && (
                        <label className={lbl}>Teacher
                            <select value={f.teacher_id} onChange={e => set('teacher_id', e.target.value)} className={fld}>
                                <option value="">Choose…</option>{meta.teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select></label>
                    )}
                    {(isRecurring || f.for_month) && (
                        <label className={lbl}>For month <span className="font-normal text-gray-400">(which month this pays)</span>
                            <input type="month" value={f.for_month} onChange={e => set('for_month', e.target.value)} className={fld} /></label>
                    )}
                    <label className={lbl}>Bill / receipt no. <span className="font-normal text-gray-400">(optional)</span>
                        <input value={f.reference_no} onChange={e => set('reference_no', e.target.value)} className={fld} /></label>
                    <div className={`${lbl} sm:col-span-2`}>Reference document <span className="font-normal text-gray-400">(optional — bill, receipt, photo; PDF or image)</span>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600">
                                {file ? 'Change file' : 'Choose file'}
                                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setRemoveRef(false); }} />
                            </label>
                            {file && <span className="text-xs text-gray-600">{file.name}</span>}
                            {!file && expense.reference_url && !removeRef && (
                                <><a href={expense.reference_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">{expense.reference_name || 'Current document'}</a>
                                    <button type="button" onClick={() => setRemoveRef(true)} className="text-xs text-red-600">Remove</button></>
                            )}
                        </div>
                    </div>
                    <label className={`${lbl} sm:col-span-2`}>Notes <span className="font-normal text-gray-400">(optional)</span>
                        <textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} className={fld} /></label>
                </div>
                {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-200">Cancel</button>
                    <button type="submit" disabled={busy} className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : expense.id ? 'Save changes' : 'Add expense'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default ExpensesPage;
