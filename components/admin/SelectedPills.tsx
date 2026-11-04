import React, { useState } from 'react';

// Who is selected in a multi-select list, as small removable pills shown
// above the list — so the admin sees the names, not just "3 selected", even
// when a search hides some of them.

export interface PillItem { id: string | number; label: string }

const SHOW = 24;

const SelectedPills: React.FC<{
    items: PillItem[];
    onRemove: (id: string | number) => void;
    onClear?: () => void;
    noun?: string; // "student", "batch"…
}> = ({ items, onRemove, onClear, noun = 'student' }) => {
    const [all, setAll] = useState(false);
    if (items.length === 0) return null;
    const shown = all ? items : items.slice(0, SHOW);
    return (
        <div className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2 dark:border-indigo-900/60 dark:bg-indigo-900/20">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-indigo-800 dark:text-indigo-200">{items.length} {noun}{items.length === 1 ? '' : 's'} selected</span>
                {onClear && <button type="button" onClick={onClear} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">Clear all</button>}
            </div>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {shown.map(it => (
                    <span key={it.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-indigo-200 bg-white py-0.5 pl-2.5 pr-1 text-xs font-medium text-gray-800 dark:border-indigo-800 dark:bg-gray-800 dark:text-gray-100">
                        <span className="truncate">{it.label}</span>
                        <button type="button" onClick={() => onRemove(it.id)} aria-label={`Remove ${it.label}`}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600">×</button>
                    </span>
                ))}
                {!all && items.length > SHOW && (
                    <button type="button" onClick={() => setAll(true)} className="rounded-full px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300">+{items.length - SHOW} more</button>
                )}
            </div>
        </div>
    );
};

export default SelectedPills;
