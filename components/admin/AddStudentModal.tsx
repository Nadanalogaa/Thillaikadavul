import React, { useState, useEffect } from 'react';
import type { User, Course } from '../../types';
import { UserRole, Sex, Grade, ClassPreference, UserStatus } from '../../types';
import { GRADES } from '../../constants';
import { getCourses, getGrades } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import CourseTimingManager from './CourseTimingManager';
import {
    FormModalShell, Section, Field, FieldGrid, PhotoPicker,
    inputClass, selectClass, textareaClass,
} from './FormModalShell';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Partial<User>) => void;
}

const EMPTY_STUDENT: Partial<User> = {
    role: UserRole.Student,
    sex: Sex.Male,
    grade: Grade.Grade1,
    courses: [],
    classPreference: ClassPreference.Online,
    schedules: [],
    status: UserStatus.Active,
    name: '',
    email: '',
    photoUrl: '',
};

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSave }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [formData, setFormData] = useState<Partial<User>>(EMPTY_STUDENT);
    const [courses, setCourses] = useState<Course[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [courseGrades, setCourseGrades] = useState<Record<string, string>>({}); // courseId -> gradeId
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [fetchedCourses, fetchedGrades] = await Promise.all([getCourses(), getGrades()]);
                    // Remove duplicates based on course name
                    const uniqueCourses = fetchedCourses.filter((course, index, array) =>
                        array.findIndex(c => c.name === course.name) === index
                    );
                    setCourses(uniqueCourses);
                    setGrades(fetchedGrades || []);
                } catch (error) {
                    console.error("Failed to fetch courses/grades for add student modal", error);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleCourse = (courseName: string) => {
        setFormData(prev => {
            const current = Array.isArray(prev.courses) ? prev.courses : [];
            const updatedCourses = current.includes(courseName)
                ? current.filter(c => c !== courseName)
                : [...current, courseName];
            const currentSchedules = Array.isArray(prev.schedules) ? prev.schedules : [];
            return {
                ...prev,
                courses: updatedCourses,
                schedules: currentSchedules.filter(s => updatedCourses.includes(s.course)),
            };
        });
    };

    const handleScheduleChange = (schedules: NonNullable<User['schedules']>) => {
        setFormData(prev => ({ ...prev, schedules }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Format validation: valid email + 10-digit phone.
        const email = (formData.email || '').trim();
        const phoneDigits = (formData.contactNumber || '').replace(/\D/g, '');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        if (phoneDigits && phoneDigits.length !== 10) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }
        setIsLoading(true);
        // Build course_grades [{course_id, grade_id}] for the selected courses that have a grade chosen.
        const selectedCourseIds = new Set(
            courses.filter(c => (formData.courses || []).includes(c.name)).map(c => c.id)
        );
        const course_grades = Object.entries(courseGrades)
            .filter(([courseId, gradeId]) => gradeId && selectedCourseIds.has(courseId))
            .map(([courseId, gradeId]) => ({ course_id: courseId, grade_id: gradeId }));
        await onSave({ ...formData, ...(course_grades.length ? { course_grades } : {}) } as any);
        setCourseGrades({});
        setFormData(EMPTY_STUDENT);
        setIsLoading(false);
    };

    const selectedCourses = formData.courses || [];

    return (
        <FormModalShell
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title="Add New Student"
            subtitle="Fill in the details to enrol a new student."
            submitLabel="Add Student"
            isSubmitting={isLoading}
        >
            <Section
                title="Student"
                aside={
                    <PhotoPicker
                        photoUrl={formData.photoUrl}
                        name={formData.name}
                        onChange={(photoUrl) => setFormData(prev => ({ ...prev, photoUrl }))}
                    />
                }
            >
                <FieldGrid>
                    <Field label="Full name" span={3} htmlFor="name-add">
                        <input type="text" id="name-add" name="name" value={formData.name || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Email address" span={3} htmlFor="email-add">
                        <input type="email" id="email-add" name="email" value={formData.email || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Contact number" span={2} htmlFor="contactNumber-add">
                        <input type="tel" id="contactNumber-add" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className={inputClass} placeholder="10 digits" />
                    </Field>
                    <Field label="Date of birth" span={2} htmlFor="dob-add">
                        <input type="date" id="dob-add" name="dob" value={formData.dob || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Sex" span={2} htmlFor="sex-add">
                        <select id="sex-add" name="sex" value={formData.sex} onChange={handleChange} required className={selectClass}>
                            {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Password" hint="Leave empty for the default 'password123'." span={2} htmlFor="password-add">
                        <input type="password" id="password-add" name="password" value={formData.password || ''} onChange={handleChange} className={inputClass} placeholder="Optional" />
                    </Field>
                    <Field label="Parent / guardian's name" span={2} htmlFor="fatherName-add">
                        <input type="text" id="fatherName-add" name="fatherName" value={formData.fatherName || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="Status" span={2} htmlFor="status-add">
                        <select id="status-add" name="status" value={formData.status} onChange={handleChange} className={selectClass}>
                            {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Address" span={6} htmlFor="address-add">
                        <textarea id="address-add" name="address" rows={2} value={formData.address || ''} onChange={handleChange} className={textareaClass} />
                    </Field>
                </FieldGrid>
            </Section>

            <Section title="Courses" description="Tap to select. A student can take more than one.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {courses.map(course => {
                        const isSelected = selectedCourses.includes(course.name);
                        return (
                            <button
                                type="button"
                                key={course.id}
                                onClick={() => toggleCourse(course.name)}
                                aria-pressed={isSelected}
                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                    isSelected
                                        ? 'border-brand-primary bg-brand-light/60 dark:border-indigo-400 dark:bg-indigo-500/15'
                                        : dark
                                            ? 'border-gray-600 bg-gray-700/40 hover:border-gray-500'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                {course.image ? (
                                    <img src={course.image} alt="" className="h-8 w-8 flex-shrink-0 rounded-md object-cover" />
                                ) : (
                                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-light text-xs font-bold text-brand-primary">
                                        {course.name.charAt(0)}
                                    </span>
                                )}
                                <span className={`flex-1 truncate text-sm font-medium ${dark ? 'text-gray-100' : 'text-gray-800'}`}>
                                    {course.name}
                                </span>
                                {isSelected && (
                                    <svg className="h-4 w-4 flex-shrink-0 text-brand-primary dark:text-indigo-300" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                    {courses.length === 0 && (
                        <p className={`col-span-full text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>No courses yet.</p>
                    )}
                </div>

                {selectedCourses.length > 0 && (
                    <div className="mt-4">
                        <p className={`mb-2 text-xs font-medium ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Grade per course <span className="font-normal">(optional — sets the monthly fee, can be set later)</span>
                        </p>
                        <FieldGrid>
                            {courses.filter(c => selectedCourses.includes(c.name)).map(course => {
                                const options = grades.filter((g: any) => String(g.course_id) === String(course.id));
                                return (
                                    <Field key={course.id} label={course.name} span={3}>
                                        <select
                                            value={courseGrades[course.id] || ''}
                                            onChange={e => setCourseGrades(prev => ({ ...prev, [course.id]: e.target.value }))}
                                            className={selectClass}
                                        >
                                            <option value="">{options.length ? '— Not assigned —' : 'No grades for this course'}</option>
                                            {options.map((g: any) => (
                                                <option key={g.id} value={g.id}>{g.name} (₹{Number(g.monthly_fee).toFixed(0)})</option>
                                            ))}
                                        </select>
                                    </Field>
                                );
                            })}
                        </FieldGrid>
                    </div>
                )}
            </Section>

            <Section title="Academic details">
                <FieldGrid>
                    <Field label="Date of joining" span={2} htmlFor="doj-add">
                        <input type="date" id="doj-add" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Class preference" span={2} htmlFor="classpref-add">
                        <select id="classpref-add" name="classPreference" value={formData.classPreference} onChange={handleChange} className={selectClass}>
                            {Object.values(ClassPreference).filter(p => p !== ClassPreference.Hybrid).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </Field>
                    <Field label="Grade (legacy)" span={2} htmlFor="grade-add">
                        <select id="grade-add" name="grade" value={formData.grade} onChange={handleChange} className={selectClass}>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </Field>
                    <Field label="Standard" span={3} htmlFor="standard-add">
                        <input type="text" id="standard-add" name="standard" value={formData.standard || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="School name" span={3} htmlFor="schoolName-add">
                        <input type="text" id="schoolName-add" name="schoolName" value={formData.schoolName || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="Notes" span={6} htmlFor="notes-add">
                        <textarea id="notes-add" name="notes" rows={2} value={formData.notes || ''} onChange={handleChange} className={textareaClass} />
                    </Field>
                </FieldGrid>
            </Section>

            <Section title="Batch timings" description="Choose the weekly slots for each selected course.">
                {selectedCourses.length === 0 ? (
                    <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Select a course first.</p>
                ) : (
                    <CourseTimingManager
                        selectedCourses={selectedCourses}
                        schedules={formData.schedules || []}
                        onChange={handleScheduleChange}
                    />
                )}
            </Section>
        </FormModalShell>
    );
};

export default AddStudentModal;
