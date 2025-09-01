import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Batch, Course, User, BatchSchedule, Location } from '../../types';
import { UserRole, ClassPreference } from '../../types';
import { WEEKDAYS, TIME_SLOTS, WEEKDAY_MAP } from '../../constants';
import { XCircleIcon } from '../icons';
import { getLocations } from '../../api';
import { getUserTimezone, formatTimeWithTimezone, IST_TIMEZONE, getTimezoneAbbreviation } from '../../utils/timezone';


interface UnifiedStudentPickerProps {
    students: User[];
    selectedStudentIds: string[];
    onSelectionChange: (ids: string[]) => void;
    selectedBatchTimings: string[];
    allBatches: Batch[];
    allUsers: User[];
    currentBatchId?: string;
}

const UnifiedStudentPicker: React.FC<UnifiedStudentPickerProps> = ({ students, selectedStudentIds, onSelectionChange, selectedBatchTimings, allBatches, allUsers, currentBatchId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStudentFullSchedule = (studentId: string): Set<string> => {
        const schedule = new Set<string>();
        allBatches.forEach(b => {
            if(b.id !== currentBatchId) {
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
        if (!selectedBatchTimings || selectedBatchTimings.length === 0) return true;
        const studentSchedule = getStudentFullSchedule(studentId);
        return !selectedBatchTimings.some(time => studentSchedule.has(time));
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }, [students, search]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 bg-white border border-gray-300 rounded text-left flex justify-between items-center hover:border-brand-primary transition-colors text-sm"
            >
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-brand-50 rounded flex items-center justify-center">
                        <svg className="w-3 h-3 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2a3 3 0 015.196-2.196M7 20H2v-2a3 3 0 515.196-2.196M7 20v-2m0 0v-5a3 3 0 616 0v5m-3 0h6m-6 0c0 1.657.343 3.23.949 4.657" />
                        </svg>
                    </div>
                    <span>
                        {selectedStudentIds.length === 0 
                            ? 'Select students for batch'
                            : `${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? '' : 's'} selected`
                        }
                    </span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white rounded border border-gray-200 shadow-lg max-h-64">
                    <div className="p-2 border-b">
                        <input 
                            type="text" 
                            placeholder="Search students..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded" 
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                            <ul className="py-1">
                                {filteredStudents.map(student => {
                                     const isAvailable = isStudentAvailable(student.id);
                                     const isSelected = selectedStudentIds.includes(student.id);
                                     
                                     return (
                                        <li key={student.id}>
                                            <label className={`flex items-center w-full px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer ${
                                                !isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                                            } ${isSelected ? 'bg-brand-50' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={!isAvailable}
                                                    checked={isSelected}
                                                    onChange={e => {
                                                        const newSelection = new Set(selectedStudentIds);
                                                        if (e.target.checked) newSelection.add(student.id); else newSelection.delete(student.id);
                                                        onSelectionChange(Array.from(newSelection));
                                                    }}
                                                    className="h-3 w-3 text-brand-primary mr-2"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{student.name}</span>
                                                        {!isAvailable && (
                                                            <span className="text-xs text-red-500 bg-red-50 px-1 py-0.5 rounded">
                                                                Conflict
                                                            </span>
                                                        )}
                                                    </div>
                                                    {student.email && (
                                                        <p className="text-xs text-gray-500">{student.email}</p>
                                                    )}
                                                </div>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                <p>No students found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


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
    const [activeTab, setActiveTab] = useState<'schedule' | 'students'>('schedule');

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
            // Remove day
            newDays.delete(dayKey);
            const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
            setFormData(prev => ({
                ...prev,
                schedule: (prev.schedule || []).filter(s => !s.timing.startsWith(dayName))
            }));
        } else {
            // Add day only if we haven't reached the limit of 2 days
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
            
            // Remove any existing schedule for this day (single selection per day)
            newSchedule = newSchedule.filter(s => !s.timing.startsWith(dayName));
            
            // Add the new timing
            newSchedule.push({ timing: fullTiming, studentIds: [] });
            
            return { ...prev, schedule: newSchedule };
        });
    };

    const handleStudentSelectionChange = (ids: string[]) => {
        setSelectedStudentIds(ids);
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
            // Check other batches assigned to this teacher
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
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <div className="flex flex-col h-full max-h-[90vh]">
                <ModalHeader 
                    title={batch.id ? 'Edit Batch' : 'Create New Batch'}
                    subtitle="Define batch details, schedule, and members."
                />
                <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                    {/* Compact Input Section */}
                    <div className="bg-gray-50 p-3 rounded mb-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Course *</label>
                                <select name="courseId" value={formData.courseId || ''} onChange={handleCourseChange} required className="w-full text-sm border border-gray-300 rounded px-2 py-1">
                                    <option value="" disabled>Select course</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Name *</label>
                                <input name="name" type="text" value={formData.name || ''} onChange={handleChange} required className="w-full text-sm border border-gray-300 rounded px-2 py-1" placeholder="Enter batch name" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Mode *</label>
                                <select name="mode" value={formData.mode || ''} onChange={handleChange} required className="w-full text-sm border border-gray-300 rounded px-2 py-1">
                                    <option value="" disabled>Select mode</option>
                                    <option value={ClassPreference.Online}>Online</option>
                                    <option value={ClassPreference.Offline}>Offline</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Teacher</label>
                                <select name="teacherId" value={formData.teacherId || ''} onChange={handleChange} disabled={!formData.courseId} className="w-full text-sm border border-gray-300 rounded px-2 py-1">
                                    <option value="">{formData.courseId ? "Select teacher" : "Select course first"}</option>
                                    {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                            {formData.mode === ClassPreference.Offline && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
                                    <select name="locationId" value={formData.locationId || ''} onChange={handleChange} required className="w-full text-sm border border-gray-300 rounded px-2 py-1">
                                        <option value="" disabled>Select location</option>
                                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className={formData.mode === ClassPreference.Offline ? "lg:col-span-2" : "lg:col-span-3"}>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={1} className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none" placeholder="Brief description..." />
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 mb-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('schedule')}
                            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'schedule'
                                    ? 'border-brand-primary text-brand-primary bg-brand-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            📅 Schedule ({selectedDays.size}/2)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('students')}
                            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'students'
                                    ? 'border-brand-primary text-brand-primary bg-brand-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            👥 Students ({selectedStudentIds.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-grow overflow-y-auto">
                        {/* Schedule Tab */}
                        {activeTab === 'schedule' && (
                            <div className="space-y-3">
                                {/* Day Selection */}
                                <div className="grid grid-cols-7 gap-1">
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

                                {/* Helper Info */}
                                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-blue-700">
                                            <strong>Rules:</strong> 2 days/week • 1 hour/class • Single slot/day
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                        >
                                            🌍 {userTimezone === IST_TIMEZONE ? 'IST' : getTimezoneAbbreviation(userTimezone)}
                                        </button>
                                    </div>
                                    {showTimezoneSelector && (
                                        <div className="mt-2 pt-2 border-t border-blue-200">
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
                                </div>

                                {/* Time Slots */}
                                <div className="space-y-2">
                                   {sortedSelectedDays.length > 0 ? sortedSelectedDays.map(dayKey => {
                                        const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
                                        const existingSchedule = (formData.schedule || []).find(s => s.timing.startsWith(dayName));
                                        
                                        return (
                                            <div key={dayKey} className="p-2 bg-gray-50 rounded border">
                                                <h4 className="font-medium text-gray-800 mb-2 text-sm flex items-center">
                                                    <div className="w-2 h-2 bg-brand-primary rounded-full mr-2"></div>
                                                    {dayName}
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
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
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                📅
                                            </div>
                                            <p className="text-sm font-medium">Select 2 days for classes</p>
                                            <p className="text-xs text-gray-400 mt-1">Choose weekdays from above</p>
                                        </div>
                                   )}
                                </div>
                            </div>
                        )}

                        {/* Students Tab */}
                        {activeTab === 'students' && (
                            <div className="space-y-3">
                                {/* Course Info */}
                                {formData.courseName && (
                                    <div className="bg-green-50 border border-green-200 rounded p-2">
                                        <p className="text-xs text-green-700">
                                            <strong>Students in {formData.courseName}:</strong> {studentsForCourse.length} available
                                        </p>
                                    </div>
                                )}

                                {/* Student Picker */}
                                <UnifiedStudentPicker
                                    students={studentsForCourse}
                                    selectedStudentIds={selectedStudentIds}
                                    onSelectionChange={handleStudentSelectionChange}
                                    selectedBatchTimings={(formData.schedule || []).map(s => s.timing)}
                                    allBatches={allBatches}
                                    allUsers={users}
                                    currentBatchId={formData.id}
                                />
                                
                                {/* Selected Students */}
                                <div className="border rounded bg-white">
                                    <div className="p-2 border-b bg-gray-50">
                                        <h4 className="text-sm font-medium text-gray-800">
                                            ✅ Enrolled Students ({selectedStudentIds.length})
                                        </h4>
                                    </div>
                                    <div className="p-2 max-h-48 overflow-y-auto">
                                        {selectedStudentIds.length > 0 ? (
                                            <div className="space-y-1">
                                                {selectedStudentIds.map(id => {
                                                    const student = users.find(u => u.id === id);
                                                    return student ? (
                                                        <div key={id} className="flex items-center justify-between p-2 bg-green-50 rounded border group">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                                                    <span className="text-green-700 font-medium text-xs">
                                                                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                                                    {student.email && (
                                                                        <p className="text-xs text-gray-500">{student.email}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleStudentSelectionChange(selectedStudentIds.filter(sid => sid !== id))} 
                                                                className="p-1 text-red-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ) : null
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-500">
                                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    👥
                                                </div>
                                                <p className="text-sm">No students selected</p>
                                                <p className="text-xs text-gray-400">Use the dropdown above</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-3 mt-3 border-t border-gray-200 space-x-2">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm border border-transparent rounded text-white bg-brand-primary hover:bg-brand-dark disabled:opacity-50">
                            {isLoading ? 'Saving...' : 'Save Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditBatchModal;