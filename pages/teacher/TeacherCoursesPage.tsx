import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useOutletContext } from 'react-router-dom';
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
    Target,
    GraduationCap
} from 'lucide-react';
import { getBatches } from '../../api';
import type { User, Batch, CourseTimingSlot } from '../../types';
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

const TeacherCoursesPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [coursesRef, coursesInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeacherData = async () => {
            if (!user) return;
            
            try {
                setIsLoading(true);
                const batchesData = await getBatches();
                
                // Filter batches where this teacher is assigned
                const filteredTeacherBatches = batchesData.filter(batch => {
                    const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id;
                    return teacherId === user.id;
                });
                
                setTeacherBatches(filteredTeacherBatches);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch teacher data:", err);
                setError(err instanceof Error ? err.message : 'Failed to fetch teacher data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeacherData();
    }, [user]);

    if (isLoading) {
        return <BeautifulLoader message="Loading your courses..." />;
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
                    Error: {error}
                </div>
            </div>
        );
    }

    const teacherCourses = user.courseExpertise || [];
    const teacherPreferredTimings = user.preferredTimings || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 p-6">
            {/* Hero Section */}
            <motion.section
                ref={heroRef}
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
                className="text-center mb-8"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="mb-6"
                >
                    <GraduationCap className="w-16 h-16 mx-auto mb-4 text-purple-600 dark:text-purple-400" />
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        Your Courses
                    </h1>
                    <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                        Manage your teaching expertise, view allocated batches, and track your preferred schedules
                    </p>
                </motion.div>
            </motion.section>

            {/* Courses Grid */}
            <motion.section
                ref={coursesRef}
                initial={{ opacity: 0, y: 50 }}
                animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1 }}
                className="max-w-7xl mx-auto"
            >
                {teacherCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {teacherCourses.map((courseName, index) => {
                            const courseTheme = getCourseTheme(courseName, index);
                            const Icon = getCourseIcon(courseName);
                            
                            // Find batches where this teacher is assigned to this course
                            const assignedBatches = teacherBatches.filter(batch => batch.courseName === courseName);
                            const isAllocated = assignedBatches.length > 0;
                            
                            // Find preferred timings for this course
                            const preferredTimings = Array.isArray(teacherPreferredTimings) 
                                ? teacherPreferredTimings.filter(t => t && typeof t === 'object' && t.courseName === courseName)
                                : [];
                            
                            // Calculate total students across all batches for this course
                            const totalStudents = assignedBatches.reduce((total, batch) => 
                                total + batch.schedule.reduce((batchTotal, schedule) => batchTotal + schedule.studentIds.length, 0), 0
                            );

                            return (
                                <motion.div
                                    key={courseName}
                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                    animate={coursesInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    whileHover={{ scale: 1.02, y: -8 }}
                                    className={`relative rounded-3xl p-8 ${courseTheme.bgGradient} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-white/50'} backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group`}
                                >
                                    {/* Background decoration */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${courseTheme.gradient} flex items-center justify-center shadow-lg`}>
                                                <Icon className="w-8 h-8 text-white" />
                                            </div>
                                            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                                isAllocated 
                                                    ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30'
                                                    : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30'
                                            }`}>
                                                {isAllocated ? '✓ Teaching' : '⏳ Pending'}
                                            </div>
                                        </div>
                                        
                                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            {courseName}
                                        </h3>
                                        
                                        {isAllocated ? (
                                            <div className="space-y-4 mb-6">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Users className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            {totalStudents} Students
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            {assignedBatches.length} Batch{assignedBatches.length !== 1 ? 'es' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                                                No batches assigned yet. Contact admin for batch allocation.
                                            </p>
                                        )}
                                        
                                        {/* Timing Information */}
                                        <div className="space-y-4">
                                            {/* Preferred Timings */}
                                            {preferredTimings.length > 0 && (
                                                <div>
                                                    <div className="flex items-center space-x-2 mb-3">
                                                        <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            Your Preferred Times:
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {preferredTimings.map((timing, idx) => {
                                                            const timingStr = `${timing.day}: ${timing.timeSlot}`;
                                                            
                                                            // Check if this timing matches any allocated batch schedule
                                                            const isMatched = isAllocated && assignedBatches.some(batch =>
                                                                batch.schedule.some(schedule => 
                                                                    schedule.timing.toLowerCase().includes(timing.day.toLowerCase()) &&
                                                                    schedule.timing.toLowerCase().includes(timing.timeSlot.toLowerCase())
                                                                )
                                                            );
                                                            
                                                            return (
                                                                <div key={idx} className={`text-sm flex items-center space-x-3 p-2 rounded-lg ${
                                                                    isMatched 
                                                                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                                                                        : isAllocated 
                                                                            ? 'text-gray-400 line-through decoration-2' 
                                                                            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                                                }`}>
                                                                    <div className={`w-2 h-2 rounded-full ${
                                                                        isMatched 
                                                                            ? 'bg-green-500' 
                                                                            : isAllocated 
                                                                                ? 'bg-gray-400' 
                                                                                : 'bg-blue-500'
                                                                    }`}></div>
                                                                    <span className={isMatched ? 'font-semibold' : 'font-medium'}>{timingStr}</span>
                                                                    {isMatched && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Allocated Timings */}
                                            {isAllocated && (
                                                <div>
                                                    <div className="flex items-center space-x-2 mb-3">
                                                        <Calendar className={`w-4 h-4 text-green-600 dark:text-green-400`} />
                                                        <span className={`text-sm font-semibold text-green-700 dark:text-green-300`}>
                                                            Teaching Schedule:
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {assignedBatches.map((batch, batchIdx) => (
                                                            <div key={batch.id} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-semibold text-green-700 dark:text-green-300">{batch.name}</span>
                                                                    <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                                                        {batch.schedule.reduce((total, schedule) => total + schedule.studentIds.length, 0)} students
                                                                    </span>
                                                                </div>
                                                                {batch.schedule.map((schedule, scheduleIdx) => (
                                                                    <div key={scheduleIdx} className="text-sm text-green-600 dark:text-green-400 flex items-center space-x-2 font-medium">
                                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                        <span>{schedule.timing}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                        animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className={`text-center py-16 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <Award className={`w-20 h-20 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Course Expertise Set
                        </h3>
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} max-w-md mx-auto`}>
                            Contact your administrator to set up your teaching expertise and preferred course timings.
                        </p>
                    </motion.div>
                )}
            </motion.section>
        </div>
    );
};

export default TeacherCoursesPage;