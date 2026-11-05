
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { User, Course, Batch } from '../../types';
import { UserRole, ClassPreference, UserStatus } from '../../types';
import { getAdminUsers, updateUserByAdmin, deleteUserByAdmin, addStudentByAdmin, sendNotification, getCourses, getBatches, updateBatch, addStudentsToBatch } from '../../api';
import PersonEditModal from '../../components/admin/PersonEditModal';
import AddStudentModal from '../../components/admin/AddStudentModal';
import SendNotificationModal from '../../components/admin/SendNotificationModal';
import { CourseIcon } from '../../components/icons';
import Tooltip from '../../components/Tooltip';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { displayEmail } from '../../utils/displayEmail';
import { placeStudent } from '../../services/batchAdminApi';
import { batchTimingLines } from '../../api';
import { compactTimes } from '../../utils/compactTimes';
import { isSuperAdmin } from '../../utils/adminRole';

type SortDirection = 'ascending' | 'descending';
type SortConfig = { key: keyof User; direction: SortDirection } | null;

const SortableIcon: React.FC<{ direction: SortDirection | 'none' }> = ({ direction }) => {
    if (direction === 'none') return <svg className="w-4 h-4 text-gray-400 opacity-30 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    if (direction === 'ascending') return <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
    return <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
};

const SortableHeader: React.FC<{ columnKey: keyof User, title: string, sortConfig: SortConfig, requestSort: (key: keyof User) => void, className?: string }> = ({ columnKey, title, sortConfig, requestSort, className }) => (
    <th scope="col" className={`px-3 py-2.5 text-left font-medium cursor-pointer select-none group ${className || ''}`} onClick={() => requestSort(columnKey)}>
        <div className="flex items-center">
            {title}
            <span className="ml-2">
                <SortableIcon direction={sortConfig?.key === columnKey ? sortConfig.direction : 'none'} />
            </span>
        </div>
    </th>
);


const StudentListPage: React.FC = () => {
    const canDelete = isSuperAdmin();
    const { theme } = useTheme();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    
    // Search, Sort, and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [gradeFilter, setGradeFilter] = useState('');
    const [discountFilter, setDiscountFilter] = useState(''); // '', 'yes', 'no'
    const [courseFilters, setCourseFilters] = useState<string[]>([]);
    const [isCourseFilterOpen, setIsCourseFilterOpen] = useState(false);
    const [courseSearch, setCourseSearch] = useState('');
    const courseFilterRef = useRef<HTMLDivElement>(null);
    const [batchFilter, setBatchFilter] = useState('');
    const [preferenceFilter, setPreferenceFilter] = useState('');
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    
    const location = useLocation();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedUsers, fetchedCourses, fetchedBatches] = await Promise.all([
                getAdminUsers(),
                getCourses(),
                getBatches(),
            ]);
            setAllUsers(fetchedUsers);
            setCourses(fetchedCourses);
            setBatches(fetchedBatches);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch student data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (courseFilterRef.current && !courseFilterRef.current.contains(event.target as Node)) {
                setIsCourseFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const studentIdToEdit = params.get('editStudentId');
        
        // Check if there's an ID in the URL and the data is loaded
        if (studentIdToEdit && allUsers.length > 0) {
            // Avoid re-opening if modal is already open for this user
            if (editingUser?.id !== studentIdToEdit) {
                const userToEdit = allUsers.find(u => u.id === studentIdToEdit && u.role === UserRole.Student);
                if (userToEdit) {
                    setEditingUser(userToEdit);
                }
            }
        }
    }, [location.search, allUsers, editingUser]);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRole.Student), [allUsers]);
    const teachersMap = useMemo(() => {
        const map = new Map<string, User>();
        allUsers.filter(u => u.role === UserRole.Teacher).forEach(t => map.set(t.id, t));
        return map;
    }, [allUsers]);
    
    const studentBatchEnrollments = useMemo(() => {
        const map = new Map<string, { batchName: string, courseName: string, timing: string, teacherId?: string }[]>();
        students.forEach(student => {
            const enrollments: { batchName: string, courseName: string, timing: string, teacherId?: string }[] = [];
            // Membership is the batch's student list; times come from its slots.
            batches.forEach(batch => {
                if ((batch.studentIds || []).map(String).includes(String(student.id))) {
                    enrollments.push({
                        batchName: batch.name,
                        courseName: batch.courseName,
                        timing: compactTimes(batchTimingLines(batch)),
                        teacherId: batch.teacherId != null ? String(typeof batch.teacherId === 'object' ? (batch.teacherId as User).id : batch.teacherId) : undefined,
                    });
                }
            });
            if (enrollments.length > 0) {
                map.set(student.id, enrollments);
            }
        });
        return map;
    }, [students, batches]);

    const requestSort = (key: keyof User) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleStatusChange = async (userId: string, newStatus: UserStatus, userName: string) => {
        if (window.confirm(`Are you sure you want to change ${userName}'s status to "${newStatus}"?`)) {
            try {
                await updateUserByAdmin(userId, { status: newStatus });
                setAllUsers(prev => prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u)));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to update status.');
            }
        }
    };

    // Grade filter options: the academy's grades students actually have,
    // grouped by course (a grade name like "Pre-Grade" exists in several
    // courses). Value = "course||grade".
    const gradeOptions = useMemo(() => {
        const byCourse = new Map<string, Set<string>>();
        for (const st of students) {
            for (const g of st.courseGrades || []) {
                if (!g.grade_name) continue;
                const c = g.course_name || 'Other';
                if (!byCourse.has(c)) byCourse.set(c, new Set());
                byCourse.get(c)!.add(g.grade_name);
            }
        }
        const gradeOrder = (a: string, b: string) => {
            const pre = (x: string) => (/^pre/i.test(x) ? 0 : 1);
            return pre(a) - pre(b) || a.localeCompare(b, undefined, { numeric: true });
        };
        return [...byCourse.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([course, grades]) => ({ course, grades: [...grades].sort(gradeOrder) }));
    }, [students]);

    const filteredAndSortedStudents = useMemo(() => {
        let processStudents = [...students];

        // Filtering
        processStudents = processStudents.filter(student => {
            if (gradeFilter) {
                const [course, grade] = gradeFilter.split('||');
                if (!(student.courseGrades || []).some(g => (g.course_name || 'Other') === course && g.grade_name === grade)) return false;
            }
            if (preferenceFilter && student.classPreference !== preferenceFilter) return false;
            if (discountFilter) {
                const hasDisc = (student.courseGrades || []).some(g => Number(g.discount_percentage || 0) > 0);
                if (discountFilter === 'yes' && !hasDisc) return false;
                if (discountFilter === 'no' && hasDisc) return false;
            }
            
            if (courseFilters.length > 0) {
                if (!student.courses || student.courses.length === 0) return false;
                const studentHasCourse = courseFilters.some(filterCourse => 
                    student.courses!.includes(filterCourse)
                );
                if (!studentHasCourse) return false;
            }

            if (batchFilter) {
                const targetBatch = batches.find(b => b.id === batchFilter);
                if (!targetBatch) return false; // Should not happen if filter is valid
                const isStudentInBatch = (targetBatch.studentIds || []).map(String).includes(String(student.id));
                if (!isStudentInBatch) return false;
            }

            if (searchQuery) {
                const searchTerm = searchQuery.toLowerCase();
                const enrollments = studentBatchEnrollments.get(student.id) || [];
                const searchIn = [
                    student.name,
                    student.id,
                    student.email,
                    displayEmail(student),
                    student.grade,
                    ...(student.courseGrades || []).map(g => g.grade_name),
                    student.contactNumber,
                    ...(student.courses || []),
                    ...enrollments.map(e => e.batchName),
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchIn.includes(searchTerm)) return false;
            }
            return true;
        });

        // Sorting
        if (sortConfig !== null) {
            processStudents.sort((a, b) => {
                // Grade column sorts by the grades shown (per course), not the old single grade.
                const gradeText = (u: User) => (u.courseGrades || []).map(g => g.grade_name).filter(Boolean).join(', ') || u.grade || null;
                const aVal = sortConfig.key === 'grade' ? gradeText(a) : a[sortConfig.key as keyof User];
                const bVal = sortConfig.key === 'grade' ? gradeText(b) : b[sortConfig.key as keyof User];

                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;
                
                if (sortConfig.key === 'dateOfJoining') {
                    const dateA = new Date(aVal as string).getTime();
                    const dateB = new Date(bVal as string).getTime();
                    if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }

                if (String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) < 0) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) > 0) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return processStudents;
    }, [students, searchQuery, gradeFilter, discountFilter, preferenceFilter, courseFilters, batchFilter, sortConfig, batches, studentBatchEnrollments]);

    const areAllVisibleSelected = useMemo(() =>
        filteredAndSortedStudents.length > 0 &&
        filteredAndSortedStudents.every(s => selectedStudents.has(s.id)),
        [filteredAndSortedStudents, selectedStudents]
    );

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const someVisibleSelected = filteredAndSortedStudents.some(s => selectedStudents.has(s.id));
            selectAllCheckboxRef.current.indeterminate = someVisibleSelected && !areAllVisibleSelected;
        }
    }, [areAllVisibleSelected, filteredAndSortedStudents, selectedStudents]);


    const handleEditUser = (user: User) => setEditingUser(user);

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to move this student to the trash?')) {
            try {
                await deleteUserByAdmin(userId);
                setAllUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to delete student.');
            }
        }
    };
    
    const handleBulkDelete = async () => {
        const selectedCount = selectedStudents.size;
        if (selectedCount === 0) return;

        if (window.confirm(`Are you sure you want to move ${selectedCount} selected student(s) to the trash?`)) {
            try {
                const deletePromises = Array.from(selectedStudents).map(userId => deleteUserByAdmin(userId));
                await Promise.all(deletePromises);
                
                setSelectedStudents(new Set());
                await fetchData();
                alert(`${selectedCount} student(s) moved to trash successfully.`);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'An error occurred while deleting students.');
            }
        }
    };

    const handleStudentSaveChanges = async (payload: { user: User; batchChanges: Map<string, { oldBatchId?: string; newBatchId: string; selectedTimings?: Set<string> }>, allBatches: Batch[] }) => {
        const { user, batchChanges, allBatches: freshBatches } = payload;
        
        let confirmMsg = `You are about to save profile changes for ${user.name}.`;
        if (batchChanges.size > 0) {
            confirmMsg += "\n\nBatch changes:\n";
            batchChanges.forEach((change, course) => {
                const oldBatchName = freshBatches.find(b => b.id === change.oldBatchId)?.name || "Unassigned";
                const newBatchName = freshBatches.find(b => b.id === change.newBatchId)?.name || "Unassigned";
                if (oldBatchName !== newBatchName) {
                    confirmMsg += `- ${course}: from "${oldBatchName}" to "${newBatchName}"\n`;
                }
            });
        }
        confirmMsg += "\nDo you want to proceed?";

        if (window.confirm(confirmMsg)) {
            try {
                await updateUserByAdmin(user.id, user);
                // Batch changes go through the batch's own student list, one
                // batch per course. (The old copy rebuilt batches from the
                // retired `schedule` field and emptied both batches.)
                for (const { oldBatchId, newBatchId } of batchChanges.values()) {
                    const next = newBatchId && newBatchId !== 'unassigned' ? Number(newBatchId) : null;
                    if (String(next ?? '') === String(oldBatchId ?? '')) continue;
                    await placeStudent(Number(user.id), next, oldBatchId ? Number(oldBatchId) : null);
                }

                setEditingUser(null);
                await fetchData(); // Refetch all data to ensure UI is up to date

                // Show success message with notification status
                const batchChangeCount = batchChanges.size;
                const successMessage = batchChangeCount > 0
                    ? `✅ Student "${user.name}" profile updated successfully with ${batchChangeCount} batch changes! 📧 Email notifications and in-app notifications sent to student, teachers, and admin regarding batch assignments.`
                    : `✅ Student "${user.name}" profile updated successfully! 📧 Email notifications and in-app notifications sent regarding profile changes.`;

                alert(successMessage);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'An error occurred while saving.');
            }
        }
    };


    const handleSaveNewStudent = async (newUser: Partial<User>, batchIds: string[] = []) => {
        try {
            const savedStudent = await addStudentByAdmin(newUser);

            // Class day, time and teacher come from the batch, so the student is
            // simply added to the batches the admin picked.
            if (batchIds.length > 0) {
                await Promise.all(batchIds.map(id => addStudentsToBatch(id, [savedStudent.id])));
            }

            setAllUsers(prev => [...prev, savedStudent]);
            setIsAddModalOpen(false);

            alert(batchIds.length > 0
                ? `✅ Student "${newUser.name || 'New Student'}" added to ${batchIds.length} batch${batchIds.length === 1 ? '' : 'es'}. 📧 Welcome email sent.`
                : `✅ Student "${newUser.name || 'New Student'}" added successfully! 📧 Welcome email and registration notifications sent to student and admin.`);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to add student.');
        }
    };
    
    const handleSendNotification = async (subject: string, message: string) => {
        try {
            await sendNotification(Array.from(selectedStudents), subject, message);
        } catch (err) {
            // The modal will display the error, so we re-throw to let it handle it.
            throw err;
        }
    };

    const handleCloseEditModal = () => {
        setEditingUser(null);
        // Clean up the URL after closing the modal, if the param is still there
        const params = new URLSearchParams(location.search);
        if (params.has('editStudentId')) {
            params.delete('editStudentId');
            navigate({ search: params.toString() }, { replace: true });
        }
    };
    
    const handleCloseNotificationModal = () => {
        setIsNotificationModalOpen(false);
        setSelectedStudents(new Set()); // Clear selection when modal is closed
    };


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSelection = new Set(selectedStudents);
        if (e.target.checked) {
            filteredAndSortedStudents.forEach(s => newSelection.add(s.id));
        } else {
            filteredAndSortedStudents.forEach(s => newSelection.delete(s.id));
        }
        setSelectedStudents(newSelection);
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
        const newSelection = new Set(selectedStudents);
        if (e.target.checked) {
            newSelection.add(userId);
        } else {
            newSelection.delete(userId);
        }
        setSelectedStudents(newSelection);
    };

    const handleCourseFilterChange = (course: string) => {
        setCourseFilters(prev => {
            const newFilters = new Set(prev);
            if (newFilters.has(course)) {
                newFilters.delete(course);
            } else {
                newFilters.add(course);
            }
            return Array.from(newFilters);
        });
    };
    
    const filteredCourseOptions = useMemo(() => courses.filter(course =>
        course.name.toLowerCase().includes(courseSearch.toLowerCase())
    ), [courses, courseSearch]);


    return (
        <AdminLayout>
            <AdminPageHeader
                title="Students"
                subtitle={`Showing ${filteredAndSortedStudents.length} of ${students.length} total students.`}
            action={
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setIsNotificationModalOpen(true)} disabled={selectedStudents.size === 0}
                            title={selectedStudents.size === 0 ? 'Tick students in the list first' : undefined}
                            className="h-9 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-emerald-700 dark:text-emerald-300">
                            Send notification{selectedStudents.size ? ` (${selectedStudents.size})` : ''}
                        </button>
                        {canDelete && selectedStudents.size > 0 && (
                            <button onClick={handleBulkDelete} className="h-9 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
                                Delete selected ({selectedStudents.size})
                            </button>
                        )}
                        <button onClick={() => setIsAddModalOpen(true)} className="h-9 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-dark">
                            + Add Student
                        </button>
                    </div>
            }
            />

            {/* Toolbar: search, filters and actions on one compact bar */}
            <div className={`mb-4 rounded-xl border p-3 shadow-sm ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="relative min-w-[12rem] flex-1 md:max-w-[15rem]">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <input type="search" placeholder="Search name, ID, phone" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 pl-8 pr-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                    </label>
                    <select id="grade-filter" aria-label="Grade" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className={`form-select h-9 rounded-lg border-gray-300 py-1 pl-3 pr-8 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white ${gradeFilter ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`}>
                        <option value="">All grades</option>
                        {gradeOptions.map(({ course, grades }) => (
                            <optgroup key={course} label={course}>
                                {grades.map(g => <option key={`${course}||${g}`} value={`${course}||${g}`}>{g}</option>)}
                            </optgroup>
                        ))}
                    </select>
                    <div className="relative" ref={courseFilterRef}>
                        <button id="course-filter-btn" type="button" onClick={() => setIsCourseFilterOpen(prev => !prev)}
                            className={`form-select h-9 rounded-lg border-gray-300 py-1 pl-3 pr-8 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white text-left ${courseFilters.length ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`} aria-label="Course">
                            {courseFilters.length > 0 ? `${courseFilters.length} course${courseFilters.length > 1 ? 's' : ''}` : 'All courses'}
                        </button>
                        {isCourseFilterOpen && (
                            <div className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                <div className="border-b border-gray-200 p-2 dark:border-gray-700">
                                    <input type="text" placeholder="Search courses..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)} className="w-full form-input text-sm" />
                                </div>
                                <ul className="max-h-48 overflow-y-auto py-1">
                                    {filteredCourseOptions.length > 0 ? filteredCourseOptions.map(course => (
                                        <li key={course.id}>
                                            <label className="flex w-full cursor-pointer items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
                                                <input type="checkbox" checked={courseFilters.includes(course.name)} onChange={() => handleCourseFilterChange(course.name)}
                                                    className="mr-3 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                                {course.name}
                                            </label>
                                        </li>
                                    )) : <li className="px-4 py-2 text-sm text-gray-500">No courses found.</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                    <select id="batch-filter" aria-label="Batch" value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className={`form-select h-9 rounded-lg border-gray-300 py-1 pl-3 pr-8 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white max-w-[11rem] ${batchFilter ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`}>
                        <option value="">All batches</option>
                        {[...batches].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true })).map(b => <option key={b.id} value={b.id}>{b.name} ({b.courseName})</option>)}
                    </select>
                    <select id="discount-filter" aria-label="Discount" value={discountFilter} onChange={e => setDiscountFilter(e.target.value)} className={`form-select h-9 rounded-lg border-gray-300 py-1 pl-3 pr-8 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white ${discountFilter ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`}>
                        <option value="">Any discount</option>
                        <option value="yes">Has discount</option>
                        <option value="no">No discount</option>
                    </select>
                    <select id="pref-filter" aria-label="Class mode" value={preferenceFilter} onChange={e => setPreferenceFilter(e.target.value)} className={`form-select h-9 rounded-lg border-gray-300 py-1 pl-3 pr-8 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white ${preferenceFilter ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`}>
                        <option value="">Online &amp; offline</option>
                        <option value={ClassPreference.Online}>Online</option>
                        <option value={ClassPreference.Offline}>Offline</option>
                    </select>
                    {(() => {
                        const active = [searchQuery, gradeFilter, discountFilter, preferenceFilter, batchFilter].filter(Boolean).length + (courseFilters.length ? 1 : 0);
                        return active > 0 ? (
                            <button type="button" onClick={() => { setSearchQuery(''); setGradeFilter(''); setDiscountFilter(''); setPreferenceFilter(''); setBatchFilter(''); setCourseFilters([]); }}
                                className="h-9 rounded-lg px-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300">Clear ({active})</button>
                        ) : null;
                    })()}
                </div>
            </div>

                    {isLoading && <p className="text-center text-gray-500 py-8">Loading students...</p>}
                    {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                    
                    {!isLoading && !error && (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            {/* Own scroll box: headings stay on top and the sideways scrollbar is always in view. */}
                            <div className="max-h-[calc(100vh-14rem)] overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgb(229,231,235)] dark:bg-gray-900 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="w-10 px-3 py-2.5">
                                                <input ref={selectAllCheckboxRef} type="checkbox" onChange={handleSelectAll} checked={areAllVisibleSelected} aria-label="Select all"
                                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                            </th>
                                            <SortableHeader columnKey="name" title="Student" sortConfig={sortConfig} requestSort={requestSort} />
                                            <SortableHeader columnKey="grade" title="Courses & grade" sortConfig={sortConfig} requestSort={requestSort} />
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Batch &amp; timing</th>
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Phone</th>
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Status</th>
                                            <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredAndSortedStudents.length > 0 ? filteredAndSortedStudents.map((user) => {
                                            const enrollments = studentBatchEnrollments.get(user.id) || [];
                                            const grades = user.courseGrades && user.courseGrades.length > 0 ? user.courseGrades : null;
                                            return (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                <td className="px-3 py-2.5 align-top">
                                                    <input type="checkbox" checked={selectedStudents.has(user.id)} onChange={(e) => handleSelectOne(e, user.id)} aria-label={`Select ${user.name}`}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                                </td>
                                                <td className="min-w-[12rem] px-3 py-2.5 align-top">
                                                    <div className="flex items-start gap-2.5">
                                                        <img src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e8eaf6&color=1a237e&size=80`} alt=""
                                                            className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200"
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e8eaf6&color=1a237e&size=80`; }} />
                                                        <div className="min-w-0">
                                                            <Link to={`/admin/student/${user.id}`} className="font-medium text-brand-primary hover:underline">{user.name}</Link>
                                                            {user.fatherName && <div className="max-w-[13rem] truncate text-xs text-gray-600 dark:text-gray-300" title={user.fatherName}>Parent: {user.fatherName}</div>}
                                                            <div className="text-xs text-gray-500"><span className="font-mono">{user.userId || user.id}</span> · {user.classPreference || '—'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="min-w-[9rem] px-3 py-2.5 align-top">
                                                    <div className="flex flex-wrap gap-1">
                                                        {grades ? grades.map((g, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                                                                {g.course_name}{g.grade_name ? <span className="font-semibold">· {g.grade_name}</span> : null}
                                                                {Number(g.discount_percentage) > 0 && <span className="rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">{Number(g.discount_percentage)}% off</span>}
                                                            </span>
                                                        )) : (user.courses || []).length ? (user.courses || []).map(c => (
                                                            <span key={c} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">{c} <span className="text-amber-600">· no grade</span></span>
                                                        )) : <span className="text-xs text-gray-400">No course</span>}
                                                    </div>
                                                    <div className="mt-1 text-[11px] text-gray-400">Joined {user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                                                </td>
                                                <td className="min-w-[10rem] px-3 py-2.5 align-top">
                                                    {enrollments.length ? (
                                                        <div className="space-y-1.5">
                                                            {enrollments.map((en, index) => (
                                                                <div key={`${en.batchName}-${index}`} className="leading-tight">
                                                                    <div className="font-medium text-gray-900 dark:text-white">{en.batchName}</div>
                                                                    <div className="text-xs text-gray-500">{en.timing || 'Timings not set'}{en.teacherId ? ` · ${teachersMap.get(en.teacherId)?.name || ''}` : ''}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">Not in a batch</span>}
                                                </td>
                                                <td className="px-3 py-2.5 align-top whitespace-nowrap text-gray-700 dark:text-gray-200">{user.contactNumber ? <a href={`tel:${user.contactNumber}`} className="hover:text-brand-primary">{user.contactNumber}</a> : '—'}</td>
                                                <td className="px-3 py-2.5 align-top"><select value={user.status || 'Active'} onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus, user.name)}
                                                        onClick={(e) => e.stopPropagation()} aria-label="Status"
                                                        className={`form-select w-[6.5rem] rounded-lg py-1 pl-2 pr-7 text-xs ${String(user.status || 'Active').toLowerCase() === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-300 text-gray-600'}`}>
                                                        {Object.values(UserStatus).map(status => <option key={status} value={status}>{status}</option>)}
                                                    </select></td>
                                                <td className="px-3 py-2.5 text-right align-top whitespace-nowrap">
                                                    <button onClick={() => handleEditUser(user)} title="Edit" aria-label={`Edit ${user.name}`} className="rounded-md p-1.5 text-brand-primary hover:bg-indigo-50"><Pencil className="h-4 w-4" /></button>
                                                    {canDelete && <button onClick={() => handleDeleteUser(user.id)} title="Delete" aria-label={`Delete ${user.name}`} className="rounded-md p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                                                </td>
                                            </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500">No students match the current filters.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

            <PersonEditModal
                isOpen={!!editingUser}
                personId={editingUser?.id ?? null}
                onClose={handleCloseEditModal}
                onSaved={async () => { handleCloseEditModal(); await fetchData(); }}
            />
            <AddStudentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveNewStudent}
            />
            <SendNotificationModal
                isOpen={isNotificationModalOpen}
                onClose={handleCloseNotificationModal}
                recipients={allUsers.filter(u => selectedStudents.has(u.id))}
                onSend={handleSendNotification}
                userType="student"
            />
        </AdminLayout>
    );
};

export default StudentListPage;