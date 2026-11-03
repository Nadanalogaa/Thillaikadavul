import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import PersonEditModal from '../../components/admin/PersonEditModal';
import { useTheme } from '../../contexts/ThemeContext';
import {
    Person, StudentGrade, GradeOption, Invoice, AttendanceSummary,
    getPerson, updatePerson, getChildren, getStudentGrades, setStudentGrade, clearStudentGrade,
    listGradeOptions, getStudentInvoices, getAttendanceSummary, inr, showDate, ageFrom, isPlaceholderEmail,
} from '../../services/peopleAdminApi';
import { AdminBatch, NamedItem, listBatches, listCourses, placeStudent, slotLines } from '../../services/batchAdminApi';

// Admin -> a student. Everything about them on one full-width page, and the
// things that belong together are edited together: each course row holds the
// grade (which sets the monthly fee) and the batch (teacher and class times).
// Personal details open in the shared Edit form.

const STATUS_STYLE: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    'on hold': 'bg-amber-100 text-amber-800',
    inactive: 'bg-gray-200 text-gray-700',
    graduated: 'bg-sky-100 text-sky-800',
};
const BILL_STYLE: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    overdue: 'bg-red-100 text-red-800',
};

const StudentProfileViewPage: React.FC<{ studentId: string }> = ({ studentId }) => {
    const id = Number(studentId);
    const navigate = useNavigate();
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const card = `rounded-xl border p-5 shadow-sm ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`;
    const muted = dark ? 'text-gray-400' : 'text-gray-500';
    const strong = dark ? 'text-white' : 'text-gray-900';

    const [student, setStudent] = useState<Person | null>(null);
    const [parent, setParent] = useState<Person | null>(null);
    const [siblings, setSiblings] = useState<Person[]>([]);
    const [grades, setGrades] = useState<StudentGrade[]>([]);
    const [gradeOptions, setGradeOptions] = useState<GradeOption[]>([]);
    const [courses, setCourses] = useState<NamedItem[]>([]);
    const [batches, setBatches] = useState<AdminBatch[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [addCourse, setAddCourse] = useState('');

    const load = useCallback(async () => {
        try {
            const s = await getPerson(id);
            const [g, go, c, b, inv, att] = await Promise.all([
                getStudentGrades(id), listGradeOptions(), listCourses(), listBatches(),
                getStudentInvoices(id), getAttendanceSummary(id),
            ]);
            setStudent(s); setGrades(g); setGradeOptions(go); setCourses(c); setBatches(b); setInvoices(inv); setAttendance(att);
            if (s.parent_id) {
                const [p, kids] = await Promise.all([getPerson(s.parent_id).catch(() => null), getChildren(s.parent_id).catch(() => [])]);
                setParent(p);
                setSiblings(kids.filter(k => k.id !== s.id));
            } else { setParent(null); setSiblings([]); }
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load the student.');
        } finally {
            setLoading(false);
        }
    }, [id]);
    useEffect(() => { setLoading(true); load(); }, [load]);

    const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
        setBusy(key); setMessage(null);
        try { await fn(); await load(); setMessage(done); }
        catch (e) { setMessage(e instanceof Error ? e.message : 'Something went wrong.'); }
        finally { setBusy(null); }
    };

    // One row per course the student takes (their list, plus any course that
    // has a grade but went missing from the list).
    const rows = useMemo(() => {
        if (!student) return [];
        const names = [...student.courses];
        for (const g of grades) if (!names.some(n => n.toLowerCase() === g.course_name.toLowerCase())) names.push(g.course_name);
        return names.map(name => {
            const course = courses.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
            const grade = course ? grades.find(g => g.course_id === course.id) || null : null;
            const options = course ? gradeOptions.filter(o => o.course_id === course.id && o.is_active !== false) : [];
            const courseBatches = course ? batches.filter(b => b.courseId === course.id) : [];
            const batch = courseBatches.find(b => b.studentIds.includes(id)) || null;
            return { name, course, grade, options, courseBatches, batch };
        });
    }, [student, grades, gradeOptions, courses, batches, id]);

    const monthlyTotal = grades.reduce((s, g) => s + Number(g.net_amount || 0), 0);
    const thisPeriod = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const thisMonth = invoices.filter(i => i.billing_period === thisPeriod);
    const dueNow = thisMonth.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
    const notTaken = courses.filter(c => !rows.some(r => r.name.toLowerCase() === c.name.toLowerCase()));

    const changeGrade = (courseId: number, gradeId: string, courseName: string) =>
        run(`g${courseId}`, () => gradeId ? setStudentGrade(id, courseId, Number(gradeId)) : clearStudentGrade(id, courseId),
            gradeId ? `${courseName} grade saved. The fee follows it from this month's bill run.` : `${courseName} grade cleared: it will not be billed.`);

    const changeBatch = (courseName: string, newId: string, oldId: number | null) =>
        run(`b${courseName}`, () => placeStudent(id, newId ? Number(newId) : null, oldId),
            newId ? `Placed in ${batches.find(b => b.id === Number(newId))?.name}.` : `Taken out of the ${courseName} batch.`);

    const removeCourse = (name: string) => {
        if (!student) return;
        if (!window.confirm(`Remove ${name} for ${student.name}?\n\nThe grade and batch place go too, and it is not billed from next month. Bills already issued stay.`)) return;
        run(`r${name}`, () => updatePerson(id, { courses: student.courses.filter(c => c.toLowerCase() !== name.toLowerCase()) }), `${name} removed.`);
    };

    const addNewCourse = () => {
        if (!student || !addCourse) return;
        run('add', () => updatePerson(id, { courses: [...student.courses, addCourse] }),
            `${addCourse} added. Set its grade to start billing, and pick a batch.`);
        setAddCourse('');
    };

    if (loading) return <AdminLayout><p className={`py-16 text-center ${muted}`}>Loading student…</p></AdminLayout>;
    if (error || !student) return <AdminLayout><p className="rounded-md bg-red-50 p-4 text-center text-red-700">{error || 'Student not found.'}</p></AdminLayout>;

    const status = (student.status || 'active').toLowerCase();
    const email = student.contact_email || (isPlaceholderEmail(student.email) ? '' : student.email);
    const age = ageFrom(student.dob);
    const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between gap-4 py-1.5 text-sm">
            <span className={muted}>{label}</span>
            <span className={`text-right font-medium ${strong}`}>{value || <span className="font-normal text-gray-400">—</span>}</span>
        </div>
    );

    return (
        <AdminLayout>
            <div className="w-full space-y-5">
                {/* Header */}
                <div className={`${card} flex flex-wrap items-center gap-5`}>
                    {student.photo_url
                        ? <img src={student.photo_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-indigo-100" />
                        : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">{student.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</div>}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className={`text-2xl font-bold ${strong}`}>{student.name}</h1>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[status] || STATUS_STYLE.inactive}`}>{status}</span>
                        </div>
                        <p className={`mt-1 text-sm ${muted}`}>
                            {[student.user_id, student.father_name && `Parent: ${student.father_name}`, student.contact_number, email].filter(Boolean).join(' · ')}
                        </p>
                        <p className={`text-sm ${muted}`}>Joined {showDate(student.date_of_joining || student.created_at) || '—'}{age != null ? ` · ${age} years` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => navigate('/admin/students')} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">← Students</button>
                        <Link to="/admin/fees" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Fees</Link>
                        <button type="button" onClick={() => setEditing(true)} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Edit details</button>
                    </div>
                </div>

                {/* Key numbers */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { label: 'Courses', value: String(rows.length), tone: 'text-indigo-700' },
                        { label: 'Monthly fee', value: inr(monthlyTotal), tone: 'text-indigo-700' },
                        { label: `${thisPeriod}`, value: thisMonth.length === 0 ? 'No bill yet' : dueNow > 0 ? `${inr(dueNow)} due` : 'Paid', tone: dueNow > 0 ? 'text-amber-700' : 'text-emerald-700' },
                        { label: 'Attendance (3 months)', value: attendance && attendance.classes ? `${attendance.percentage ?? 0}%` : 'No classes yet', tone: 'text-emerald-700' },
                    ].map(k => (
                        <div key={k.label} className={card}>
                            <div className={`text-xs font-medium uppercase tracking-wide ${muted}`}>{k.label}</div>
                            <div className={`mt-1 text-xl font-bold ${k.tone}`}>{k.value}</div>
                        </div>
                    ))}
                </div>

                {message && <p className={`rounded-md px-4 py-2 text-sm ${dark ? 'bg-gray-800 text-gray-200' : 'bg-indigo-50 text-indigo-900'}`}>{message}</p>}

                {/* Courses: grade -> fee, batch -> teacher and times (full width) */}
                        <section className={card}>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className={`text-lg font-semibold ${strong}`}>Courses, fees and batches</h2>
                                    <p className={`text-xs ${muted}`}>The grade sets the monthly fee. A course with no grade is not billed.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select value={addCourse} onChange={e => setAddCourse(e.target.value)} className="form-select text-sm">
                                        <option value="">Add a course…</option>
                                        {notTaken.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <button type="button" onClick={addNewCourse} disabled={!addCourse || !!busy}
                                        className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
                                </div>
                            </div>
                            {rows.length === 0 && <p className={`py-6 text-center text-sm ${muted}`}>No courses yet.</p>}
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    {rows.length > 0 && (
                                        <thead className={dark ? 'text-gray-400' : 'text-gray-500'}>
                                            <tr>{['Course', 'Grade', 'Monthly fee', 'Batch', 'Teacher and class times', ''].map(h =>
                                                <th key={h} className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>)}</tr>
                                        </thead>
                                    )}
                                    <tbody className={dark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                                        {rows.map(r => (
                                            <tr key={r.name} className="align-top">
                                                <td className={`whitespace-nowrap px-2 py-3 font-semibold ${strong}`}>{r.name}</td>
                                                <td className="px-2 py-3">
                                                    {r.course ? (
                                                        <select value={r.grade?.grade_id || ''} disabled={!!busy}
                                                            onChange={e => changeGrade(r.course!.id, e.target.value, r.name)}
                                                            className={`form-select w-52 text-sm ${r.grade ? '' : 'border-amber-400'}`}>
                                                            <option value="">Not set (not billed)</option>
                                                            {r.options.map(o => <option key={o.id} value={o.id}>{o.name} · {inr(o.monthly_fee)}</option>)}
                                                        </select>
                                                    ) : <span className="text-amber-600">Unknown course</span>}
                                                </td>
                                                <td className="px-2 py-3">
                                                    {r.grade ? (
                                                        <div>
                                                            <span className={`font-semibold ${strong}`}>{inr(r.grade.net_amount)}</span>
                                                            {r.grade.discount_percentage > 0 && <div className={`text-xs ${muted}`}>{inr(r.grade.monthly_fee)} − {r.grade.discount_percentage}%</div>}
                                                        </div>
                                                    ) : <span className="text-amber-600">—</span>}
                                                </td>
                                                <td className="px-2 py-3">
                                                    {r.course && (
                                                        <select value={r.batch?.id || ''} disabled={!!busy}
                                                            onChange={e => changeBatch(r.name, e.target.value, r.batch?.id || null)}
                                                            className={`form-select w-60 text-sm ${r.batch ? '' : 'border-amber-400'}`}>
                                                            <option value="">Not in a batch</option>
                                                            {r.courseBatches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.studentIds.length})</option>)}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className={`min-w-[16rem] px-2 py-3 ${muted}`}>
                                                    {r.batch ? (
                                                        <>
                                                            <div className={`font-medium ${strong}`}>{r.batch.teacherName || 'No teacher'}</div>
                                                            <div>{slotLines(r.batch.timeSlots).join(', ') || 'Times not set'}</div>
                                                        </>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-2 py-3 text-right">
                                                    <button type="button" onClick={() => removeCourse(r.name)} disabled={!!busy}
                                                        className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>


                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="space-y-5 xl:col-span-2">
                        {/* Bills */}
                        <section className={card}>
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className={`text-lg font-semibold ${strong}`}>Bills and payments</h2>
                                <Link to="/admin/fees" className="text-sm font-medium text-brand-primary hover:underline">Collect / record a payment →</Link>
                            </div>
                            {invoices.length === 0 ? <p className={`py-6 text-center text-sm ${muted}`}>No bills yet.</p> : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className={dark ? 'text-gray-400' : 'text-gray-500'}>
                                            <tr>{['Month', 'Course', 'Amount', 'Status', 'Due', 'Receipt'].map(h =>
                                                <th key={h} className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>)}</tr>
                                        </thead>
                                        <tbody className={dark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                                            {invoices.map(i => (
                                                <tr key={i.id}>
                                                    <td className={`px-2 py-2.5 font-medium ${strong}`}>{i.billing_period}{i.prorated_from ? <span className={`block text-xs font-normal ${muted}`}>from {showDate(i.prorated_from)}</span> : null}</td>
                                                    <td className={`px-2 py-2.5 ${muted}`}>{i.course_name}</td>
                                                    <td className={`px-2 py-2.5 font-semibold ${strong}`}>{inr(i.amount)}</td>
                                                    <td className="px-2 py-2.5">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BILL_STYLE[i.status] || 'bg-gray-100 text-gray-700'}`}>{i.status}</span>
                                                        {i.status !== 'paid' && i.payment_status === 'submitted' && <span className="ml-1 text-xs text-sky-700">proof sent</span>}
                                                    </td>
                                                    <td className={`px-2 py-2.5 ${muted}`}>{showDate(i.due_date)}</td>
                                                    <td className={`px-2 py-2.5 ${muted}`}>{i.receipt_number ? <>{i.receipt_number}<span className="block text-xs">{showDate(i.paid_at)} · {i.paid_method}</span></> : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="space-y-5">
                        <section className={card}>
                            <h2 className={`mb-2 text-lg font-semibold ${strong}`}>Personal</h2>
                            <Row label="Date of birth" value={student.dob ? `${showDate(student.dob)}${age != null ? ` (${age})` : ''}` : null} />
                            <Row label="Gender" value={student.sex} />
                            <Row label="Class / standard" value={student.standard} />
                            <Row label="School" value={student.school_name} />
                            <Row label="Class preference" value={student.class_preference} />
                            <Row label="Address" value={student.address} />
                            {student.notes && <p className={`mt-2 rounded-md p-2 text-sm ${dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>{student.notes}</p>}
                        </section>

                        <section className={card}>
                            <h2 className={`mb-2 text-lg font-semibold ${strong}`}>Family</h2>
                            <Row label="Parent / guardian" value={parent?.name || student.father_name} />
                            <Row label="Phone (login)" value={(parent?.contact_number || student.contact_number) && <a className="text-brand-primary" href={`tel:${parent?.contact_number || student.contact_number}`}>{parent?.contact_number || student.contact_number}</a>} />
                            <Row label="Email" value={email} />
                            <Row label="Family account" value={parent?.user_id} />
                            {siblings.length > 0 && (
                                <div className="mt-2">
                                    <div className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Also at the academy</div>
                                    <ul className="mt-1 space-y-1">
                                        {siblings.map(s => (
                                            <li key={s.id}><Link to={`/admin/student/${s.id}`} className="text-sm font-medium text-brand-primary hover:underline">{s.name}</Link> <span className={`text-xs ${muted}`}>{s.courses.join(', ')}</span></li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>

                        <section className={card}>
                            <h2 className={`mb-2 text-lg font-semibold ${strong}`}>Attendance · last 3 months</h2>
                            {!attendance || attendance.classes === 0 ? <p className={`text-sm ${muted}`}>No classes marked yet.</p> : (
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    {[['Classes', attendance.classes], ['Present', attendance.present], ['Absent', attendance.absent], ['Late', attendance.late]].map(([l, v]) => (
                                        <div key={String(l)} className={`rounded-lg p-2 ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                            <div className={`text-lg font-bold ${strong}`}>{v}</div>
                                            <div className={`text-xs ${muted}`}>{l}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            <PersonEditModal isOpen={editing} personId={id} onClose={() => setEditing(false)}
                onSaved={async () => { setEditing(false); await load(); setMessage('Details saved.'); }} />
        </AdminLayout>
    );
};

export default StudentProfileViewPage;
