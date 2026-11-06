
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User, Course } from '../../types';
import { UserRole, ClassPreference, UserStatus } from '../../types';
import { getAdminUsers, updateUserByAdmin, deleteUserByAdmin, addStudentByAdmin, sendNotification, getCourses, setBatchTeacher, getBatches, batchTimingLines } from '../../api';
import PersonEditModal from '../../components/admin/PersonEditModal';
import AddTeacherModal from '../../components/admin/AddTeacherModal';
import SendNotificationModal from '../../components/admin/SendNotificationModal';
import { WEEKDAYS, TIME_SLOTS } from '../../constants';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import { useTheme } from '../../contexts/ThemeContext';
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

const TeacherListPage: React.FC = () => {
    const canDelete = isSuperAdmin();
    const { theme } = useTheme();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    // Per teacher: the batches they teach (name, timing, students) and the
    // number of different students across them.
    const [studentsByTeacher, setStudentsByTeacher] = useState<Map<string, number>>(new Map());
    const [batchesByTeacher, setBatchesByTeacher] = useState<Map<string, { id: string; name: string; timing: string; students: number }[]>>(new Map());
    useEffect(() => {
        getBatches().then(bs => {
            const sets = new Map<string, Set<string>>();
            const lists = new Map<string, { id: string; name: string; timing: string; students: number }[]>();
            for (const b of bs) {
                const t = b.teacherId == null ? '' : String(typeof b.teacherId === 'object' ? (b.teacherId as any).id : b.teacherId);
                if (!t) continue;
                const set = sets.get(t) || new Set<string>();
                (b.studentIds || []).forEach(id => set.add(String(id)));
                sets.set(t, set);
                const list = lists.get(t) || [];
                list.push({ id: String(b.id), name: b.name, timing: compactTimes(batchTimingLines(b)), students: (b.studentIds || []).length });
                lists.set(t, list);
            }
            for (const l of lists.values()) l.sort((a, c) => a.name.localeCompare(c.name, undefined, { numeric: true }));
            setStudentsByTeacher(new Map([...sets].map(([k, v]) => [k, v.size])));
            setBatchesByTeacher(lists);
        }).catch(() => {});
    }, []);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

    // Search, Sort, and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [courseFilters, setCourseFilters] = useState<string[]>([]);
    const [isCourseFilterOpen, setIsCourseFilterOpen] = useState(false);
    const [courseSearch, setCourseSearch] = useState('');
    const [preferenceFilter, setPreferenceFilter] = useState('');
    const courseFilterRef = useRef<HTMLDivElement>(null);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedUsers, fetchedCourses] = await Promise.all([
                getAdminUsers(),
                getCourses()
            ]);
            setAllUsers(fetchedUsers);
            setCourses(fetchedCourses);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch teacher data.');
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

    const teachers = useMemo(() => allUsers.filter(u => u.role === UserRole.Teacher), [allUsers]);

    const filteredAndSortedTeachers = useMemo(() => {
        let processTeachers = [...teachers];

        // Filtering
        processTeachers = processTeachers.filter(teacher => {
            if (preferenceFilter && teacher.classPreference !== preferenceFilter) return false;

            if (courseFilters.length > 0) {
                if (!teacher.courseExpertise || teacher.courseExpertise.length === 0) return false;
                const teacherHasExpertise = courseFilters.some(filterCourse => 
                    teacher.courseExpertise!.includes(filterCourse)
                );
                if (!teacherHasExpertise) return false;
            }

            const assignedStudents = allUsers.filter(u => u.role === UserRole.Student && u.schedules?.some(s => s.teacherId === teacher.id));
            
            if (searchQuery) {
                const searchTerm = searchQuery.toLowerCase();
                const searchIn = [
                    teacher.name,
                    teacher.id,
                    teacher.email,
                    teacher.contactNumber,
                    ...(teacher.courseExpertise || []),
                    ...assignedStudents.flatMap(s => s.schedules?.map(sc => sc.timing) || [])
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchIn.includes(searchTerm)) return false;
            }
            return true;
        });

        // Sorting
        if (sortConfig !== null) {
            processTeachers.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof User];
                const bVal = b[sortConfig.key as keyof User];

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

        return processTeachers;
    }, [teachers, allUsers, searchQuery, courseFilters, preferenceFilter, sortConfig]);

    const areAllVisibleSelected = useMemo(() =>
        filteredAndSortedTeachers.length > 0 &&
        filteredAndSortedTeachers.every(s => selectedTeachers.has(s.id)),
        [filteredAndSortedTeachers, selectedTeachers]
    );

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const someVisibleSelected = filteredAndSortedTeachers.some(s => selectedTeachers.has(s.id));
            selectAllCheckboxRef.current.indeterminate = someVisibleSelected && !areAllVisibleSelected;
        }
    }, [areAllVisibleSelected, filteredAndSortedTeachers, selectedTeachers]);

    const handleEditUser = (user: User) => setEditingUser(user);

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to move this teacher to the trash?')) {
            try {
                await deleteUserByAdmin(userId);
                // Refetch all users to ensure students assigned to this teacher are updated
                await fetchData();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to delete teacher.');
            }
        }
    };
    
    const handleBulkDelete = async () => {
        const selectedCount = selectedTeachers.size;
        if (selectedCount === 0) return;

        if (window.confirm(`Are you sure you want to move ${selectedCount} selected teacher(s) to the trash? This will unassign them from all students.`)) {
            try {
                const deletePromises = Array.from(selectedTeachers).map(userId => deleteUserByAdmin(userId));
                await Promise.all(deletePromises);
                
                setSelectedTeachers(new Set());
                await fetchData();
                alert(`${selectedCount} teacher(s) moved to trash successfully.`);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'An error occurred while deleting teachers.');
            }
        }
    };

    const handleSaveUsers = async (usersToUpdate: User[]) => {
        try {
            await Promise.all(usersToUpdate.map(user => updateUserByAdmin(user.id, user)));
            setEditingUser(null);
            // Refetch all data to ensure UI consistency
            await fetchData();

            // Show success message with notification status
            const hasScheduleChanges = usersToUpdate.some(user => user.schedules && user.schedules.length > 0);
            const successMessage = hasScheduleChanges
                ? `✅ Teacher profile updated successfully! 📧 Email notifications and in-app notifications sent to affected students, teachers, and admin regarding schedule changes.`
                : `✅ Teacher profile updated successfully! 📧 Email notifications and in-app notifications sent regarding profile changes.`;

            alert(successMessage);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save teacher.');
        }
    };
    
    const handleSaveNewTeacher = async (teacherData: Partial<User>, batchIds: string[]) => {
        try {
            const newTeacher = await addStudentByAdmin(teacherData);

            // Batches hold the students and timings, so assigning the teacher to a
            // batch is all that is needed here.
            if (batchIds.length > 0) {
                await Promise.all(batchIds.map(id => setBatchTeacher(id, newTeacher.id)));
            }

            await fetchData();
            setIsAddModalOpen(false);
            alert(batchIds.length > 0
                ? `✅ Teacher "${teacherData.name || 'New Teacher'}" created and assigned to ${batchIds.length} batch${batchIds.length === 1 ? '' : 'es'}.`
                : `✅ Teacher "${teacherData.name || 'New Teacher'}" created successfully.`);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create the teacher.');
        }
    };

    const handleSendNotification = async (subject: string, message: string) => {
        try {
            await sendNotification(Array.from(selectedTeachers), subject, message);
        } catch (err) {
            // The modal will display the error, so we re-throw to let it handle it.
            throw err;
        }
    };
    
    const handleCloseNotificationModal = () => {
        setIsNotificationModalOpen(false);
        setSelectedTeachers(new Set()); // Clear selection when modal is closed
    };


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSelection = new Set(selectedTeachers);
        if (e.target.checked) {
            filteredAndSortedTeachers.forEach(s => newSelection.add(s.id));
        } else {
            filteredAndSortedTeachers.forEach(s => newSelection.delete(s.id));
        }
        setSelectedTeachers(newSelection);
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
        const newSelection = new Set(selectedTeachers);
        if (e.target.checked) {
            newSelection.add(userId);
        } else {
            newSelection.delete(userId);
        }
        setSelectedTeachers(newSelection);
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
        <AdminLayout fill>
            <AdminPageHeader
                title="Teachers"
                subtitle={`Showing ${filteredAndSortedTeachers.length} of ${teachers.length} total teachers.`}
            action={
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setIsNotificationModalOpen(true)} disabled={selectedTeachers.size === 0}
                            title={selectedTeachers.size === 0 ? 'Tick teachers in the list first' : undefined}
                            className="h-9 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-emerald-700 dark:text-emerald-300">
                            Send notification{selectedTeachers.size ? ` (${selectedTeachers.size})` : ''}
                        </button>
                        {canDelete && selectedTeachers.size > 0 && (
                            <button onClick={handleBulkDelete} className="h-9 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
                                Delete selected ({selectedTeachers.size})
                            </button>
                        )}
                        <button onClick={() => setIsAddModalOpen(true)} className="h-9 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-dark">
                            + Add Teacher
                        </button>
                    </div>
            }
            />

            {/* Toolbar: search, filters and actions on one compact bar */}
            <div className={`mb-4 rounded-xl border p-3 shadow-sm ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="relative min-w-[13rem] flex-1 md:max-w-xs">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <input type="search" placeholder="Search name, ID, phone" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-300 pl-8 pr-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                    </label>
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
                    <select id="pref-filter" aria-label="Class mode" value={preferenceFilter} onChange={e => setPreferenceFilter(e.target.value)} className={`form-select h-9 rounded-lg border-gray-300 py-1 pl-3 pr-8 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white ${preferenceFilter ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : ''}`}>
                        <option value="">Any mode</option>
                        <option value={ClassPreference.Online}>Online</option>
                        <option value={ClassPreference.Offline}>Offline</option>
                        <option value={ClassPreference.Hybrid}>Hybrid</option>
                    </select>
                    {(searchQuery || preferenceFilter || courseFilters.length > 0) && (
                        <button type="button" onClick={() => { setSearchQuery(''); setPreferenceFilter(''); setCourseFilters([]); }}
                            className="h-9 rounded-lg px-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300">Clear</button>
                    )}
                </div>
            </div>

                    {isLoading && <p className="text-center text-gray-500 py-8">Loading teachers...</p>}
                    {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                    
                    {!isLoading && !error && (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex lg:min-h-0 lg:!shrink lg:flex-1 lg:flex-col">
                            {/* Own scroll box filling the rest of the screen: one scrollbar, headings on top, the sideways scrollbar always in view. */}
                            <div className="max-h-[70vh] overflow-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgb(229,231,235)] dark:bg-gray-900 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="w-10 px-3 py-2.5">
                                                <input ref={selectAllCheckboxRef} type="checkbox" onChange={handleSelectAll} checked={areAllVisibleSelected} aria-label="Select all"
                                                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                            </th>
                                            <SortableHeader columnKey="name" title="Teacher" sortConfig={sortConfig} requestSort={requestSort} />
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Courses</th>
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Batches &amp; timing</th>
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Students</th>
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Phone</th>
                                            <th scope="col" className="px-3 py-2.5 text-left font-medium">Status</th>
                                            <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredAndSortedTeachers.length > 0 ? filteredAndSortedTeachers.map((user) => {
                                            const assignedStudentCount = studentsByTeacher.get(String(user.id)) || 0;
                                            const teaches = batchesByTeacher.get(String(user.id)) || [];
                                            return (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                <td className="px-3 py-2.5 align-top">
                                                    <input type="checkbox" checked={selectedTeachers.has(user.id)} onChange={(e) => handleSelectOne(e, user.id)} aria-label={`Select ${user.name}`}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                                </td>
                                                <td className="min-w-[11rem] px-3 py-2.5 align-top">
                                                    <div className="flex items-start gap-2.5">
                                                        <img src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e8eaf6&color=1a237e&size=80`} alt=""
                                                            className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200"
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e8eaf6&color=1a237e&size=80`; }} />
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                            <div className="text-xs text-gray-500"><span className="font-mono">{user.userId || user.id}</span> · {user.classPreference || '—'}</div>
                                                            <div className="text-[11px] text-gray-400">Joined {user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="min-w-[7rem] px-3 py-2.5 align-top">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(user.courseExpertise || []).length ? (user.courseExpertise || []).map(c => (
                                                            <span key={c} className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">{c}</span>
                                                        )) : <span className="text-xs text-gray-400">—</span>}
                                                    </div>
                                                </td>
                                                <td className="min-w-[11rem] px-3 py-2.5 align-top">
                                                    {teaches.length ? (
                                                        <div className="space-y-1.5">
                                                            {teaches.map(b => (
                                                                <div key={b.id} className="leading-tight">
                                                                    <Link to={`/admin/batches/${b.id}`} className="font-medium text-gray-900 hover:text-brand-primary hover:underline dark:text-white">{b.name}</Link>
                                                                    <span className="ml-1 text-xs text-gray-400">· {b.students}</span>
                                                                    <div className="text-xs text-gray-500">{b.timing || 'Timings not set'}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">No batch</span>}
                                                </td>
                                                <td className="px-3 py-2.5 align-top font-semibold text-gray-900 dark:text-white">{assignedStudentCount}</td>
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
                                            <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500">No teachers match the current filters.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

            <PersonEditModal
                isOpen={!!editingUser}
                personId={editingUser?.id ?? null}
                onClose={() => setEditingUser(null)}
                onSaved={async () => { setEditingUser(null); await fetchData(); }}
            />
             <AddTeacherModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveNewTeacher}
             />
             <SendNotificationModal
                isOpen={isNotificationModalOpen}
                onClose={handleCloseNotificationModal}
                recipients={allUsers.filter(u => selectedTeachers.has(u.id))}
                onSend={handleSendNotification}
                userType="teacher"
            />
        </AdminLayout>
    );
};

export default TeacherListPage;