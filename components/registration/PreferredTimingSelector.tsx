import React, { useState, useEffect } from 'react';
import { WEEKDAYS, TIME_SLOTS, WEEKDAY_MAP } from '../../constants';
import { 
  CourseTimingSlot, 
  createDualTimezoneDisplay, 
  getUserTimezone, 
  doSlotsOverlap 
} from '../../utils/timezone';

interface PreferredTimingSelectorProps {
    selectedCourses: string[];
    selectedTimings: CourseTimingSlot[];
    onChange: (timings: CourseTimingSlot[]) => void;
    userTimezone?: string;
}

// Course colors for visual distinction
const COURSE_COLORS: { [key: string]: { bg: string; text: string; border: string } } = {
  'Bharatanatyam': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  'Vocal': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'Drawing': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  'Abacus': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' }
};

const PreferredTimingSelector: React.FC<PreferredTimingSelectorProps> = ({ 
  selectedCourses, 
  selectedTimings, 
  onChange, 
  userTimezone 
}) => {
    const [activeDay, setActiveDay] = useState<string | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
    const [detectedTimezone, setDetectedTimezone] = useState<string>('Asia/Kolkata');

    useEffect(() => {
        const timezone = userTimezone || getUserTimezone();
        setDetectedTimezone(timezone);
        
        // Auto-select first course if none selected
        if (selectedCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(selectedCourses[0]);
        }
    }, [userTimezone, selectedCourses, selectedCourse]);

    const handleDayToggle = (dayKey: string) => {
        setActiveDay(prev => (prev === dayKey ? null : dayKey));
    };

    const handleCourseChange = (courseName: string) => {
        setSelectedCourse(courseName);
    };

    const handleTimingClick = (timeSlot: string) => {
        if (!activeDay || !selectedCourse) return;
        
        const fullDay = WEEKDAY_MAP[activeDay as keyof typeof WEEKDAY_MAP];
        const slotId = `${selectedCourse}-${fullDay}-${timeSlot}`;
        
        // Check if this slot is already selected for this course
        const existingSlotIndex = selectedTimings.findIndex(
            slot => slot.id === slotId
        );
        
        if (existingSlotIndex !== -1) {
            // Remove the slot
            const newTimings = selectedTimings.filter((_, index) => index !== existingSlotIndex);
            onChange(newTimings);
            return;
        }
        
        // Create new slot
        const newSlot: CourseTimingSlot = {
            id: slotId,
            courseId: selectedCourse.toLowerCase().replace(/\s+/g, '-'),
            courseName: selectedCourse,
            day: fullDay,
            timeSlot,
            utcTime: new Date().toISOString(), // This would be properly calculated in real implementation
            localTime: timeSlot,
            istTime: timeSlot, // This would be properly converted
            timezone: detectedTimezone
        };
        
        // Check for overlaps with existing slots
        const hasOverlap = selectedTimings.some(existing => 
            doSlotsOverlap(existing, newSlot)
        );
        
        if (hasOverlap) {
            alert('This time slot conflicts with another course. Please select a different time.');
            return;
        }
        
        // Check if course already has 2 slots (1 hour × 2 days per week)
        const courseSlots = selectedTimings.filter(slot => slot.courseName === selectedCourse);
        if (courseSlots.length >= 2) {
            alert(`${selectedCourse} already has 2 time slots selected. Please remove one to add another.`);
            return;
        }
        
        onChange([...selectedTimings, newSlot]);
    };
    
    const removeSlot = (slotId: string) => {
        const newTimings = selectedTimings.filter(slot => slot.id !== slotId);
        onChange(newTimings);
    };
    
    const isSlotSelected = (timeSlot: string): boolean => {
        if (!activeDay || !selectedCourse) return false;
        const fullDay = WEEKDAY_MAP[activeDay as keyof typeof WEEKDAY_MAP];
        const slotId = `${selectedCourse}-${fullDay}-${timeSlot}`;
        return selectedTimings.some(slot => slot.id === slotId);
    };
    
    const isSlotDisabled = (timeSlot: string): boolean => {
        if (!activeDay) return true;
        const fullDay = WEEKDAY_MAP[activeDay as keyof typeof WEEKDAY_MAP];
        
        // Check if any other course has this slot
        return selectedTimings.some(slot => 
            slot.day === fullDay && 
            slot.timeSlot === timeSlot && 
            slot.courseName !== selectedCourse
        );
    };

    // Group selected timings by course
    const timingsByCourse = selectedTimings.reduce((acc, slot) => {
        if (!acc[slot.courseName]) {
            acc[slot.courseName] = [];
        }
        acc[slot.courseName].push(slot);
        return acc;
    }, {} as { [key: string]: CourseTimingSlot[] });

    if (selectedCourses.length === 0) {
        return (
            <div className="text-center text-sm text-gray-500 py-6 border-2 border-dashed rounded-lg">
                <p>Please select courses first to choose preferred timings.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Selected Timings Display */}
            {selectedTimings.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Selected Timings:</h4>
                    {Object.entries(timingsByCourse).map(([courseName, slots]) => {
                        const colors = COURSE_COLORS[courseName] || COURSE_COLORS['Bharatanatyam'];
                        return (
                            <div key={courseName} className="mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`inline-block w-3 h-3 rounded-full ${colors.bg.replace('bg-', 'bg-').replace('100', '400')}`}></span>
                                    <span className="font-medium text-sm">{courseName}:</span>
                                </div>
                                <div className="flex flex-wrap gap-1 ml-5">
                                    {slots.map(slot => (
                                        <div key={slot.id} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${colors.bg} ${colors.text} ${colors.border} border`}>
                                            <span>{createDualTimezoneDisplay(slot.day, slot.timeSlot, detectedTimezone)}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeSlot(slot.id)}
                                                className="ml-1 text-red-500 hover:text-red-700"
                                                title="Remove this slot"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Course Selection */}
            <div className="mb-4">
                <p className="form-label mb-2">Select course to schedule:</p>
                <div className="flex flex-wrap gap-2">
                    {selectedCourses.map(course => {
                        const colors = COURSE_COLORS[course] || COURSE_COLORS['Bharatanatyam'];
                        const courseSlots = timingsByCourse[course] || [];
                        return (
                            <button
                                key={course}
                                type="button"
                                onClick={() => handleCourseChange(course)}
                                className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${
                                    selectedCourse === course 
                                        ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-${course === 'Bharatanatyam' ? 'purple' : course === 'Vocal' ? 'blue' : course === 'Drawing' ? 'green' : 'orange'}-300`
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {course} ({courseSlots.length}/2)
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Day Selection */}
            <div className="mb-4">
                <p className="form-label">Toggle a day to see available time slots:</p>
                <div className="flex rounded-md shadow-sm">
                    {Object.keys(WEEKDAY_MAP).map((dayKey) => (
                        <button
                            type="button"
                            key={dayKey}
                            onClick={() => handleDayToggle(dayKey)}
                            className={`flex-1 px-3 py-2 text-sm font-medium border border-gray-300 -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                                activeDay === dayKey ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {dayKey}
                        </button>
                    ))}
                </div>
            </div>

            {/* Time Slot Selection */}
            {activeDay && selectedCourse ? (
                <div className="space-y-4 pr-2 max-h-60 overflow-y-auto">
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">{WEEKDAY_MAP[activeDay as keyof typeof WEEKDAY_MAP]} - {selectedCourse}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TIME_SLOTS.map(timeSlot => {
                                const isSelected = isSlotSelected(timeSlot);
                                const isDisabled = isSlotDisabled(timeSlot);
                                const colors = COURSE_COLORS[selectedCourse] || COURSE_COLORS['Bharatanatyam'];
                                
                                return (
                                    <button
                                        type="button"
                                        key={timeSlot}
                                        onClick={() => handleTimingClick(timeSlot)}
                                        disabled={isDisabled}
                                        className={`p-2 text-sm rounded-md border text-center transition-colors ${
                                            isSelected 
                                                ? `${colors.bg} ${colors.text} ${colors.border} font-semibold` 
                                                : isDisabled 
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-brand-light/50 hover:border-brand-primary'
                                        }`}
                                    >
                                        <div>{timeSlot}</div>
                                        {isSelected && (
                                            <div className="text-xs opacity-75 mt-1">
                                                {createDualTimezoneDisplay(WEEKDAY_MAP[activeDay as keyof typeof WEEKDAY_MAP], timeSlot, detectedTimezone).replace(/^\w+\s/, '')}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-sm text-gray-500 py-6 border-2 border-dashed rounded-lg">
                    <p>Select a course and day to see available time slots.</p>
                    <p className="text-xs mt-1">Each course requires 2 time slots (1 hour × 2 days per week)</p>
                </div>
            )}
            
            {/* Timezone Info */}
            <div className="mt-4 text-xs text-gray-500">
                <p>Times shown in your timezone ({detectedTimezone.split('/')[1]?.replace('_', ' ')}) with IST reference</p>
            </div>
        </div>
    );
};

export default PreferredTimingSelector;