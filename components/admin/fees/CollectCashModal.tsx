import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { CollectCashResult, FamilyDue } from '../../../types';
import { collectCash, getFamilyDue } from '../../../api';
import { useTheme } from '../../../contexts/ThemeContext';
import { FeeModal, formatDateTime, formatRupees } from './feeUi';

interface CollectCashModalProps {
    /** Student whose family's unpaid bills are collected; null keeps the modal closed. */
    student: { student_id: number; name: string } | null;
    /** `collected` is true when a payment was recorded (the caller should refresh). */
    onClose: (collected: boolean) => void;
    onViewReceipt: (receiptNumber: string) => void;
}

const CollectCashModal: React.FC<CollectCashModalProps> = ({ student, onClose, onViewReceipt }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [family, setFamily] = useState<FamilyDue | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [result, setResult] = useState<CollectCashResult | null>(null);

    const studentId = student?.student_id ?? null;

    useEffect(() => {
        setFamily(null);
        setChecked(new Set());
        setSubmitError(null);
        setLoadError(null);
        setResult(null);
        if (studentId === null) return;
        let cancelled = false;
        setLoading(true);
        getFamilyDue(studentId)
            .then(data => {
                if (cancelled) return;
                setFamily(data);
                setChecked(new Set(data.bills.map(b => Number(b.id))));
            })
            .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load unpaid bills.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [studentId]);

    const total = useMemo(
        () => (family?.bills || []).filter(b => checked.has(Number(b.id))).reduce((s, b) => s + Number(b.amount || 0), 0),
        [family, checked],
    );

    const toggle = (id: number) => setChecked(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const close = useCallback(() => onClose(!!result), [onClose, result]);

    const submit = async () => {
        if (checked.size === 0 || submitting) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            setResult(await collectCash(Array.from(checked)));
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Could not record the cash payment.');
        } finally {
            setSubmitting(false);
        }
    };

    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const border = dark ? 'border-gray-700' : 'border-gray-200';
    const tag = (cls: string) => `inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`;

    return (
        <FeeModal open={!!student} onClose={close} title={result ? 'Cash collected' : `Collect cash — ${student?.name || ''}`}>
            {result ? (
                <div className="px-5 py-6">
                    <div className="flex flex-col items-center text-center">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${dark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'}`}>
                            <Check className="h-8 w-8" strokeWidth={3} />
                        </div>
                        <p className="mt-3 text-sm font-medium">Receipt {result.receipt_number}</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight">{formatRupees(result.total)}</p>
                        <p className={`mt-1 text-xs ${muted}`}>
                            Cash{result.collected_by_name ? ` · collected by ${result.collected_by_name}` : ''}
                            {result.paid_at ? ` · ${formatDateTime(result.paid_at)}` : ''}
                        </p>
                    </div>
                    <ul className={`mt-5 divide-y rounded-lg border text-sm ${border} ${dark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                        {result.lines.map(line => (
                            <li key={line.invoice_id} className="flex items-center justify-between gap-3 px-3 py-2">
                                <span className="min-w-0">
                                    <span className="font-medium">{line.student_name}</span>
                                    <span className={muted}> · {line.course_name} · {line.billing_period}</span>
                                </span>
                                <span className="whitespace-nowrap font-medium">{formatRupees(line.amount)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-5 flex gap-2">
                        <button
                            type="button"
                            onClick={() => onViewReceipt(result.receipt_number)}
                            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold ${dark ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            View receipt
                        </button>
                        <button
                            type="button"
                            onClick={close}
                            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            Done
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-5 py-5">
                    {loading && <p className={`py-8 text-center text-sm ${muted}`}>Loading unpaid bills…</p>}
                    {loadError && (
                        <div className={`rounded-lg border px-3 py-2 text-sm ${dark ? 'border-red-800 bg-red-900/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {loadError}
                        </div>
                    )}

                    {family && family.bills.length === 0 && (
                        <p className={`py-8 text-center text-sm ${muted}`}>Nothing to collect — this family has no unpaid bills.</p>
                    )}

                    {family && family.bills.length > 0 && (
                        <>
                            <p className={`text-sm ${muted}`}>All unpaid bills for this family. Untick any the parent is not paying today.</p>
                            <ul className={`mt-3 divide-y rounded-lg border ${border} ${dark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {family.bills.map(bill => {
                                    const id = Number(bill.id);
                                    const on = checked.has(id);
                                    return (
                                        <li key={id}>
                                            <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${on ? '' : 'opacity-60'} ${dark ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={on}
                                                    onChange={() => toggle(id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-sm font-medium">{bill.student_name}</span>
                                                        {bill.overdue && <span className={tag(dark ? 'border-red-800 bg-red-900/40 text-red-300' : 'border-red-200 bg-red-50 text-red-700')}>Overdue</span>}
                                                        {bill.prorated_from && <span className={tag(dark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600')}>Pro-rata</span>}
                                                    </span>
                                                    <span className={`block text-xs ${muted}`}>{bill.course_name} · {bill.billing_period}</span>
                                                </span>
                                                <span className="whitespace-nowrap text-sm font-semibold">{formatRupees(bill.amount)}</span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className={`mt-5 rounded-xl border px-4 py-4 text-center ${border} ${dark ? 'bg-gray-800/40' : 'bg-gray-50'}`}>
                                <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>
                                    Total · {checked.size} {checked.size === 1 ? 'bill' : 'bills'}
                                </p>
                                <p className="mt-1 text-3xl font-bold tracking-tight">{formatRupees(total)}</p>
                                <p className={`mt-2 text-xs ${muted}`}>
                                    {family.notify?.email
                                        ? `Receipt will be emailed to ${family.notify.name} (${family.notify.email})`
                                        : 'No email on file — the family gets an in-app notification.'}
                                </p>
                            </div>

                            {submitError && (
                                <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${dark ? 'border-red-800 bg-red-900/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                    {submitError}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={submit}
                                disabled={checked.size === 0 || submitting}
                                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? 'Recording…' : checked.size === 0 ? 'Select a bill to collect' : `Collect ${formatRupees(total)} in cash`}
                            </button>
                        </>
                    )}
                </div>
            )}
        </FeeModal>
    );
};

export default CollectCashModal;
