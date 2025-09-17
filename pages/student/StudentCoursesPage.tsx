
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getFamilyStudents, getStudentEnrollmentsForFamily } from '../../api';
import type { User, StudentEnrollment, CourseTimingSlot } from '../../types';
import { MapPinIcon } from '../../components/icons';
import { useTheme } from '../../contexts/ThemeContext';

const StudentCoursesPage: React.FC = () => {
    const { theme } = useTheme();
    const [family, setFamily] = useState<User[]>([]);
    const [enrollments, setEnrollments] = useState<Map<string, StudentEnrollment[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const familyData = await getFamilyStudents();
                setFamily(familyData);

                const enrollmentPromises = familyData.map(student =>
                    getStudentEnrollmentsForFamily(student.id).then(data => ({ studentId: student.id, data }))
                );
                const results = await Promise.all(enrollmentPromises);
                
                const newEnrollments = new Map<string, StudentEnrollment[]>();
                results.forEach(result => {
                    newEnrollments.set(result.studentId, result.data);
                });
                setEnrollments(newEnrollments);
            } catch (error) {
                console.error("Failed to load family course data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // Helper function to get student's preferred timings for a specific course
    const getPreferredTimingsForCourse = (student: User, courseName: string): CourseTimingSlot[] => {
        if (!Array.isArray(student.preferredTimings)) return [];
        return (student.preferredTimings as CourseTimingSlot[]).filter(
            timing => timing && typeof timing === 'object' && timing.courseName === courseName
        );
    };

    // Helper function to format timing slot for display
    const formatTimingSlot = (timing: CourseTimingSlot): string => {
        return `${timing.day}: ${timing.timeSlot}`;
    };

    // Helper function to check if a preferred timing matches any assigned timing
    const isPreferredTimingMatched = (preferredTiming: CourseTimingSlot, assignedTimings: string[]): boolean => {
        const preferredStr = formatTimingSlot(preferredTiming);
        return assignedTimings.some(assigned => 
            assigned.toLowerCase().includes(preferredTiming.day.toLowerCase()) &&
            assigned.toLowerCase().includes(preferredTiming.timeSlot.toLowerCase())
        );
    };

    if (isLoading) return (
        <div className="p-8 text-center">
            <div className="animate-pulse">Loading course information...</div>
        </div>
    );

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900"></div>
                
                {/* Floating Elements */}
                <motion.div
                    className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
                    animate={{
                        y: [0, -20, 0],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>
            
            <div className="relative z-10 p-4 sm:p-6 md:p-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/20 rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/30"
                >
                    <h1 className={`text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
                        📚 My Courses
                    </h1>
                    <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        View and manage courses for each family member
                    </p>
                </motion.div>

                {/* Student Tabs */}
                {family.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/20 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30"
                    >
                        {/* Tab Headers */}
                        <div className="flex border-b border-white/20 dark:border-gray-700/30 overflow-x-auto">
                            {family.map((student, index) => {
                                const active = index === activeTabIndex;
                                const studentName = student.name || `Student ${index + 1}`;
                                const studentEnrollments = enrollments.get(student.id) || [];
                                
                                return (
                                    <motion.button
                                        key={student.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex items-center space-x-3 px-6 py-4 border-b-2 transition-all duration-300 whitespace-nowrap ${
                                            active 
                                                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' 
                                                : 'border-transparent hover:bg-white/20 dark:hover:bg-gray-700/20'
                                        }`}
                                        onClick={() => setActiveTabIndex(index)}
                                    >
                                        <img
                                            src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=E5E7EB&color=111827`}
                                            className="w-8 h-8 rounded-full object-cover border-2 border-purple-300 dark:border-purple-600"
                                            alt={studentName}
                                        />
                                        <span className={`font-medium ${
                                            active 
                                                ? 'text-purple-600 dark:text-purple-400' 
                                                : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            {studentName}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            active 
                                                ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
                                                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {studentEnrollments.length}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {(() => {
                                const currentStudent = family[activeTabIndex];
                                const studentEnrollments = enrollments.get(currentStudent?.id) || [];
                                const studentName = currentStudent?.name || `Student ${activeTabIndex + 1}`;

                                return (
                                    <motion.div
                                        key={activeTabIndex}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="space-y-6"
                                    >
                                        {/* Student Header */}
                                        <div className="flex items-center space-x-4 pb-6 border-b border-white/20 dark:border-gray-700/30">
                                            <img
                                                src={currentStudent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=E5E7EB&color=111827`}
                                                className="w-16 h-16 rounded-full object-cover border-4 border-purple-300 dark:border-purple-600 shadow-lg"
                                                alt={studentName}
                                            />
                                            <div>
                                                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    {studentName}'s Courses
                                                </h3>
                                                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {studentEnrollments.length} course{studentEnrollments.length !== 1 ? 's' : ''} enrolled
                                                </p>
                                            </div>
                                        </div>

                                        {/* Course Cards */}
                                        {studentEnrollments.length > 0 ? (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {studentEnrollments.map((enrollment, idx) => {
                                                    const preferredTimings = getPreferredTimingsForCourse(currentStudent, enrollment.courseName);
                                        
                                                    return (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                                                            className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/20 rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/30 hover:shadow-xl transition-all duration-300"
                                                        >
                                                            {/* Course Header */}
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h3 className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                        {enrollment.courseName}
                                                                    </h3>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            Batch:
                                                                        </span>
                                                                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                                                                            {enrollment.batchName}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            Teacher:
                                                                        </span>
                                                                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                            {enrollment.teacher?.name || 'Not Assigned'}
                                                                        </span>
                                                                    </div>
                                                                    {enrollment.mode === 'Offline' && enrollment.location && (
                                                                        <a 
                                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enrollment.location.address)}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center space-x-1 text-sm text-purple-700 hover:text-purple-900 hover:underline transition-colors"
                                                                        >
                                                                            <MapPinIcon className="h-4 w-4" />
                                                                            <span>{enrollment.location.name}</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                                {enrollment.mode && (
                                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                                        enrollment.mode === 'Online' 
                                                                            ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
                                                                            : 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                                                                    }`}>
                                                                        {enrollment.mode}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Timing Comparison */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Preferred Timings */}
                                                                <div className="bg-white/50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200/50 dark:border-gray-600/30">
                                                                    <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                        Your Preferred Times
                                                                    </h4>
                                                                    {preferredTimings.length > 0 ? (
                                                                        <ul className="space-y-2">
                                                                            {preferredTimings.map((timing, timingIdx) => {
                                                                                const isMatched = isPreferredTimingMatched(timing, enrollment.timings);
                                                                                return (
                                                                                    <li key={timingIdx} className={`text-sm flex items-center gap-2 ${
                                                                                        isMatched ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                                                                                    }`}>
                                                                                        {isMatched ? (
                                                                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                                                            </svg>
                                                                                        ) : (
                                                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                                            </svg>
                                                                                        )}
                                                                                        <span className={isMatched ? '' : 'line-through decoration-2'}>
                                                                                            {formatTimingSlot(timing)}
                                                                                        </span>
                                                                                    </li>
                                                                                );
                                                                            })}
                                                                        </ul>
                                                                    ) : (
                                                                        <p className={`text-sm italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                            No preferred times set
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {/* Assigned Timings */}
                                                                <div className="bg-green-50/50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200/50 dark:border-green-700/30">
                                                                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3 uppercase tracking-wide">
                                                                        Assigned Batch Times
                                                                    </h4>
                                                                    {enrollment.timings.length > 0 ? (
                                                                        <ul className="space-y-2">
                                                                            {enrollment.timings.map((timing, timingIdx) => (
                                                                                <li key={timingIdx} className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                                                                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                                    </svg>
                                                                                    <span className="font-medium">{timing}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-400 italic">No assigned times yet</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Status Indicator */}
                                                            {preferredTimings.length > 0 && (
                                                                <div className="mt-4 pt-4 border-t border-white/20 dark:border-gray-700/30">
                                                                    <div className="flex items-center gap-2">
                                                                        {preferredTimings.every(timing => isPreferredTimingMatched(timing, enrollment.timings)) ? (
                                                                            <>
                                                                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                                </svg>
                                                                                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                                                                    Perfect match! All your preferred times were accommodated.
                                                                                </span>
                                                                            </>
                                                                        ) : preferredTimings.some(timing => isPreferredTimingMatched(timing, enrollment.timings)) ? (
                                                                            <>
                                                                                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                                                                </svg>
                                                                                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                                                                                    Partial match. Some of your preferred times were accommodated.
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                                </svg>
                                                                                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                                                                    Different schedule assigned based on availability.
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.5 }}
                                                className="text-center py-12"
                                            >
                                                <div className="mx-auto w-24 h-24 bg-gray-100/50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                                                    <svg className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                                    </svg>
                                                </div>
                                                <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    No courses enrolled yet
                                                </p>
                                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {studentName} hasn't been enrolled in any courses yet. Contact admin for course enrollment.
                                                </p>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })()}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default StudentCoursesPage;
