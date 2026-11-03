// Data for the admin Batches page, in the shape the server really stores:
// membership is batches.student_ids, class times are time_slots (per day) or
// days + start_time/end_time. The retired `schedule` column is never read or
// written here — the old helpers rebuilt student_ids from it and wiped every
// batch they saved.

export interface TimeSlot { day: string; start_time?: string; end_time?: string }

export interface AdminBatch {
    id: number;
    name: string;
    courseId: number | null;
    courseName: string;
    teacherId: number | null;
    teacherName: string;
    studentIds: number[];
    timeSlots: TimeSlot[];
    mode: string;
    locationId: number | null;
    locationName: string;
    studio: string;
    maxStudents: number | null;
    /** The batch's own monthly fee; null = each student's grade fee. */
    monthlyFee: number | null;
}

export interface AdminStudent {
    id: number;
    name: string;
    userId: string;
    parentName: string;
    phone: string;
    photoUrl: string;
    courses: string[];
    grades: { course: string; grade: string }[];
}

export interface NamedItem { id: number; name: string }

const json = async (r: Response) => {
    if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${r.status})`);
    }
    return r.json();
};
const get = (url: string) => fetch(url, { credentials: 'include' }).then(json);
const send = (url: string, method: string, body?: unknown) => fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
}).then(json);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : undefined);

/** Per-day slots; a batch saved with one time for all its days is expanded. */
const slotsOf = (b: any): TimeSlot[] => {
    if (Array.isArray(b.time_slots) && b.time_slots.length) {
        return b.time_slots.map((s: any) => ({ day: s.day, start_time: hhmm(s.start_time), end_time: hhmm(s.end_time) }));
    }
    return (b.days || []).map((d: string) => ({ day: d, start_time: hhmm(b.start_time), end_time: hhmm(b.end_time) }));
};

export const toAdminBatch = (b: any): AdminBatch => ({
    id: Number(b.id),
    name: b.batch_name || 'Untitled batch',
    courseId: b.course_id ?? null,
    courseName: b.course_name || '',
    teacherId: b.teacher_id ?? null,
    teacherName: b.teacher_name || '',
    studentIds: (b.student_ids || []).map(Number),
    timeSlots: slotsOf(b).sort((a, c) => DAYS.indexOf(a.day) - DAYS.indexOf(c.day)),
    mode: b.mode || '',
    locationId: b.location_id ?? null,
    locationName: b.location_name || '',
    studio: b.studio || '',
    maxStudents: b.max_students ?? null,
    monthlyFee: b.monthly_fee != null && Number(b.monthly_fee) > 0 ? Number(b.monthly_fee) : null,
});

export const listBatches = async (): Promise<AdminBatch[]> =>
    (await get('/api/batches')).map(toAdminBatch);

export const listStudents = async (): Promise<AdminStudent[]> =>
    (await get('/api/users?role=Student')).map((u: any) => ({
        id: Number(u.id),
        name: u.name || '',
        userId: u.user_id || '',
        parentName: u.father_name || '',
        phone: u.contact_number || '',
        photoUrl: u.photo_url || '',
        courses: Array.isArray(u.courses) ? u.courses : [],
        grades: (u.course_grades || []).map((g: any) => ({ course: g.course_name || '', grade: g.grade_name || '' })),
    }));

export const listTeachers = async (): Promise<NamedItem[]> =>
    (await get('/api/users?role=Teacher')).map((u: any) => ({ id: Number(u.id), name: u.name }));

export const listCourses = async (): Promise<NamedItem[]> =>
    (await get('/api/courses')).map((c: any) => ({ id: Number(c.id), name: c.name }));

export const listLocations = async (): Promise<NamedItem[]> =>
    (await get('/api/locations')).map((l: any) => ({ id: Number(l.id), name: l.name }));

export interface BatchInput {
    name: string;
    courseId: number | null;
    teacherId: number | null;
    timeSlots: TimeSlot[];
    mode: string;
    locationId: number | null;
    studio: string;
    maxStudents: number | null;
    monthlyFee: number | null;
}

/** Fields for create/update. Membership is only sent when given. */
const body = (b: BatchInput, studentIds?: number[]) => {
    const slots = b.timeSlots.filter(s => s.day);
    const first = slots.find(s => s.start_time);
    return {
        batch_name: b.name.trim(),
        course_id: b.courseId,
        teacher_id: b.teacherId,
        time_slots: slots,
        days: slots.map(s => s.day),
        // Older screens read a single time; keep it as the first slot's.
        start_time: first?.start_time || null,
        end_time: first?.end_time || null,
        mode: b.mode || null,
        location_id: b.locationId,
        studio: b.studio || null,
        max_students: b.maxStudents,
        monthly_fee: b.monthlyFee,
        ...(studentIds ? { student_ids: studentIds } : {}),
    };
};

export const createBatch = async (b: BatchInput): Promise<AdminBatch> =>
    toAdminBatch(await send('/api/batches', 'POST', { ...body(b, []), schedule: [] }));

export const updateBatchDetails = async (id: number, b: BatchInput): Promise<AdminBatch> =>
    toAdminBatch(await send(`/api/batches/${id}`, 'PUT', body(b)));

export const setBatchStudents = async (id: number, studentIds: number[]): Promise<AdminBatch> =>
    toAdminBatch(await send(`/api/batches/${id}`, 'PUT', { student_ids: [...new Set(studentIds)] }));

export const removeBatch = (id: number) => send(`/api/batches/${id}`, 'DELETE');

export const moveStudent = (studentId: number, fromBatchId: number, toBatchId: number) =>
    send('/api/batches/transfer', 'POST', { studentId, fromBatchId, toBatchId });

// "17:00" -> "5:00 PM"
export const clock12 = (t?: string) => {
    if (!t) return '';
    const [h, m = '00'] = t.split(':');
    const hour = Number(h);
    if (Number.isNaN(hour)) return t;
    return `${hour % 12 === 0 ? 12 : hour % 12}:${m.slice(0, 2)} ${hour >= 12 ? 'PM' : 'AM'}`;
};

/** "Mon 5:00 PM – 6:00 PM" per slot. */
export const slotLines = (slots: TimeSlot[]) => slots.map(s =>
    `${s.day.slice(0, 3)}${s.start_time ? ` ${clock12(s.start_time)}${s.end_time ? ` – ${clock12(s.end_time)}` : ''}` : ''}`);

export const WEEK_DAYS = DAYS;

/**
 * Put a student in `newBatchId` for that batch's course (or take them out of
 * the course's batches when newBatchId is null, using oldBatchId to find the
 * course). Any other batch of the same course is left — a student is in one
 * batch per course. Used by the Edit Student screens.
 */
export const placeStudent = async (studentId: number, newBatchId: number | null, oldBatchId?: number | null) => {
    const batches = await listBatches();
    const target = newBatchId ? batches.find(b => b.id === newBatchId) || null : null;
    const courseId = target ? target.courseId : batches.find(b => b.id === oldBatchId)?.courseId ?? null;
    if (!target && !oldBatchId) return;
    const current = batches.filter(b => b.id !== target?.id && b.studentIds.includes(studentId)
        && (courseId == null ? b.id === oldBatchId : b.courseId === courseId));
    if (target && current.length === 1 && !target.studentIds.includes(studentId)) {
        await moveStudent(studentId, current[0].id, target.id);
        return;
    }
    for (const b of current) await setBatchStudents(b.id, b.studentIds.filter(id => id !== studentId));
    if (target && !target.studentIds.includes(studentId)) await setBatchStudents(target.id, [...target.studentIds, studentId]);
};
