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

// Student Details Popover Component
const StudentPopover: React.FC<{ 
    student: User; 
    isVisible: boolean; 
    position: { x: number; y: number };
    onClose: () => void;
}> = ({ student, isVisible, position, onClose }) => {
    if (!isVisible) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose}></div>
            {/* Popover */}
            <div 
                className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80"
                style={{ 
                    top: position.y + 10, 
                    left: Math.min(position.x, window.innerWidth - 320),
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}
            >
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-dark rounded-full flex items-center justify-center text-white font-bold">
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{student.name}</h3>
                            <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="font-medium text-gray-700">Phone:</span>
                            <p className="text-gray-600">{student.phoneNumber || 'Not provided'}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">Country:</span>
                            <p className="text-gray-600">{student.country || 'Not specified'}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">Age:</span>
                            <p className="text-gray-600">{student.age || 'Not provided'}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">Gender:</span>
                            <p className="text-gray-600">{student.sex || 'Not specified'}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">Status:</span>
                            <p className="text-gray-600">{student.status || 'Active'}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">Preference:</span>
                            <p className="text-gray-600">{student.classPreference || 'Not set'}</p>
                        </div>
                    </div>

                    {student.courses && student.courses.length > 0 && (
                        <div>
                            <span className="font-medium text-gray-700 text-sm">Enrolled Courses:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {student.courses.map((course, index) => (
                                    <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                        {course}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {student.address && (
                        <div>
                            <span className="font-medium text-gray-700 text-sm">Address:</span>
                            <p className="text-gray-600 text-sm">{student.address}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

const EditBatchModal: React.FC<EditBatchModalProps> = ({ isOpen, onClose, batch, courses, users, allBatches, onSave }) => {
    const [formData, setFormData] = useState<Partial<Omit<Batch, 'teacherId' | 'mode'>> & { teacherId?: string; mode?: ClassPreference.Online | ClassPreference.Offline; }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [userTimezone, setUserTimezone] = useState<string>(IST_TIMEZONE);
    const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);
    
    // Step management
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    
    // Student management states
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilter, setStudentFilter] = useState<'all' | 'available' | 'conflicts'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [studentsPerPage] = useState(25); // Reduced for table format
    const [sortBy, setSortBy] = useState<'name' | 'email' | 'country' | 'registeredAt'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    
    // Popover state
    const [popoverState, setPopoverState] = useState<{
        student: User | null;
        visible: boolean;
        position: { x: number; y: number };
    }>({
        student: null,
        visible: false,
        position: { x: 0, y: 0 }
    });

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

            // If schedule is already set, go to step 2
            if (initialSchedule.length > 0) {
                setCurrentStep(2);
            }
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

    // Get student's preferred timing info
    const getStudentPreferredTiming = (student: User): string => {
        // This would come from student's preferred timings - mock for now
        return student.classPreference === ClassPreference.Online ? 'Online Classes' : 
               student.classPreference === ClassPreference.Offline ? 'Offline Classes' : 
               'Any Time';
    };

    // Get student's local time
    const getStudentLocalTime = (student: User): string => {
        const batchTimings = (formData.schedule || []).map(s => s.timing);
        if (batchTimings.length === 0) return 'Not scheduled';
        
        const userTz = student.timezone || 'Asia/Kolkata';
        const timing = batchTimings[0]; // Show first timing
        
        if (userTz === 'Asia/Kolkata') {
            return `${timing} IST`;
        }
        
        // Mock conversion for display
        return `${timing} IST (Local TZ)`;
    };

    // Filtered and sorted students
    const filteredAndSortedStudents = useMemo(() => {
        let filtered = studentsForCourse;
        
        // Search filter
        if (studentSearch.trim()) {
            const searchTerm = studentSearch.toLowerCase();
            filtered = filtered.filter(s => 
                s.name.toLowerCase().includes(searchTerm) || 
                s.email?.toLowerCase().includes(searchTerm) ||
                s.country?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Availability filter
        if (studentFilter === 'available') {
            filtered = filtered.filter(s => isStudentAvailable(s.id));
        } else if (studentFilter === 'conflicts') {
            filtered = filtered.filter(s => !isStudentAvailable(s.id));
        }
        
        // Sorting
        filtered.sort((a, b) => {
            let aValue = '';
            let bValue = '';
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'email':
                    aValue = a.email || '';
                    bValue = b.email || '';
                    break;
                case 'country':
                    aValue = a.country || '';
                    bValue = b.country || '';
                    break;
                case 'registeredAt':
                    aValue = a.createdAt || '';
                    bValue = b.createdAt || '';
                    break;
            }
            
            if (sortOrder === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
        
        return filtered;
    }, [studentsForCourse, studentSearch, studentFilter, sortBy, sortOrder, formData.schedule]);

    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = startIndex + studentsPerPage;
        return filteredAndSortedStudents.slice(startIndex, endIndex);
    }, [filteredAndSortedStudents, currentPage, studentsPerPage]);

    const totalPages = Math.ceil(filteredAndSortedStudents.length / studentsPerPage);

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

    const handleSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const showStudentPopover = (student: User, event: React.MouseEvent) => {
        setPopoverState({
            student,
            visible: true,
            position: { x: event.clientX, y: event.clientY }
        });
    };

    const hideStudentPopover = () => {
        setPopoverState(prev => ({ ...prev, visible: false }));
    };

    const handleNextStep = () => {
        if (currentStep === 1 && selectedDays.size === 2 && (formData.schedule || []).length > 0) {
            setCurrentStep(2);
        }
    };

    const handlePreviousStep = () => {
        if (currentStep === 2) {
            setCurrentStep(1);
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

    const canProceedToStep2 = selectedDays.size === 2 && (formData.schedule || []).length > 0;
    const canSave = canProceedToStep2 && selectedStudentIds.length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-screen bg-white">
                {/* Header with Steps */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                {batch.id ? 'Edit Batch' : 'Create New Batch'}
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Follow the steps to set up your batch schedule and enroll students
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

                    {/* Step Indicator */}
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= 1 ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                                1
                            </div>
                            <span className={`text-sm font-medium ${
                                currentStep >= 1 ? 'text-brand-primary' : 'text-gray-500'
                            }`}>
                                Weekly Schedule
                            </span>
                        </div>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                            <div className={`h-full bg-brand-primary rounded transition-all duration-300 ${
                                currentStep >= 2 ? 'w-full' : 'w-0'
                            }`}></div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= 2 ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                                2
                            </div>
                            <span className={`text-sm font-medium ${
                                currentStep >= 2 ? 'text-brand-primary' : 'text-gray-500'
                            }`}>
                                Student Enrollment
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                    {/* Form Fields - Always visible */}
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

                    {/* Step Content */}
                    <div className="flex-grow p-6 overflow-y-auto">
                        {/* Step 1: Schedule */}
                        {currentStep === 1 && (
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                        📅 Weekly Schedule Setup
                                        <span className="ml-3 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                                            {selectedDays.size}/2 days selected
                                        </span>
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                                        className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                                    >
                                        🌍 {userTimezone === IST_TIMEZONE ? 'IST' : getTimezoneAbbreviation(userTimezone)}
                                    </button>
                                </div>

                                {showTimezoneSelector && (
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
                                        <label className="block text-sm font-medium text-blue-700 mb-2">Select your timezone:</label>
                                        <select
                                            value={userTimezone}
                                            onChange={(e) => setUserTimezone(e.target.value)}
                                            className="border border-blue-300 rounded px-3 py-2 bg-white"
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

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-blue-700">
                                        <strong>Rules:</strong> Select exactly 2 days per week • Each class is 1 hour • Only one time slot per day
                                    </p>
                                </div>

                                {/* Day Selection */}
                                <div className="grid grid-cols-7 gap-3 mb-6">
                                    {Object.keys(WEEKDAY_MAP).map((dayKey) => {
                                        const isSelected = selectedDays.has(dayKey);
                                        const isDisabled = !isSelected && selectedDays.size >= 2;
                                        
                                        return (
                                            <button
                                                type="button"
                                                key={dayKey}
                                                onClick={() => !isDisabled && handleDayToggle(dayKey)}
                                                disabled={isDisabled}
                                                className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                                                    isSelected 
                                                        ? 'bg-brand-primary text-white border-brand-primary' 
                                                        : isDisabled
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-primary'
                                                }`}
                                            >
                                                <div className="text-center">
                                                    <div className="font-semibold">{dayKey}</div>
                                                    <div className="text-xs opacity-75 mt-1">{WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP]}</div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Time Slots - Compact Grid */}
                                <div className="space-y-6">
                                   {sortedSelectedDays.length > 0 ? sortedSelectedDays.map(dayKey => {
                                        const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
                                        const existingSchedule = (formData.schedule || []).find(s => s.timing.startsWith(dayName));
                                        
                                        return (
                                            <div key={dayKey} className="bg-gray-50 rounded-lg p-4 border">
                                                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                                                    <div className="w-3 h-3 bg-brand-primary rounded-full mr-3"></div>
                                                    {dayName}
                                                    <span className="ml-3 text-sm font-normal text-gray-500">(Select one time slot)</span>
                                                </h4>
                                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                    {TIME_SLOTS.map(timeSlot => {
                                                        const fullTiming = `${dayName} ${timeSlot}`;
                                                        const isSelected = existingSchedule?.timing === fullTiming;
                                                        const isTeacherBusy = teacherSchedule.has(fullTiming);
                                                        
                                                        return (
                                                            <label key={fullTiming} className={`flex flex-col items-center text-xs p-2 rounded border cursor-pointer transition-colors ${
                                                                isSelected 
                                                                    ? 'bg-brand-primary text-white border-brand-primary shadow' 
                                                                    : isTeacherBusy
                                                                    ? 'cursor-not-allowed opacity-50 bg-gray-100 border-gray-200'
                                                                    : 'bg-white border-gray-200 hover:border-brand-primary hover:shadow-sm'
                                                            }`}>
                                                                <input
                                                                    type="radio"
                                                                    name={`timing-${dayKey}`}
                                                                    disabled={isTeacherBusy}
                                                                    checked={isSelected}
                                                                    onChange={() => !isTeacherBusy && handleTimingChange(dayKey, fullTiming)}
                                                                    className="mb-1 h-3 w-3"
                                                                />
                                                                <span className="text-center leading-tight">
                                                                    {timeSlot}
                                                                </span>
                                                                <span className="text-xs opacity-75 mt-0.5">
                                                                    {userTimezone === IST_TIMEZONE ? 'IST' : getTimezoneAbbreviation(userTimezone)}
                                                                </span>
                                                                {isTeacherBusy && <span className="text-xs text-red-500 mt-1">Busy</span>}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                   }) : (
                                        <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                📅
                                            </div>
                                            <p className="text-lg font-medium">Select 2 days for classes</p>
                                            <p className="text-sm text-gray-400 mt-1">Choose weekdays from above to continue</p>
                                        </div>
                                   )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Student Enrollment */}
                        {currentStep === 2 && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                        👥 Student Enrollment
                                        <span className="ml-3 text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                                            {selectedStudentIds.length} selected
                                        </span>
                                    </h2>
                                </div>

                                {/* Course Info */}
                                {formData.courseName && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                        <p className="text-sm text-green-700">
                                            <strong>Course:</strong> {formData.courseName} • <strong>{studentsForCourse.length}</strong> students available
                                        </p>
                                    </div>
                                )}

                                {/* Search and Filters */}
                                <div className="flex flex-wrap items-center gap-4 mb-4">
                                    <div className="flex-1 min-w-64">
                                        <input
                                            type="text"
                                            placeholder="Search by name, email, or country..."
                                            value={studentSearch}
                                            onChange={(e) => {
                                                setStudentSearch(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={studentFilter}
                                            onChange={(e) => {
                                                setStudentFilter(e.target.value as any);
                                                setCurrentPage(1);
                                            }}
                                            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                                        >
                                            <option value="all">All Students ({studentsForCourse.length})</option>
                                            <option value="available">Available Only</option>
                                            <option value="conflicts">With Conflicts</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Student Table */}
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.id))}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    const newIds = [...new Set([...selectedStudentIds, ...paginatedStudents.map(s => s.id)])];
                                                                    setSelectedStudentIds(newIds);
                                                                } else {
                                                                    const pageIds = paginatedStudents.map(s => s.id);
                                                                    setSelectedStudentIds(selectedStudentIds.filter(id => !pageIds.includes(id)));
                                                                }
                                                            }}
                                                            className="h-4 w-4 text-brand-primary rounded"
                                                        />
                                                    </th>
                                                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort('name')}>
                                                        Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort('email')}>
                                                        Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Preferred Time
                                                    </th>
                                                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort('country')}>
                                                        Country & Time {sortBy === 'country' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort('registeredAt')}>
                                                        Registered {sortBy === 'registeredAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {paginatedStudents.map(student => {
                                                    const isSelected = selectedStudentIds.includes(student.id);
                                                    const isAvailable = isStudentAvailable(student.id);
                                                    
                                                    return (
                                                        <tr
                                                            key={student.id}
                                                            className={`hover:bg-gray-50 transition-colors text-sm leading-tight ${
                                                                isSelected ? 'bg-green-50' : ''
                                                            } ${!isAvailable ? 'opacity-60' : ''}`}
                                                        >
                                                            <td className="px-2 py-1.5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => handleStudentToggle(student.id)}
                                                                    className="h-4 w-4 text-brand-primary rounded"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="w-6 h-6 bg-gradient-to-br from-brand-primary to-brand-dark rounded-full flex items-center justify-center text-white font-medium text-xs">
                                                                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <span 
                                                                        className="font-medium text-gray-900 cursor-pointer hover:text-brand-primary text-sm"
                                                                        onMouseEnter={(e) => showStudentPopover(student, e)}
                                                                        onMouseLeave={hideStudentPopover}
                                                                    >
                                                                        {student.name}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-1.5 text-gray-600">
                                                                {student.email || '-'}
                                                            </td>
                                                            <td className="px-2 py-1.5 text-gray-600">
                                                                {getStudentPreferredTiming(student)}
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <div className="space-y-0.5">
                                                                    <div className="text-gray-900 font-medium text-sm">{student.country || 'Not specified'}</div>
                                                                    <div className="text-xs text-gray-500">{getStudentLocalTime(student)}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-1.5 text-gray-600">
                                                                {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '-'}
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                {!isAvailable && (
                                                                    <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                                                                        Conflict
                                                                    </span>
                                                                )}
                                                                {isAvailable && isSelected && (
                                                                    <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                                                        Selected
                                                                    </span>
                                                                )}
                                                                {isAvailable && !isSelected && (
                                                                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                                                                        Available
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                                            <p className="text-sm text-gray-700">
                                                Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredAndSortedStudents.length)} of {filteredAndSortedStudents.length} students
                                            </p>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                                >
                                                    Previous
                                                </button>
                                                <span className="px-3 py-1 text-sm bg-brand-primary text-white rounded">
                                                    {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer with Navigation */}
                    <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {currentStep === 1 && (
                                <span>
                                    {canProceedToStep2 ? (
                                        <span className="text-green-600 font-medium">✓ Schedule ready - proceed to student enrollment</span>
                                    ) : (
                                        <span>Select 2 days and set time slots to continue</span>
                                    )}
                                </span>
                            )}
                            {currentStep === 2 && (
                                <span>
                                    {canSave ? (
                                        <span className="text-green-600 font-medium">✓ Ready to save: {selectedDays.size} days, {selectedStudentIds.length} students</span>
                                    ) : (
                                        <span>Select at least 1 student to save the batch</span>
                                    )}
                                </span>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            {currentStep === 2 && (
                                <button 
                                    type="button" 
                                    onClick={handlePreviousStep}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                >
                                    ← Previous
                                </button>
                            )}
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={isLoading} 
                                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            {currentStep === 1 && (
                                <button 
                                    type="button"
                                    onClick={handleNextStep}
                                    disabled={!canProceedToStep2}
                                    className="px-4 py-2 border border-transparent rounded text-white bg-brand-primary hover:bg-brand-dark disabled:opacity-50"
                                >
                                    Next: Enroll Students →
                                </button>
                            )}
                            {currentStep === 2 && (
                                <button 
                                    type="submit" 
                                    disabled={isLoading || !canSave} 
                                    className="px-6 py-2 border border-transparent rounded text-white bg-brand-primary hover:bg-brand-dark disabled:opacity-50"
                                >
                                    {isLoading ? 'Saving...' : 'Save Batch'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Student Popover */}
            <StudentPopover
                student={popoverState.student!}
                isVisible={popoverState.visible}
                position={popoverState.position}
                onClose={hideStudentPopover}
            />
        </Modal>
    );
};

export default EditBatchModal;