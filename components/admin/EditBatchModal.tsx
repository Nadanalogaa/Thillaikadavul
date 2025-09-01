
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
                className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm text-left flex justify-between items-center hover:border-brand-primary hover:shadow-md transition-all duration-200"
            >
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2a3 3 0 015.196-2.196M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2m0 0v-5a3 3 0 016 0v5m-3 0h6m-6 0c0 1.657.343 3.23.949 4.657" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            {selectedStudentIds.length === 0 
                                ? 'Select students for this batch'
                                : `${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? '' : 's'} selected`
                            }
                        </p>
                        <p className="text-xs text-gray-500">
                            {selectedStudentIds.length === 0 
                                ? 'Click to choose from available students'
                                : 'Click to modify selection'
                            }
                        </p>
                    </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-20 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80">
                    <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Search students..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary" 
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        {filteredStudents.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                                {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'} available
                            </p>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                            <ul className="py-1">
                                {filteredStudents.map(student => {
                                     const isAvailable = isStudentAvailable(student.id);
                                     const isSelected = selectedStudentIds.includes(student.id);
                                     
                                     return (
                                        <li key={student.id}>
                                            <label className={`flex items-center w-full px-4 py-3 text-sm transition-colors duration-150 ${
                                                isAvailable 
                                                    ? 'hover:bg-gray-50 cursor-pointer text-gray-700' 
                                                    : 'opacity-50 cursor-not-allowed text-gray-400'
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
                                                    className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded mr-3 flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`font-medium truncate ${
                                                            isSelected ? 'text-brand-primary' : isAvailable ? 'text-gray-900' : 'text-gray-400'
                                                        }`}>
                                                            {student.name}
                                                        </span>
                                                        {!isAvailable && (
                                                            <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">
                                                                Schedule Conflict
                                                            </span>
                                                        )}
                                                    </div>
                                                    {student.email && (
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">{student.email}</p>
                                                    )}
                                                </div>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2a3 3 0 015.196-2.196M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2m0 0v-5a3 3 0 016 0v5m-3 0h6m-6 0c0 1.657.343 3.23.949 4.657" />
                                </svg>
                                <p className="text-sm font-medium">No students found</p>
                                <p className="text-xs mt-1">
                                    {search ? 'Try adjusting your search' : 'No students enrolled in this course'}
                                </p>
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
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-full">
                <ModalHeader 
                    title={batch.id ? 'Edit Batch' : 'Create New Batch'}
                    subtitle="Define batch details, schedule, and members."
                />
                <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="form-label">Course</label>
                            <select name="courseId" value={formData.courseId || ''} onChange={handleCourseChange} required className="form-select w-full">
                                <option value="" disabled>Select a course</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="name" className="form-label">Batch Name</label>
                            <input id="name" name="name" type="text" value={formData.name || ''} onChange={handleChange} required className="form-input w-full" />
                        </div>
                        <div>
                            <label htmlFor="mode" className="form-label">Batch Mode</label>
                            <select id="mode" name="mode" value={formData.mode || ''} onChange={handleChange} required className="form-select w-full">
                                <option value="" disabled>Select mode</option>
                                <option value={ClassPreference.Online}>Online</option>
                                <option value={ClassPreference.Offline}>Offline</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="teacherId" className="form-label">Teacher</label>
                            <select id="teacherId" name="teacherId" value={formData.teacherId || ''} onChange={handleChange} disabled={!formData.courseId} className="form-select w-full">
                                <option value="">{formData.courseId ? "Select a teacher" : "Select course first"}</option>
                                {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        {formData.mode === ClassPreference.Offline && (
                            <div>
                                <label className="form-label">Location</label>
                                <select name="locationId" value={formData.locationId || ''} onChange={handleChange} required className="form-select w-full">
                                    <option value="" disabled>Select a location</option>
                                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="lg:col-span-3">
                            <label htmlFor="description" className="form-label">Description</label>
                            <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={2} className="form-textarea w-full" />
                        </div>
                    </div>

                    <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto -mx-4 px-4 pb-4 border-t pt-4">
                        {/* Left: Schedule Selection */}
                        <div className="flex flex-col min-h-0">
                             <h3 className="form-label text-base mb-3 flex items-center">
                                <svg className="w-5 h-5 text-brand-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Weekly Schedule Setup
                                <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                                    {selectedDays.size}/2 days selected
                                </span>
                             </h3>
                             <div className="grid grid-cols-7 gap-2 mb-6">
                                {Object.keys(WEEKDAY_MAP).map((dayKey) => {
                                    const isSelected = selectedDays.has(dayKey);
                                    const isDisabled = !isSelected && selectedDays.size >= 2;
                                    
                                    return (
                                        <button
                                            type="button"
                                            key={dayKey}
                                            onClick={() => !isDisabled && handleDayToggle(dayKey)}
                                            disabled={isDisabled}
                                            className={`px-2 py-3 text-xs font-medium rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 ${
                                                isSelected 
                                                    ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                                    : isDisabled
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-primary hover:bg-brand-50'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="font-semibold">{dayKey}</div>
                                                <div className="text-xs opacity-75 mt-0.5">{WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP].slice(0, 3)}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                            {/* Helper text and timezone selector */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="text-sm text-blue-700">
                                            <p className="font-medium">Batch Schedule Rules:</p>
                                            <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs">
                                                <li>Select exactly 2 days per week for classes</li>
                                                <li>Each class is 1 hour long</li>
                                                <li>Only one time slot per day</li>
                                                <li>Times displayed in your timezone: {getTimezoneAbbreviation(userTimezone)}</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-200 transition-colors"
                                        >
                                            🌍 {userTimezone === IST_TIMEZONE ? 'IST' : getTimezoneAbbreviation(userTimezone)}
                                        </button>
                                    </div>
                                </div>
                                {showTimezoneSelector && (
                                    <div className="mt-3 pt-3 border-t border-blue-200">
                                        <p className="text-xs text-blue-600 mb-2">Select your timezone to view times:</p>
                                        <select
                                            value={userTimezone}
                                            onChange={(e) => setUserTimezone(e.target.value)}
                                            className="text-xs border border-blue-300 rounded px-2 py-1 bg-white"
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
                            
                            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                               {sortedSelectedDays.length > 0 ? sortedSelectedDays.map(dayKey => {
                                    const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
                                    const existingSchedule = (formData.schedule || []).find(s => s.timing.startsWith(dayName));
                                    
                                    return (
                                        <div key={dayKey} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg border border-gray-200">
                                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                                                <div className="w-3 h-3 bg-brand-primary rounded-full mr-2"></div>
                                                {dayName}
                                                <span className="ml-2 text-xs text-gray-500 font-normal">(Select one time slot)</span>
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {TIME_SLOTS.map(timeSlot => {
                                                    const fullTiming = `${dayName} ${timeSlot}`;
                                                    const isSelected = existingSchedule?.timing === fullTiming;
                                                    const isTeacherBusy = teacherSchedule.has(fullTiming);
                                                    
                                                    return (
                                                        <label key={fullTiming} className={`flex items-center space-x-2 text-sm p-2.5 rounded-md border transition-all duration-200 ${
                                                            isSelected 
                                                                ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                                                : isTeacherBusy
                                                                ? 'cursor-not-allowed opacity-50 bg-gray-100 border-gray-200'
                                                                : 'cursor-pointer bg-white border-gray-200 hover:border-brand-primary hover:bg-brand-50'
                                                        }`}>
                                                            <input
                                                                type="radio"
                                                                name={`timing-${dayKey}`}
                                                                disabled={isTeacherBusy}
                                                                checked={isSelected}
                                                                onChange={() => !isTeacherBusy && handleTimingChange(dayKey, fullTiming)}
                                                                className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300"
                                                            />
                                                            <span className="flex-1">
                                                                {timeSlot}
                                                                <span className="block text-xs opacity-75">
                                                                    {userTimezone === IST_TIMEZONE 
                                                                        ? 'IST' 
                                                                        : `${getTimezoneAbbreviation(userTimezone)}`
                                                                    }
                                                                </span>
                                                            </span>
                                                            {isTeacherBusy && <span className="text-xs text-red-500 font-medium">(Busy)</span>}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                               }) : (
                                    <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium">Select exactly 2 days for your batch</p>
                                        <p className="text-xs mt-1">Choose the days when classes will be conducted</p>
                                    </div>
                               )}
                            </div>
                        </div>

                        {/* Right: Student Roster */}
                        <div className="flex flex-col">
                            <h3 className="form-label text-base mb-3 flex items-center">
                                <svg className="w-5 h-5 text-brand-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2m0 0v-5a3 3 0 016 0v5m-3 0h6m-6 0c0 1.657.343 3.23.949 4.657" />
                                </svg>
                                Student Enrollment
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    {selectedStudentIds.length} selected
                                </span>
                            </h3>
                            
                            {/* Course filter info */}
                            {formData.courseName && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                                    <p className="text-xs text-green-700">
                                        <span className="font-medium">Showing students enrolled in:</span> {formData.courseName}
                                        <span className="block mt-0.5 opacity-75">({studentsForCourse.length} students available)</span>
                                    </p>
                                </div>
                            )}
                            
                             <UnifiedStudentPicker
                                students={studentsForCourse}
                                selectedStudentIds={selectedStudentIds}
                                onSelectionChange={handleStudentSelectionChange}
                                selectedBatchTimings={(formData.schedule || []).map(s => s.timing)}
                                allBatches={allBatches}
                                allUsers={users}
                                currentBatchId={formData.id}
                            />
                             <div className="flex-grow overflow-y-auto mt-4 border rounded-lg bg-white">
                                <div className="p-3 border-b border-gray-100 bg-gray-50">
                                    <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                                        <svg className="w-4 h-4 text-brand-primary mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Enrolled Students 
                                        <span className="ml-1 bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full text-xs">
                                            {selectedStudentIds.length}
                                        </span>
                                    </h4>
                                </div>
                                <div className="p-3">
                                    {selectedStudentIds.length > 0 ? (
                                        <ul className="space-y-2">
                                            {selectedStudentIds.map(id => {
                                                const student = users.find(u => u.id === id);
                                                return student ? (
                                                    <li key={id} className="flex items-center justify-between p-2.5 bg-gradient-to-r from-green-50 to-green-25 rounded-lg border border-green-200 group">
                                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                                <span className="text-green-700 font-medium text-sm">
                                                                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 truncate">{student.name}</p>
                                                                {student.email && (
                                                                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleStudentSelectionChange(selectedStudentIds.filter(sid => sid !== id))} 
                                                            className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-150 opacity-0 group-hover:opacity-100"
                                                            title="Remove student"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </li>
                                                ) : null
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="text-center py-8">
                                            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2a3 3 0 015.196-2.196M7 20H2v-2a3 3 0 015.196-2.196M7 20v-2m0 0v-5a3 3 0 016 0v5m-3 0h6m-6 0c0 1.657.343 3.23.949 4.657" />
                                            </svg>
                                            <p className="text-sm font-medium text-gray-500">No students enrolled</p>
                                            <p className="text-xs text-gray-400 mt-1">Select students from the dropdown above</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 flex justify-end pt-4 mt-auto border-t border-gray-200">
                        <button type="button" onClick={onClose} disabled={isLoading} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-indigo-300">
                            {isLoading ? 'Saving...' : 'Save Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditBatchModal;
