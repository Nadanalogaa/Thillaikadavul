import React from 'react';
import type { Batch } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

// Batches are where students, teachers and timings come together, so both
// "Add student" and "Add teacher" assign batches here instead of asking for
// timings again. Timings are shown read-only, straight from the batch.

const DAY_SHORT: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
    Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const formatTime = (value?: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(value || '');
    if (!m) return '';
    const h = Number(m[1]);
    return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};

/** "Mon, Wed · 5:00 PM – 6:30 PM", or "Timings not set". */
export const batchTiming = (batch: Batch): string => {
    const days = (batch.days || []).map(d => DAY_SHORT[d] || d).join(', ');
    const time = [formatTime(batch.startTime), formatTime(batch.endTime)].filter(Boolean).join(' – ');
    const text = [days, time].filter(Boolean).join(' · ');
    return text || 'Timings not set';
};

interface BatchPickerProps {
    batches: Batch[];
    selectedIds: string[];
    onToggle: (batchId: string) => void;
    /** 'teacher' warns when a batch already has a different teacher. */
    mode: 'teacher' | 'student';
    /** Only show batches of these course names (empty = show all). */
    courseFilter?: string[];
    emptyHint?: string;
}

const BatchPicker: React.FC<BatchPickerProps> = ({
    batches, selectedIds, onToggle, mode, courseFilter = [], emptyHint,
}) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';

    const visible = courseFilter.length > 0
        ? batches.filter(b => courseFilter.includes(b.courseName))
        : batches;

    if (visible.length === 0) {
        return (
            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {emptyHint || 'No batches yet. Create one under Batches.'}
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {visible.map(batch => {
                const isSelected = selectedIds.includes(batch.id);
                const hasTeacher = !!batch.teacherId && batch.teacherName !== 'Unassigned';
                const full = batch.capacity != null && (batch.enrolled || 0) >= batch.capacity;
                return (
                    <label
                        key={batch.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            isSelected
                                ? 'border-brand-primary bg-brand-light/50 dark:border-indigo-400 dark:bg-indigo-500/15'
                                : dark
                                    ? 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggle(batch.id)}
                            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-primary"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2">
                                <span className={`text-sm font-medium ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {batch.name}
                                </span>
                                <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {batch.courseName}{batch.mode ? ` · ${batch.mode}` : ''}
                                </span>
                            </div>
                            <div className={`mt-0.5 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {batchTiming(batch)}
                                {' · '}
                                {batch.enrolled || 0}{batch.capacity ? `/${batch.capacity}` : ''} students
                                {mode === 'student' && full && (
                                    <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">(full)</span>
                                )}
                            </div>
                            {mode === 'teacher' && (
                                hasTeacher ? (
                                    <div className={`mt-1 text-xs ${
                                        isSelected ? 'font-medium text-amber-600 dark:text-amber-400' : dark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        {isSelected
                                            ? `Replaces ${batch.teacherName} as the teacher`
                                            : `Currently taught by ${batch.teacherName}`}
                                    </div>
                                ) : (
                                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">No teacher yet</div>
                                )
                            )}
                        </div>
                    </label>
                );
            })}
        </div>
    );
};

export default BatchPicker;
