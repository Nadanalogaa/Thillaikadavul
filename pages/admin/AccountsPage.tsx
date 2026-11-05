import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Landmark, PiggyBank, Receipt, Scale, Users, Wallet } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { isSuperAdmin } from '../../utils/adminRole';

// Super admin -> Accounts: money in (fee payments approved, by the day paid)
// against money out (expenses), month by month, with where it came from and
// where it went.

interface Summary {
    from: string; to: string;
    months: { month: string; billed: number; collected: number; expenses: number; net: number }[];
    totals: { collected: number; expenses: number; net: number; margin: number | null; billed: number };
    expenses_by_category: { key: string; total: number }[];
    income_by_kind: { key: string; total: number }[];
    income_by_method: { key: string; total: number }[];
    by_location: { location: string; collected: number; expenses: number; net: number }[];
    outstanding: { amount: number; bills: number; students: number };
    people: { students: number; teachers: number; joined: number };
}

const rupees = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
const short = (n: number) => { const a = Math.abs(n); const s = n < 0 ? '−' : ''; return a >= 100000 ? `${s}₹${(a / 100000).toFixed(a >= 1000000 ? 0 : 1)}L` : a >= 1000 ? `${s}₹${Math.round(a / 1000)}k` : `${s}₹${Math.round(a)}`; };
const nowMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).slice(0, 7);
const addMonths = (m: string, n: number) => { const d = new Date(`${m}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const mLabel = (m: string, long = false) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', long ? { month: 'long', year: 'numeric' } : { month: 'short' });
const fyStart = () => { const m = nowMonth(); const y = Number(m.slice(0, 4)); return Number(m.slice(5)) >= 4 ? `${y}-04` : `${y - 1}-04`; };

type Preset = 'this' | '3' | '6' | '12' | 'fy' | 'custom';

const AccountsPage: React.FC = () => {
    const [preset, setPreset] = useState<Preset>('6');
    const [from, setFrom] = useState(addMonths(nowMonth(), -5));
    const [to, setTo] = useState(nowMonth());
    const [data, setData] = useState<Summary | null>(null);
    const [error, setError] = useState<string | null>(null);

    const choose = (p: Preset) => {
        setPreset(p);
        const t = nowMonth();
        if (p === 'this') { setFrom(t); setTo(t); }
        if (p === '3' || p === '6' || p === '12') { setFrom(addMonths(t, -(Number(p) - 1))); setTo(t); }
        if (p === 'fy') { setFrom(fyStart()); setTo(t); }
    };
    const load = useCallback(() => fetch(`/api/accounts/summary?from=${from}&to=${to}`, { credentials: 'include' })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Could not load.'); setData(d); setError(null); })
        .catch(e => setError(e.message)), [from, to]);
    useEffect(() => { load(); }, [load]);

    if (!isSuperAdmin()) {
        return <AdminLayout><AdminPageHeader title="Accounts" /><p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Accounts are for the super admin only.</p></AdminLayout>;
    }

    const t = data?.totals;
    const max = Math.max(1, ...(data?.months || []).flatMap(m => [m.collected, m.expenses]));
    const maxCat = Math.max(1, ...(data?.expenses_by_category || []).map(c => c.total));
    const Tile: React.FC<{ icon: React.ElementType; label: string; value: string; hint?: string; tone: string }> = ({ icon: Icon, label, value, hint, tone }) => (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>{label}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            {hint && <div className="text-xs text-gray-500">{hint}</div>}
        </div>
    );
    const card = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800';

    return (
        <AdminLayout>
            <AdminPageHeader title="Accounts" subtitle="Fees collected against expenses — the academy's overall picture." />
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {([['this', 'This month'], ['3', 'Last 3 months'], ['6', 'Last 6 months'], ['12', 'Last 12 months'], ['fy', 'This financial year'], ['custom', 'Custom']] as [Preset, string][]).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => choose(k)}
                        className={`rounded-full px-3 py-1 text-sm font-medium ${preset === k ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}>{l}</button>
                ))}
                {preset === 'custom' && (
                    <span className="flex items-center gap-1 text-sm"><input type="month" value={from} max={to} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900" /> to
                        <input type="month" value={to} min={from} max={nowMonth()} onChange={e => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900" /></span>
                )}
                <span className="ml-auto text-sm text-gray-500">{from === to ? mLabel(from, true) : `${mLabel(from, true)} – ${mLabel(to, true)}`}</span>
            </div>
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {!data && !error && <p className="py-10 text-center text-gray-500">Loading…</p>}
            {data && t && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        <Tile icon={ArrowDownRight} label="Fees collected" value={rupees(t.collected)} hint={`of ${rupees(t.billed)} billed`} tone="bg-emerald-50 text-emerald-600" />
                        <Tile icon={ArrowUpRight} label="Expenses" value={rupees(t.expenses)} hint={`${data.expenses_by_category.length} categories`} tone="bg-rose-50 text-rose-600" />
                        <Tile icon={Scale} label={t.net >= 0 ? 'Surplus' : 'Deficit'} value={rupees(t.net)} hint={t.margin == null ? '' : `${t.margin}% of what came in`} tone={t.net >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'} />
                        <Tile icon={Wallet} label="Still to collect" value={rupees(data.outstanding.amount)} hint={`${data.outstanding.students} students · ${data.outstanding.bills} bills`} tone="bg-amber-50 text-amber-600" />
                        <Tile icon={Users} label="Students" value={String(data.people.students)} hint={`${data.people.joined} joined in this period · ${data.people.teachers} teachers`} tone="bg-sky-50 text-sky-600" />
                    </div>

                    <section className={card}>
                        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Month by month</h3>
                            <span className="flex gap-3 text-xs text-gray-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Collected</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" />Expenses</span></span></div>
                        <div className="flex h-48 items-end gap-3 overflow-x-auto">
                            {data.months.map(m => (
                                <div key={m.month} className="flex h-full min-w-[3rem] flex-1 flex-col justify-end" title={`${mLabel(m.month, true)}: collected ${rupees(m.collected)}, expenses ${rupees(m.expenses)}, net ${rupees(m.net)}`}>
                                    <div className="flex h-full items-end justify-center gap-1">
                                        <div className="w-1/2 max-w-[1.5rem] rounded-t bg-emerald-500" style={{ height: `${(m.collected / max) * 100}%`, minHeight: m.collected ? 3 : 0 }} />
                                        <div className="w-1/2 max-w-[1.5rem] rounded-t bg-rose-400" style={{ height: `${(m.expenses / max) * 100}%`, minHeight: m.expenses ? 3 : 0 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 flex gap-3">{data.months.map(m => <div key={m.month} className="min-w-[3rem] flex-1 text-center"><div className="text-[11px] text-gray-500">{mLabel(m.month)}</div><div className={`text-[11px] font-semibold ${m.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{short(m.net)}</div></div>)}</div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-xs uppercase text-gray-500"><tr>{['Month', 'Billed', 'Collected', 'Expenses', 'Net'].map(h => <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {data.months.map(m => (
                                        <tr key={m.month}><td className="px-2 py-1.5">{mLabel(m.month, true)}</td><td className="px-2 py-1.5">{rupees(m.billed)}</td><td className="px-2 py-1.5 text-emerald-700">{rupees(m.collected)}</td>
                                            <td className="px-2 py-1.5 text-rose-700">{rupees(m.expenses)}</td><td className={`px-2 py-1.5 font-semibold ${m.net >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>{rupees(m.net)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <section className={`${card} lg:col-span-2`}>
                            <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Receipt className="h-4 w-4 text-rose-500" /> Where the money went</h3><Link to="/admin/expenses" className="text-xs font-semibold text-indigo-600">Expenses →</Link></div>
                            {data.expenses_by_category.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No expenses entered for this period.</p>}
                            <ul className="space-y-2">
                                {data.expenses_by_category.map(c => (
                                    <li key={c.key}>
                                        <div className="flex justify-between text-sm"><span className="text-gray-700 dark:text-gray-200">{c.key}</span><span className="font-semibold">{rupees(c.total)} <span className="text-xs font-normal text-gray-400">{t.expenses ? Math.round((c.total / t.expenses) * 100) : 0}%</span></span></div>
                                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-rose-400" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                        <section className={card}>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><PiggyBank className="h-4 w-4 text-emerald-500" /> Where it came from</h3>
                            {[...data.income_by_kind, ...data.income_by_method.map(x => ({ ...x, key: `Paid by ${x.key}` }))].map((x, i) => (
                                <div key={x.key} className={`flex justify-between py-1 text-sm ${i === data.income_by_kind.length ? 'mt-2 border-t border-gray-100 pt-2 dark:border-gray-700' : ''}`}><span className="text-gray-600 dark:text-gray-300">{x.key}</span><span className="font-medium">{rupees(x.total)}</span></div>
                            ))}
                            {data.income_by_kind.length === 0 && <p className="py-4 text-center text-sm text-gray-500">No payments in this period.</p>}
                        </section>
                    </div>

                    <section className={card}>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Landmark className="h-4 w-4 text-indigo-500" /> By location</h3>
                        <table className="min-w-full text-sm">
                            <thead className="text-xs uppercase text-gray-500"><tr>{['Location', 'Collected', 'Expenses', 'Net'].map(h => <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {data.by_location.map(l => (
                                    <tr key={l.location}><td className="px-2 py-1.5">{l.location}</td><td className="px-2 py-1.5">{rupees(l.collected)}</td><td className="px-2 py-1.5">{rupees(l.expenses)}</td>
                                        <td className={`px-2 py-1.5 font-semibold ${l.net >= 0 ? '' : 'text-red-600'}`}>{rupees(l.net)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="mt-2 text-xs text-gray-500">Fees count towards the location of the student's batch; "Not set" is a batch or expense with no location.</p>
                    </section>
                </div>
            )}
        </AdminLayout>
    );
};

export default AccountsPage;
