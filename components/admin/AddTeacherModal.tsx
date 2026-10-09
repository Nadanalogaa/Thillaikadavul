import React, { useState, useEffect } from 'react';
import type { User, Course, Batch } from '../../types';
import { UserRole, Sex, ClassPreference, EmploymentType, UserStatus } from '../../types';
import { getCourses, getBatches } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import BatchPicker from './BatchPicker';
import {
    FormModalShell, Section, Field, FieldGrid, PhotoPicker,
    inputClass, selectClass,
} from './FormModalShell';

interface AddTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** batchIds: batches this teacher takes over (students and timings live there). */
    onSave: (teacherData: Partial<User>, batchIds: string[]) => Promise<void>;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ isOpen, onClose, onSave }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const [formData, setFormData] = useState<Partial<User>>({});
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(false);

    const resetForm = () => {
        setFormData({
            role: UserRole.Teacher,
            sex: Sex.Male,
            classPreference: ClassPreference.Hybrid,
            employmentType: EmploymentType.FullTime,
            courseExpertise: [],
            status: UserStatus.Active,
            name: '',
            email: '',
            photoUrl: '',
            dob: '',
            dateOfJoining: new Date().toISOString().split('T')[0],
        });
        setSelectedBatchIds([]);
    };

    useEffect(() => {
        if (isOpen) {
            resetForm();
            const fetchInitialData = async () => {
                try {
                    const [fetchedCourses, fetchedBatches] = await Promise.all([
                        getCourses(),
                        getBatches()
                    ]);
                    setCourses(fetchedCourses);
                    setBatches(fetchedBatches);
                } catch (error) {
                    console.error("Failed to fetch data for add teacher modal", error);
                }
            };
            fetchInitialData();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleExpertise = (courseName: string) => {
        setFormData(prev => {
            const expertise = prev.courseExpertise || [];
            return {
                ...prev,
                courseExpertise: expertise.includes(courseName)
                    ? expertise.filter(c => c !== courseName)
                    : [...expertise, courseName],
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            alert('Please fill out the teacher\'s name and email.');
            return;
        }
        setIsLoading(true);
        await onSave(formData, selectedBatchIds);
        setIsLoading(false);
    };

    const expertise = formData.courseExpertise || [];

    return (
        <FormModalShell
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title="Add New Teacher"
            subtitle="Create the profile, set expertise and assign batches in one go."
            submitLabel="Add Teacher"
            isSubmitting={isLoading}
        >
            <>
                <Section
                    title="Personal & account"
                    aside={
                        <PhotoPicker
                            photoUrl={formData.photoUrl}
                            name={formData.name}
                            onChange={(photoUrl) => setFormData(prev => ({ ...prev, photoUrl }))}
                        />
                    }
                >
                    <FieldGrid>
                        <Field label="Full name" span={3}>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className={inputClass} />
                        </Field>
                        <Field label="Email address" span={3}>
                            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required className={inputClass} />
                        </Field>
                        <Field label="Contact number" span={2}>
                            <input type="tel" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className={inputClass} />
                        </Field>
                        <Field label="Date of birth" span={2}>
                            <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} required className={inputClass} />
                        </Field>
                        <Field label="Sex" span={2}>
                            <select name="sex" value={formData.sex} onChange={handleChange} className={selectClass}>
                                {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                        <Field label="Password" hint="Leave empty for the default 'password123'." span={3}>
                            <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className={inputClass} placeholder="Optional" />
                        </Field>
                        <Field label="Status" span={3}>
                            <select name="status" value={formData.status} onChange={handleChange} className={selectClass}>
                                {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                    </FieldGrid>
                </Section>
                    <Section title="Professional details">
                        <FieldGrid>
                            <Field label="Educational qualifications" span={6}>
                                <input type="text" name="educationalQualifications" value={formData.educationalQualifications || ''} onChange={handleChange} className={inputClass} />
                            </Field>
                            <Field label="Employment" span={2}>
                                <select name="employmentType" value={formData.employmentType} onChange={handleChange} className={selectClass}>
                                    {Object.values(EmploymentType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Class preference" span={2}>
                                <select name="classPreference" value={formData.classPreference} onChange={handleChange} className={selectClass}>
                                    {Object.values(ClassPreference).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </Field>
                            <Field label="Date of joining" span={2}>
                                <input type="date" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} required className={inputClass} />
                            </Field>
                        </FieldGrid>
                    </Section>

                    <Section title="Course expertise" description="Which courses this teacher can take.">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {courses.map(course => {
                                const isSelected = expertise.includes(course.name);
                                return (
                                    <button
                                        type="button"
                                        key={course.id}
                                        onClick={() => toggleExpertise(course.name)}
                                        aria-pressed={isSelected}
                                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                            isSelected
                                                ? 'border-brand-primary bg-brand-light/60 dark:border-indigo-400 dark:bg-indigo-500/15'
                                                : dark
                                                    ? 'border-gray-600 bg-gray-700/40 hover:border-gray-500'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
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
                    </Section>

                <Section
                    title="Batches"
                    description="Choose the batches this teacher takes. Students and timings come from the batch."
                >
                    <BatchPicker
                        mode="teacher"
                        batches={batches}
                        courseFilter={expertise}
                        selectedIds={selectedBatchIds}
                        onToggle={(id) => setSelectedBatchIds(prev =>
                            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])}
                        emptyHint={expertise.length > 0
                            ? 'No batches for the selected course(s) yet. Create one under Batches.'
                            : 'Select course expertise above to see matching batches.'}
                    />
                </Section>
            </>
        </FormModalShell>
    );
};

export default AddTeacherModal;
