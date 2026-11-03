import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../Modal';
import { FormModalShell, Section, Field, FieldGrid, inputClass, selectClass, textareaClass } from '../FormModalShell';
import { formatRupees } from './feeUi';

// Admin -> Fees -> Extra bills. One-off bills beyond the monthly fee:
// costumes, grade-exam fees, events, book materials, uniforms, anything else.
// "Bill these students" bills everyone in the chosen group at once; "Families
// order it" offers an item (e.g. a uniform in sizes) that families order in
// the app. Each student's part is a normal bill, paid like the monthly fee.

interface Option { label: string; amount: number | null }
interface Charge {
    id: number; title: string; category: string; description: string | null; amount: number;
    due_date: string | null; mode: 'assigned' | 'orderable'; audience: { type: string; ids: number[] };
    options: Option[]; status: 'open' | 'closed'; created_by_name: string | null; created_at: string;
    audience_label: string; bills: number; paid: number; paid_amount: number; due_amount: number;
}
interface ChargeBill {
    id: number; student_id: number; student_name: string; user_id: string | null; phone: string | null;
    parent_name: string | null; amount: number; status: string; charge_option: string | null; quantity: number | null;
    receipt_number: string | null; payment_method: string | null; paid_at: string | null;
}
interface Named { id: number; name: string; sub?: string }

const json = async (r: Response) => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || `Request failed (${r.status})`);
    return d;
};
const get = (u: string) => fetch(u, { credentials: 'include' }).then(json);
const post = (u: string, body?: unknown) => fetch(u, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
}).then(json);

const showDate = (v?: string | null) => {
    if (!v) return '';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CATEGORY_STYLE: Record<string, string> = {
    Costume: 'bg-pink-100 text-pink-800', 'Grade exam fee': 'bg-indigo-100 text-indigo-800', Event: 'bg-amber-100 text-amber-800',
    'Book materials': 'bg-sky-100 text-sky-800', Uniform: 'bg-emerald-100 text-emerald-800', Other: 'bg-gray-100 text-gray-700',
};

const ExtraBillsPanel: React.FC = () => {
    const [charges, setCharges] = useState<Charge[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [show, setShow] = useState<'open' | 'closed' | 'all'>('open');

    const load = useCallback(async () => {
        try {
            const d = await get('/api/fee-charges');
            setCharges(d.charges || []); setCategories(d.categories || []); setError(null);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not load extra bills.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const visible = charges.filter(c => show === 'all' || c.status === show);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Costumes, grade-exam fees, events, books, uniforms — bills beyond the monthly fee.</p>
                    <p className="text-xs text-gray-500">They appear in each family's app under Fees and are paid like the monthly fee (screenshot, cash, UPI).</p>
                </div>
                <button type="button" onClick={() => setCreating(true)} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ New bill</button>
            </div>
            <div className="mb-3 flex gap-2">
                {(['open', 'closed', 'all'] as const).map(k => (
                    <button key={k} type="button" onClick={() => setShow(k)}
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${show === k ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
                        {k === 'open' ? 'Open' : k === 'closed' ? 'Closed' : 'All'}
                    </button>
                ))}
            </div>
            {message && <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
            {loading && <p className="py-8 text-center text-gray-500">Loading…</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {!loading && !error && visible.length === 0 && (
                <p className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">No {show === 'all' ? '' : show} extra bills yet.</p>
            )}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {visible.map(c => (
                    <button key={c.id} type="button" onClick={() => setOpenId(c.id)}
                        className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-gray-900 dark:text-white">{c.title}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_STYLE[c.category] || CATEGORY_STYLE.Other}`}>{c.category}</span>
                                    {c.status === 'closed' && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">Closed</span>}
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500">{c.audience_label} · {c.mode === 'orderable' ? 'Families order it' : 'Billed to students'}{c.due_date ? ` · due ${showDate(c.due_date)}` : ''}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{formatRupees(c.amount)}</div>
                                {c.options.length > 0 && <div className="text-xs text-gray-500">{c.options.map(o => o.label).join(' / ')}</div>}
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700"><div className="text-base font-bold text-gray-900 dark:text-white">{c.bills}</div>{c.mode === 'orderable' ? 'orders' : 'billed'}</div>
                            <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/30"><div className="text-base font-bold text-emerald-800 dark:text-emerald-200">{c.paid}</div>paid · {formatRupees(c.paid_amount)}</div>
                            <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/30"><div className="text-base font-bold text-amber-800 dark:text-amber-200">{c.bills - c.paid}</div>unpaid · {formatRupees(c.due_amount)}</div>
                        </div>
                    </button>
                ))}
            </div>

            {creating && (
                <NewBillForm categories={categories} onClose={() => setCreating(false)}
                    onCreated={async (msg) => { setCreating(false); setMessage(msg); await load(); }} />
            )}
            {openId !== null && (
                <ChargeDetail id={openId} onClose={() => setOpenId(null)} onChanged={async (msg) => { if (msg) setMessage(msg); await load(); }} />
            )}
        </div>
    );
};

// --- New bill ---------------------------------------------------------------

const NewBillForm: React.FC<{ categories: string[]; onClose: () => void; onCreated: (msg: string) => void }> = ({ categories, onClose, onCreated }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Costume');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [mode, setMode] = useState<'assigned' | 'orderable'>('assigned');
    const [options, setOptions] = useState<{ label: string; amount: string }[]>([]);
    const [audType, setAudType] = useState<'all' | 'course' | 'batch' | 'grade' | 'students'>('all');
    const [picked, setPicked] = useState<Set<number>>(new Set());
    const [lists, setLists] = useState<Record<string, Named[]>>({});
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const [courses, batches, grades, students] = await Promise.all([
                get('/api/courses').catch(() => []), get('/api/batches').catch(() => []),
                get('/api/grades').catch(() => []), get('/api/users?role=Student').catch(() => []),
            ]);
            setLists({
                course: courses.map((c: any) => ({ id: Number(c.id), name: c.name })),
                batch: batches.map((b: any) => ({ id: Number(b.id), name: b.batch_name, sub: b.course_name })),
                grade: grades.filter((g: any) => g.is_active !== false).map((g: any) => ({ id: Number(g.id), name: `${g.course_name || ''} · ${g.name}`, sub: g.monthly_fee ? formatRupees(Number(g.monthly_fee)) : '' })),
                students: students.map((u: any) => ({ id: Number(u.id), name: u.name, sub: [u.user_id, u.father_name && `Parent: ${u.father_name}`].filter(Boolean).join(' · ') })),
            });
        })();
    }, []);

    useEffect(() => { setPicked(new Set()); setSearch(''); }, [audType]);

    const choices = useMemo(() => {
        const all = lists[audType] || [];
        const q = search.trim().toLowerCase();
        return q ? all.filter(x => `${x.name} ${x.sub || ''}`.toLowerCase().includes(q)) : all;
    }, [lists, audType, search]);

    const toggle = (id: number) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError('Give the bill a title.'); return; }
        if (!(Number(amount) > 0)) { setError('Enter the amount.'); return; }
        if (audType !== 'all' && picked.size === 0) { setError('Choose who the bill is for.'); return; }
        if (mode === 'assigned' && !window.confirm(`Bill ${title} (${formatRupees(Number(amount))}) to ${audType === 'all' ? 'ALL active students' : 'the chosen students'} now?`)) return;
        setSaving(true); setError(null);
        try {
            const d = await post('/api/fee-charges', {
                title: title.trim(), category, amount: Number(amount), due_date: dueDate || null, description: description || null, mode,
                audience: { type: audType, ids: [...picked] },
                options: mode === 'orderable' ? options.filter(o => o.label.trim()).map(o => ({ label: o.label.trim(), amount: o.amount ? Number(o.amount) : null })) : [],
            });
            onCreated(mode === 'assigned'
                ? `${title} billed to ${d.students} student${d.students === 1 ? '' : 's'}.`
                : `${title} is open for ordering by ${d.students} student${d.students === 1 ? '' : 's'}' families.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create the bill.');
            setSaving(false);
        }
    };

    return (
        <FormModalShell isOpen onClose={onClose} onSubmit={submit} isSubmitting={saving}
            title="New extra bill" subtitle="Costume, grade-exam fee, event, books, uniform…"
            submitLabel={mode === 'assigned' ? 'Create and bill' : 'Open for ordering'}>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Section title="What">
                <FieldGrid>
                    <Field label="Title (families see this)" span={3} htmlFor="xb-title">
                        <input id="xb-title" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Annual Day costume" />
                    </Field>
                    <Field label="Category" span={3} htmlFor="xb-cat">
                        <select id="xb-cat" value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
                            {(categories.length ? categories : ['Costume', 'Grade exam fee', 'Event', 'Book materials', 'Uniform', 'Other']).map(c => <option key={c}>{c}</option>)}
                        </select>
                    </Field>
                    <Field label="Amount (₹ per student)" span={2} htmlFor="xb-amt">
                        <input id="xb-amt" type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Pay by (optional)" span={2} htmlFor="xb-due">
                        <input id="xb-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Details (optional)" span={6} htmlFor="xb-desc">
                        <textarea id="xb-desc" rows={2} value={description} onChange={e => setDescription(e.target.value)} className={textareaClass} />
                    </Field>
                </FieldGrid>
            </Section>
            <Section title="How">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {([['assigned', 'Bill these students', 'Everyone chosen gets the bill now (costume, exam fee, event).'],
                        ['orderable', 'Families order it', 'Shown in the app to order (uniform, books); billed when they order.']] as const).map(([k, t, d]) => (
                        <label key={k} className={`cursor-pointer rounded-lg border p-3 ${mode === k ? 'border-brand-primary bg-indigo-50' : 'border-gray-200'}`}>
                            <input type="radio" name="xb-mode" checked={mode === k} onChange={() => setMode(k)} className="mr-2" />
                            <span className="text-sm font-semibold">{t}</span>
                            <p className="mt-1 text-xs text-gray-500">{d}</p>
                        </label>
                    ))}
                </div>
                {mode === 'orderable' && (
                    <div className="mt-3">
                        <p className="mb-1 text-xs font-medium text-gray-600">Sizes / options (optional) — leave the price empty to use the amount above</p>
                        {options.map((o, i) => (
                            <div key={i} className="mb-2 flex gap-2">
                                <input value={o.label} onChange={e => setOptions(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="e.g. M" className={`${inputClass} w-40`} />
                                <input value={o.amount} type="number" min={1} onChange={e => setOptions(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} placeholder="Price (₹)" className={`${inputClass} w-32`} />
                                <button type="button" onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} className="text-sm text-red-600">Remove</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => setOptions(prev => [...prev, { label: '', amount: '' }])} className="text-sm font-medium text-brand-primary">+ Add size / option</button>
                    </div>
                )}
            </Section>
            <Section title="Who">
                <div className="mb-3 flex flex-wrap gap-2">
                    {([['all', 'All students'], ['course', 'By course'], ['batch', 'By batch'], ['grade', 'By grade'], ['students', 'Particular students']] as const).map(([k, t]) => (
                        <button key={k} type="button" onClick={() => setAudType(k)}
                            className={`rounded-full px-3 py-1 text-sm font-medium ${audType === k ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700'}`}>{t}</button>
                    ))}
                </div>
                {audType !== 'all' && (
                    <>
                        {(audType === 'students' || audType === 'batch' || audType === 'grade') && (
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className={`${inputClass} mb-2`} />
                        )}
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                            {choices.length === 0 && <p className="p-3 text-sm text-gray-500">Nothing to show.</p>}
                            {choices.map(x => (
                                <label key={x.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-50">
                                    <input type="checkbox" checked={picked.has(x.id)} onChange={() => toggle(x.id)} />
                                    <span className="text-sm">{x.name}{x.sub ? <span className="text-xs text-gray-500"> · {x.sub}</span> : null}</span>
                                </label>
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{picked.size} selected</p>
                    </>
                )}
            </Section>
        </FormModalShell>
    );
};

// --- One bill: who has paid ---------------------------------------------------

const ChargeDetail: React.FC<{ id: number; onClose: () => void; onChanged: (msg?: string) => void }> = ({ id, onClose, onChanged }) => {
    const [data, setData] = useState<{ charge: Charge; bills: ChargeBill[] } | null>(null);
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => get(`/api/fee-charges/${id}`).then(setData).catch(e => setError(e.message)), [id]);
    useEffect(() => { load(); }, [load]);

    const close = async () => {
        if (!data) return;
        if (!window.confirm(`Close "${data.charge.title}"? Unpaid bills from it are withdrawn and families can no longer order it. Paid bills stay.`)) return;
        setBusy(true);
        try {
            const d = await post(`/api/fee-charges/${id}/close`);
            onChanged(`${data.charge.title} closed — ${d.withdrawn} unpaid bill${d.withdrawn === 1 ? '' : 's'} withdrawn.`);
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not close.'); }
        finally { setBusy(false); }
    };

    const rows = (data?.bills || []).filter(b => filter === 'all' || (filter === 'paid' ? b.status === 'paid' : b.status !== 'paid'));
    const c = data?.charge;
    return (
        <Modal isOpen onClose={onClose} size="3xl">
            <div className="max-h-[85vh] overflow-y-auto bg-white p-5 dark:bg-gray-800">
                {!data && !error && <p className="py-8 text-center text-gray-500">Loading…</p>}
                {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                {c && (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                                <p className="text-sm text-gray-500">{c.category} · {formatRupees(c.amount)}{c.options.length ? ` · ${c.options.map(o => `${o.label}${o.amount ? ` ${formatRupees(o.amount)}` : ''}`).join(', ')}` : ''} · {c.audience_label}</p>
                                <p className="text-xs text-gray-500">{c.mode === 'orderable' ? 'Families order it' : 'Billed to students'}{c.due_date ? ` · due ${showDate(c.due_date)}` : ''}{c.created_by_name ? ` · by ${c.created_by_name}` : ''} · {showDate(c.created_at)}</p>
                                {c.description && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.description}</p>}
                            </div>
                            <div className="flex gap-2">
                                {c.status === 'open' && <button type="button" disabled={busy} onClick={close} className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">Close bill</button>}
                                <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Close</button>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            {(['all', 'paid', 'unpaid'] as const).map(k => (
                                <button key={k} type="button" onClick={() => setFilter(k)}
                                    className={`rounded-full px-3 py-1 text-sm ${filter === k ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700'}`}>
                                    {k === 'all' ? `All ${data.bills.length}` : k === 'paid' ? `Paid ${data.bills.filter(b => b.status === 'paid').length}` : `Unpaid ${data.bills.filter(b => b.status !== 'paid').length}`}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Collect unpaid ones under Fees → Collect cash / UPI screenshot, or when the family uploads a screenshot.</p>
                        <table className="mt-3 min-w-full text-sm">
                            <thead className="text-xs uppercase text-gray-500"><tr>{['Student', 'Option', 'Amount', 'Status'].map(h => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.length === 0 && <tr><td colSpan={4} className="px-2 py-6 text-center text-gray-500">{c.mode === 'orderable' ? 'No orders yet.' : 'Nothing here.'}</td></tr>}
                                {rows.map(b => (
                                    <tr key={b.id}>
                                        <td className="px-2 py-2"><div className="font-medium text-gray-900 dark:text-white">{b.student_name}</div><div className="text-xs text-gray-500">{[b.user_id, b.parent_name && `Parent: ${b.parent_name}`, b.phone].filter(Boolean).join(' · ')}</div></td>
                                        <td className="px-2 py-2 text-gray-600">{[b.charge_option, b.quantity && b.quantity > 1 ? `× ${b.quantity}` : ''].filter(Boolean).join(' ') || '—'}</td>
                                        <td className="px-2 py-2 font-semibold">{formatRupees(b.amount)}</td>
                                        <td className="px-2 py-2">
                                            {b.status === 'paid'
                                                ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Paid · {b.receipt_number}</span>
                                                : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold capitalize text-amber-800">{b.status}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ExtraBillsPanel;
