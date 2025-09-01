import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Batch, Course, User, BatchSchedule, Location } from '../../types';
import { UserRole, ClassPreference } from '../../types';
import { WEEKDAYS, TIME_SLOTS, WEEKDAY_MAP } from '../../constants';
import { XCircleIcon } from '../icons';
import { getLocations } from '../../api';
import { getUserTimezone, formatTimeWithTimezone, IST_TIMEZONE, getTimezoneAbbreviation } from '../../utils/timezone';

interface EditBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: Partial<Batch> | null;
    courses: Course[];
    users: User[];
    allBatches: Batch[];
    onSave: (batchData: Partial<Batch>) => void;
}

const EditBatchModal: React.FC<EditBatchModalProps> = ({ isOpen, onClose, batch, courses, users, allBatches, onSave }) => {
    const [formData, setFormData] = useState<Partial<Omit<Batch, 'teacherId' | 'mode'>> & { teacherId?: string; mode?: ClassPreference.Online | ClassPreference.Offline; }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [userTimezone, setUserTimezone] = useState<string>(IST_TIMEZONE);
    const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);
    
    // Student management states
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilter, setStudentFilter] = useState<'all' | 'available' | 'conflicts'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [studentsPerPage] = useState(50);
    const [bulkSelectMode, setBulkSelectMode] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getLocations().then(setLocations).catch(console.error);
            setUserTimezone(getUserTimezone());
        }
    }, [isOpen]);

    useEffect(() => {
        if (batch) {
            const initialSchedule = batch.schedule || [];
            const initialDays = new Set<string>();
            const studentIdSet = new Set<string>();

            initialSchedule.forEach(item => {
                const dayKey = Object.keys(WEEKDAY_MAP).find(key => item.timing.startsWith(WEEKDAY_MAP[key as keyof typeof WEEKDAY_MAP]));
                if (dayKey) {
                    initialDays.add(dayKey);
                }
                item.studentIds.forEach(id => studentIdSet.add(id));
            });
            
            setSelectedDays(initialDays);
            setSelectedStudentIds(Array.from(studentIdSet));

            const teacherIdString = (typeof batch.teacherId === 'object' && batch.teacherId) ? (batch.teacherId as Partial<User>).id || '' : (batch.teacherId as string || '');

            setFormData({
                id: batch.id,
                name: batch.name || '',
                description: batch.description || '',
                courseId: batch.courseId || '',
                courseName: batch.courseName || '',
                teacherId: teacherIdString,
                schedule: batch.schedule ? JSON.parse(JSON.stringify(batch.schedule)) : [],
                mode: batch.mode,
                locationId: batch.locationId,
            });
        }
    }, [batch]);
    
    const teachers = useMemo(() => users.filter(u => u.role === UserRole.Teacher), [users]);
    const students = useMemo(() => users.filter(u => u.role === UserRole.Student), [users]);
    const studentsForCourse = useMemo(() => students.filter(s => (s.courses || []).includes(formData.courseName || '')), [students, formData.courseName]);

    // Student availability checker
    const getStudentFullSchedule = (studentId: string): Set<string> => {
        const schedule = new Set<string>();
        allBatches.forEach(b => {
            if(b.id !== formData.id) {
                b.schedule.forEach(s => {
                    if (s.studentIds.includes(studentId)) {
                        schedule.add(s.timing);
                    }
                });
            }
        });
        return schedule;
    };
    
    const isStudentAvailable = (studentId: string): boolean => {
        const selectedBatchTimings = (formData.schedule || []).map(s => s.timing);
        if (!selectedBatchTimings || selectedBatchTimings.length === 0) return true;
        const studentSchedule = getStudentFullSchedule(studentId);
        return !selectedBatchTimings.some(time => studentSchedule.has(time));
    };

    // Filtered and paginated students
    const filteredStudents = useMemo(() => {
        let filtered = studentsForCourse;
        
        // Search filter
        if (studentSearch.trim()) {
            const searchTerm = studentSearch.toLowerCase();
            filtered = filtered.filter(s => 
                s.name.toLowerCase().includes(searchTerm) || 
                s.email?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Availability filter
        if (studentFilter === 'available') {
            filtered = filtered.filter(s => isStudentAvailable(s.id));
        } else if (studentFilter === 'conflicts') {
            filtered = filtered.filter(s => !isStudentAvailable(s.id));
        }
        
        return filtered;
    }, [studentsForCourse, studentSearch, studentFilter, formData.schedule]);

    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = startIndex + studentsPerPage;
        return filteredStudents.slice(startIndex, endIndex);
    }, [filteredStudents, currentPage, studentsPerPage]);

    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const courseId = e.target.value;
        const course = courses.find(c => c.id === courseId);
        if (course) {
            setFormData(prev => ({
                ...prev,
                courseId: course.id,
                courseName: course.name,
                teacherId: '',
                schedule: [],
            }));
            setSelectedDays(new Set());
            setSelectedStudentIds([]);
            setCurrentPage(1);
            setStudentSearch('');
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        if (name === 'mode' && value === ClassPreference.Online) {
            delete newFormData.locationId;
        }
        setFormData(newFormData);
    };
    
    const handleDayToggle = (dayKey: string) => {
        const newDays = new Set(selectedDays);
        
        if (newDays.has(dayKey)) {
            newDays.delete(dayKey);
            const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
            setFormData(prev => ({
                ...prev,
                schedule: (prev.schedule || []).filter(s => !s.timing.startsWith(dayName))
            }));
        } else {
            if (newDays.size < 2) {
                newDays.add(dayKey);
            }
        }
        setSelectedDays(newDays);
    };

    const handleTimingChange = (dayKey: string, fullTiming: string) => {
        const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
        
        setFormData(prev => {
            let newSchedule = [...(prev.schedule || [])];
            newSchedule = newSchedule.filter(s => !s.timing.startsWith(dayName));
            newSchedule.push({ timing: fullTiming, studentIds: [] });
            return { ...prev, schedule: newSchedule };
        });
    };

    const handleStudentToggle = (studentId: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(studentId) 
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleBulkSelect = (action: 'all' | 'none' | 'available') => {
        if (action === 'none') {
            setSelectedStudentIds([]);
        } else if (action === 'all') {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        } else if (action === 'available') {
            setSelectedStudentIds(filteredStudents.filter(s => isStudentAvailable(s.id)).map(s => s.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const dataToSave: Partial<Batch> = {
            ...formData,
            schedule: (formData.schedule || [])
                .filter(s => s.timing)
                .map(s => ({
                    timing: s.timing,
                    studentIds: selectedStudentIds,
                })),
        };

        if (!dataToSave.teacherId) {
            delete dataToSave.teacherId;
        }

        try {
            await onSave(dataToSave);
            setIsLoading(false);
        } catch (error) {
            console.error('Error saving batch:', error);
            setIsLoading(false);
        }
    };

    const getTeacherFullSchedule = (teacherId: string | undefined): Set<string> => {
        if (!teacherId) return new Set();
        const schedule = new Set<string>();
        allBatches.forEach(b => {
            const batchTeacherId = typeof b.teacherId === 'string' ? b.teacherId : (b.teacherId as User)?.id;
            if (batchTeacherId === teacherId && b.id !== formData.id) {
                (b.schedule || []).forEach(s => schedule.add(s.timing));
            }
        });
        return schedule;
    };
    
    const teacherSchedule = useMemo(() => getTeacherFullSchedule(formData.teacherId), [formData.teacherId, allBatches, formData.id]);
    
    if (!batch) return null;

    const availableTeachers = teachers.filter(t => t.courseExpertise?.includes(formData.courseName || ''));
    const sortedSelectedDays = Array.from(selectedDays).sort((a,b) => Object.keys(WEEKDAY_MAP).indexOf(a) - Object.keys(WEEKDAY_MAP).indexOf(b));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-screen bg-white">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                {batch.id ? 'Edit Batch' : 'Create New Batch'}
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Define batch details, schedule, and manage student enrollment
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                    {/* Form Fields */}
                    <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                                <select 
                                    name="courseId" 
                                    value={formData.courseId || ''} 
                                    onChange={handleCourseChange} 
                                    required 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                                >
                                    <option value="" disabled>Select course</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
                                <input 
                                    name="name" 
                                    type="text" 
                                    value={formData.name || ''} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary" 
                                    placeholder="Enter batch name" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
                                <select 
                                    name="mode" 
                                    value={formData.mode || ''} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                                >
                                    <option value="" disabled>Select mode</option>
                                    <option value={ClassPreference.Online}>Online</option>
                                    <option value={ClassPreference.Offline}>Offline</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                                <select 
                                    name="teacherId" 
                                    value={formData.teacherId || ''} 
                                    onChange={handleChange} 
                                    disabled={!formData.courseId} 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary disabled:bg-gray-100"
                                >
                                    <option value="">{formData.courseId ? "Select teacher" : "Select course first"}</option>
                                    {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {formData.mode === ClassPreference.Offline && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                                    <select 
                                        name="locationId" 
                                        value={formData.locationId || ''} 
                                        onChange={handleChange} 
                                        required 
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                                    >
                                        <option value="" disabled>Select location</option>
                                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className={formData.mode === ClassPreference.Offline ? "lg:col-span-2" : "lg:col-span-3"}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea 
                                    name="description" 
                                    value={formData.description || ''} 
                                    onChange={handleChange} 
                                    rows={1} 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary resize-none" 
                                    placeholder="Brief description..." 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
                        {/* Left: Schedule */}
                        <div className="p-6 border-r border-gray-200 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                    📅 Weekly Schedule
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                        {selectedDays.size}/2 days
                                    </span>
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                                >
                                    🌍 {userTimezone === IST_TIMEZONE ? 'IST' : getTimezoneAbbreviation(userTimezone)}
                                </button>
                            </div>

                            {showTimezoneSelector && (
                                <div className="mb-4 p-3 bg-blue-50 rounded border">
                                    <label className="block text-xs font-medium text-blue-700 mb-2">Select your timezone:</label>
                                    <select
                                        value={userTimezone}
                                        onChange={(e) => setUserTimezone(e.target.value)}
                                        className="text-xs border border-blue-300 rounded px-2 py-1 bg-white w-full"
                                    >
                                        <option value="Asia/Kolkata">IST (India Standard Time)</option>
                                        <option value="Europe/London">GMT/BST (London, Dublin)</option>
                                        <option value="Europe/Berlin">CET/CEST (Berlin, Paris)</option>
                                        <option value="Asia/Dubai">GST (Dubai)</option>
                                        <option value="Asia/Singapore">SGT (Singapore)</option>
                                        <option value="Australia/Sydney">AEST/AEDT (Sydney)</option>
                                        <option value="America/New_York">ET (New York)</option>
                                        <option value="America/Chicago">CT (Chicago)</option>
                                        <option value="America/Denver">MT (Denver)</option>
                                        <option value="America/Los_Angeles">PT (Los Angeles)</option>
                                    </select>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                                <p className="text-xs text-blue-700">
                                    <strong>Rules:</strong> Select exactly 2 days per week • Each class is 1 hour • Only one time slot per day
                                </p>
                            </div>

                            {/* Day Selection */}
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {Object.keys(WEEKDAY_MAP).map((dayKey) => {
                                    const isSelected = selectedDays.has(dayKey);
                                    const isDisabled = !isSelected && selectedDays.size >= 2;
                                    
                                    return (
                                        <button
                                            type="button"
                                            key={dayKey}
                                            onClick={() => !isDisabled && handleDayToggle(dayKey)}
                                            disabled={isDisabled}
                                            className={`p-2 text-xs font-medium rounded border transition-colors ${
                                                isSelected 
                                                    ? 'bg-brand-primary text-white border-brand-primary' 
                                                    : isDisabled
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-primary'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div>{dayKey}</div>
                                                <div className="opacity-75">{WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP].slice(0, 3)}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Time Slots */}
                            <div className="flex-grow overflow-y-auto space-y-3">
                               {sortedSelectedDays.length > 0 ? sortedSelectedDays.map(dayKey => {
                                    const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
                                    const existingSchedule = (formData.schedule || []).find(s => s.timing.startsWith(dayName));
                                    
                                    return (
                                        <div key={dayKey} className="p-3 bg-gray-50 rounded border">
                                            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                                                <div className="w-2 h-2 bg-brand-primary rounded-full mr-2"></div>
                                                {dayName}
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {TIME_SLOTS.map(timeSlot => {
                                                    const fullTiming = `${dayName} ${timeSlot}`;
                                                    const isSelected = existingSchedule?.timing === fullTiming;
                                                    const isTeacherBusy = teacherSchedule.has(fullTiming);
                                                    
                                                    return (
                                                        <label key={fullTiming} className={`flex items-center text-xs p-2 rounded border cursor-pointer transition-colors ${
                                                            isSelected 
                                                                ? 'bg-brand-primary text-white border-brand-primary' 
                                                                : isTeacherBusy
                                                                ? 'cursor-not-allowed opacity-50 bg-gray-100 border-gray-200'
                                                                : 'bg-white border-gray-200 hover:border-brand-primary'
                                                        }`}>
                                                            <input
                                                                type="radio"
                                                                name={`timing-${dayKey}`}
                                                                disabled={isTeacherBusy}
                                                                checked={isSelected}
                                                                onChange={() => !isTeacherBusy && handleTimingChange(dayKey, fullTiming)}
                                                                className="h-3 w-3 text-brand-primary mr-2"
                                                            />
                                                            <div className="flex-1 text-center">
                                                                <div>{timeSlot}</div>
                                                                <div className="opacity-75">
                                                                    {userTimezone === IST_TIMEZONE ? 'IST' : getTimezoneAbbreviation(userTimezone)}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                               }) : (
                                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            📅
                                        </div>
                                        <p className="font-medium">Select 2 days for classes</p>
                                        <p className="text-xs text-gray-400 mt-1">Choose weekdays from above</p>
                                    </div>
                               )}
                            </div>
                        </div>

                        {/* Right: Student Management */}
                        <div className="p-6 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                    👥 Student Enrollment
                                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                        {selectedStudentIds.length} selected
                                    </span>
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setBulkSelectMode(!bulkSelectMode)}
                                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                                >
                                    {bulkSelectMode ? 'Exit Bulk' : 'Bulk Select'}
                                </button>
                            </div>

                            {/* Course Info */}
                            {formData.courseName && (
                                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                                    <p className="text-sm text-green-700">
                                        <strong>Course:</strong> {formData.courseName} • <strong>{studentsForCourse.length}</strong> students available
                                    </p>
                                </div>
                            )}

                            {/* Search and Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Search students by name or email..."
                                        value={studentSearch}
                                        onChange={(e) => {
                                            setStudentSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <select
                                        value={studentFilter}
                                        onChange={(e) => {
                                            setStudentFilter(e.target.value as any);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                                    >
                                        <option value="all">All Students ({studentsForCourse.length})</option>
                                        <option value="available">Available Only</option>
                                        <option value="conflicts">With Conflicts</option>
                                    </select>
                                </div>
                            </div>

                            {/* Bulk Actions */}
                            {bulkSelectMode && (
                                <div className="flex items-center space-x-2 mb-4 p-2 bg-blue-50 rounded border border-blue-200">
                                    <span className="text-xs text-blue-700 font-medium">Bulk Actions:</span>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkSelect('all')}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkSelect('available')}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        Select Available
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkSelect('none')}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}

                            {/* Student List */}
                            <div className="flex-grow overflow-y-auto border rounded">
                                <div className="divide-y divide-gray-200">
                                    {paginatedStudents.map(student => {
                                        const isSelected = selectedStudentIds.includes(student.id);
                                        const isAvailable = isStudentAvailable(student.id);
                                        
                                        return (
                                            <div
                                                key={student.id}
                                                className={`p-3 flex items-center space-x-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-green-50 border-l-4 border-green-500' : ''
                                                } ${!isAvailable ? 'opacity-60' : ''}`}
                                                onClick={() => handleStudentToggle(student.id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // Handled by div click
                                                    className="h-4 w-4 text-brand-primary rounded"
                                                />
                                                <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-dark rounded-full flex items-center justify-center text-white font-medium text-sm">
                                                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{student.name}</p>
                                                    {student.email && <p className="text-xs text-gray-500 truncate">{student.email}</p>}
                                                </div>
                                                {!isAvailable && (
                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                        Schedule Conflict
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between p-3 border-t bg-gray-50">
                                        <p className="text-xs text-gray-700">
                                            Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                                        </p>
                                        <div className="flex space-x-1">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-3 py-1 text-xs bg-brand-primary text-white rounded">
                                                {currentPage}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {selectedDays.size === 2 && selectedStudentIds.length > 0 ? (
                                <span className="text-green-600 font-medium">
                                    ✓ Ready to save: {selectedDays.size} days, {selectedStudentIds.length} students
                                </span>
                            ) : (
                                <span>
                                    Select 2 days and at least 1 student to continue
                                </span>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={isLoading} 
                                className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isLoading || selectedDays.size !== 2 || selectedStudentIds.length === 0} 
                                className="px-6 py-2 border border-transparent rounded text-white bg-brand-primary hover:bg-brand-dark disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Batch'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditBatchModal;