import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Batch, Course, User, BatchSchedule } from '../../types';
import { UserRole, ClassPreference } from '../../types';
import { WEEKDAYS, TIME_SLOTS } from '../../constants';
import { addBatch } from '../../api';

interface QuickBatchCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newBatch: Batch) => void;
    course: Course | null;
    allUsers: User[];
    allBatches: Batch[];
    preferredTimings: string[];
}

const QuickBatchCreateModal: React.FC<QuickBatchCreateModalProps> = ({ isOpen, onClose, onSave, course, allUsers, allBatches, preferredTimings }) => {
    const [name, setName] = useState('');
    const [teacherId, setTeacherId] = useState<string>('');
    const [mode, setMode] = useState<ClassPreference.Online | ClassPreference.Offline>(ClassPreference.Online);
    const [schedule, setSchedule] = useState<BatchSchedule[]>([]);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && course) {
            // Reset form
            setName(`${course.name} - New Batch`);
            setTeacherId('');
            setMode(ClassPreference.Online);
            setSchedule([]);
            setSelectedDays([]);
            setStartTime('');
            setEndTime('');
            setIsLoading(false);
        }
    }, [isOpen, course]);

    const teachersWithExpertise = useMemo(() => {
        if (!course) return [];
        return allUsers.filter(u => u.role === UserRole.Teacher && u.courseExpertise?.includes(course.name));
    }, [allUsers, course]);

    const availableTeachers = useMemo(() => {
        const selectedTimes = new Set(schedule.map(s => s.timing).filter(Boolean));
        if (selectedTimes.size === 0) {
            return teachersWithExpertise;
        }

        return teachersWithExpertise.filter(teacher => {
            const teacherSchedule = new Set<string>();
            allBatches.forEach(b => {
                const batchTeacherId = typeof b.teacherId === 'string' ? b.teacherId : (b.teacherId as User)?.id;
                if (batchTeacherId === teacher.id) {
                    (b.schedule || []).forEach(s => teacherSchedule.add(s.timing));
                }
            });

            for (const time of selectedTimes) {
                if (teacherSchedule.has(time)) {
                    return false; // Teacher is busy
                }
            }
            return true; // Teacher is available
        });
    }, [schedule, teachersWithExpertise, allBatches]);

    useEffect(() => {
        // Reset selected teacher if they become unavailable due to a schedule change
        if (teacherId && !availableTeachers.some(t => t.id === teacherId)) {
            setTeacherId('');
        }
    }, [availableTeachers, teacherId]);

    const handleAddTiming = () => {
        setSchedule(prev => [...prev, { timing: '', studentIds: [] }]);
    };

    const handleRemoveTiming = (index: number) => {
        setSchedule(prev => prev.filter((_, i) => i !== index));
    };

    const handleTimingChange = (index: number, newTiming: string) => {
        setSchedule(prev => {
            const newSchedule = [...prev];
            newSchedule[index].timing = newTiming;
            return newSchedule;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!course || !name) {
            alert('Please fill in the batch name.');
            return;
        }
        if (selectedDays.length === 0) {
            alert('Please select at least one day.');
            return;
        }
        if (!startTime || !endTime) {
            alert('Please select start and end times.');
            return;
        }

        setIsLoading(true);
        try {
            const batchData: Partial<Batch> = {
                name,
                courseId: course.id,
                courseName: course.name,
                teacherId: teacherId || undefined,
                mode,
                schedule,
                days: selectedDays,
                startTime,
                endTime,
                description: `Quickly created batch for ${course.name}.`,
            };
            const newBatch = await addBatch(batchData);
            onSave(newBatch);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create batch.');
            setIsLoading(false);
        }
    };
    
    if (!course) return null;

    const allTimings = WEEKDAYS.flatMap(day => TIME_SLOTS.map(slot => `${day} ${slot}`));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalHeader title={`Quick Create Batch for ${course.name}`} />
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="form-label">Batch Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="form-input w-full" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Teacher (Optional)</label>
                        <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="form-select w-full">
                            <option value="">Select an available teacher</option>
                            {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                         {schedule.length > 0 && availableTeachers.length === 0 && teachersWithExpertise.length > 0 && (
                             <div className="text-xs text-center text-yellow-800 bg-yellow-100 p-2 mt-2 rounded-md border border-yellow-200">
                                Warning: No teachers with expertise in {course.name} are available for the selected time(s). You can create the batch and assign a teacher later.
                            </div>
                        )}
                        {teachersWithExpertise.length === 0 && (
                             <div className="text-xs text-center text-gray-600 bg-gray-100 p-2 mt-2 rounded-md border">
                                No teachers have expertise in {course.name}.
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="form-label">Mode</label>
                        <select value={mode} onChange={e => setMode(e.target.value as any)} className="form-select w-full">
                            <option value={ClassPreference.Online}>Online</option>
                            <option value={ClassPreference.Offline}>Offline</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="form-label">Days</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 border rounded-lg">
                        {WEEKDAYS.map(day => (
                            <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedDays.includes(day)}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedDays([...selectedDays, day]);
                                        } else {
                                            setSelectedDays(selectedDays.filter(d => d !== day));
                                        }
                                    }}
                                    className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                />
                                <span className="text-sm">{day}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Start Time</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            required
                            className="form-input w-full"
                        />
                    </div>
                    <div>
                        <label className="form-label">End Time</label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            required
                            className="form-input w-full"
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">
                        {isLoading ? 'Creating...' : 'Create Batch'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickBatchCreateModal;