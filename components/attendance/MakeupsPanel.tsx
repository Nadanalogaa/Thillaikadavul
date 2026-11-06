import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getMakeups, scheduleMakeup, closeMakeup, reinstateClass, type MakeupRow } from '../../api';

// Make-up (compensation) classes: a cancelled class is "owed" until someone
// fixes the day, "scheduled" once it has a date and time (it can still be moved),
// and "done" when it has been held — marking attendance for the make-up closes
// it by itself, or "Mark as done" does. Families, the batch teacher and the
// admins are told at each step (Admin → Notifications → Class cancelled).

const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const makeupDay = (iso?: string | null) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return iso || '';
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
export const makeupTime = (t?: string | null) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    if (!m) return '';
    const h = Number(m[1]);
    return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};
export const makeupWhen = (r: Pick<MakeupRow, 'makeup_date' | 'start_time' | 'end_time'>) =>
    `${makeupDay(r.makeup_date)}${r.start_time ? `, ${makeupTime(r.start_time)}${r.end_time ? `–${makeupTime(r.end_time)}` : ''}` : ''}`;

const STATE_STYLE: Record<MakeupRow['state'], string> = {
    owed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    scheduled: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};
const STATE_LABEL: Record<MakeupRow['state'], string> = { owed: 'Owed · date not fixed', scheduled: 'Scheduled', done: 'Done' };

type Draft = { date: string; start: string; end: string };

const MakeupsPanel: React.FC<{ canUndo?: boolean; canSchedule?: boolean; onCount?: (open: number) => void; onChanged?: () => void }> = ({ canUndo = false, canSchedule = true, onCount, onChanged }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [rows, setRows] = useState<MakeupRow[] | null>(null);
    const [all, setAll] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft>({ date: '', start: '', end: '' });
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const card = `rounded-xl border p-4 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;
    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const strong = dark ? 'text-white' : 'text-gray-900';
    const outline = `rounded-md border px-3 py-1.5 text-sm font-medium ${dark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`;

    const load = async (history = all) => {
        try {
            const list = await getMakeups(history);
            setRows(list);
            onCount?.(list.filter(r => r.state !== 'done').length);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not load make-up classes'); }
    };
    useEffect(() => { load(all); }, [all]);

    const open = (r: MakeupRow) => {
        setEditing(r.id); setError(''); setNotice('');
        setDraft({ date: r.makeup_date || '', start: r.start_time || '', end: r.end_time || '' });
    };

    const run = async (id: number, fn: () => Promise<unknown>, done: string) => {
        setBusy(id); setError(''); setNotice('');
        try { await fn(); setEditing(null); setNotice(done); await load(); onChanged?.(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
        finally { setBusy(null); }
    };

    const save = (r: MakeupRow) => {
        if (!draft.date) { setError('Pick the date of the make-up class.'); return; }
        if (!!draft.start !== !!draft.end) { setError('Set both the start and end time, or leave both empty for the usual timing.'); return; }
        if (draft.start && draft.end && draft.end <= draft.start) { setError('The end time must be after the start time.'); return; }
        run(r.id, () => scheduleMakeup(r.id, draft.date, draft.start || undefined, draft.end || undefined),
            r.state === 'scheduled' ? 'Make-up moved. Families, the teacher and admins have been told.' : 'Make-up scheduled. Families, the teacher and admins have been told.');
    };
    const markDone = (r: MakeupRow) => {
        if (!window.confirm(`Mark the make-up for "${r.batch_name}" as done?\n\n(It closes by itself when attendance is marked for the make-up class.)`)) return;
        run(r.id, () => closeMakeup(r.id), 'Make-up marked as done.');
    };
    const undo = (r: MakeupRow) => {
        if (!window.confirm(`Undo the cancellation of "${r.batch_name}" on ${makeupDay(r.cancelled_date)}?\n\nThe class goes back to "not marked"${r.makeup_id ? ' and the planned make-up is removed' : ''}. Nothing is sent to families.`)) return;
        run(r.id, () => reinstateClass(r.id), 'Cancellation undone.');
    };

    const openRows = (rows || []).filter(r => r.state !== 'done');
    const owed = openRows.filter(r => r.state === 'owed').length;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={`text-sm ${muted}`}>
                    {rows === null ? 'Loading…'
                        : openRows.length === 0 ? 'No make-up classes pending.'
                        : `${owed} owed (date not fixed) · ${openRows.length - owed} scheduled.${canSchedule ? ' Fix or move the date any time — everyone is told.' : ' The academy fixes the date; you are told.'}`}
                </p>
                <div className={`flex rounded-lg border p-0.5 text-xs ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                    {([[false, 'Pending'], [true, 'All history']] as [boolean, string][]).map(([v, label]) => (
                        <button key={label} onClick={() => setAll(v)}
                            className={`rounded-md px-3 py-1 font-medium ${all === v ? 'bg-brand-primary text-white' : muted}`}>{label}</button>
                    ))}
                </div>
            </div>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
            {notice && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">{notice}</div>}

            {(rows || []).map(r => (
                <div key={r.id} className={card}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className={`font-semibold ${strong}`}>{r.batch_name}</p>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLE[r.state]}`}>{STATE_LABEL[r.state]}</span>
                            </div>
                            <p className={`mt-0.5 text-xs ${muted}`}>
                                {[r.course_name, r.teacher_name, `${r.students} students`].filter(Boolean).join(' · ')}
                            </p>
                            <p className={`mt-1 text-sm ${muted}`}>
                                Cancelled {makeupDay(r.cancelled_date)}{r.cancel_reason ? ` — ${r.cancel_reason}` : ''}
                            </p>
                            {r.makeup_date && (
                                <p className={`mt-0.5 text-sm font-medium ${r.state === 'done' ? muted : strong}`}>
                                    Make-up: {makeupWhen(r)}
                                </p>
                            )}
                            {r.state === 'done' && r.closed_by_name && <p className={`mt-0.5 text-xs ${muted}`}>Closed by {r.closed_by_name}</p>}
                        </div>
                        {r.state !== 'done' && editing !== r.id && (
                            <div className="flex flex-wrap gap-2">
                                {canSchedule && (
                                <button onClick={() => open(r)} className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                                    {r.state === 'scheduled' ? 'Change date' : 'Fix date'}
                                </button>
                                )}
                                {r.state === 'scheduled' && (
                                    <button onClick={() => markDone(r)} disabled={busy === r.id} className={outline}>Mark as done</button>
                                )}
                                {canUndo && (
                                    <button onClick={() => undo(r)} disabled={busy === r.id} title="Cancelled by mistake? Put the class back." className={outline}>Undo cancel</button>
                                )}
                            </div>
                        )}
                    </div>

                    {editing === r.id && (
                        <div className={`mt-3 rounded-lg p-3 ${dark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <label className={`text-xs font-medium ${muted}`}>Date
                                    <input type="date" min={localToday()} value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} className="form-input mt-1 w-full text-sm" />
                                </label>
                                <label className={`text-xs font-medium ${muted}`}>Starts
                                    <input type="time" value={draft.start} onChange={e => setDraft(d => ({ ...d, start: e.target.value }))} className="form-input mt-1 w-full text-sm" />
                                </label>
                                <label className={`text-xs font-medium ${muted}`}>Ends
                                    <input type="time" value={draft.end} onChange={e => setDraft(d => ({ ...d, end: e.target.value }))} className="form-input mt-1 w-full text-sm" />
                                </label>
                            </div>
                            <p className={`mt-2 text-xs ${muted}`}>Leave both times empty to keep the batch's usual timing.</p>
                            <div className="mt-3 flex justify-end gap-2">
                                <button onClick={() => setEditing(null)} className={outline}>Cancel</button>
                                <button onClick={() => save(r)} disabled={busy === r.id} className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                                    {busy === r.id ? 'Saving…' : r.state === 'scheduled' ? 'Move make-up' : 'Schedule make-up'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default MakeupsPanel;
