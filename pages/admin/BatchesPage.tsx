import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/Modal';
import { fetchInsights, NotInBatchList, type Insights } from '../../components/admin/AdminInsights';
import { FormModalShell, InlineFormShell, Section, Field, FieldGrid, inputClass, selectClass } from '../../components/admin/FormModalShell';
import { useTheme } from '../../contexts/ThemeContext';
import {
    AdminBatch, AdminStudent, BatchInput, NamedItem, TimeSlot, WEEK_DAYS,
    listBatches, listStudents, listTeachers, listCourses, listLocations,
    createBatch, updateBatchDetails, setBatchStudents, removeBatch, moveStudent, slotLines,
} from '../../services/batchAdminApi';

// Admin -> Batches. Grid or table of every batch with its teacher, class
// times and student count up front; open one to see its students and move,
// remove or add them. Membership is batches.student_ids (see batchAdminApi).

type View = 'grid' | 'table';
const VIEW_KEY = 'admin.batches.view';
const readView = (): View => {
    try { return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid'; } catch { return 'grid'; }
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const Avatar: React.FC<{ name: string; photoUrl?: string; size?: number }> = ({ name, photoUrl, size = 36 }) => {
    const [broken, setBroken] = useState(false);
    const style = { width: size, height: size };
    if (photoUrl && !broken) {
        return <img src={photoUrl} alt="" style={style} onError={() => setBroken(true)} className="flex-shrink-0 rounded-full object-cover" />;
    }
    return (
        <span style={style} className="flex flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {initials(name)}
        </span>
    );
};

const ModePill: React.FC<{ mode: string }> = ({ mode }) => {
    if (!mode) return null;
    const m = mode.toLowerCase();
    const cls = m === 'online' ? 'bg-sky-100 text-sky-800' : m === 'hybrid' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{mode}</span>;
};

const BatchesPage: React.FC = () => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const strong = dark ? 'text-white' : 'text-gray-900';

    const [batches, setBatches] = useState<AdminBatch[]>([]);
    const [students, setStudents] = useState<AdminStudent[]>([]);
    const [teachers, setTeachers] = useState<NamedItem[]>([]);
    const [courses, setCourses] = useState<NamedItem[]>([]);
    const [locations, setLocations] = useState<NamedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [view, setView] = useState<View>(readView);
    const [search, setSearch] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [teacherFilter, setTeacherFilter] = useState('');
    // /admin/batches/<id> is one batch's own page (the list stays at /admin/batches).
    // An old ?open=<id> link is turned into that page.
    const navigate = useNavigate();
    const { batchId } = useParams();
    const openId = Number(batchId) || null;
    const setOpenId = (id: number | null) => navigate(id ? `/admin/batches/${id}` : '/admin/batches');
    useEffect(() => {
        const legacy = Number(new URLSearchParams(window.location.search).get('open'));
        if (legacy) navigate(`/admin/batches/${legacy}`, { replace: true });
    }, [navigate]);
    // Editing on a batch's page happens in the page, not a full-screen pop-up.
    const [editingInline, setEditingInline] = useState(false);
    useEffect(() => { setEditingInline(false); }, [openId]);
    const [editing, setEditing] = useState<AdminBatch | 'new' | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [b, s, t, c, l] = await Promise.all([
                listBatches(), listStudents(), listTeachers(), listCourses(), listLocations().catch(() => []),
            ]);
            setBatches(b); setStudents(s); setTeachers(t); setCourses(c); setLocations(l);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load batches.');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    // Students taking a course with no batch for it (shown above the batches).
    const [unplaced, setUnplaced] = useState<Insights['not_in_batch'] | null>(null);
    const [showUnplaced, setShowUnplaced] = useState(false);
    const loadUnplaced = useCallback(() => fetchInsights().then(d => setUnplaced(d.not_in_batch)).catch(() => {}), []);
    useEffect(() => { loadUnplaced(); }, [loadUnplaced]);

    const chooseView = (v: View) => {
        setView(v);
        try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ }
    };

    const studentById = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return batches
            .filter(b => !courseFilter || String(b.courseId) === courseFilter)
            .filter(b => !teacherFilter || String(b.teacherId) === teacherFilter)
            .filter(b => {
                if (!q) return true;
                if (`${b.name} ${b.teacherName} ${b.courseName}`.toLowerCase().includes(q)) return true;
                return b.studentIds.some(id => (studentById.get(id)?.name || '').toLowerCase().includes(q));
            })
            .sort((a, c) => a.courseName.localeCompare(c.courseName) || a.name.localeCompare(c.name, undefined, { numeric: true }));
    }, [batches, search, courseFilter, teacherFilter, studentById]);

    const grouped = useMemo(() => {
        const map = new Map<string, AdminBatch[]>();
        for (const b of filtered) {
            const k = b.courseName || 'No course';
            map.set(k, [...(map.get(k) || []), b]);
        }
        return [...map.entries()];
    }, [filtered]);

    const totals = useMemo(() => {
        const placed = new Set(batches.flatMap(b => b.studentIds));
        return { batches: batches.length, placed: placed.size, unplaced: students.filter(s => !placed.has(s.id)).length };
    }, [batches, students]);

    const openBatch = batches.find(b => b.id === openId) || null;

    const replaceBatch = (b: AdminBatch) => setBatches(prev => prev.map(x => (x.id === b.id ? { ...x, ...b } : x)));

    const afterSave = async (saved: AdminBatch) => {
        setEditing(null);
        setEditingInline(false);
        setBatches(await listBatches());
        setOpenId(saved.id);
        if (saved.repricedBills) {
            window.alert(`${saved.repricedBills} unpaid bill${saved.repricedBills === 1 ? '' : 's'} for this month updated to the new fee.`);
        }
    };

    // --- rendering helpers -------------------------------------------------
    const Timing: React.FC<{ b: AdminBatch; compact?: boolean }> = ({ b, compact }) => {
        const lines = slotLines(b.timeSlots);
        if (!lines.length) return <span className="text-amber-600">Times not set</span>;
        return (
            <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
                {lines.map(l => <div key={l} className="whitespace-nowrap">{l}</div>)}
            </div>
        );
    };
    const count = (b: AdminBatch) => `${b.studentIds.length}${b.maxStudents ? ` / ${b.maxStudents}` : ''}`;

    const renderGrid = () => (
        <div className="space-y-8">
            {grouped.map(([course, list]) => (
                <section key={course}>
                    <h2 className={`mb-3 text-lg font-semibold ${strong}`}>{course} <span className={`text-sm font-normal ${muted}`}>· {list.length} {list.length === 1 ? 'batch' : 'batches'}</span></h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {list.map(b => (
                            <button key={b.id} type="button" onClick={() => setOpenId(b.id)}
                                className={`flex flex-col rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md ${card}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className={`font-semibold ${strong}`}>{b.name}</h3>
                                    <ModePill mode={b.mode} />
                                </div>
                                {(b.locationName || b.studio) && (
                                    <p className={`mt-0.5 text-xs ${muted}`}>{[b.locationName, b.studio].filter(Boolean).join(' · ')}</p>
                                )}
                                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                    <div className={`col-span-3 flex items-center gap-2 rounded-lg px-3 py-2 ${dark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                                        <span className="text-xs font-medium uppercase tracking-wide text-indigo-500">Teacher</span>
                                        <span className={`truncate font-semibold ${b.teacherName ? (dark ? 'text-indigo-200' : 'text-indigo-900') : 'text-amber-600'}`}>
                                            {b.teacherName || 'Not assigned'}
                                        </span>
                                    </div>
                                    <div className={`col-span-2 rounded-lg px-3 py-2 ${dark ? 'bg-gray-700/60' : 'bg-gray-50'}`}>
                                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Class times</div>
                                        <div className={`mt-0.5 font-medium ${strong}`}><Timing b={b} compact /></div>
                                    </div>
                                    <div className={`rounded-lg px-3 py-2 text-center ${dark ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
                                        <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">Students</div>
                                        <div className={`mt-0.5 text-2xl font-bold ${dark ? 'text-emerald-200' : 'text-emerald-800'}`}>{count(b)}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );

    const renderTable = () => (
        <div className={`overflow-x-auto rounded-xl border shadow-sm ${card}`}>
            <table className="min-w-full text-sm">
                <thead className={dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}>
                    <tr>
                        {['Batch', 'Course', 'Teacher', 'Class times', 'Students', 'Mode', ''].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className={dark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                    {filtered.map(b => (
                        <tr key={b.id} onClick={() => setOpenId(b.id)} className={`cursor-pointer ${dark ? 'hover:bg-gray-700/60' : 'hover:bg-indigo-50/40'}`}>
                            <td className={`px-4 py-3 font-semibold ${strong}`}>{b.name}</td>
                            <td className={`px-4 py-3 ${muted}`}>{b.courseName}</td>
                            <td className="px-4 py-3">
                                <span className={`rounded-md px-2 py-1 font-semibold ${b.teacherName ? (dark ? 'bg-indigo-900/50 text-indigo-200' : 'bg-indigo-50 text-indigo-900') : 'text-amber-600'}`}>
                                    {b.teacherName || 'Not assigned'}
                                </span>
                            </td>
                            <td className={`px-4 py-3 font-medium ${strong}`}><Timing b={b} compact /></td>
                            <td className="px-4 py-3">
                                <span className={`rounded-md px-2 py-1 text-base font-bold ${dark ? 'bg-emerald-900/50 text-emerald-200' : 'bg-emerald-50 text-emerald-800'}`}>{count(b)}</span>
                            </td>
                            <td className="px-4 py-3"><ModePill mode={b.mode} /></td>
                            <td className="px-4 py-3 text-right">
                                <button type="button" onClick={e => { e.stopPropagation(); setEditing(b); }} className="text-sm font-medium text-brand-primary hover:underline">Edit</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // One batch's own page: back to the list, switch batch, edit in place.
    if (openId) {
        const byCourse = new Map<string, AdminBatch[]>();
        for (const b of [...batches].sort((a, c) => a.name.localeCompare(c.name, undefined, { numeric: true }))) {
            const k = b.courseName || 'Other';
            if (!byCourse.has(k)) byCourse.set(k, []);
            byCourse.get(k)!.push(b);
        }
        return (
            <AdminLayout>
                <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-sm ${card}`}>
                    <Link to="/admin/batches" className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold ${dark ? 'text-indigo-300 hover:bg-gray-700' : 'text-brand-primary hover:bg-indigo-50'}`}>
                        ← All batches
                    </Link>
                    <label className="flex min-w-0 items-center gap-2 text-sm">
                        <span className={muted}>Switch batch</span>
                        <select value={openId} onChange={e => setOpenId(Number(e.target.value))} className={`${selectClass} max-w-xs`}>
                            {[...byCourse.entries()].map(([course, list]) => (
                                <optgroup key={course} label={course}>
                                    {list.map(b => <option key={b.id} value={b.id}>{b.name} · {b.studentIds.length} students</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </label>
                </div>
                {loading && <p className={`py-10 text-center ${muted}`}>Loading batch…</p>}
                {!loading && !openBatch && (
                    <p className={`rounded-xl border py-12 text-center ${card} ${muted}`}>This batch no longer exists. <Link to="/admin/batches" className="font-semibold text-brand-primary">Back to all batches</Link></p>
                )}
                {!loading && openBatch && (editingInline ? (
                    <BatchForm inline batch={openBatch} courses={courses} teachers={teachers} locations={locations}
                        onClose={() => setEditingInline(false)} onSaved={afterSave} />
                ) : (
                    <BatchPanel
                        batch={openBatch}
                        batches={batches}
                        students={students}
                        studentById={studentById}
                        onClose={() => setOpenId(null)}
                        onEdit={() => setEditingInline(true)}
                        onChanged={async () => { setBatches(await listBatches()); }}
                        onReplace={replaceBatch}
                        onDeleted={() => { setBatches(prev => prev.filter(b => b.id !== openBatch.id)); setOpenId(null); }}
                    />
                ))}
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <AdminPageHeader title="Batches" subtitle="Who teaches each batch, when it meets and who is in it." />

            {unplaced && unplaced.students_count > 0 && (
                <div className={`mb-4 rounded-xl border p-4 ${dark ? 'border-amber-800 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className={`font-semibold ${dark ? 'text-amber-200' : 'text-amber-800'}`}>{unplaced.students_count} student{unplaced.students_count === 1 ? '' : 's'} not in a batch</div>
                            <div className="text-xs text-gray-500">Taking a course but in no batch for it — they get no class timings or attendance.</div>
                        </div>
                        <button type="button" onClick={() => setShowUnplaced(v => !v)}
                            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700">{showUnplaced ? 'Hide' : 'Show and place them'}</button>
                    </div>
                    {showUnplaced && (
                        <div className={`mt-3 rounded-lg p-3 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                            <NotInBatchList rows={unplaced.students} onChanged={async () => { await Promise.all([load(), loadUnplaced()]); }} />
                        </div>
                    )}
                </div>
            )}

            <div className={`mb-4 rounded-xl border p-4 shadow-sm ${card}`}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex rounded-lg p-1 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`} role="tablist" aria-label="View">
                        {(['grid', 'table'] as View[]).map(v => (
                            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => chooseView(v)}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? 'bg-white text-brand-primary shadow-sm' : (dark ? 'text-gray-300' : 'text-gray-600')}`}>
                                {v === 'grid' ? 'Grid' : 'Table'}
                            </button>
                        ))}
                    </div>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batch, teacher or student"
                        className={`${inputClass} min-w-[12rem] flex-1`} />
                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="form-select w-auto text-sm">
                        <option value="">All courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className="form-select w-auto text-sm">
                        <option value="">All teachers</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setEditing('new')}
                        className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ New batch</button>
                </div>
                <div className={`mt-3 flex flex-wrap gap-4 text-sm ${muted}`}>
                    <span><b className={strong}>{totals.batches}</b> batches</span>
                    <span><b className={strong}>{totals.placed}</b> students placed</span>
                    {totals.unplaced > 0 && <span className="text-amber-600"><b>{totals.unplaced}</b> students not in any batch</span>}
                </div>
            </div>

            {loading && <p className={`py-10 text-center ${muted}`}>Loading batches…</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-center text-red-700">{error}</p>}
            {!loading && !error && filtered.length === 0 && (
                <p className={`rounded-xl border py-12 text-center ${card} ${muted}`}>No batches match.</p>
            )}
            {!loading && !error && filtered.length > 0 && (view === 'grid' ? renderGrid() : renderTable())}

            {editing && (
                <BatchForm
                    batch={editing === 'new' ? null : editing}
                    courses={courses}
                    teachers={teachers}
                    locations={locations}
                    onClose={() => setEditing(null)}
                    onSaved={afterSave}
                />
            )}
        </AdminLayout>
    );
};

// --- One batch: its students, and moving them ----------------------------

const BatchPanel: React.FC<{
    batch: AdminBatch;
    batches: AdminBatch[];
    students: AdminStudent[];
    studentById: Map<number, AdminStudent>;
    onClose: () => void;
    onEdit: () => void;
    onChanged: () => Promise<void>;
    onReplace: (b: AdminBatch) => void;
    onDeleted: () => void;
}> = ({ batch, batches, students, studentById, onClose, onEdit, onChanged, onReplace, onDeleted }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const strong = dark ? 'text-white' : 'text-gray-900';
    const [busy, setBusy] = useState(false);
    const [moving, setMoving] = useState<AdminStudent | null>(null);
    const [adding, setAdding] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const members = batch.studentIds
        .map(id => studentById.get(id))
        .filter((s): s is AdminStudent => !!s)
        .sort((a, b) => a.name.localeCompare(b.name));
    const missing = batch.studentIds.length - members.length;
    const sameCourse = batches.filter(b => b.id !== batch.id && b.courseId === batch.courseId);
    const gradeOf = (s: AdminStudent) => s.grades.find(g => g.course.toLowerCase() === batch.courseName.toLowerCase())?.grade || '';

    const run = async (fn: () => Promise<unknown>, done: string) => {
        setBusy(true); setMessage(null);
        try { await fn(); await onChanged(); setMessage(done); } catch (e) { setMessage(e instanceof Error ? e.message : 'Something went wrong.'); }
        finally { setBusy(false); }
    };

    const remove = (s: AdminStudent) => {
        if (!window.confirm(`Remove ${s.name} from ${batch.name}? They stay enrolled in ${batch.courseName || 'the course'}.`)) return;
        run(() => setBatchStudents(batch.id, batch.studentIds.filter(id => id !== s.id)).then(onReplace), `${s.name} removed from ${batch.name}.`);
    };

    const del = () => {
        if (batch.studentIds.length > 0) { window.alert('Move or remove the students first, then delete the batch.'); return; }
        if (!window.confirm(`Delete ${batch.name}? This cannot be undone.`)) return;
        setBusy(true);
        removeBatch(batch.id).then(onDeleted).catch(e => { setMessage(e.message); setBusy(false); });
    };

    return (
        <div className={`overflow-hidden rounded-xl border shadow-sm ${dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <div>
                <div className={`border-b px-5 py-4 ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className={`text-lg font-semibold ${strong}`}>{batch.name}</h2>
                            <p className={`text-sm ${muted}`}>{[batch.courseName, batch.mode, batch.locationName, batch.studio].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                            <button type="button" onClick={onEdit} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</button>
                            <button type="button" onClick={del} disabled={busy} className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div className={`rounded-lg px-3 py-2 ${dark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                            <div className="text-xs font-medium uppercase tracking-wide text-indigo-500">Teacher</div>
                            <div className={`font-semibold ${batch.teacherName ? (dark ? 'text-indigo-200' : 'text-indigo-900') : 'text-amber-600'}`}>{batch.teacherName || 'Not assigned'}</div>
                        </div>
                        <div className={`rounded-lg px-3 py-2 ${dark ? 'bg-gray-700/60' : 'bg-gray-50'}`}>
                            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Class times</div>
                            <div className={`font-medium ${strong}`}>{slotLines(batch.timeSlots).join(', ') || 'Not set'}</div>
                        </div>
                        <div className={`rounded-lg px-3 py-2 ${dark ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
                            <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">Students</div>
                            <div className={`text-xl font-bold ${dark ? 'text-emerald-200' : 'text-emerald-800'}`}>{batch.studentIds.length}{batch.maxStudents ? ` / ${batch.maxStudents}` : ''}</div>
                            {batch.monthlyFee && <div className={`text-xs font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>Batch fee ₹{batch.monthlyFee.toLocaleString('en-IN')}/month</div>}
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4">
                    {message && <p className={`mb-3 rounded-md px-3 py-2 text-sm ${dark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>{message}</p>}
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className={`text-sm font-semibold uppercase tracking-wide ${muted}`}>Students</h3>
                        <button type="button" onClick={() => setAdding(true)} disabled={busy}
                            className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">+ Add students</button>
                    </div>
                    {members.length === 0 && <p className={`py-6 text-center text-sm ${muted}`}>No students in this batch yet.</p>}
                    <ul className={dark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                        {members.map(s => (
                            <li key={s.id} className="flex items-center gap-3 py-2.5">
                                <Avatar name={s.name} photoUrl={s.photoUrl} />
                                <div className="min-w-0 flex-1">
                                    <div className={`truncate font-medium ${strong}`}>{s.name} <span className={`text-xs font-normal ${muted}`}>{s.userId}</span></div>
                                    <div className={`truncate text-xs ${muted}`}>
                                        {[s.parentName && `Parent: ${s.parentName}`, s.phone, gradeOf(s)].filter(Boolean).join(' · ')}
                                    </div>
                                </div>
                                <button type="button" onClick={() => setMoving(s)} disabled={busy || sameCourse.length === 0}
                                    title={sameCourse.length === 0 ? `No other ${batch.courseName} batch to move to` : undefined}
                                    className="rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40">Move</button>
                                <button type="button" onClick={() => remove(s)} disabled={busy}
                                    className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Remove</button>
                            </li>
                        ))}
                    </ul>
                    {missing > 0 && <p className={`mt-2 text-xs ${muted}`}>{missing} id(s) in this batch belong to deleted students.</p>}
                </div>
            </div>

            {moving && (
                <MoveDialog
                    student={moving}
                    from={batch}
                    options={sameCourse}
                    onClose={() => setMoving(null)}
                    onMove={to => {
                        const s = moving;
                        setMoving(null);
                        run(() => moveStudent(s.id, batch.id, to.id), `${s.name} moved to ${to.name}.`);
                    }}
                />
            )}
            {adding && (
                <AddStudentsDialog
                    batch={batch}
                    batches={batches}
                    students={students}
                    onClose={() => setAdding(false)}
                    onAdd={ids => {
                        setAdding(false);
                        run(() => setBatchStudents(batch.id, [...batch.studentIds, ...ids]).then(onReplace),
                            `${ids.length} student${ids.length === 1 ? '' : 's'} added to ${batch.name}.`);
                    }}
                />
            )}
        </div>
    );
};

const MoveDialog: React.FC<{
    student: AdminStudent; from: AdminBatch; options: AdminBatch[];
    onClose: () => void; onMove: (to: AdminBatch) => void;
}> = ({ student, from, options, onClose, onMove }) => {
    const [to, setTo] = useState<number | null>(null);
    const target = options.find(o => o.id === to) || null;
    return (
        <Modal isOpen onClose={onClose} size="lg">
            <div className="bg-white p-5">
                <h3 className="text-lg font-semibold text-gray-900">Move {student.name}</h3>
                <p className="mt-1 text-sm text-gray-500">From <b>{from.name}</b> to another {from.courseName || ''} batch. Grade and fees stay the same.</p>
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                    {options.map(o => (
                        <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${to === o.id ? 'border-brand-primary bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <input type="radio" name="to" className="mt-1" checked={to === o.id} onChange={() => setTo(o.id)} />
                            <div className="min-w-0 text-sm">
                                <div className="font-semibold text-gray-900">{o.name}</div>
                                <div className="text-gray-600">{o.teacherName || 'No teacher'} · {slotLines(o.timeSlots).join(', ') || 'Times not set'}</div>
                                <div className="text-xs text-gray-500">{o.studentIds.length} students{o.maxStudents ? ` of ${o.maxStudents}` : ''}{o.mode ? ` · ${o.mode}` : ''}</div>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                    <button type="button" disabled={!target} onClick={() => target && onMove(target)}
                        className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                        {target ? `Move to ${target.name}` : 'Choose a batch'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const AddStudentsDialog: React.FC<{
    batch: AdminBatch; batches: AdminBatch[]; students: AdminStudent[];
    onClose: () => void; onAdd: (ids: number[]) => void;
}> = ({ batch, batches, students, onClose, onAdd }) => {
    const [q, setQ] = useState('');
    const [scope, setScope] = useState<'unplaced' | 'course' | 'all'>('unplaced');
    const [picked, setPicked] = useState<Set<number>>(new Set());
    const course = batch.courseName.toLowerCase();
    // Students already in some batch of this course.
    const inCourseBatch = useMemo(() => new Set(
        batches.filter(b => b.courseId === batch.courseId).flatMap(b => b.studentIds)), [batches, batch.courseId]);
    const takesCourse = (s: AdminStudent) => s.courses.some(c => c.toLowerCase() === course) || s.grades.some(g => g.course.toLowerCase() === course);
    const list = students
        .filter(s => !batch.studentIds.includes(s.id))
        .filter(s => scope === 'all' || takesCourse(s))
        .filter(s => scope !== 'unplaced' || !inCourseBatch.has(s.id))
        .filter(s => !q.trim() || `${s.name} ${s.userId} ${s.parentName} ${s.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
    const toggle = (id: number) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    return (
        <Modal isOpen onClose={onClose} size="2xl">
            <div className="bg-white p-5">
                <h3 className="text-lg font-semibold text-gray-900">Add students to {batch.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                    {([['unplaced', `${batch.courseName || 'Course'} students without a batch`], ['course', `All ${batch.courseName || 'course'} students`], ['all', 'Everyone']] as const).map(([k, label]) => (
                        <button key={k} type="button" onClick={() => setScope(k)}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${scope === k ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700'}`}>{label}</button>
                    ))}
                </div>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, ID, parent or phone" className={`${inputClass} mt-3`} />
                <div className="mt-3 max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                    {list.length === 0 && <p className="p-4 text-center text-sm text-gray-500">No students to show.</p>}
                    {list.map(s => (
                        <label key={s.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                            <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                            <Avatar name={s.name} photoUrl={s.photoUrl} size={30} />
                            <div className="min-w-0 text-sm">
                                <div className="truncate font-medium text-gray-900">{s.name} <span className="text-xs text-gray-500">{s.userId}</span></div>
                                <div className="truncate text-xs text-gray-500">{[s.parentName && `Parent: ${s.parentName}`, s.courses.join(', '), inCourseBatch.has(s.id) ? 'already in another batch of this course' : ''].filter(Boolean).join(' · ')}</div>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                    <button type="button" disabled={picked.size === 0} onClick={() => onAdd([...picked])}
                        className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                        Add {picked.size || ''} student{picked.size === 1 ? '' : 's'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- Create / edit a batch ------------------------------------------------

const BatchForm: React.FC<{
    batch: AdminBatch | null;
    courses: NamedItem[]; teachers: NamedItem[]; locations: NamedItem[];
    onClose: () => void; onSaved: (b: AdminBatch) => void;
    /** Shown inside the batch's page instead of a full-screen pop-up. */
    inline?: boolean;
}> = ({ batch, courses, teachers, locations, onClose, onSaved, inline = false }) => {
    const Shell = inline ? InlineFormShell : FormModalShell;
    const [name, setName] = useState(batch?.name || '');
    const [courseId, setCourseId] = useState(batch?.courseId ? String(batch.courseId) : '');
    const [teacherId, setTeacherId] = useState(batch?.teacherId ? String(batch.teacherId) : '');
    const [mode, setMode] = useState(batch?.mode || 'Offline');
    const [locationId, setLocationId] = useState(batch?.locationId ? String(batch.locationId) : '');
    const [studio, setStudio] = useState(batch?.studio || '');
    const [max, setMax] = useState(batch?.maxStudents ? String(batch.maxStudents) : '');
    const [fee, setFee] = useState(batch?.monthlyFee ? String(batch.monthlyFee) : '');
    const [slots, setSlots] = useState<Record<string, TimeSlot>>(() =>
        Object.fromEntries((batch?.timeSlots || []).map(s => [s.day, s])));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleDay = (day: string) => setSlots(prev => {
        const n = { ...prev };
        if (n[day]) delete n[day];
        else {
            const any = Object.values(prev)[0];
            n[day] = { day, start_time: any?.start_time || '17:00', end_time: any?.end_time || '18:00' };
        }
        return n;
    });
    const setTime = (day: string, key: 'start_time' | 'end_time', v: string) =>
        setSlots(prev => ({ ...prev, [day]: { ...prev[day], [key]: v } }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Give the batch a name.'); return; }
        if (!courseId) { setError('Choose the course.'); return; }
        const timeSlots = WEEK_DAYS.filter(d => slots[d]).map(d => slots[d]);
        if (timeSlots.some(s => s.start_time && s.end_time && s.end_time <= s.start_time)) {
            setError('Each class must end after it starts.'); return;
        }
        const input: BatchInput = {
            name, courseId: Number(courseId), teacherId: teacherId ? Number(teacherId) : null,
            timeSlots, mode, locationId: locationId ? Number(locationId) : null, studio,
            maxStudents: max ? Number(max) : null,
            monthlyFee: Number(fee) > 0 ? Number(fee) : null,
        };
        setSaving(true); setError(null);
        try {
            onSaved(batch ? await updateBatchDetails(batch.id, input) : await createBatch(input));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the batch.');
            setSaving(false);
        }
    };

    return (
        <Shell isOpen onClose={onClose} onSubmit={submit} isSubmitting={saving}
            title={batch ? `Edit ${batch.name}` : 'New batch'}
            subtitle="Students are added and moved from the batch itself."
            submitLabel={batch ? 'Save changes' : 'Create batch'}>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Section title="Batch">
                <FieldGrid>
                    <Field label="Name (shown to families)" span={3} htmlFor="b-name">
                        <input id="b-name" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Batch 1 · Gurupriya" />
                    </Field>
                    <Field label="Course" span={3} htmlFor="b-course">
                        <select id="b-course" value={courseId} onChange={e => setCourseId(e.target.value)} className={selectClass}>
                            <option value="">Choose…</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Teacher" span={3} htmlFor="b-teacher">
                        <select id="b-teacher" value={teacherId} onChange={e => setTeacherId(e.target.value)} className={selectClass}>
                            <option value="">Not assigned</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Mode" span={3} htmlFor="b-mode">
                        <select id="b-mode" value={mode} onChange={e => setMode(e.target.value)} className={selectClass}>
                            {['Offline', 'Online', 'Hybrid'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </Field>
                    <Field label="Branch" span={2} htmlFor="b-loc">
                        <select id="b-loc" value={locationId} onChange={e => setLocationId(e.target.value)} className={selectClass}>
                            <option value="">—</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Studio / room" span={2} htmlFor="b-studio">
                        <input id="b-studio" value={studio} onChange={e => setStudio(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Most students" span={2} htmlFor="b-max">
                        <input id="b-max" type="number" min={1} value={max} onChange={e => setMax(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Monthly fee for this batch (₹)" span={3} htmlFor="b-fee">
                        <input id="b-fee" type="number" min={1} value={fee} onChange={e => setFee(e.target.value)} className={inputClass} placeholder="Leave empty to use each student's grade fee" />
                        <p className="mt-1 text-xs text-gray-500">When set, every student in this batch pays this amount, whatever their grade. This month's unpaid bills are updated too.</p>
                    </Field>
                </FieldGrid>
            </Section>
            <Section title="Class times" description="Tick the days the batch meets and set each day's time.">
                <div className="space-y-2">
                    {WEEK_DAYS.map(day => {
                        const s = slots[day];
                        return (
                            <div key={day} className="flex flex-wrap items-center gap-3">
                                <label className="flex w-36 items-center gap-2 text-sm font-medium">
                                    <input type="checkbox" checked={!!s} onChange={() => toggleDay(day)} /> {day}
                                </label>
                                {s && (
                                    <>
                                        <input type="time" value={s.start_time || ''} onChange={e => setTime(day, 'start_time', e.target.value)} className={`${inputClass} w-32`} aria-label={`${day} start`} />
                                        <span className="text-sm text-gray-500">to</span>
                                        <input type="time" value={s.end_time || ''} onChange={e => setTime(day, 'end_time', e.target.value)} className={`${inputClass} w-32`} aria-label={`${day} end`} />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Section>
        </Shell>
    );
};

export default BatchesPage;
