import React, { useState } from 'react';
import Modal from '../../Modal';
import type { FeeRosterRow } from '../../../types';
import { formatRupees } from './feeUi';

// One student's payment screenshot(s) waiting to be checked: the picture,
// the bills it pays, the UTR, and Approve (bill(s) paid, one receipt) or
// Reject (the family sees the reason and can upload again). A screenshot
// that also paid a brother's or sister's bill ("Pay all") is decided as one.

const ProofReviewModal: React.FC<{
    row: FeeRosterRow;
    onClose: () => void;
    onDone: (message: string) => void;
}> = ({ row, onClose, onDone }) => {
    const waiting = row.bills.filter(b => b.proof_status === 'submitted' && b.status !== 'paid');
    // One entry per screenshot (bills of a "Pay all" share the picture).
    const shots = [...new Map(waiting.map(b => [b.proof_url || `p${b.proof_payment_id}`, b])).values()];
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState<string | null>(null);
    const total = waiting.reduce((t, b) => t + b.amount, 0);

    const decide = async (status: 'approved' | 'rejected') => {
        let notes: string | null = null;
        if (status === 'rejected') {
            notes = window.prompt('Why is the screenshot not accepted? The family will see this.', 'Payment not found in the bank account');
            if (notes === null) return;
        }
        setBusy(true); setError(null);
        const receipts: string[] = [];
        try {
            for (const b of shots) {
                const r = await fetch(`/api/invoice-payments/${b.proof_payment_id}`, {
                    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status, notes }),
                });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(d.message || 'Could not save.');
                if (d.receipt_number) receipts.push(d.receipt_number);
            }
            onDone(status === 'approved'
                ? `${row.name}: ${formatRupees(total)} marked paid${receipts.length ? ` — receipt ${receipts.join(', ')}` : ''}. Any brother's or sister's bill on the same screenshot is paid too.`
                : `${row.name}: screenshot not accepted. The family has been told why.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save.');
            setBusy(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} size="2xl">
            <div className="bg-white p-5 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment screenshot · {row.name}</h3>
                <p className="text-sm text-gray-500">{[row.user_id, row.phone, row.parent_name && `Parent: ${row.parent_name}`].filter(Boolean).join(' · ')}</p>
                {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                {shots.length === 0 && <p className="mt-4 text-sm text-gray-600">No screenshot is waiting for this student.</p>}
                {shots.map(b => (
                    <div key={b.proof_payment_id} className="mt-4 flex gap-4">
                        {b.proof_url && (
                            <button type="button" onClick={() => setZoom(b.proof_url!)} title="Open full size" className="flex-shrink-0">
                                <img src={b.proof_url} alt="Payment screenshot" className="h-56 w-36 rounded-md border object-cover" />
                            </button>
                        )}
                        <div className="min-w-0 text-sm">
                            <div className="font-medium text-gray-900 dark:text-white">Bills on this screenshot</div>
                            <ul className="mt-1 space-y-0.5 text-gray-700 dark:text-gray-300">
                                {waiting.filter(x => (x.proof_url || `p${x.proof_payment_id}`) === (b.proof_url || `p${b.proof_payment_id}`)).map(x => (
                                    <li key={x.id}>{x.course_name} · <b>{formatRupees(x.amount)}</b> <span className="text-gray-400">(bill {x.id})</span></li>
                                ))}
                            </ul>
                            {b.proof_txn && <p className="mt-2 text-gray-600">UTR / reference: <b>{b.proof_txn}</b></p>}
                            {b.proof_submitted_at && <p className="text-xs text-gray-500">Sent {new Date(b.proof_submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>}
                            <p className="mt-2 text-xs text-gray-500">If it also paid a brother's or sister's bill, those are approved together.</p>
                        </div>
                    </div>
                ))}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 dark:border-gray-700">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total {formatRupees(total)}</span>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Close</button>
                        <button type="button" disabled={busy || shots.length === 0} onClick={() => decide('rejected')}
                            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                        <button type="button" disabled={busy || shots.length === 0} onClick={() => decide('approved')}
                            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                            {busy ? 'Saving…' : 'Approve — mark paid'}
                        </button>
                    </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Check the amount reached the bank before approving.</p>
            </div>
            {zoom && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setZoom(null)}>
                    <img src={zoom} alt="Payment screenshot" className="max-h-full max-w-full rounded-lg bg-white" />
                </div>
            )}
        </Modal>
    );
};

export default ProofReviewModal;
