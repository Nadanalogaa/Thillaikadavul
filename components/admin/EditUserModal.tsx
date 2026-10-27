
import React, { useState, useEffect, useMemo } from 'react';
import type { User, Document, Course, Batch, CourseTimingSlot } from '../../types';
import { UserRole, ClassPreference, Sex, EmploymentType, Grade, UserStatus } from '../../types';
import { GRADES } from '../../constants';
import { getAdminUsers, getCourses, getBatches as getAdminBatches } from '../../api';
import DocumentManager from './DocumentManager';
import TabButton from './TabButton';
import StudentAssignmentManager from './StudentAssignmentManager';
import QuickBatchCreateModal from './QuickBatchCreateModal';
import {
    FormModalShell, Section, Field, FieldGrid, PhotoPicker,
    inputClass, selectClass, textareaClass,
} from './FormModalShell';

type BatchChange = { oldBatchId?: string; newBatchId: string };
type BatchChangeMap = Map<string, BatchChange>;
type TimingSelectionMap = Map<string, Set<string>>;

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSave: (users: User[]) => void;
    onStudentSave?: (payload: { user: User, batchChanges: Map<string, BatchChange & { selectedTimings?: Set<string> }>, allBatches: Batch[] }) => Promise<void> | void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave, onStudentSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'schedule' | 'assignments'>('personal');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [allBatches, setAllBatches] = useState<Batch[]>([]);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [courseForQuickCreate, setCourseForQuickCreate] = useState<Course | null>(null);
    const [preferredTimingsForQuickCreate, setPreferredTimingsForQuickCreate] = useState<string[]>([]);
    // State for teacher edits
    const [assignmentChanges, setAssignmentChanges] = useState<Map<string, Record<string, { newTeacherId?: string | null; newTiming?: string }>>>(new Map());
    // State for student edits
    const [batchChanges, setBatchChanges] = useState<BatchChangeMap>(new Map());
    const [timingSelections, setTimingSelections] = useState<TimingSelectionMap>(new Map());


    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [users, fetchedCourses, fetchedBatches] = await Promise.all([
                        getAdminUsers(),
                        getCourses(),
                        getAdminBatches()
                    ]);
                    setAllUsers(users);
                    setCourses(fetchedCourses);
                    setAllBatches(fetchedBatches);
                } catch (error) {
                    console.error("Failed to fetch data for edit modal", error);
                }
            };
            fetchData();
            setActiveTab('personal'); // Reset to first tab on open
            setAssignmentChanges(new Map()); // Reset changes on open
            setBatchChanges(new Map());
            setTimingSelections(new Map());
        }
    }, [isOpen]);

    useEffect(() => {
        if (user) {
            setFormData({
                ...user,
                courses: user.courses || [],
                courseExpertise: user.courseExpertise || [],
                schedules: user.schedules || [],
                documents: user.documents || [],
                preferredTimings: user.preferredTimings || [],
                status: user.status || UserStatus.Active,
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                dateOfJoining: user.dateOfJoining ? new Date(user.dateOfJoining).toISOString().split('T')[0] : '',
            });
            setBatchChanges(new Map()); // Clear old changes when user changes
            setTimingSelections(new Map());
        }
    }, [user]);

    const teachers = useMemo(() => allUsers.filter(u => u.role === UserRole.Teacher), [allUsers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const courseValue = value;
        setFormData(prev => {
            const courses = prev.courses || [];
            let updatedCourses;
            if (checked) {
                updatedCourses = [...courses, courseValue];
            } else {
                updatedCourses = courses.filter(c => c !== courseValue);
            }
            // Also remove any pending batch changes for the unchecked course
            const newBatchChanges = new Map(batchChanges);
            const newTimingSelections = new Map(timingSelections);
            if (!checked) {
                newBatchChanges.delete(courseValue);
                newTimingSelections.delete(courseValue);
            }
            setBatchChanges(newBatchChanges);
            setTimingSelections(newTimingSelections);

            return { ...prev, courses: updatedCourses };
        });
    };
    
    const handleExpertiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const courseValue = value;
        setFormData(prev => {
            const expertise = prev.courseExpertise || [];
            let updatedExpertise;
            if (checked) {
                updatedExpertise = [...expertise, courseValue];
            } else {
                updatedExpertise = expertise.filter(c => c !== courseValue);
            }
            return { ...prev, courseExpertise: updatedExpertise };
        });
    };
    
    const handleDocumentsChange = (newDocuments: Document[]) => {
        setFormData(prev => ({ ...prev, documents: newDocuments }));
    };
    
    const handleAssignmentsChange = (changes: Map<string, Record<string, { newTeacherId?: string | null; newTiming?: string }>>) => {
        setAssignmentChanges(changes);
    };

    const handleBatchChange = (courseName: string, oldBatchId: string | undefined, newBatchId: string) => {
        const newChanges = new Map(batchChanges);
        newChanges.set(courseName, { oldBatchId, newBatchId });
        setBatchChanges(newChanges);

        const newTimingSelections = new Map(timingSelections);
        // If a new batch is selected (and it's not the same or 'unassigned')
        if (newBatchId && newBatchId !== 'unassigned' && newBatchId !== oldBatchId) {
            const selectedBatch = allBatches.find(b => b.id === newBatchId);
            if (selectedBatch && selectedBatch.schedule.length > 0) {
                 // Default to selecting all timings for the new batch
                const allTimings = new Set(selectedBatch.schedule.map(s => s.timing));
                newTimingSelections.set(courseName, allTimings);
            } else {
                // The new batch has no timings, so clear selections.
                newTimingSelections.delete(courseName);
            }
        } else {
             // If unassigned or same batch, clear the timing selections.
            newTimingSelections.delete(courseName);
        }
        setTimingSelections(newTimingSelections);
    };

    const openQuickCreateModal = (courseName: string, preferredTimings: string[]) => {
        const course = courses.find(c => c.name === courseName);
        if (course) {
            setCourseForQuickCreate(course);
            setPreferredTimingsForQuickCreate(preferredTimings);
            setIsQuickCreateOpen(true);
        }
    };

    const handleQuickBatchCreated = (newBatch: Batch) => {
        setAllBatches(prev => [...prev, newBatch]);
        handleBatchChange(newBatch.courseName, undefined, newBatch.id);
        setIsQuickCreateOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const isStudent = formData.role === UserRole.Student;
            if (isStudent && onStudentSave) {
                const batchChangesWithTimings: Map<string, BatchChange & { selectedTimings?: Set<string> }> = new Map();
                batchChanges.forEach((change, courseName) => {
                    batchChangesWithTimings.set(courseName, {
                        ...change,
                        selectedTimings: timingSelections.get(courseName),
                    });
                });
                await onStudentSave({ user: formData as User, batchChanges: batchChangesWithTimings, allBatches });
            } else if (!isStudent) { // Teacher save logic
                const usersToUpdateMap = new Map<string, User>();
                usersToUpdateMap.set(formData.id!, formData as User);
        
                if (assignmentChanges.size > 0) {
                    assignmentChanges.forEach((studentCourseChanges, studentId) => {
                        const originalStudent = allUsers.find(u => u.id === studentId);
                        if (!originalStudent) return;
        
                        const studentToUpdate = usersToUpdateMap.get(studentId) || JSON.parse(JSON.stringify(originalStudent));
                        let schedules = studentToUpdate.schedules ? [...studentToUpdate.schedules] : [];
        
                        Object.entries(studentCourseChanges).forEach(([course, change]) => {
                            const scheduleIndex = schedules.findIndex(s => s.course === course);
                            let schedule = scheduleIndex > -1 ? { ...schedules[scheduleIndex] } : { course, timing: '', teacherId: '' };
        
                            if (change.newTiming !== undefined) {
                                schedule.timing = change.newTiming;
                            }
                            if (change.newTeacherId !== undefined) {
                                schedule.teacherId = change.newTeacherId || undefined;
                            }
                            
                            if (schedule.timing === '' || schedule.timing === null) {
                                schedules = schedules.filter(s => s.course !== course);
                            } else if (scheduleIndex > -1) {
                                schedules[scheduleIndex] = schedule;
                            } else {
                                schedules.push(schedule);
                            }
                        });
        
                        studentToUpdate.schedules = schedules;
                        usersToUpdateMap.set(studentId, studentToUpdate);
                    });
                }
                await onSave(Array.from(usersToUpdateMap.values()));
            } else {
                // Fallback for student save if new prop not provided
                await onSave([formData as User]);
            }
        } catch(err) {
            console.error("Error saving user data:", err);
            // Parent component will show an alert
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    const isStudent = formData.role === UserRole.Student;

    const renderStudentPersonalInfo = () => (
        <>
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
                    <Field label="Full name" span={3} htmlFor="edit-name">
                        <input type="text" id="edit-name" name="name" value={formData.name || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Parent / guardian's name" span={3} htmlFor="edit-fatherName">
                        <input type="text" id="edit-fatherName" name="fatherName" value={formData.fatherName || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="Email address" span={3} htmlFor="edit-email">
                        <input type="email" id="edit-email" name="email" value={formData.email || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Contact number" span={3} htmlFor="edit-contactNumber">
                        <input type="tel" id="edit-contactNumber" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Date of birth" span={2} htmlFor="edit-dob">
                        <input type="date" id="edit-dob" name="dob" value={formData.dob || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Sex" span={2} htmlFor="edit-sex">
                        <select id="edit-sex" name="sex" value={formData.sex} onChange={handleChange} className={selectClass}>
                            {Object.values(Sex).map(sx => <option key={sx} value={sx}>{sx}</option>)}
                        </select>
                    </Field>
                    <Field label="Status" span={2} htmlFor="edit-status">
                        <select id="edit-status" name="status" value={formData.status || 'Active'} onChange={handleChange} className={selectClass}>
                            {Object.values(UserStatus).map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                    </Field>
                    <Field label="Address" span={6} htmlFor="edit-address">
                        <textarea id="edit-address" name="address" rows={2} value={formData.address || ''} onChange={handleChange} className={textareaClass} />
                    </Field>
                </FieldGrid>
            </Section>

            <Section title="Academic details">
                <FieldGrid>
                    <Field label="School name" span={3} htmlFor="edit-schoolName">
                        <input type="text" id="edit-schoolName" name="schoolName" value={formData.schoolName || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="Standard" span={3} htmlFor="edit-standard">
                        <input type="text" id="edit-standard" name="standard" value={formData.standard || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                </FieldGrid>
            </Section>

            <Section title="Notes and documents">
                <FieldGrid>
                    <Field label="Notes" span={6} htmlFor="edit-notes">
                        <textarea id="edit-notes" name="notes" rows={3} value={formData.notes || ''} onChange={handleChange} className={textareaClass} />
                    </Field>
                    <Field label="Documents" span={6}>
                        <DocumentManager documents={formData.documents || []} onDocumentsChange={handleDocumentsChange} />
                    </Field>
                </FieldGrid>
            </Section>
        </>
    );

    const renderTeacherPersonalInfo = () => (
        <>
            <Section
                title="Teacher"
                aside={
                    <PhotoPicker
                        photoUrl={formData.photoUrl}
                        name={formData.name}
                        onChange={(photoUrl) => setFormData(prev => ({ ...prev, photoUrl }))}
                    />
                }
            >
                <FieldGrid>
                    <Field label="Full name" span={3} htmlFor="edit-name">
                        <input type="text" id="edit-name" name="name" value={formData.name || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Email address" span={3} htmlFor="edit-email">
                        <input type="email" id="edit-email" name="email" value={formData.email || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Contact number" span={2} htmlFor="edit-contactNumber">
                        <input type="tel" id="edit-contactNumber" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Date of birth" span={2} htmlFor="edit-dob">
                        <input type="date" id="edit-dob" name="dob" value={formData.dob || ''} onChange={handleChange} required className={inputClass} />
                    </Field>
                    <Field label="Sex" span={2} htmlFor="edit-sex">
                        <select id="edit-sex" name="sex" value={formData.sex} onChange={handleChange} className={selectClass}>
                            {Object.values(Sex).map(sx => <option key={sx} value={sx}>{sx}</option>)}
                        </select>
                    </Field>
                    <Field label="Employment" span={2} htmlFor="edit-employmentType">
                        <select id="edit-employmentType" name="employmentType" value={formData.employmentType} onChange={handleChange} className={selectClass}>
                            {Object.values(EmploymentType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Status" span={2} htmlFor="edit-status">
                        <select id="edit-status" name="status" value={formData.status || 'Active'} onChange={handleChange} className={selectClass}>
                            {Object.values(UserStatus).map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                    </Field>
                    <Field label="Educational qualifications" span={6} htmlFor="edit-educationalQualifications">
                        <input type="text" id="edit-educationalQualifications" name="educationalQualifications" value={formData.educationalQualifications || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="Address" span={6} htmlFor="edit-address">
                        <textarea id="edit-address" name="address" rows={2} value={formData.address || ''} onChange={handleChange} className={textareaClass} />
                    </Field>
                </FieldGrid>
            </Section>

            <Section title="Documents">
                <DocumentManager documents={formData.documents || []} onDocumentsChange={handleDocumentsChange} />
            </Section>
        </>
    );

    const renderStudentBatchSchedule = () => {
        const findStudentBatchForCourse = (studentId: string, courseName: string): Batch | undefined => {
            return allBatches.find(batch => 
                batch.courseName === courseName && 
                batch.schedule.some(s => s.studentIds.includes(studentId))
            );
        };

        const getStudentFullSchedule = (studentId: string, courseToExclude?: string): Set<string> => {
            const schedule = new Set<string>();
            allBatches.forEach(batch => {
                if (batch.courseName !== courseToExclude) {
                    batch.schedule.forEach(s => {
                        if(s.studentIds.includes(studentId)) schedule.add(s.timing);
                    });
                }
            });
            return schedule;
        };

        const preferredTimings = Array.isArray(formData.preferredTimings) ? formData.preferredTimings : [];

        return (
            <>
                 {preferredTimings && preferredTimings.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-yellow-800">Student's Preferred Timings</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {preferredTimings.map((timing: string | CourseTimingSlot, index: number) => {
                                // Handle both old string format and new CourseTimingSlot object format
                                if (typeof timing === 'string') {
                                    return (
                                        <span key={timing} className="bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-1 rounded-full">
                                            {timing}
                                        </span>
                                    );
                                } else if (timing && typeof timing === 'object' && timing.courseName && timing.day && timing.timeSlot) {
                                    const displayText = `${timing.courseName}: ${timing.day.substring(0, 3)} ${timing.timeSlot}`;
                                    return (
                                        <span key={timing.id || `${timing.courseName}-${timing.day}-${timing.timeSlot}-${index}`} className="bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-1 rounded-full">
                                            {displayText}
                                        </span>
                                    );
                                }
                                return null;
                            }).filter(Boolean)}
                        </div>
                    </div>
                )}
                <FieldGrid>
                    <Field label="Date of joining" span={2} htmlFor="edit-dateOfJoining">
                        <input type="date" id="edit-dateOfJoining" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="Grade" span={2} htmlFor="edit-grade">
                        <select id="edit-grade" name="grade" value={formData.grade} onChange={handleChange} className={selectClass}>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </Field>
                    <Field label="Class preference" span={2} htmlFor="edit-classPreference">
                        <select id="edit-classPreference" name="classPreference" value={formData.classPreference} onChange={handleChange} className={selectClass}>
                            <option value={ClassPreference.Online}>Online</option>
                            <option value={ClassPreference.Offline}>Offline</option>
                        </select>
                    </Field>
                </FieldGrid>
                <fieldset className="mt-4">
                    <legend className="mb-2 block text-xs font-medium text-gray-600">Courses</legend>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                        {courses.map(course => (
                            <label key={course.id} className="flex items-center space-x-2">
                                <input type="checkbox" value={course.name} checked={formData.courses?.includes(course.name)} onChange={handleCourseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/>
                                <span>{course.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="mt-4 border-t pt-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-700">Batch assignments</h4>
                    <div className="space-y-4">
                        {(formData.courses || []).map(courseName => {
                            const currentBatch = findStudentBatchForCourse(formData.id!, courseName);
                            const availableBatchesForCourse = allBatches.filter(b => b.courseName === courseName);
                            
                            const pendingChange = batchChanges.get(courseName);
                            const displayBatchId = pendingChange ? pendingChange.newBatchId : (currentBatch?.id || 'unassigned');
                            const studentSchedule = getStudentFullSchedule(formData.id!, courseName);

                            const selectedTimingsForCourse = timingSelections.get(courseName);
                            const newBatchForCourse = selectedTimingsForCourse ? allBatches.find(b => b.id === pendingChange?.newBatchId) : null;

                            const preferredTimingsSet = new Set(
                                preferredTimings.map((t: string | CourseTimingSlot) => 
                                    typeof t === 'string' ? t : 
                                    (t && typeof t === 'object' && t.courseName && t.day && t.timeSlot) 
                                        ? `${t.courseName}: ${t.day.substring(0, 3)} ${t.timeSlot}`
                                        : ''
                                ).filter(Boolean)
                            );
                            const matchingBatches = availableBatchesForCourse.filter(b => b.schedule.some(s => preferredTimingsSet.has(s.timing)));
                            const otherBatches = availableBatchesForCourse.filter(b => !matchingBatches.some(matching => matching.id === b.id));
                            const hasNoMatchingBatches = matchingBatches.length === 0 && preferredTimings && preferredTimings.length > 0;

                            const renderOption = (batch: Batch) => {
                                const hasConflict = batch.schedule.some(s => studentSchedule.has(s.timing));
                                const scheduleTimings = batch.schedule.map(s => `${s.timing.split(' ')[0].substring(0, 3)} ${s.timing.split(' ').slice(1).join(' ')}`).join(', ');
                                const teacherName = teachers.find(t => t.id === batch.teacherId)?.name || 'N/A';
                                const isPreferred = batch.schedule.some(s => preferredTimingsSet.has(s.timing));
                                const optionText = `${batch.name} (${scheduleTimings || 'No timings'})`;

                                return (
                                    <option key={batch.id} value={batch.id} disabled={hasConflict && batch.id !== currentBatch?.id} title={`Teacher: ${teacherName}`}>
                                        {optionText}
                                        {isPreferred && ' ✨'}
                                        {hasConflict && batch.id !== currentBatch?.id ? ' (Conflict)' : ''}
                                    </option>
                                );
                            };


                            return (
                                <div key={courseName} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="grid grid-cols-1 sm:grid-cols-10 gap-x-4 gap-y-2 items-center">
                                        <label className="sm:col-span-3 font-medium text-gray-700 text-sm">{courseName}</label>
                                        <div className="sm:col-span-7">
                                            <select
                                                value={displayBatchId}
                                                onChange={(e) => handleBatchChange(courseName, currentBatch?.id, e.target.value)}
                                                className="form-select text-sm w-full"
                                            >
                                                <option value="unassigned">Unassigned</option>
                                                {matchingBatches.length > 0 && <optgroup label="✨ Preferred Batches">{matchingBatches.map(renderOption)}</optgroup>}
                                                {otherBatches.length > 0 && <optgroup label={matchingBatches.length > 0 ? "Other Batches" : "Available Batches"}>{otherBatches.map(renderOption)}</optgroup>}
                                            </select>
                                             {hasNoMatchingBatches && (
                                                <div className="text-xs text-center text-gray-600 bg-yellow-50 p-2 mt-2 rounded-md border border-yellow-200">
                                                    No existing batches match student preferences.
                                                    <button 
                                                        type="button" 
                                                        onClick={() => openQuickCreateModal(courseName, formData.preferredTimings || [])} 
                                                        className="font-semibold underline text-brand-primary hover:text-brand-dark ml-1"
                                                    >
                                                        Create a new batch now.
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {newBatchForCourse && newBatchForCourse.schedule.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs font-medium text-gray-600 mb-2">Select timings for "{newBatchForCourse.name}":</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                                {newBatchForCourse.schedule.map(scheduleItem => (
                                                    <label key={scheduleItem.timing} className="flex items-center space-x-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"
                                                            checked={selectedTimingsForCourse?.has(scheduleItem.timing)}
                                                            onChange={(e) => {
                                                                const newSelections = new Map(timingSelections);
                                                                const courseSelections = new Set(newSelections.get(courseName));
                                                                if (e.target.checked) {
                                                                    courseSelections.add(scheduleItem.timing);
                                                                } else {
                                                                    courseSelections.delete(scheduleItem.timing);
                                                                }
                                                                newSelections.set(courseName, courseSelections);
                                                                setTimingSelections(newSelections);
                                                            }}
                                                        />
                                                        <span>{scheduleItem.timing}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {(formData.courses || []).length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">Select courses to assign to a batch.</p>
                        )}
                    </div>
                </div>
            </>
        );
    };

    
    const renderTeacherSchedule = () => {
        return (
            <>
                <FieldGrid>
                    <Field label="Date of joining" span={3} htmlFor="edit-dateOfJoining">
                        <input type="date" id="edit-dateOfJoining" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label="Class preference" span={3} htmlFor="edit-classPreference">
                        <select id="edit-classPreference" name="classPreference" value={formData.classPreference} onChange={handleChange} className={selectClass}>
                            <option value={ClassPreference.Online}>Online</option>
                            <option value={ClassPreference.Offline}>Offline</option>
                            <option value={ClassPreference.Hybrid}>Hybrid</option>
                        </select>
                    </Field>
                </FieldGrid>
                <fieldset className="mt-4">
                    <legend className="mb-2 block text-xs font-medium text-gray-600">Course expertise</legend>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                        {courses.map(course => (
                            <label key={course.id} className="flex items-center space-x-2">
                                <input type="checkbox" value={course.name} checked={formData.courseExpertise?.includes(course.name)} onChange={handleExpertiseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/>
                                <span>{course.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            </>
        );
    };

    return (
        <>
            <FormModalShell
                isOpen={isOpen}
                onClose={onClose}
                onSubmit={handleSubmit}
                title={`Edit ${isStudent ? 'Student' : 'Teacher'}`}
                subtitle={user.name}
                submitLabel="Save Changes"
                isSubmitting={isLoading}
                toolbar={
                    <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
                        <TabButton isActive={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
                            Personal Information
                        </TabButton>
                        <TabButton isActive={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')}>
                            Schedule &amp; Courses
                        </TabButton>
                        {!isStudent && (
                            <TabButton isActive={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')}>
                                Student Assignments
                                {assignmentChanges.size > 0 && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                        {assignmentChanges.size} changed
                                    </span>
                                )}
                            </TabButton>
                        )}
                    </nav>
                }
            >
                {activeTab === 'personal' && (isStudent ? renderStudentPersonalInfo() : renderTeacherPersonalInfo())}

                {activeTab === 'schedule' && (
                    <Section
                        title={isStudent ? 'Courses and batches' : 'Teaching details'}
                        description={isStudent
                            ? 'Which courses this student takes, and the batch for each.'
                            : 'Joining date, class preference and the courses this teacher can take.'}
                    >
                        {isStudent ? renderStudentBatchSchedule() : renderTeacherSchedule()}
                    </Section>
                )}

                {activeTab === 'assignments' && !isStudent && (
                    <Section title="Student assignments" description="Move students between this teacher and others.">
                        <StudentAssignmentManager
                            teacher={formData as User}
                            allUsers={allUsers}
                            onAssignmentsChange={handleAssignmentsChange}
                            courses={courses}
                        />
                    </Section>
                )}
            </FormModalShell>
             <QuickBatchCreateModal
                isOpen={isQuickCreateOpen}
                onClose={() => setIsQuickCreateOpen(false)}
                onSave={handleQuickBatchCreated}
                course={courseForQuickCreate}
                allUsers={allUsers}
                allBatches={allBatches}
                preferredTimings={preferredTimingsForQuickCreate}
            />
        </>
    );
};

export default EditUserModal;