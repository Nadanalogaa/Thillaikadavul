import React, { useState, useEffect } from 'react';
import { WEEKDAYS, TIME_SLOTS, WEEKDAY_MAP } from '../../constants';
import { 
  CourseTimingSlot, 
  formatTimeWithTimezone, 
  getUserTimezone, 
  doSlotsOverlap,
  createUtcTimeSlot,
  createDualTimezoneDisplay,
  IST_TIMEZONE
} from '../../utils/timezone';

interface PreferredTimingSelectorProps {
    selectedCourses: string[];
    selectedTimings: CourseTimingSlot[];
    onChange: (timings: CourseTimingSlot[]) => void;
    userTimezone?: string;
    showOnlySelections?: boolean;
    activeDay?: string | null;
    selectedCourse?: string | null;
    onDayToggle?: (day: string) => void;
    onCourseChange?: (course: string) => void;
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
  userTimezone,
  showOnlySelections = false,
  activeDay: externalActiveDay,
  selectedCourse: externalSelectedCourse,
  onDayToggle,
  onCourseChange: externalOnCourseChange
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

    // Helper function to format dual timezone display
    const formatDualTimezoneDisplay = (day: string, timeSlot: string): string => {
        // For IST users, show the time as-is (no conversion needed)
        if (detectedTimezone === IST_TIMEZONE) {
            return `${day} ${timeSlot} IST`;
        }
        
        // For non-IST users, show their local time with IST reference
        // timeSlot is in IST, so we convert from IST to user timezone
        const utcSlot = createUtcTimeSlot(day, timeSlot, IST_TIMEZONE);
        const dualDisplay = createDualTimezoneDisplay(utcSlot.startUtc, utcSlot.endUtc, detectedTimezone);
        
        return `${day} ${dualDisplay.localTime} (${timeSlot} IST)`;
    };

    const handleDayToggle = (dayKey: string) => {
        if (onDayToggle) {
            onDayToggle(dayKey);
        } else {
            setActiveDay(prev => (prev === dayKey ? null : dayKey));
        }
    };

    const handleCourseChange = (courseName: string) => {
        if (externalOnCourseChange) {
            externalOnCourseChange(courseName);
        } else {
            setSelectedCourse(courseName);
        }
    };

    // Use external state if provided, otherwise use internal state
    const currentActiveDay = externalActiveDay !== undefined ? externalActiveDay : activeDay;
    const currentSelectedCourse = externalSelectedCourse !== undefined ? externalSelectedCourse : selectedCourse;

    const handleTimingClick = (timeSlot: string) => {
        if (!currentActiveDay || !currentSelectedCourse) return;
        
        const fullDay = WEEKDAY_MAP[currentActiveDay as keyof typeof WEEKDAY_MAP];
        const slotId = `${currentSelectedCourse}-${fullDay}-${timeSlot}`;
        
        // Check if this slot is already selected for this course
        const existingSlotIndex = (selectedTimings || []).findIndex(
            slot => slot && typeof slot === 'object' && slot.id === slotId
        );
        
        if (existingSlotIndex !== -1) {
            // Remove the slot
            const newTimings = selectedTimings.filter((_, index) => index !== existingSlotIndex);
            onChange(newTimings);
            return;
        }
        
        // Create new slot with proper handling for IST vs non-IST users
        let localTime: string;
        let istTime: string;
        let utcTime: string;
        
        if (detectedTimezone === IST_TIMEZONE) {
            // For IST users, the timeSlot IS the IST time
            localTime = timeSlot;
            istTime = timeSlot;
            // Create UTC time properly
            const utcSlot = createUtcTimeSlot(fullDay, timeSlot, IST_TIMEZONE);
            utcTime = utcSlot.startUtc;
        } else {
            // For non-IST users, convert properly
            const utcSlot = createUtcTimeSlot(fullDay, timeSlot, IST_TIMEZONE);
            const dualDisplay = createDualTimezoneDisplay(utcSlot.startUtc, utcSlot.endUtc, detectedTimezone);
            localTime = dualDisplay.localTime;
            istTime = dualDisplay.istTime;
            utcTime = utcSlot.startUtc;
        }
        
        const newSlot: CourseTimingSlot = {
            id: slotId,
            courseId: (currentSelectedCourse || '').toLowerCase().replace(/\s+/g, '-'),
            courseName: currentSelectedCourse,
            day: fullDay,
            timeSlot,
            utcTime: utcTime,
            localTime: localTime,
            istTime: istTime,
            timezone: detectedTimezone
        };
        
        // Check for overlaps with existing slots
        const hasOverlap = (selectedTimings || []).some(existing => 
            existing && typeof existing === 'object' && existing.day && 
            doSlotsOverlap(existing, newSlot)
        );
        
        if (hasOverlap) {
            alert('This time slot conflicts with another course. Please select a different time.');
            return;
        }
        
        // Get current course slots for validation
        const currentCourseSlots = (selectedTimings || []).filter(slot => 
            slot && typeof slot === 'object' && slot.courseName === currentSelectedCourse
        );
        
        // Rule 1: Check if course already has 2 slots
        if (currentCourseSlots.length >= 2) {
            alert(`${currentSelectedCourse} already has 2 time slots selected (maximum allowed). Please remove one to add another.`);
            return;
        }
        
        // Rule 2: Check if same day already has a slot for this course
        const sameDaySlot = currentCourseSlots.find(slot => slot.day === fullDay);
        if (sameDaySlot) {
            alert(`${currentSelectedCourse} already has a class on ${fullDay} at ${sameDaySlot.timeSlot}. Only one class per day per course is allowed.`);
            return;
        }
        
        // Across courses: no global daily cap; only prevent overlaps.
        
        onChange([...selectedTimings, newSlot]);
    };
    
    const removeSlot = (slotId: string) => {
        const newTimings = (selectedTimings || []).filter(slot => 
            slot && typeof slot === 'object' && slot.id !== slotId
        );
        onChange(newTimings);
    };
    
    const isSlotSelected = (timeSlot: string): boolean => {
        if (!currentActiveDay || !currentSelectedCourse) return false;
        const fullDay = WEEKDAY_MAP[currentActiveDay as keyof typeof WEEKDAY_MAP];
        const slotId = `${currentSelectedCourse}-${fullDay}-${timeSlot}`;
        return (selectedTimings || []).some(slot => 
            slot && typeof slot === 'object' && slot.id === slotId
        );
    };
    
    const isSlotDisabled = (timeSlot: string): boolean => {
        if (!currentActiveDay || !currentSelectedCourse) return true;
        const fullDay = WEEKDAY_MAP[currentActiveDay as keyof typeof WEEKDAY_MAP];
        
        // Get current course slots
        const currentCourseSlots = (selectedTimings || []).filter(slot => 
            slot && typeof slot === 'object' && slot.courseName === currentSelectedCourse
        );
        
        // Rule 1: If course already has 2 slots, disable all other slots for this course
        if (currentCourseSlots.length >= 2) {
            return !currentCourseSlots.some(slot => 
                slot.day === fullDay && slot.timeSlot === timeSlot
            );
        }
        
        // Rule 2: Can't pick multiple hours on same day for same course
        const sameDayCurrentCourse = currentCourseSlots.some(slot => 
            slot.day === fullDay
        );
        if (sameDayCurrentCourse) {
            // Allow only if this exact slot is already selected
            return !currentCourseSlots.some(slot => 
                slot.day === fullDay && slot.timeSlot === timeSlot
            );
        }
        
        // Rule 3: Check if any other course has this exact slot (cross-course conflicts)
        const conflictingSlot = (selectedTimings || []).find(slot => 
            slot && typeof slot === 'object' &&
            slot.day === fullDay && 
            slot.timeSlot === timeSlot && 
            slot.courseName !== currentSelectedCourse
        );
        
        if (conflictingSlot) return true;
        
        // No daily cap across courses; availability governed by overlap and per-course rules only.
        
        return false;
    };

    // Group selected timings by course (with safety check)
    const timingsByCourse = (selectedTimings || []).reduce((acc, slot) => {
        // Skip if slot is not a proper CourseTimingSlot object
        if (!slot || typeof slot !== 'object' || !slot.courseName || !slot.day) {
            return acc;
        }
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

    // If showOnlySelections is true, only show the selections
    if (showOnlySelections) {
        return (
            <div>
                {selectedTimings.length > 0 ? (
                    <div>
                        {Object.entries(timingsByCourse).map(([courseName, slots]) => {
                            const colors = COURSE_COLORS[courseName] || COURSE_COLORS['Bharatanatyam'];
                            return (
                                <div key={courseName} className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-block w-3 h-3 rounded-full ${colors.bg.replace('bg-', 'bg-').replace('100', '400')}`}></span>
                                        <span className="font-medium text-sm">{courseName}:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {slots.map(slot => (
                                            <div key={slot.id} className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md ${colors.bg} ${colors.text} ${colors.border} border`}>
                                                <span>{formatDualTimezoneDisplay(slot.day, slot.timeSlot)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSlot(slot.id)}
                                                    className="text-red-500 hover:text-red-700 font-bold"
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
                ) : (
                    <div className="text-center text-sm text-gray-500 py-4">
                        <p>No timings selected yet.</p>
                        <p className="text-xs mt-1">Select courses and choose times from the main form.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>


            {/* Time Slot Selection */}
            {currentActiveDay && currentSelectedCourse ? (
                <div className="space-y-4 pr-2 max-h-60 overflow-y-auto">
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">{WEEKDAY_MAP[currentActiveDay as keyof typeof WEEKDAY_MAP]} - {currentSelectedCourse}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TIME_SLOTS.map(timeSlot => {
                                const isSelected = isSlotSelected(timeSlot);
                                const isDisabled = isSlotDisabled(timeSlot);
                                const colors = COURSE_COLORS[currentSelectedCourse] || COURSE_COLORS['Bharatanatyam'];
                                
                                // Get disabled reason for tooltip
                                const getDisabledReason = (): string => {
                                    if (!currentActiveDay || !currentSelectedCourse) return '';
                                    const fullDay = WEEKDAY_MAP[currentActiveDay as keyof typeof WEEKDAY_MAP];
                                    
                                    const currentCourseSlots = (selectedTimings || []).filter(slot => 
                                        slot && typeof slot === 'object' && slot.courseName === currentSelectedCourse
                                    );
                                    
                                    if (currentCourseSlots.length >= 2) {
                                        return `${currentSelectedCourse} already has 2 slots selected (maximum)`;
                                    }
                                    
                                    const sameDaySlot = currentCourseSlots.find(slot => slot.day === fullDay);
                                    if (sameDaySlot) {
                                        return `${currentSelectedCourse} already has a class on ${fullDay} at ${sameDaySlot.timeSlot}`;
                                    }
                                    
                                    const conflictingSlot = (selectedTimings || []).find(slot => 
                                        slot && typeof slot === 'object' &&
                                        slot.day === fullDay && 
                                        slot.timeSlot === timeSlot && 
                                        slot.courseName !== currentSelectedCourse
                                    );
                                    
                                    if (conflictingSlot) {
                                        return `Conflicts with ${conflictingSlot.courseName} ${fullDay} ${timeSlot}`;
                                    }
                                    
                                    const sameDayAllCourses = (selectedTimings || []).filter(slot => 
                                        slot && typeof slot === 'object' && slot.day === fullDay
                                    );
                                    if (sameDayAllCourses.length >= 2) {
                                        const courses = sameDayAllCourses.map(s => `${s.courseName} ${s.timeSlot}`).join(', ');
                                        return `Daily limit reached: 2 hours max per day (already have ${courses})`;
                                    }
                                    
                                    return '';
                                };
                                
                                return (
                                    <button
                                        type="button"
                                        key={timeSlot}
                                        onClick={() => handleTimingClick(timeSlot)}
                                        disabled={isDisabled}
                                        title={isDisabled ? getDisabledReason() : `Select ${timeSlot} for ${currentSelectedCourse} on ${WEEKDAY_MAP[currentActiveDay as keyof typeof WEEKDAY_MAP]}`}
                                        className={`p-1.5 text-sm rounded-md border text-center transition-colors ${
                                            isSelected 
                                                ? `${colors.bg} ${colors.text} ${colors.border} font-semibold` 
                                                : isDisabled 
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-brand-light/50 hover:border-brand-primary'
                                        }`}
                                    >
                                        {detectedTimezone === IST_TIMEZONE ? (
                                            // For IST users, show IST time only
                                            <div className="text-center">
                                                <div className="font-medium">{timeSlot} IST</div>
                                            </div>
                                        ) : (
                                            // For non-IST users, show local time with IST reference
                                            <div className="text-center">
                                                {(() => {
                                                    const utcSlot = createUtcTimeSlot(WEEKDAY_MAP[currentActiveDay as keyof typeof WEEKDAY_MAP], timeSlot, IST_TIMEZONE);
                                                    const dualDisplay = createDualTimezoneDisplay(utcSlot.startUtc, utcSlot.endUtc, detectedTimezone);
                                                    return (
                                                        <div className="font-medium">{dualDisplay.localTime} ({timeSlot} IST)</div>
                                                    );
                                                })()}
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
                <p>Times shown in your timezone ({(detectedTimezone || 'Asia/Kolkata').split('/')[1]?.replace('_', ' ') || 'IST'}) with IST reference</p>
            </div>
        </div>
    );
};

export default PreferredTimingSelector;
