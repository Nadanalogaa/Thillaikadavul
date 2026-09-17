import React, { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import type { FeeReceipt } from '../../../types';
import { getReceipt, reverseReceipt } from '../../../api';
import { useTheme } from '../../../contexts/ThemeContext';
import { ACADEMY_NAME, FeeModal, StatusBadge, formatDateTime, formatRupees } from './feeUi';

interface ReceiptModalProps {
    /** Receipt to show; null keeps the modal closed. */
    receiptNumber: string | null;
    onClose: () => void;
    /** Admin only: allow reversing a paid receipt. */
    canReverse?: boolean;
    /** Called after a successful reversal so the parent can refresh its data. */
    onReversed?: (receiptNumber: string) => void;
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #fee-receipt-print, #fee-receipt-print * { visibility: visible !important; }
  #fee-receipt-print {
    position: absolute !important; left: 0 !important; top: 0 !important;
    width: 100% !important; max-width: none !important; max-height: none !important;
    overflow: visible !important; border: none !important; box-shadow: none !important;
    background: #fff !important; color: #000 !important;
  }
  #fee-receipt-print * { color: #000 !important; background: transparent !important; border-color: #d1d5db !important; }
  #fee-receipt-print .fee-no-print { display: none !important; }
}
`;

const ReceiptModal: React.FC<ReceiptModalProps> = ({ receiptNumber, onClose, canReverse = false, onReversed }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [receipt, setReceipt] = useState<FeeReceipt | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [reverseOpen, setReverseOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [reversing, setReversing] = useState(false);
    const [reverseError, setReverseError] = useState<string | null>(null);

    const load = useCallback(async (no: string) => {
        setLoading(true);
        setError(null);
        try {
            setReceipt(await getReceipt(no));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load the receipt.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setReceipt(null);
        setReverseOpen(false);
        setReason('');
        setReverseError(null);
        if (receiptNumber) load(receiptNumber);
    }, [receiptNumber, load]);

    const doReverse = async () => {
        if (!receipt) return;
        if (!reason.trim()) { setReverseError('Please enter a reason for reversing this receipt.'); return; }
        setReversing(true);
        setReverseError(null);
        try {
            await reverseReceipt(receipt.receipt_number, reason.trim());
            setReverseOpen(false);
            setReason('');
            await load(receipt.receipt_number);
            onReversed?.(receipt.receipt_number);
        } catch (e) {
            setReverseError(e instanceof Error ? e.message : 'Could not reverse the receipt.');
        } finally {
            setReversing(false);
        }
    };

    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const border = dark ? 'border-gray-700' : 'border-gray-200';

    return (
        <FeeModal open={!!receiptNumber} onClose={onClose} title="Receipt" maxWidth="max-w-xl" panelId="fee-receipt-print">
            <style>{PRINT_CSS}</style>
            <div className="px-5 py-5">
                {loading && !receipt && <p className={`py-10 text-center text-sm ${muted}`}>Loading receipt…</p>}
                {error && (
                    <div className={`rounded-lg border px-3 py-2 text-sm ${dark ? 'border-red-800 bg-red-900/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
                        {error}
                    </div>
                )}

                {receipt && (
                    <>
                        <div className={`flex items-start justify-between gap-3 border-b pb-4 ${border}`}>
                            <div>
                                <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>{ACADEMY_NAME}</p>
                                <p className="mt-1 text-lg font-semibold">Fee receipt</p>
                                <p className="mt-0.5 font-mono text-sm">{receipt.receipt_number}</p>
                            </div>
                            <StatusBadge status={receipt.status} label={receipt.status === 'reversed' ? 'Reversed' : 'Paid'} />
                        </div>

                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 py-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className={muted}>Payment method</dt>
                                <dd className="font-medium">{receipt.method_label || receipt.method || '—'}</dd>
                            </div>
                            <div>
                                <dt className={muted}>Date &amp; time</dt>
                                <dd className="font-medium">{formatDateTime(receipt.paid_at) || '—'}</dd>
                            </div>
                            {receipt.collected_by_name && (
                                <div>
                                    <dt className={muted}>Collected by</dt>
                                    <dd className="font-medium">{receipt.collected_by_name}</dd>
                                </div>
                            )}
                            {receipt.transaction_id && (
                                <div>
                                    <dt className={muted}>Transaction ID</dt>
                                    <dd className="font-mono text-xs break-all">{receipt.transaction_id}</dd>
                                </div>
                            )}
                        </dl>

                        {receipt.status === 'reversed' && (
                            <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${dark ? 'border-red-800 bg-red-900/30 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                                Reversed on {formatDateTime(receipt.reversed_at) || '—'}
                                {receipt.reversed_by_name ? ` by ${receipt.reversed_by_name}` : ''}
                                {receipt.reversal_reason ? `: ${receipt.reversal_reason}` : ''}
                            </div>
                        )}

                        <div className={`overflow-x-auto rounded-lg border ${border}`}>
                            <table className="min-w-full text-sm">
                                <thead className={dark ? 'bg-gray-800/60' : 'bg-gray-50'}>
                                    <tr className={`text-left text-xs uppercase tracking-wide ${muted}`}>
                                        <th className="px-3 py-2 font-medium">Student</th>
                                        <th className="px-3 py-2 font-medium">Course</th>
                                        <th className="px-3 py-2 font-medium">Month</th>
                                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${dark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                    {receipt.lines.map(line => (
                                        <tr key={line.invoice_id}>
                                            <td className="px-3 py-2">{line.student_name}</td>
                                            <td className="px-3 py-2">{line.course_name}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{line.billing_period}</td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap">{formatRupees(line.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className={`border-t ${border}`}>
                                        <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
                                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatRupees(receipt.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {canReverse && receipt.status === 'paid' && reverseOpen && (
                            <div className={`fee-no-print mt-4 rounded-lg border p-3 ${dark ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50/60'}`}>
                                <label htmlFor="fee-reverse-reason" className="block text-sm font-medium">
                                    Why are you reversing this receipt?
                                </label>
                                <p className={`mt-0.5 text-xs ${muted}`}>The bills go back to unpaid. This is recorded with your name.</p>
                                <textarea
                                    id="fee-reverse-reason"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={3}
                                    required
                                    className={`mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                        dark ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                                    }`}
                                    placeholder="e.g. Counted wrong note, entered for the wrong student"
                                />
                                {reverseError && <p className={`mt-1 text-sm ${dark ? 'text-red-300' : 'text-red-700'}`}>{reverseError}</p>}
                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setReverseOpen(false); setReverseError(null); }}
                                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={doReverse}
                                        disabled={reversing || !reason.trim()}
                                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {reversing ? 'Reversing…' : `Reverse ${formatRupees(receipt.total)}`}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="fee-no-print mt-5 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                {canReverse && receipt.status === 'paid' && !reverseOpen && (
                                    <button
                                        type="button"
                                        onClick={() => setReverseOpen(true)}
                                        className={`text-sm font-medium ${dark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} hover:underline`}
                                    >
                                        Reverse receipt
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${dark ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                >
                                    <Printer className="h-4 w-4" /> Print
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </FeeModal>
    );
};

export default ReceiptModal;
