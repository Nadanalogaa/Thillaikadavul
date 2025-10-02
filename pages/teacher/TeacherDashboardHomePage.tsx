import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
    GraduationCap, 
    Users, 
    Calendar, 
    Bell, 
    Award, 
    BookOpen,
    ChevronRight,
    Star,
    Clock,
    User,
    TrendingUp,
    Sparkles,
    MapPin,
    UserCheck,
    Heart,
    Music,
    Palette,
    Calculator
} from 'lucide-react';
import type { User, Event, Notice, Batch } from '../../types';
import { getEvents, getNotices, getBatches, getUsersByIds } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import TeacherLoader from '../../components/TeacherLoader';

// Course-specific icons and colors for teachers
const getCourseTheme = (courseName: string, index: number) => {
    const courseThemes: Record<string, { icon: React.ElementType; gradient: string; bgGradient: string }> = {
        'Bharatanatyam': { 
            icon: Heart, 
            gradient: 'from-pink-500 to-rose-500',
            bgGradient: 'bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 dark:from-pink-900/30 dark:via-rose-900/30 dark:to-purple-900/30'
        },
        'Vocal': { 
            icon: Music, 
            gradient: 'from-blue-500 to-indigo-500',
            bgGradient: 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30'
        },
        'Drawing': { 
            icon: Palette, 
            gradient: 'from-orange-500 to-amber-500',
            bgGradient: 'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/30 dark:via-amber-900/30 dark:to-yellow-900/30'
        },
        'Abacus': { 
            icon: Calculator, 
            gradient: 'from-green-500 to-emerald-500',
            bgGradient: 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30'
        }
    };
    
    const fallbackThemes = [
        { icon: BookOpen, gradient: 'from-purple-500 to-blue-500', bgGradient: 'bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-indigo-900/30' },
        { icon: Star, gradient: 'from-cyan-500 to-teal-500', bgGradient: 'bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 dark:from-cyan-900/30 dark:via-teal-900/30 dark:to-emerald-900/30' }
    ];
    
    return courseThemes[courseName] || fallbackThemes[index % fallbackThemes.length];
};

const TeacherDashboardHomePage: React.FC = () => {
    const { user } = useOutletContext<{ user: User; onUpdate: (user: User) => void }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [statsRef, statsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [batchesRef, batchesInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [activityRef, activityInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [stats, setStats] = useState({ totalStudents: 0, totalBatches: 0 });
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Wait for user to be available
            if (!user?.id) {
                setIsLoading(true);
                return;
            }

            try {
                setIsLoading(true);
                
                console.log('Loading dashboard data for teacher:', user.name);
                
                const [eventsData, noticesData, batchesData] = await Promise.all([
                    getEvents(5), // Limit to 5 recent events for dashboard
                    getNotices(5), // Limit to 5 recent notices for dashboard
                    getBatches(),
                ]);

                // Calculate stats using the current user data
                const filteredTeacherBatches = batchesData.filter(b => {
                    const teacherId = typeof b.teacherId === 'string' ? b.teacherId : (b.teacherId as User)?.id;
                    return teacherId === user.id;
                });
                
                const initialStudentIds = new Set<string>();
                filteredTeacherBatches.forEach(batch => {
                    batch.schedule.forEach(scheduleItem => {
                        (scheduleItem.studentIds || []).forEach(id => {
                            if (id) initialStudentIds.add(id);
                        });
                    });
                });

                let activeStudentIdSet = new Set<string>();
                if (initialStudentIds.size > 0) {
                    const activeStudents = await getUsersByIds(Array.from(initialStudentIds));
                    activeStudentIdSet = new Set(activeStudents.map(student => student.id));
                }

                const sanitizedBatches = filteredTeacherBatches.map(batch => {
                    const sanitizedSchedule = (batch.schedule || []).map(scheduleItem => {
                        const filteredIds = (scheduleItem.studentIds || []).filter(id => activeStudentIdSet.has(id));
                        return { ...scheduleItem, studentIds: filteredIds };
                    });

                    const batchStudentIds = new Set<string>();
                    sanitizedSchedule.forEach(scheduleItem => {
                        (scheduleItem.studentIds || []).forEach(id => batchStudentIds.add(id));
                    });

                    return {
                        ...batch,
                        schedule: sanitizedSchedule,
                        enrolled: batchStudentIds.size
                    };
                });

                const totalActiveStudentIds = new Set<string>();
                sanitizedBatches.forEach(batch => {
                    batch.schedule.forEach(scheduleItem => {
                        (scheduleItem.studentIds || []).forEach(id => totalActiveStudentIds.add(id));
                    });
                });

                setTeacherBatches(sanitizedBatches);
                setStats({
                    totalStudents: totalActiveStudentIds.size,
                    totalBatches: sanitizedBatches.length
                });

                setRecentEvents(eventsData.slice(0, 3));
                setRecentNotices(noticesData.slice(0, 3));
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user?.id]); // Only re-run when user ID changes
    
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (isLoading) {
        return <TeacherLoader message="Loading teacher dashboard..." />;
    }

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
                
                {/* Background Pattern Dots */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-300/40 dark:bg-purple-600/40 rounded-full"></div>
                    <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-pink-300/40 dark:bg-pink-600/40 rounded-full"></div>
                    <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-blue-300/40 dark:bg-blue-600/40 rounded-full"></div>
                    <div className="absolute top-2/3 left-1/5 w-2 h-2 bg-indigo-300/40 dark:bg-indigo-600/40 rounded-full"></div>
                </div>
            </div>

            {/* Header Section */}
            <div className="relative z-10 px-6 py-4">
                <div className="flex justify-between items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col"
                    >
                        <h1 className={`text-lg sm:text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                            Welcome back, {user?.name?.split(' ')[0] || 'Teacher'}!
                        </h1>
                        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {dateString}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 px-6 pb-6">

                {/* Professional Stats Cards */}
                <motion.section
                    ref={statsRef}
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6"
                >
                    {[
                        {
                            title: "Total Students",
                            value: stats.totalStudents,
                            linkTo: undefined,
                            icon: Users,
                            color: "text-blue-600 dark:text-blue-400",
                            bg: "bg-blue-50 dark:bg-blue-900/20"
                        },
                        {
                            title: "Your Batches", 
                            value: stats.totalBatches,
                            linkTo: undefined,
                            icon: BookOpen,
                            color: "text-green-600 dark:text-green-400",
                            bg: "bg-green-50 dark:bg-green-900/20"
                        },
                        {
                            title: "Course Expertise",
                            value: (user.courseExpertise || []).length,
                            linkTo: undefined, 
                            icon: Award,
                            color: "text-purple-600 dark:text-purple-400",
                            bg: "bg-purple-50 dark:bg-purple-900/20"
                        },
                        {
                            title: "Recent Events",
                            value: recentEvents.length,
                            linkTo: "events",
                            icon: Calendar,
                            color: "text-orange-600 dark:text-orange-400", 
                            bg: "bg-orange-50 dark:bg-orange-900/20"
                        }
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={statsInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            className="group"
                        >
                            {stat.linkTo ? (
                                <Link
                                    to={stat.linkTo}
                                    className={`block p-3 sm:p-4 rounded-lg transition-all duration-300 border ${
                                        theme === 'dark'
                                            ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600'
                                            : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-[10px] sm:text-xs md:text-sm font-medium ${
                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                            }`}>
                                                {stat.title}
                                            </p>
                                            <p className={`text-xl sm:text-2xl font-bold ${
                                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                                            }`}>
                                                {stat.value}
                                            </p>
                                        </div>
                                        <div className={`p-2 sm:p-3 rounded-lg ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                                            <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${stat.color}`} />
                                        </div>
                                    </div>
                                </Link>
                            ) : (
                                <div className={`p-3 sm:p-4 rounded-lg border ${
                                    theme === 'dark'
                                        ? 'bg-gray-800/50 border-gray-700/50'
                                        : 'bg-white border-gray-200 shadow-sm'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-[10px] sm:text-xs md:text-sm font-medium ${
                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                            }`}>
                                                {stat.title}
                                            </p>
                                            <p className={`text-xl sm:text-2xl font-bold ${
                                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                                            }`}>
                                                {stat.value}
                                            </p>
                                        </div>
                                        <div className={`p-2 sm:p-3 rounded-lg ${stat.bg}`}>
                                            <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${stat.color}`} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </motion.section>

                {/* Course Expertise Section */}
                <motion.section
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className={`rounded-3xl shadow-2xl border backdrop-blur-sm overflow-hidden mb-8 ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-purple-200/50'
                    }`}
                >
                    {/* Header */}
                    <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-purple-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <Award className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Your Course Expertise ({(user?.courseExpertise || []).length})
                                    </h2>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Courses you can teach with allocation status
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Course Content */}
                    <div className="p-6">
                        {(() => {
                            const teacherCourses = user?.courseExpertise || [];
                            const teacherPreferredTimings = user?.availableTimeSlots || user?.preferredTimings || [];
                            
                            // Debug logging to see what data we have
                            console.log('Teacher courses:', teacherCourses);
                            console.log('Teacher preferred timings:', teacherPreferredTimings);
                            
                            if (teacherCourses.length > 0) {
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {teacherCourses.map((courseName, i) => {
                                            const courseTheme = getCourseTheme(courseName, i);
                                            const Icon = courseTheme.icon;
                                            
                                            // Find batches where this teacher is assigned to this course
                                            const assignedBatches = teacherBatches.filter(batch => batch.courseName === courseName);
                                            const isAllocated = assignedBatches.length > 0;
                                            
                                            // Find preferred timings for this course
                                            const preferredTimings = Array.isArray(teacherPreferredTimings) 
                                                ? teacherPreferredTimings.filter(t => t && typeof t === 'object' && (t.courseName === courseName || !t.courseName))
                                                : [];
                                            
                                            console.log(`Preferred timings for ${courseName}:`, preferredTimings);
                                            
                                            return (
                                                <motion.div
                                                    key={courseName}
                                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                                    whileHover={{ scale: 1.02, y: -5 }}
                                                    className={`relative rounded-2xl p-6 ${courseTheme.bgGradient} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-white/50'} backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden group`}
                                                >
                                                    {/* Background decoration */}
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
                                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
                                                    
                                                    <div className="relative z-10">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${courseTheme.gradient} flex items-center justify-center shadow-lg`}>
                                                                <Icon className="w-6 h-6 text-white" />
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                                isAllocated 
                                                                    ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30'
                                                                    : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30'
                                                            }`}>
                                                                {isAllocated ? '✓ Allocated' : '⏳ Pending'}
                                                            </div>
                                                        </div>
                                                        
                                                        <h4 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                            {courseName}
                                                        </h4>
                                                        
                                                        {isAllocated ? (
                                                            <>
                                                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                                                                    Assigned to {assignedBatches.length} batch{assignedBatches.length !== 1 ? 'es' : ''}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                                                                Waiting for admin to assign batches
                                                            </p>
                                                        )}
                                                        
                                                        {/* Timing Information */}
                                                        <div className="space-y-3">
                                                            {/* Preferred Timings */}
                                                            {(preferredTimings.length > 0 || teacherPreferredTimings.length > 0) && (
                                                                <div>
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                            Your Preferred Times:
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {(preferredTimings.length > 0 ? preferredTimings : teacherPreferredTimings).map((timing, idx) => {
                                                                            const timingStr = `${timing.day}: ${timing.timeSlot}`;
                                                                            
                                                                            // Check if this timing matches any allocated batch schedule
                                                                            const isMatched = isAllocated && assignedBatches.some(batch =>
                                                                                batch.schedule.some(schedule => 
                                                                                    schedule.timing.toLowerCase().includes(timing.day.toLowerCase()) &&
                                                                                    schedule.timing.toLowerCase().includes(timing.timeSlot.toLowerCase())
                                                                                )
                                                                            );
                                                                            
                                                                            return (
                                                                                <div key={idx} className={`text-sm flex items-center space-x-2 ${
                                                                                    isMatched 
                                                                                        ? 'text-green-600 dark:text-green-400' 
                                                                                        : isAllocated 
                                                                                            ? 'text-gray-400 line-through decoration-2' 
                                                                                            : 'text-blue-600 dark:text-blue-400'
                                                                                }`}>
                                                                                    <div className={`w-2 h-2 rounded-full ${
                                                                                        isMatched 
                                                                                            ? 'bg-green-500' 
                                                                                            : isAllocated 
                                                                                                ? 'bg-gray-400' 
                                                                                                : 'bg-blue-500'
                                                                                    }`}></div>
                                                                                    <span className={isMatched ? 'font-medium' : ''}>{timingStr}</span>
                                                                                    {isMatched && <span className="text-xs">✓ Matched</span>}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Allocated Timings */}
                                                            {isAllocated && (
                                                                <div>
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <Calendar className={`w-4 h-4 text-green-600 dark:text-green-400`} />
                                                                        <span className={`text-sm font-medium text-green-700 dark:text-green-300`}>
                                                                            Allocated Schedule:
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {assignedBatches.slice(0, 2).map((batch, batchIdx) => (
                                                                            batch.schedule.slice(0, 2).map((schedule, scheduleIdx) => (
                                                                                <div key={`${batchIdx}-${scheduleIdx}`} className="text-sm text-green-600 dark:text-green-400 flex items-center space-x-2 font-medium">
                                                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                                    <span>{batch.name}: {schedule.timing}</span>
                                                                                </div>
                                                                            ))
                                                                        ))}
                                                                        {assignedBatches.length > 2 && (
                                                                            <div className="text-xs text-green-500 dark:text-green-400">
                                                                                +{assignedBatches.length - 2} more batches
                                                                            </div>
                                                                        )}
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
                                );
                            } else {
                                return (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`col-span-full text-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'}`}
                                    >
                                        <Award className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                        <h4 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                            No Course Expertise Set
                                        </h4>
                                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                                            Contact admin to set your teaching expertise and preferred timings
                                        </p>
                                    </motion.div>
                                );
                            }
                        })()}
                    </div>
                </motion.section>

                {/* Teacher's Classes */}
                <motion.section
                    ref={batchesRef}
                    initial={{ opacity: 0, y: 50 }}
                    animate={batchesInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`rounded-3xl shadow-2xl border backdrop-blur-sm overflow-hidden ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-purple-200/50'
                    }`}
                >
                    {/* Header */}
                    <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-purple-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Your Classes ({stats.totalBatches})
                                    </h2>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Manage your batches and students
                                    </p>
                                </div>
                            </div>
                            {teacherBatches.length > 6 && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link 
                                        to="batches" 
                                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>View All Batches</span>
                                    </Link>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Batches Content */}
                    <div className="p-6">
                        {teacherBatches.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={batchesInView ? { opacity: 1, y: 0 } : {}}
                                className={`text-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'}`}
                            >
                                <BookOpen className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    No Batches Assigned Yet
                                </h3>
                                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Your assigned classes will appear here once they're created by the admin.
                                </p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {teacherBatches.slice(0, 6).map((batch, index) => (
                                    <motion.div
                                        key={batch.id}
                                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                        animate={batchesInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                        transition={{ duration: 0.6, delay: index * 0.1 }}
                                        whileHover={{ scale: 1.02, y: -5 }}
                                        className={`rounded-2xl p-6 border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden group ${
                                            theme === 'dark' 
                                                ? 'bg-gray-700/50 border-gray-600/30' 
                                                : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/50'
                                        }`}
                                    >
                                        {/* Background decoration */}
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full -translate-y-6 translate-x-6"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                                                        <GraduationCap className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                                            {batch.name}
                                                        </h4>
                                                        <p className={`text-sm ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'} font-medium`}>
                                                            {batch.courseName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-lg ${
                                                    batch.mode === 'Online' 
                                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                                                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                                }`}>
                                                    {batch.mode}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-3 mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <UserCheck className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {batch.schedule.reduce((total, schedule) => total + schedule.studentIds.length, 0)} students enrolled
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {batch.schedule.length} time slot{batch.schedule.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h5 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                                    Schedule:
                                                </h5>
                                                {batch.schedule.slice(0, 2).map((schedule, idx) => (
                                                    <div key={idx} className={`flex items-center space-x-2 p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-600/50' : 'bg-white/70'}`}>
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                                            {schedule.day}: {schedule.timeSlot}
                                                        </span>
                                                    </div>
                                                ))}
                                                {batch.schedule.length > 2 && (
                                                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-1`}>
                                                        +{batch.schedule.length - 2} more slots
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.section>

                {/* Recent Activity */}
                <motion.section
                    ref={activityRef}
                    initial={{ opacity: 0, y: 50 }}
                    animate={activityInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                >
                    {/* Recent Notices */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={activityInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={`rounded-3xl shadow-2xl border backdrop-blur-sm overflow-hidden ${
                            theme === 'dark' 
                                ? 'bg-gray-800/90 border-gray-700/50' 
                                : 'bg-white/90 border-purple-200/50'
                        }`}
                    >
                        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-purple-200'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Recent Notices
                                    </h3>
                                </div>
                                <Link to="notice" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                    View All
                                </Link>
                            </div>
                        </div>
                        <div className="p-6">
                            {recentNotices.length > 0 ? (
                                <div className="space-y-4">
                                    {recentNotices.map((notice, i) => (
                                        <motion.div
                                            key={notice.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={activityInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                                            whileHover={{ scale: 1.02, x: 5 }}
                                            className={`p-4 rounded-xl border backdrop-blur-sm hover:shadow-lg transition-all duration-300 ${
                                                theme === 'dark' 
                                                    ? 'bg-gray-700/50 border-gray-600/30' 
                                                    : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200/50'
                                            }`}
                                        >
                                            <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                                                {notice.title}
                                            </p>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {new Date(notice.issuedAt).toLocaleDateString()}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={activityInView ? { opacity: 1 } : {}}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="text-center py-8"
                                >
                                    <Bell className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        No recent notices.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                    
                    {/* Upcoming Events */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={activityInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 1, delay: 0.4 }}
                        className={`rounded-3xl shadow-2xl border backdrop-blur-sm overflow-hidden ${
                            theme === 'dark' 
                                ? 'bg-gray-800/90 border-gray-700/50' 
                                : 'bg-white/90 border-purple-200/50'
                        }`}
                    >
                        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-purple-200'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Upcoming Events
                                    </h3>
                                </div>
                                <Link to="events" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                                    View All
                                </Link>
                            </div>
                        </div>
                        <div className="p-6">
                            {recentEvents.length > 0 ? (
                                <div className="space-y-4">
                                    {recentEvents.map((event, i) => (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={activityInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                                            whileHover={{ scale: 1.02, x: -5 }}
                                            className={`p-4 rounded-xl border backdrop-blur-sm hover:shadow-lg transition-all duration-300 ${
                                                theme === 'dark' 
                                                    ? 'bg-gray-700/50 border-gray-600/30' 
                                                    : 'bg-gradient-to-r from-emerald-50 to-cyan-50 border-emerald-200/50'
                                            }`}
                                        >
                                            <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                                                {event.title}
                                            </p>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {new Date(event.date).toLocaleString()}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={activityInView ? { opacity: 1 } : {}}
                                    transition={{ duration: 1, delay: 0.7 }}
                                    className="text-center py-8"
                                >
                                    <Calendar className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        No upcoming events.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </motion.section>
            </div>
        </div>
    );
};

export default TeacherDashboardHomePage;
