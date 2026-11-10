// Admin data for one student or teacher, in the server's own shape (snake
// case), so the profile and edit screens read and write exactly what is
// stored. Courses: users.courses lists what the student takes; the grade per
// course (student_course_grades) is what bills it; batches hold membership.

export interface Person {
    id: number;
    user_id: string | null;
    name: string;
    role: string;
    email: string;
    contact_email: string | null;
    contact_number: string | null;
    address: string | null;
    dob: string | null;
    sex: string | null;
    date_of_joining: string | null;
    created_at: string | null;
    status: string | null;
    class_preference: string | null;
    /** Overseas family: billed in this currency and pays online. null = India (INR, screenshot). */
    billing_currency?: string | null;
    photo_url: string | null;
    courses: string[];
    father_name: string | null;
    standard: string | null;
    school_name: string | null;
    notes: string | null;
    parent_id: number | null;
    course_expertise: string[];
    educational_qualifications: string | null;
    employment_type: string | null;
}

export interface StudentGrade {
    course_id: number;
    course_name: string;
    grade_id: number;
    grade_name: string;
    monthly_fee: number;
    discount_percentage: number;
    net_amount: number;
}

export interface GradeOption { id: number; course_id: number; name: string; monthly_fee: number; is_active?: boolean }

export interface Invoice {
    id: number;
    course_name: string;
    amount: number;
    status: string;
    billing_period: string;
    due_date: string | null;
    issue_date: string | null;
    prorated_from: string | null;
    receipt_number: string | null;
    paid_at: string | null;
    paid_method: string | null;
    payment_status: string | null;
}

export interface AttendanceSummary {
    classes: number; present: number; absent: number; late: number; cancelled: number; percentage: number | null;
}

const json = async (r: Response) => {
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.message || `Request failed (${r.status})`);
    return body;
};
const get = (url: string) => fetch(url, { credentials: 'include' }).then(json);
const send = (url: string, method: string, body?: unknown) => fetch(url, {
    method, credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
}).then(json);

const list = (v: any): string[] => {
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string' && v.trim()) { try { const p = JSON.parse(v); return Array.isArray(p) ? p.map(String) : [String(p)]; } catch { return [v]; } }
    return [];
};

export const toPerson = (u: any): Person => ({
    ...u,
    id: Number(u.id),
    courses: list(u.courses),
    course_expertise: list(u.course_expertise),
    parent_id: u.parent_id ?? null,
});

export const getPerson = async (id: number | string): Promise<Person> => toPerson(await get(`/api/users/${id}`));

/** Save only the given fields (the server ignores unknown keys and turns blank dates into empty). */
export const updatePerson = async (id: number, fields: Partial<Person>): Promise<Person> =>
    toPerson(await send(`/api/users/${id}`, 'PUT', fields));

export const getChildren = async (parentId: number): Promise<Person[]> =>
    (await get(`/api/users/${parentId}/children`)).map(toPerson);

export const getStudentGrades = (id: number): Promise<StudentGrade[]> => get(`/api/students/${id}/grades`);
export const setStudentGrade = (id: number, courseId: number, gradeId: number) =>
    send(`/api/students/${id}/grades`, 'POST', { course_id: courseId, grade_id: gradeId });
export const clearStudentGrade = (id: number, courseId: number) =>
    send(`/api/students/${id}/grades/${courseId}`, 'DELETE');

export const listGradeOptions = async (): Promise<GradeOption[]> =>
    (await get('/api/grades')).map((g: any) => ({ ...g, id: Number(g.id), course_id: Number(g.course_id), monthly_fee: Number(g.monthly_fee || 0) }));

export const getStudentInvoices = async (id: number): Promise<Invoice[]> =>
    (await get(`/api/invoices?student_id=${id}`)).map((i: any) => ({ ...i, amount: Number(i.amount || 0), status: String(i.status || '').toLowerCase() }));

export const getAttendanceSummary = async (id: number): Promise<AttendanceSummary | null> => {
    try { return (await get(`/api/attendance/student/${id}`)).summary || null; } catch { return null; }
};

// --- formatting -----------------------------------------------------------
export const inr = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;

/** "12 Mar 2017" for a stored date (UTC midnight or plain YYYY-MM-DD). */
export const showDate = (v?: string | null) => {
    if (!v) return '';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Value for an <input type="date"> from a stored date, in local time. */
export const dateInput = (v?: string | null) => {
    if (!v) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ageFrom = (dob?: string | null) => {
    const d = dob ? new Date(dob) : null;
    if (!d || isNaN(d.getTime())) return null;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
    return a;
};

export const isPlaceholderEmail = (e?: string | null) => !e || /\.nadanaloga\.local$/i.test(e);
