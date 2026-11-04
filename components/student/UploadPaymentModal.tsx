import React, { useState } from 'react';
import Modal from '../Modal';

// Families pay the academy by UPI (or cash at the office) and upload the
// payment screenshot here; the academy checks it and marks the bill(s) paid.
// One screenshot can cover several bills ("Upload one screenshot for all").

export interface UploadBill { id: string | number; label: string; amount: number }

const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const UploadPaymentModal: React.FC<{
    bills: UploadBill[];
    upiId?: string | null;
    onClose: () => void;
    onDone: (message: string) => void;
}> = ({ bills, upiId, onClose, onDone }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [utr, setUtr] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const total = bills.reduce((t, b) => t + Number(b.amount || 0), 0);

    const pick = (f: File | null) => {
        setFile(f); setPreview(null); setError(null);
        if (f) { const r = new FileReader(); r.onload = () => setPreview(String(r.result)); r.readAsDataURL(f); }
    };

    const submit = async () => {
        if (!file) { setError('Choose the payment screenshot.'); return; }
        setBusy(true); setError(null);
        try {
            const fd = new FormData();
            fd.append('proof', file);
            fd.append('invoice_ids', bills.map(b => b.id).join(','));
            if (utr.trim()) fd.append('transaction_id', utr.trim());
            const r = await fetch('/api/payment-proofs', { method: 'POST', credentials: 'include', body: fd });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.message || 'Could not upload the screenshot.');
            onDone(`Screenshot sent for ${rupees(total)}. The academy will check it and mark ${bills.length === 1 ? 'the bill' : 'the bills'} paid.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not upload the screenshot.');
            setBusy(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} size="lg">
            <div className="max-h-[85vh] overflow-y-auto bg-white p-5 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload payment screenshot</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pay the academy by UPI (GPay, PhonePe, Paytm…) or cash at the office, then upload the screenshot.</p>

                <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm dark:divide-gray-700 dark:border-gray-700">
                    {bills.map(b => (
                        <li key={b.id} className="flex justify-between gap-3 px-3 py-2"><span className="text-gray-700 dark:text-gray-200">{b.label}</span><span className="font-semibold text-gray-900 dark:text-white">{rupees(b.amount)}</span></li>
                    ))}
                    <li className="flex justify-between gap-3 bg-gray-50 px-3 py-2 font-semibold dark:bg-gray-700/50"><span>Total to pay</span><span className="text-indigo-700 dark:text-indigo-300">{rupees(total)}</span></li>
                </ul>

                {upiId && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm dark:bg-indigo-900/30">
                        <span className="min-w-0"><span className="block text-xs text-gray-500">Academy UPI ID</span><span className="block truncate font-mono font-semibold text-gray-900 dark:text-white">{upiId}</span></span>
                        <button type="button" onClick={() => { navigator.clipboard?.writeText(upiId).then(() => setCopied(true)).catch(() => {}); }}
                            className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300">{copied ? 'Copied' : 'Copy'}</button>
                    </div>
                )}

                <div className="mt-4">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:border-indigo-400 dark:border-gray-600">
                        {preview ? <img src={preview} alt="Payment screenshot" className="max-h-56 rounded-lg" /> : <span className="text-sm text-gray-500">Choose the payment screenshot (photo or image)</span>}
                        <span className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">{file ? 'Change screenshot' : 'Choose screenshot'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0] || null)} />
                    </label>
                    <input value={utr} onChange={e => setUtr(e.target.value)} placeholder="UPI reference / UTR number (optional)"
                        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>

                {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div className="mt-5 flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-600 dark:text-gray-200">Cancel</button>
                    <button type="button" onClick={submit} disabled={busy || !file}
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? 'Sending…' : `Send screenshot · ${rupees(total)}`}</button>
                </div>
            </div>
        </Modal>
    );
};

export default UploadPaymentModal;
