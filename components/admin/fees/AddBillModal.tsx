import React, { useEffect, useState } from 'react';
import { createBill } from '../../../api';
import { useTheme } from '../../../contexts/ThemeContext';
import { FeeModal, formatRupees } from './feeUi';

interface AddBillModalProps {
    student: { student_id: number; name: string } | null;
    period: string;
    onClose: (created: boolean) => void;
}

const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

// One-off bill for a student: an exam or costume fee, or a small test payment.
// It is created UNPAID and the family pays it like any other bill (online or cash).
const AddBillModal: React.FC<AddBillModalProps> = ({ student, period, onClose }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState(inDays(7));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (student) {
            setDescription('');
            setAmount('');
            setDueDate(inDays(7));
            setError(null);
        }
    }, [student]);

    const value = Number(amount);
    const valid = description.trim().length > 0 && Number.isFinite(value) && value > 0;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student || !valid || saving) return;
        setSaving(true);
        setError(null);
        try {
            await createBill({
                studentId: student.student_id,
                description: description.trim(),
                amount: Math.round(value),
                billingPeriod: period,
                dueDate,
            });
            onClose(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add the bill.');
        } finally {
            setSaving(false);
        }
    };

    const field = `mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
        dark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
    }`;
    const label = `block text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`;

    return (
        <FeeModal open={!!student} onClose={() => !saving && onClose(false)} title="Add a bill">
            <form onSubmit={submit} className="space-y-4">
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    For <span className={dark ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{student?.name}</span> · {period}.
                    The bill is created unpaid; the family pays it online or at the office like any other fee.
                </p>
                <div>
                    <label className={label} htmlFor="bill-desc">What is it for?</label>
                    <input id="bill-desc" className={field} value={description} autoFocus
                        onChange={e => setDescription(e.target.value)} placeholder="e.g. Exam fee, Costume, Test payment" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={label} htmlFor="bill-amount">Amount (₹)</label>
                        <input id="bill-amount" className={field} type="number" min={1} step={1} inputMode="numeric"
                            value={amount} onChange={e => setAmount(e.target.value)} placeholder="1" />
                    </div>
                    <div>
                        <label className={label} htmlFor="bill-due">Due date</label>
                        <input id="bill-due" className={field} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => onClose(false)} disabled={saving}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${dark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                        Cancel
                    </button>
                    <button type="submit" disabled={!valid || saving}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? 'Adding…' : valid ? `Add bill for ${formatRupees(Math.round(value))}` : 'Add bill'}
                    </button>
                </div>
            </form>
        </FeeModal>
    );
};

export default AddBillModal;
