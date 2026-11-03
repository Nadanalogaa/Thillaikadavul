import React, { useCallback, useEffect, useState } from 'react';

// Admin -> Fees: payment screenshots families sent from the app, waiting to be
// checked against the bank. One card per screenshot — it may pay several bills
// (a family's "Pay all"). Approve marks every bill on it paid under one
// receipt; Reject tells the family why, and they can pay or upload again.

interface Bill { invoice_id: number; student_name: string; user_id: string; course_name: string; billing_period: string; amount: number }
interface Proof {
    key: string; payment_id: number; proof_url: string; transaction_id: string | null; payment_date: string | null;
    submitted_at: string; family: string; phone: string | null; total: number; bills: Bill[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const when = (v: string | null) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

const PaymentsToVerifyPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
    const [proofs, setProofs] = useState<Proof[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<number | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [zoom, setZoom] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const r = await fetch('/api/payment-proofs/pending', { credentials: 'include' });
            setProofs(r.ok ? await r.json() : []);
        } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const decide = async (p: Proof, status: 'approved' | 'rejected') => {
        let notes: string | null = null;
        if (status === 'rejected') {
            notes = window.prompt(`Why is ${p.family}'s screenshot not accepted? The family will see this.`, 'Payment not found in the bank account');
            if (notes === null) return;
        } else if (!window.confirm(`Mark ${p.bills.length === 1 ? 'this bill' : `these ${p.bills.length} bills`} paid (${inr(p.total)}) for ${p.family}?\n\nCheck the amount reached the bank first.`)) {
            return;
        }
        setBusy(p.payment_id); setMessage(null);
        try {
            const r = await fetch(`/api/invoice-payments/${p.payment_id}`, {
                method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.message || 'Could not save.');
            setMessage(status === 'approved'
                ? `${p.family}: ${inr(p.total)} marked paid${d.receipt_number ? ` — receipt ${d.receipt_number}` : ''}.`
                : `${p.family}: screenshot not accepted. They have been told why.`);
            await load();
            onChanged?.();
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Could not save.');
        } finally { setBusy(null); }
    };

    if (loading) return null;
    return (
        <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Payments to verify {proofs.length > 0 && <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{proofs.length}</span>}
                </h2>
                <button type="button" onClick={() => { setLoading(true); load(); }} className="text-sm font-medium text-brand-primary hover:underline">Refresh</button>
            </div>
            {message && <p className="mb-3 rounded-md bg-white px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">{message}</p>}
            {proofs.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No screenshots waiting. Families' UPI payments appear here after they upload the screenshot in the app.</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {proofs.map(p => (
                        <div key={p.key} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                            <button type="button" onClick={() => setZoom(p.proof_url)} className="flex-shrink-0" title="View screenshot">
                                <img src={p.proof_url} alt="Payment screenshot" className="h-28 w-20 rounded-md border object-cover" />
                            </button>
                            <div className="min-w-0 flex-1 text-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="truncate font-semibold text-gray-900 dark:text-white">{p.family}</div>
                                        <div className="text-xs text-gray-500">{[p.phone, `sent ${when(p.submitted_at)}`].filter(Boolean).join(' · ')}</div>
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{inr(p.total)}</div>
                                </div>
                                <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                                    {p.bills.map(b => <li key={b.invoice_id}>{b.student_name} · {b.course_name} · {b.billing_period} · <b>{inr(b.amount)}</b> <span className="text-gray-400">(bill {b.invoice_id})</span></li>)}
                                </ul>
                                {(p.transaction_id || p.payment_date) && (
                                    <div className="mt-1 text-xs text-gray-500">{[p.transaction_id && `UTR ${p.transaction_id}`, p.payment_date && `paid ${String(p.payment_date).slice(0, 10)}`].filter(Boolean).join(' · ')}</div>
                                )}
                                <div className="mt-2 flex gap-2">
                                    <button type="button" disabled={busy === p.payment_id} onClick={() => decide(p, 'approved')}
                                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Approve — mark paid</button>
                                    <button type="button" disabled={busy === p.payment_id} onClick={() => decide(p, 'rejected')}
                                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {zoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Payment screenshot">
                    <img src={zoom} alt="Payment screenshot" className="max-h-full max-w-full rounded-lg bg-white" />
                </div>
            )}
        </section>
    );
};

export default PaymentsToVerifyPanel;
