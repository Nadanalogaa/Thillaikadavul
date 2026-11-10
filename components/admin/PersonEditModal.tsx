import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormModalShell, Section, Field, FieldGrid, PhotoPicker, inputClass, selectClass, textareaClass } from './FormModalShell';
import { Person, getPerson, updatePerson, dateInput, isPlaceholderEmail } from '../../services/peopleAdminApi';
import { AdminBatch, listBatches, listCourses, NamedItem, slotLines } from '../../services/batchAdminApi';

// One edit form for students and teachers, same layout for both. It saves
// only the fields shown here, straight to the server's columns. Grades,
// fees and batch places are handled on the student's profile / Batches page,
// where they can be seen together.

const STATUSES = [
    { value: 'active', label: 'Active' },
    { value: 'on hold', label: 'On hold' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'graduated', label: 'Graduated' },
];

interface Props {
    isOpen: boolean;
    personId: number | string | null;
    onClose: () => void;
    onSaved: (p: Person) => void;
}

// Overseas families are billed in one of these (Admin → Fees → Overseas fees).
export const BILLING_CURRENCIES: [string, string][] = [
    ['USD', 'USA · $ USD'], ['CAD', 'Canada · C$ CAD'], ['GBP', 'UK · £ GBP'], ['EUR', 'Europe · € EUR'],
    ['AUD', 'Australia · A$ AUD'], ['NZD', 'New Zealand · NZ$ NZD'], ['SGD', 'Singapore · S$ SGD'], ['MYR', 'Malaysia · RM MYR'],
    ['AED', 'UAE · AED'], ['SAR', 'Saudi Arabia · SAR'], ['QAR', 'Qatar · QAR'], ['OMR', 'Oman · OMR'], ['KWD', 'Kuwait · KD'], ['BHD', 'Bahrain · BD'],
    ['LKR', 'Sri Lanka · LKR'], ['HKD', 'Hong Kong · HK$ HKD'], ['JPY', 'Japan · ¥ JPY'], ['CHF', 'Switzerland · CHF'],
];

const PersonEditModal: React.FC<Props> = ({ isOpen, personId, onClose, onSaved }) => {
    const [person, setPerson] = useState<Person | null>(null);
    const [form, setForm] = useState<Partial<Person>>({});
    const [courses, setCourses] = useState<NamedItem[]>([]);
    const [batches, setBatches] = useState<AdminBatch[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [familyEmail, setFamilyEmail] = useState('');

    useEffect(() => {
        if (!isOpen || personId == null) return;
        setError(null);
        setPerson(null);
        Promise.all([getPerson(personId), listCourses(), listBatches()])
            .then(([p, c, b]) => {
                setPerson(p);
                setFamilyEmail(p.contact_email || '');
                setCourses(c);
                setBatches(b);
                setForm({
                    name: p.name,
                    email: p.email,
                    contact_number: p.contact_number || '',
                    address: p.address || '',
                    dob: dateInput(p.dob),
                    sex: p.sex || '',
                    date_of_joining: dateInput(p.date_of_joining),
                    status: (p.status || 'active').toLowerCase(),
                    class_preference: p.class_preference || 'Offline',
                    billing_currency: p.billing_currency || '',
                    photo_url: p.photo_url || '',
                    notes: p.notes || '',
                    father_name: p.father_name || '',
                    standard: p.standard || '',
                    school_name: p.school_name || '',
                    courses: p.courses,
                    course_expertise: p.course_expertise,
                    educational_qualifications: p.educational_qualifications || '',
                    employment_type: p.employment_type || '',
                });
            })
            .catch(e => setError(e instanceof Error ? e.message : 'Could not load.'));
    }, [isOpen, personId]);

    const isStudent = (person?.role || '').toLowerCase() === 'student';
    const set = (k: keyof Person, v: any) => setForm(prev => ({ ...prev, [k]: v }));
    const listKey: 'courses' | 'course_expertise' = isStudent ? 'courses' : 'course_expertise';
    const chosen = (form[listKey] as string[]) || [];
    const toggleCourse = (name: string) =>
        set(listKey, chosen.includes(name) ? chosen.filter(c => c !== name) : [...chosen, name]);

    const removedCourses = useMemo(
        () => (isStudent && person ? person.courses.filter(c => !chosen.includes(c)) : []),
        [isStudent, person, chosen]);

    const teaching = useMemo(
        () => (person && !isStudent ? batches.filter(b => b.teacherId === person.id) : []),
        [person, isStudent, batches]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!person) return;
        if (!String(form.name || '').trim()) { setError('Name is required.'); return; }
        if (removedCourses.length && !window.confirm(
            `Remove ${removedCourses.join(', ')} for ${person.name}?\n\nTheir grade and batch place for it are removed and it is not billed from next month. Bills already issued stay.`)) return;
        setSaving(true); setError(null);
        const fields: Partial<Person> = { ...form };
        // A child's login address is a stand-in; it is not edited here.
        if (isStudent && isPlaceholderEmail(person.email)) {
            delete (fields as any).email;
            const fe = familyEmail.trim();
            if (fe && fe.toLowerCase() !== String(person.contact_email || '').toLowerCase()) (fields as any).family_email = fe;
        }
        if (isStudent) { delete (fields as any).course_expertise; delete (fields as any).educational_qualifications; delete (fields as any).employment_type; }
        else { delete (fields as any).courses; delete (fields as any).father_name; delete (fields as any).standard; delete (fields as any).school_name; }
        try {
            onSaved(await updatePerson(person.id, fields));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <FormModalShell isOpen onClose={onClose} onSubmit={submit} isSubmitting={saving}
            title={person ? `Edit ${isStudent ? 'student' : 'teacher'}` : 'Loading…'}
            subtitle={person ? `${person.name}${person.user_id ? ` · ${person.user_id}` : ''}` : undefined}
            submitLabel="Save changes">
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {!person && !error && <p className="py-10 text-center text-sm text-gray-500">Loading…</p>}
            {person && (
                <>
                    <Section title="Personal details"
                        aside={<PhotoPicker photoUrl={form.photo_url || ''} name={form.name} onChange={v => set('photo_url', v)} />}>
                        <FieldGrid>
                            <Field label="Full name" span={3} htmlFor="p-name">
                                <input id="p-name" value={form.name || ''} onChange={e => set('name', e.target.value)} className={inputClass} required />
                            </Field>
                            <Field label="Status" span={3} htmlFor="p-status" hint={isStudent ? 'Only active students are billed.' : undefined}>
                                <select id="p-status" value={form.status || 'active'} onChange={e => set('status', e.target.value)} className={selectClass}>
                                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Date of birth" span={2} htmlFor="p-dob">
                                <input id="p-dob" type="date" value={form.dob || ''} onChange={e => set('dob', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Gender" span={2} htmlFor="p-sex">
                                <select id="p-sex" value={form.sex || ''} onChange={e => set('sex', e.target.value)} className={selectClass}>
                                    <option value="">—</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option>
                                </select>
                            </Field>
                            <Field label="Joined on" span={2} htmlFor="p-doj" hint={isStudent ? 'A mid-month joiner is billed from this day.' : undefined}>
                                <input id="p-doj" type="date" value={form.date_of_joining || ''} onChange={e => set('date_of_joining', e.target.value)} className={inputClass} />
                            </Field>
                        </FieldGrid>
                    </Section>

                    <Section title="Contact">
                        <FieldGrid>
                            <Field label={isStudent ? 'Family phone (login)' : 'Phone (login)'} span={3} htmlFor="p-phone">
                                <input id="p-phone" value={form.contact_number || ''} onChange={e => set('contact_number', e.target.value)} className={inputClass} />
                            </Field>
                            {isStudent && isPlaceholderEmail(person.email) ? (
                                <Field label="Family email" span={3} htmlFor="p-email" hint="Saved on the family's login (used to sign in and for receipts).">
                                    <input id="p-email" type="email" value={familyEmail} onChange={e => setFamilyEmail(e.target.value)} placeholder="No email on file" className={inputClass} />
                                </Field>
                            ) : (
                                <Field label="Email" span={3} htmlFor="p-email">
                                    <input id="p-email" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className={inputClass} />
                                </Field>
                            )}
                            {isStudent && (
                                <Field label="Parent / guardian" span={6} htmlFor="p-father">
                                    <input id="p-father" value={form.father_name || ''} onChange={e => set('father_name', e.target.value)} className={inputClass} />
                                </Field>
                            )}
                            {isStudent && (
                                <Field label="Fees billed in" span={6} htmlFor="p-currency"
                                    hint={form.billing_currency ? 'Overseas: billed from the overseas fee list in this currency, pays online by card.' : 'India: rupees, pays by UPI screenshot.'}>
                                    <select id="p-currency" value={form.billing_currency || ''} onChange={e => set('billing_currency', e.target.value)} className={selectClass}>
                                        <option value="">India · ₹ INR</option>
                                        {BILLING_CURRENCIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                                    </select>
                                </Field>
                            )}
                            <Field label="Address" span={6} htmlFor="p-address">
                                <textarea id="p-address" rows={2} value={form.address || ''} onChange={e => set('address', e.target.value)} className={textareaClass} />
                            </Field>
                        </FieldGrid>
                    </Section>

                    <Section title={isStudent ? 'Courses and classes' : 'Teaching'}
                        description={isStudent
                            ? 'Tick what the student takes. Set the grade (which sets the fee) and the batch on the profile.'
                            : 'Courses this teacher can take. Batches are assigned on the Batches page.'}>
                        <div className="mb-4 flex flex-wrap gap-2">
                            {courses.map(c => {
                                const on = chosen.includes(c.name);
                                return (
                                    <button key={c.id} type="button" onClick={() => toggleCourse(c.name)} aria-pressed={on}
                                        className={`rounded-full border px-3 py-1 text-sm font-medium ${on ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                        {on ? '✓ ' : ''}{c.name}
                                    </button>
                                );
                            })}
                        </div>
                        {removedCourses.length > 0 && (
                            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Removing {removedCourses.join(', ')}: its grade and batch place go too, and it is not billed from next month.
                            </p>
                        )}
                        <FieldGrid>
                            <Field label="Class preference" span={2} htmlFor="p-pref">
                                <select id="p-pref" value={form.class_preference || 'Offline'} onChange={e => set('class_preference', e.target.value)} className={selectClass}>
                                    {['Offline', 'Online', 'Hybrid'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </Field>
                            {isStudent ? (
                                <>
                                    <Field label="Class / standard" span={2} htmlFor="p-std">
                                        <input id="p-std" value={form.standard || ''} onChange={e => set('standard', e.target.value)} className={inputClass} />
                                    </Field>
                                    <Field label="School" span={2} htmlFor="p-school">
                                        <input id="p-school" value={form.school_name || ''} onChange={e => set('school_name', e.target.value)} className={inputClass} />
                                    </Field>
                                </>
                            ) : (
                                <>
                                    <Field label="Employment" span={2} htmlFor="p-emp">
                                        <select id="p-emp" value={form.employment_type || ''} onChange={e => set('employment_type', e.target.value)} className={selectClass}>
                                            <option value="">—</option><option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Visiting">Visiting</option>
                                        </select>
                                    </Field>
                                    <Field label="Qualifications" span={2} htmlFor="p-qual">
                                        <input id="p-qual" value={form.educational_qualifications || ''} onChange={e => set('educational_qualifications', e.target.value)} className={inputClass} />
                                    </Field>
                                </>
                            )}
                        </FieldGrid>
                        {!isStudent && (
                            <div className="mt-4">
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Batches they teach</h4>
                                {teaching.length === 0 ? (
                                    <p className="text-sm text-gray-500">None yet. Assign a teacher from <Link to="/admin/batches" className="text-brand-primary underline">Batches</Link>.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                                        {teaching.map(b => (
                                            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                                <span className="font-medium text-gray-900">{b.name} <span className="font-normal text-gray-500">· {b.courseName}</span></span>
                                                <span className="text-gray-600">{slotLines(b.timeSlots).join(', ') || 'Times not set'} · <b>{b.studentIds.length}</b> students</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </Section>

                    <Section title="Notes">
                        <textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} className={textareaClass} placeholder="Anything the academy should remember" />
                    </Section>
                </>
            )}
        </FormModalShell>
    );
};

export default PersonEditModal;
