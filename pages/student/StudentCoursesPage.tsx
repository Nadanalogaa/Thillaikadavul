import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
    BookOpen, 
    Users, 
    Clock, 
    MapPin, 
    User, 
    Star, 
    CheckCircle, 
    Calendar,
    Heart,
    Music,
    Palette,
    Calculator,
    Award,
    TrendingUp,
    Target
} from 'lucide-react';
import { getFamilyStudents, getStudentEnrollmentsForFamily } from '../../api';
import type { User, StudentEnrollment, CourseTimingSlot } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import BeautifulLoader from '../../components/BeautifulLoader';

const getCourseIcon = (courseName: string) => {
    const iconMap: Record<string, React.ElementType> = {
        'Bharatanatyam': Heart,
        'Vocal': Music,
        'Drawing': Palette,
        'Abacus': Calculator
    };
    return iconMap[courseName] || BookOpen;
};

const getCourseTheme = (courseName: string, index: number) => {
    const courseThemes: Record<string, { gradient: string; bgGradient: string }> = {
        'Bharatanatyam': { 
            gradient: 'from-pink-500 to-rose-500',
            bgGradient: 'bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 dark:from-pink-900/30 dark:via-rose-900/30 dark:to-purple-900/30'
        },
        'Vocal': { 
            gradient: 'from-blue-500 to-indigo-500',
            bgGradient: 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30'
        },
        'Drawing': { 
            gradient: 'from-orange-500 to-amber-500',
            bgGradient: 'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/30 dark:via-amber-900/30 dark:to-yellow-900/30'
        },
        'Abacus': { 
            gradient: 'from-green-500 to-emerald-500',
            bgGradient: 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30'
        }
    };
    
    const fallbackThemes = [
        { gradient: 'from-purple-500 to-blue-500', bgGradient: 'bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-indigo-900/30' },
        { gradient: 'from-cyan-500 to-teal-500', bgGradient: 'bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 dark:from-cyan-900/30 dark:via-teal-900/30 dark:to-emerald-900/30' }
    ];
    
    return courseThemes[courseName] || fallbackThemes[index % fallbackThemes.length];
};

const StudentCoursesPage: React.FC = () => {
    const { theme } = useTheme();
    const [family, setFamily] = useState<User[]>([]);
    const [enrollments, setEnrollments] = useState<Map<string, StudentEnrollment[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [tabsRef, tabsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [coursesRef, coursesInView] = useInView({ threshold: 0.1, triggerOnce: true });

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

    // Helper functions
    const getPreferredTimingsForCourse = (student: User, courseName: string): CourseTimingSlot[] => {
        if (!Array.isArray(student.preferredTimings)) return [];
        return (student.preferredTimings as CourseTimingSlot[]).filter(
            timing => timing && typeof timing === 'object' && timing.courseName === courseName
        );
    };

    const formatTimingSlot = (timing: CourseTimingSlot): string => {
        return `${timing.day}: ${timing.timeSlot}`;
    };

    const isPreferredTimingMatched = (preferredTiming: CourseTimingSlot, assignedTimings: string[]): boolean => {
        const preferredStr = formatTimingSlot(preferredTiming);
        return assignedTimings.some(assigned => 
            assigned.toLowerCase().includes(preferredTiming.day.toLowerCase()) &&
            assigned.toLowerCase().includes(preferredTiming.timeSlot.toLowerCase())
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading course information...</p>
                </div>
            </div>
        );
    }

    const currentStudent = family[activeTabIndex];
    const studentEnrollments = enrollments.get(currentStudent?.id) || [];
    const studentName = currentStudent?.name || `Student ${activeTabIndex + 1}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full"
                    animate={{
                        y: [0, -30, 0],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-1/3 left-10 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-lg rotate-12"
                    animate={{
                        y: [0, 20, 0],
                        rotate: [12, 25, 12],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full"
                    animate={{
                        y: [0, -25, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 p-6 space-y-8">

                {/* Student Tabs */}
                {family.length > 0 && (
                    <motion.section
                        ref={tabsRef}
                        initial={{ opacity: 0, y: 50 }}
                        animate={tabsInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={`rounded-3xl shadow-2xl border backdrop-blur-sm overflow-hidden ${
                            theme === 'dark' 
                                ? 'bg-gray-800/90 border-gray-700/50' 
                                : 'bg-white/90 border-purple-200/50'
                        }`}
                    >
                        {/* Tab Header */}
                        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-purple-200'}`}>
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        My Courses
                                    </h2>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        View and manage courses for each family member
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Student Navigation Tabs */}
                        <div className={`px-6 py-4 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-r from-purple-50/50 to-blue-50/50'}`}>
                            <div className="flex space-x-2 overflow-x-auto">
                                {family.map((student, index) => {
                                    const active = index === activeTabIndex;
                                    const studentName = student.name || `Student ${index + 1}`;
                                    const studentEnrollments = enrollments.get(student.id) || [];
                                    
                                    return (
                                        <motion.button
                                            key={student.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={tabsInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ duration: 0.6, delay: index * 0.1 }}
                                            className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 whitespace-nowrap font-semibold min-w-fit ${
                                                active 
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg ring-2 ring-purple-300 dark:ring-purple-600 transform scale-105' 
                                                    : theme === 'dark'
                                                        ? 'bg-gray-600/50 text-gray-300 hover:bg-gray-500/50 hover:text-white'
                                                        : 'bg-white/70 text-gray-700 hover:bg-white hover:text-purple-600 border border-gray-200 hover:border-purple-300'
                                            }`}
                                            onClick={() => setActiveTabIndex(index)}
                                        >
                                            <div className="relative">
                                                <img
                                                    src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=${active ? 'fff' : '7B61FF'}&color=${active ? '7B61FF' : 'fff'}`}
                                                    className="w-10 h-10 rounded-full object-cover shadow-md"
                                                    alt={studentName}
                                                />
                                                {active && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <span>{studentName}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                active 
                                                    ? 'bg-white/20 text-white'
                                                    : theme === 'dark'
                                                        ? 'bg-gray-700 text-gray-300'
                                                        : 'bg-purple-100 text-purple-700'
                                            }`}>
                                                {studentEnrollments.length}
                                            </span>
                                            {active && <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTabIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                                className="p-6"
                            >
                                {/* Student Header */}
                                <div className="flex items-center space-x-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                                    <div className="relative">
                                        <img
                                            src={currentStudent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=7B61FF&color=fff`}
                                            className="w-16 h-16 rounded-full object-cover border-4 border-purple-300 dark:border-purple-600 shadow-lg"
                                            alt={studentName}
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-3 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                            {studentName}'s Courses
                                        </h3>
                                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex items-center space-x-2`}>
                                            <TrendingUp className="w-4 h-4" />
                                            <span>{studentEnrollments.length} course{studentEnrollments.length !== 1 ? 's' : ''} enrolled</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Course Cards */}
                                <motion.div
                                    ref={coursesRef}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.8 }}
                                    className="mt-6"
                                >
                                    {studentEnrollments.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {studentEnrollments.map((enrollment, idx) => {
                                                const preferredTimings = getPreferredTimingsForCourse(currentStudent, enrollment.courseName);
                                                const courseTheme = getCourseTheme(enrollment.courseName, idx);
                                                const Icon = getCourseIcon(enrollment.courseName);
                                                
                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                        animate={coursesInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                        className={`${courseTheme.bgGradient} rounded-2xl p-6 border ${theme === 'dark' ? 'border-gray-600/30' : 'border-white/50'} backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden group`}
                                                    >
                                                        {/* Background decoration */}
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
                                                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
                                                        
                                                        <div className="relative z-10">
                                                            {/* Course Header */}
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${courseTheme.gradient} flex items-center justify-center shadow-lg`}>
                                                                        <Icon className="w-6 h-6 text-white" />
                                                                    </div>
                                                                    <div>
                                                                        <h3 className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                            {enrollment.courseName}
                                                                        </h3>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Award className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                                Batch: {enrollment.batchName}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {enrollment.mode && (
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.05 }}
                                                                        className={`px-3 py-1 rounded-full text-sm font-semibold shadow-lg ${
                                                                            enrollment.mode === 'Online' 
                                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                                                                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                                                        }`}
                                                                    >
                                                                        {enrollment.mode}
                                                                    </motion.div>
                                                                )}
                                                            </div>

                                                            {/* Teacher and Location */}
                                                            <div className="space-y-2 mb-4">
                                                                <div className="flex items-center space-x-2">
                                                                    <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                        Teacher: {enrollment.teacher?.name || 'Not Assigned'}
                                                                    </span>
                                                                </div>
                                                                {enrollment.mode === 'Offline' && enrollment.location && (
                                                                    <motion.a 
                                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enrollment.location.address)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center space-x-2 ${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'} hover:underline transition-colors duration-300`}
                                                                        whileHover={{ x: 5 }}
                                                                    >
                                                                        <MapPin className="w-4 h-4" />
                                                                        <span className="text-sm font-medium">{enrollment.location.name}</span>
                                                                    </motion.a>
                                                                )}
                                                            </div>

                                                            {/* Timing Comparison */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Preferred Timings */}
                                                                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-600/50 border-gray-500/30' : 'bg-white/50 border-gray-200/50'}`}>
                                                                    <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                        <Target className="w-4 h-4" />
                                                                        <span>Your Preferred Times</span>
                                                                    </h4>
                                                                    {preferredTimings.length > 0 ? (
                                                                        <ul className="space-y-2">
                                                                            {preferredTimings.map((timing, timingIdx) => {
                                                                                const isMatched = isPreferredTimingMatched(timing, enrollment.timings);
                                                                                return (
                                                                                    <motion.li 
                                                                                        key={timingIdx} 
                                                                                        initial={{ opacity: 0, x: -20 }}
                                                                                        animate={coursesInView ? { opacity: 1, x: 0 } : {}}
                                                                                        transition={{ duration: 0.5, delay: 0.3 + timingIdx * 0.1 }}
                                                                                        className={`text-sm flex items-center gap-2 ${
                                                                                            isMatched ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                                                                                        }`}
                                                                                    >
                                                                                        {isMatched ? (
                                                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                                                        ) : (
                                                                                            <div className="w-4 h-4 rounded-full border-2 border-gray-400"></div>
                                                                                        )}
                                                                                        <span className={isMatched ? 'font-medium' : 'line-through decoration-2'}>
                                                                                            {formatTimingSlot(timing)}
                                                                                        </span>
                                                                                    </motion.li>
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
                                                                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-green-900/20 border-green-700/30' : 'bg-green-50/50 border-green-200/50'}`}>
                                                                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3 uppercase tracking-wide flex items-center space-x-2">
                                                                        <Clock className="w-4 h-4" />
                                                                        <span>Assigned Batch Times</span>
                                                                    </h4>
                                                                    {enrollment.timings.length > 0 ? (
                                                                        <ul className="space-y-2">
                                                                            {enrollment.timings.map((timing, timingIdx) => (
                                                                                <motion.li 
                                                                                    key={timingIdx} 
                                                                                    initial={{ opacity: 0, x: -20 }}
                                                                                    animate={coursesInView ? { opacity: 1, x: 0 } : {}}
                                                                                    transition={{ duration: 0.5, delay: 0.5 + timingIdx * 0.1 }}
                                                                                    className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400"
                                                                                >
                                                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                                    <span className="font-medium">{timing}</span>
                                                                                </motion.li>
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
                                                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                                                                    Perfect match! All your preferred times were accommodated.
                                                                                </span>
                                                                            </>
                                                                        ) : preferredTimings.some(timing => isPreferredTimingMatched(timing, enrollment.timings)) ? (
                                                                            <>
                                                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                                                                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                                                                                    Partial match. Some of your preferred times were accommodated.
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                                                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                                                                    Different schedule assigned based on availability.
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`text-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'}`}
                                        >
                                            <BookOpen className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                No Courses Enrolled
                                            </h3>
                                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {studentName} hasn't been enrolled in any courses yet. Contact admin for course enrollment.
                                            </p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    </motion.section>
                )}

                {family.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <Users className={`w-24 h-24 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Students Found
                        </h3>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            No students found in this family account.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default StudentCoursesPage;