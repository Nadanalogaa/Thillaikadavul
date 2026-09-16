import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Bell, 
  Award, 
  Music, 
  Palette, 
  Calculator, 
  Heart,
  ChevronRight,
  Plus,
  Star,
  Clock,
  User,
  GraduationCap,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import type { User, Event, Notice, CourseTimingSlot, StudentEnrollment } from '../../types';
import { getFamilyStudents, getEvents, getNotices, getCourses, getStudentEnrollmentsForFamily } from '../../api';
import type { Course } from '../../types';
import UnifiedNotificationBell from '../../components/UnifiedNotificationBell';
import { useTheme } from '../../contexts/ThemeContext';
import BeautifulLoader from '../../components/BeautifulLoader';


// Course-specific icons and colors
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

const StudentDashboardHomePage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [tabsRef, tabsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [coursesRef, coursesInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [statsRef, statsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [family, setFamily] = useState<User[]>([]);
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Map<string, StudentEnrollment[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [familyData, eventsData, noticesData, coursesData] = await Promise.all([
                    getFamilyStudents(),
                    getEvents(5), // Limit to 5 recent events for dashboard
                    getNotices(5), // Limit to 5 recent notices for dashboard
                    getCourses(),
                ]);
                setFamily(familyData);
                setRecentEvents(eventsData.slice(0, 3));
                setRecentNotices(noticesData.slice(0, 3));
                setCourses(coursesData);
                
                // For testing: If no family members, add the current user as a student
                if (familyData.length === 0) {
                    familyData.push({
                        ...user,
                        name: user.name || 'Current User',
                        id: user.id
                    });
                }

                // Fetch enrollments for each family member
                const enrollmentPromises = familyData.map(student =>
                    getStudentEnrollmentsForFamily(student.id).then(data => ({ studentId: student.id, data }))
                );
                const enrollmentResults = await Promise.all(enrollmentPromises);
                
                const newEnrollments = new Map<string, StudentEnrollment[]>();
                enrollmentResults.forEach(result => {
                    newEnrollments.set(result.studentId, result.data);
                });
                setEnrollments(newEnrollments);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const guardianName = user.fatherName || user.name;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const currentStudent = family[activeIdx];
    const studentEnrollments = enrollments.get(currentStudent?.id) || [];
    const studentName = currentStudent?.name || `Student ${activeIdx + 1}`;
    
    // Calculate correct statistics
    const studentCourses = currentStudent?.courses || [];
    const upcomingEvents = recentEvents.filter(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        return eventDate >= today;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header Section */}
            <div className="px-6 py-5">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                            Welcome back, {guardianName?.split(' ')[0]}!
                        </h1>
                        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {dateString}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-6 pb-6">

                {/* Professional Stats Cards */}
                <motion.section
                    ref={statsRef}
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6"
                >
                    {[
                        {
                            title: "Active Students",
                            value: family.length,
                            linkTo: "family-profile",
                            icon: Users,
                            color: "text-blue-600 dark:text-blue-400",
                            bg: "bg-blue-50 dark:bg-blue-900/20"
                        },
                        {
                            title: "Total Courses", 
                            value: studentCourses.length,
                            linkTo: "courses",
                            icon: BookOpen,
                            color: "text-green-600 dark:text-green-400",
                            bg: "bg-green-50 dark:bg-green-900/20"
                        },
                        {
                            title: "Upcoming Events",
                            value: upcomingEvents.length,
                            linkTo: "events", 
                            icon: Calendar,
                            color: "text-purple-600 dark:text-purple-400",
                            bg: "bg-purple-50 dark:bg-purple-900/20"
                        },
                        {
                            title: "Recent Notices",
                            value: recentNotices.length,
                            linkTo: "notices",
                            icon: Bell,
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
                        </motion.div>
                    ))}
                </motion.section>

                {/* Student Tabs Section */}
                <section
                    ref={tabsRef}
                    className={`rounded-2xl border overflow-hidden shadow-sm ${
                        theme === 'dark'
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                    }`}
                >
                    {/* Tab Header */}
                    <div className={`p-4 sm:p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center space-x-3 sm:space-x-4">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-600 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {family.length > 1 ? `Family Students (${family.length})` : 'My Learning Journey'}
                                    </h2>
                                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {family.length > 1 ? "Manage your family's learning journey" : 'Your courses, schedule and progress'}
                                    </p>
                                </div>
                            </div>
                            <Link to="add" className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 border ${
                                theme === 'dark'
                                    ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}>
                                <Plus className="w-4 h-4" />
                                <span>Add Student</span>
                            </Link>
                        </div>
                    </div>

                    {/* Student Navigation Tabs — only when there's more than one family member */}
                    {family.length > 1 && (
                    <div className={`px-3 sm:px-6 py-3 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex space-x-1.5 sm:space-x-2 overflow-x-auto pb-1">
                            {family.map((student, idx) => {
                                const active = idx === activeIdx;
                                const name = student.name || `Student ${idx + 1}`;
                                return (
                                    <button
                                        key={student.id}
                                        className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-5 py-2 rounded-lg transition-colors whitespace-nowrap text-sm font-semibold min-w-fit ${
                                            active
                                                ? 'bg-indigo-600 text-white'
                                                : theme === 'dark'
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                        onClick={() => setActiveIdx(idx)}
                                    >
                                        <div className="relative">
                                            <img
                                                src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${active ? 'fff' : '7B61FF'}&color=${active ? '7B61FF' : 'fff'}`}
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-md"
                                                alt={name}
                                            />
                                            {active && (
                                                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 border-2 border-white rounded-full"></div>
                                            )}
                                        </div>
                                        <span className="hidden sm:inline">{name}</span>
                                        <span className="sm:hidden">{name.split(' ')[0]}</span>
                                        {active && <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-300" fill="currentColor" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    )}

                    {/* Student Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="p-3 sm:p-6"
                        >
                            {/* Student Header - Hidden on mobile */}
                            <div className="hidden md:flex items-center space-x-4 mb-6">
                                <div className="relative">
                                    <img
                                        src={currentStudent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4f46e5&color=fff`}
                                        className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                        alt={studentName}
                                    />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {studentName}'s Courses
                                    </h3>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Progress tracking and course management
                                    </p>
                                </div>
                            </div>

                            {/* Courses Grid */}
                            <div
                                ref={coursesRef}
                                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6"
                            >
                                {/* Show preferred courses first, then enrolled courses */}
                                {(() => {
                                    const studentCourses = currentStudent?.courses || [];
                                    const studentPreferredTimings = currentStudent?.preferredTimings || [];
                                    
                                    // If student has preferred courses, show them with status
                                    if (studentCourses.length > 0) {
                                        return studentCourses.map((courseName, i) => {
                                            const courseTheme = getCourseTheme(courseName, i);
                                            const Icon = courseTheme.icon;
                                            
                                            // Find enrollment for this course (if allocated by admin)
                                            const enrollment = studentEnrollments.find(e => e.courseName === courseName);
                                            
                                            // Find preferred timings for this course
                                            const preferredTimings = Array.isArray(studentPreferredTimings) 
                                                ? studentPreferredTimings.filter(t => t && typeof t === 'object' && t.courseName === courseName)
                                                : [];
                                            
                                            const isAllocated = !!enrollment;
                                            
                                            return (
                                                <motion.div
                                                    key={courseName}
                                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                                    animate={coursesInView ? { opacity: 1, scale: 1, y: 0 } : {}}
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
                                                            // Show batch info if allocated
                                                            <>
                                                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                                                                    Batch: {enrollment.batchName}
                                                                </p>
                                                                
                                                                {enrollment.teacher && (
                                                                    <div className="flex items-center space-x-2 mb-4">
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                                            <User className="w-4 h-4 text-white" />
                                                                        </div>
                                                                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            Teacher: {enrollment.teacher.name}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                                                                Waiting for admin to assign batch and teacher
                                                            </p>
                                                        )}
                                                        
                                                        {/* Timing Information */}
                                                        <div className="space-y-3">
                                                            {/* Preferred Timings */}
                                                            {preferredTimings.length > 0 && (
                                                                <div>
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                            Your Preferred Times:
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {preferredTimings.map((timing, idx) => {
                                                                            const timingStr = `${timing.day}: ${timing.timeSlot}`;
                                                                            const isMatched = isAllocated && enrollment.timings.some(allocated => 
                                                                                allocated.toLowerCase().includes(timing.day.toLowerCase()) &&
                                                                                allocated.toLowerCase().includes(timing.timeSlot.toLowerCase())
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
                                                                        {enrollment.timings.slice(0, 2).map((timing, idx) => (
                                                                            <div key={idx} className="text-sm text-green-600 dark:text-green-400 flex items-center space-x-2 font-medium">
                                                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                                <span>{timing}</span>
                                                                            </div>
                                                                        ))}
                                                                        {enrollment.timings.length > 2 && (
                                                                            <div className="text-xs text-green-500 dark:text-green-400">
                                                                                +{enrollment.timings.length - 2} more sessions
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
                                        });
                                    } else {
                                        // No courses selected during registration
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`col-span-full text-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'}`}
                                            >
                                                <BookOpen className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                <h4 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    No courses selected yet
                                                </h4>
                                                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                                                    {studentName} hasn't selected any courses during registration
                                                </p>
                                                <Link to="courses" className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300">
                                                    <Sparkles className="w-4 h-4" />
                                                    <span>Browse & Select Courses</span>
                                                </Link>
                                            </motion.div>
                                        );
                                    }
                                })()}
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                {[
                                    { icon: Calendar, title: 'Events', caption: `${upcomingEvents.length} upcoming`, link: 'events', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                    { icon: BookOpen, title: 'Materials', caption: 'Books & notes', link: 'book-materials', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                    { icon: Bell, title: 'Notices', caption: `${recentNotices.length} recent`, link: 'notices', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                                    { icon: Award, title: 'Grades', caption: 'Exams & results', link: 'grade-exams', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' }
                                ].map((item, idx) => (
                                    <Link
                                        key={idx}
                                        to={item.link}
                                        className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-colors ${
                                            theme === 'dark'
                                                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700/60'
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${item.bg} shrink-0`}>
                                            <item.icon className={`w-5 h-5 ${item.color}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.title}</h5>
                                            <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{item.caption}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </section>
            </div>
        </div>
    );
};

export default StudentDashboardHomePage;