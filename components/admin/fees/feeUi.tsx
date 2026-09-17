import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { FeeRosterStatus } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';

export const ACADEMY_NAME = 'Nadanaloga Fine Arts Academy';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

/** ₹ with en-IN grouping and no decimals, e.g. ₹1,35,000 */
export const formatRupees = (value: number | string | null | undefined): string =>
    `₹${Math.round(Number(value || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar parts of a date in Asia/Kolkata. Plain "YYYY-MM-DD" strings are taken as-is (no timezone shift). */
const istParts = (value: string) => {
    const m = DATE_ONLY.exec(value);
    if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: null as number | null, minute: 0, pm: false };
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
    }).formatToParts(d);
    const get = (t: string) => parts.find(p => p.type === t)?.value || '';
    return {
        year: Number(get('year')), month: Number(get('month')), day: Number(get('day')),
        hour: Number(get('hour')), minute: Number(get('minute')), pm: get('dayPeriod').toLowerCase() === 'pm',
    };
};

/** "10 Sep" */
export const formatDayMonth = (value: string | null | undefined): string => {
    if (!value) return '';
    const p = istParts(value);
    return p ? `${p.day} ${MONTHS_SHORT[p.month - 1]}` : '';
};

/** "10 Sep 2026" */
export const formatDate = (value: string | null | undefined): string => {
    if (!value) return '';
    const p = istParts(value);
    return p ? `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}` : '';
};

/** "17 Sep 2026, 10:42 am" (Asia/Kolkata) */
export const formatDateTime = (value: string | null | undefined, withYear = true): string => {
    if (!value) return '';
    const p = istParts(value);
    if (!p) return '';
    const date = `${p.day} ${MONTHS_SHORT[p.month - 1]}${withYear ? ` ${p.year}` : ''}`;
    if (p.hour === null) return date;
    return `${date}, ${p.hour}:${String(p.minute).padStart(2, '0')} ${p.pm ? 'pm' : 'am'}`;
};

/** Current month + previous 11, e.g. ["September 2026", "August 2026", …] (Asia/Kolkata calendar). */
export const recentBillingPeriods = (count = 12): string[] => {
    const p = istParts(new Date().toISOString());
    let year = p ? p.year : new Date().getFullYear();
    let month = p ? p.month - 1 : new Date().getMonth();
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
        out.push(`${MONTHS[month]} ${year}`);
        month -= 1;
        if (month < 0) { month = 11; year -= 1; }
    }
    return out;
};

export const STATUS_LABEL: Record<FeeRosterStatus, string> = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    partly_paid: 'Partly paid',
    no_bill: 'Bill not generated',
    not_set_up: 'Fee not set up',
};

export const statusBadgeClass = (status: string, theme: string): string => {
    const dark = theme === 'dark';
    switch (status) {
        case 'paid': return dark ? 'bg-green-900/40 text-green-300 border-green-800' : 'bg-green-50 text-green-700 border-green-200';
        case 'overdue': return dark ? 'bg-red-900/40 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200';
        case 'partly_paid': return dark ? 'bg-amber-900/40 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200';
        case 'pending': return dark ? 'bg-indigo-900/40 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'reversed': return dark ? 'bg-red-900/40 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200';
        default: return dark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200';
    }
};

export const StatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => {
    const { theme } = useTheme();
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status, theme)}`}>
            {label || STATUS_LABEL[status as FeeRosterStatus] || status}
        </span>
    );
};

interface FeeModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    /** id on the panel (e.g. to mark it for printing). */
    panelId?: string;
}

/** Simple centered modal: overlay click and Escape close it. */
export const FeeModal: React.FC<FeeModalProps> = ({ open, onClose, title, children, maxWidth = 'max-w-lg', panelId }) => {
    const { theme } = useTheme();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    // Portal to <body> so a transformed ancestor (page animations) can't offset the overlay.
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="fee-no-print absolute inset-0 bg-black/50" onClick={onClose} />
            <div
                id={panelId}
                className={`relative w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-xl ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                }`}
            >
                <div className={`fee-no-print sticky top-0 z-10 flex items-center justify-between border-b px-5 py-3 ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                    <h2 className="text-base font-semibold">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={`rounded-md p-1.5 ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
};
