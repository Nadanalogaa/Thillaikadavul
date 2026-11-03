import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Family home (website): extra bills from the academy (costumes, exam fees,
// events…) beyond this month's fee, and items the family can order for a
// student (uniforms, books). An order becomes a normal bill, paid the same way.

interface Opt { label: string; amount: number | null }
interface Orderable {
    id: number; title: string; category: string; description: string | null; amount: number; due_date: string | null;
    options: Opt[]; students: { id: number; name: string }[];
    orders: { id: number; student_id: number; student_name: string; charge_option: string | null; quantity: number; amount: number; status: string }[];
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const FamilyExtraBills: React.FC<{ otherDue: number; otherBills: number; dark: boolean; payLink?: string | null }> = ({ otherDue, otherBills, dark, payLink = 'payment-history' }) => {
    const [items, setItems] = useState<Orderable[]>([]);
    const [ordering, setOrdering] = useState<Orderable | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    // After an order the totals change; reload them here.
    const [totals, setTotals] = useState<{ due: number; bills: number } | null>(null);
    const due = totals ? totals.due : otherDue;
    const bills = totals ? totals.bills : otherBills;

    const load = useCallback(() => {
        fetch('/api/fee-charges-orderable', { credentials: 'include' })
            .then(r => (r.ok ? r.json() : [])).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([]));
    }, []);
    useEffect(() => { load(); }, [load]);
    const reloadTotals = () => fetch('/api/household/fees', { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null)).then(d => d && setTotals({ due: d.other_due || 0, bills: d.other_bills || 0 })).catch(() => {});

    if (bills === 0 && items.length === 0 && !msg) return null;
    const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const muted = dark ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`mt-3 p-4 rounded-2xl border ${card}`}>
            {bills > 0 && (
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Other bills</p>
                        <p className={`text-xs ${muted}`}>{bills} unpaid — costumes, exam fees, events, items ordered</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-amber-600">{rupees(due)}</p>
                        {payLink
                            ? <Link to={payLink} className="text-xs font-semibold text-indigo-600">See &amp; pay</Link>
                            : <p className={`text-xs ${muted}`}>Pay in the app or at the academy</p>}
                    </div>
                </div>
            )}
            {msg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
            {items.length > 0 && (
                <div className={bills > 0 ? 'mt-4 border-t pt-3 ' + (dark ? 'border-gray-700' : 'border-gray-100') : ''}>
                    <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Order from the academy</p>
                    <ul className="mt-2 space-y-2">
                        {items.map(it => (
                            <li key={it.id} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium ${dark ? 'text-gray-100' : 'text-gray-800'}`}>{it.title} <span className={`text-xs ${muted}`}>· {it.category}</span></p>
                                    <p className={`text-xs ${muted}`}>
                                        {rupees(it.amount)}{it.options.length ? ` · ${it.options.map(o => o.label).join(' / ')}` : ''}
                                        {it.orders.length ? ` · ordered: ${it.orders.map(o => `${o.student_name}${o.charge_option ? ` (${o.charge_option})` : ''}${o.status === 'paid' ? ' ✓' : ''}`).join(', ')}` : ''}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setOrdering(it)}
                                    className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">Order</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {ordering && (
                <OrderDialog item={ordering} dark={dark} onClose={() => setOrdering(null)}
                    onOrdered={m => { setOrdering(null); setMsg(m); load(); reloadTotals(); }} />
            )}
        </div>
    );
};

const OrderDialog: React.FC<{ item: Orderable; dark: boolean; onClose: () => void; onOrdered: (msg: string) => void }> = ({ item, dark, onClose, onOrdered }) => {
    const [student, setStudent] = useState(item.students[0]?.id ?? 0);
    const [option, setOption] = useState(item.options[0]?.label ?? '');
    const [qty, setQty] = useState(1);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const opt = item.options.find(o => o.label === option);
    const unit = opt && opt.amount ? Number(opt.amount) : item.amount;

    const submit = async () => {
        setBusy(true); setError(null);
        try {
            const r = await fetch(`/api/fee-charges/${item.id}/order`, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: student, option: option || undefined, quantity: qty }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.message || 'Could not place the order.');
            const who = item.students.find(s => s.id === student)?.name || '';
            onOrdered(`Ordered ${item.title}${option ? ` (${option})` : ''} for ${who}. ${rupees(unit * qty)} is added to your bills.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not place the order.');
            setBusy(false);
        }
    };

    const field = `mt-1 w-full rounded-lg border px-3 py-2 text-sm ${dark ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white'}`;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className={`w-full max-w-sm rounded-2xl p-5 ${dark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`} onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold">Order {item.title}</h3>
                {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
                {item.students.length > 1 && (
                    <label className="mt-3 block text-sm font-medium">For
                        <select value={student} onChange={e => setStudent(Number(e.target.value))} className={field}>
                            {item.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </label>
                )}
                {item.options.length > 0 && (
                    <div className="mt-3">
                        <p className="text-sm font-medium">Size / option</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {item.options.map(o => (
                                <button key={o.label} type="button" onClick={() => setOption(o.label)}
                                    className={`rounded-full border px-3 py-1 text-sm ${option === o.label ? 'border-indigo-600 bg-indigo-600 text-white' : dark ? 'border-gray-600' : 'border-gray-300'}`}>
                                    {o.label}{o.amount ? ` · ${rupees(Number(o.amount))}` : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <label className="mt-3 block text-sm font-medium">Quantity
                    <input type="number" min={1} max={20} value={qty} onChange={e => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className={field} />
                </label>
                {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div className="mt-5 flex gap-2">
                    <button type="button" onClick={onClose} className={`flex-1 rounded-lg border px-4 py-2 text-sm ${dark ? 'border-gray-600' : 'border-gray-300'}`}>Cancel</button>
                    <button type="button" disabled={busy || !student} onClick={submit}
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {busy ? 'Ordering…' : `Order · ${rupees(unit * qty)}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FamilyExtraBills;
