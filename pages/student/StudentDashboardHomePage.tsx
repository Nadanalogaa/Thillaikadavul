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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 relative overflow-hidden">
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
                            Welcome back, {guardianName?.split(' ')[0]}!
                        </h1>
                        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {dateString}
                        </p>
                    </motion.div>
                </div>
            </div>
            
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

            {/* Main Content */}
            <div className="relative z-10 px-6 pb-6">

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
                    <div className={`p-4 sm:p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-purple-200'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center space-x-3 sm:space-x-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`text-lg sm:text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Family Students ({family.length})
                                    </h2>
                                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Manage your children's learning journey
                                    </p>
                                </div>
                            </div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link to="add" className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center space-x-2">
                                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Add Student</span>
                                </Link>
                            </motion.div>
                        </div>
                    </div>

                    {/* Student Navigation Tabs */}
                    <div className={`px-3 sm:px-6 py-3 sm:py-4 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-r from-purple-50/50 to-blue-50/50'}`}>
                        <div className="flex space-x-1.5 sm:space-x-2 overflow-x-auto pb-1">
                            {family.map((student, idx) => {
                                const active = idx === activeIdx;
                                const name = student.name || `Student ${idx + 1}`;
                                return (
                                    <motion.button
                                        key={student.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={tabsInView ? { opacity: 1, x: 0 } : {}}
                                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                                        className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-300 whitespace-nowrap text-sm sm:text-base font-semibold min-w-fit ${
                                            active
                                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg ring-2 ring-purple-300 dark:ring-purple-600 transform scale-105'
                                                : theme === 'dark'
                                                    ? 'bg-gray-600/50 text-gray-300 hover:bg-gray-500/50 hover:text-white'
                                                    : 'bg-white/70 text-gray-700 hover:bg-white hover:text-purple-600 border border-gray-200 hover:border-purple-300'
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
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Student Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className="p-3 sm:p-6"
                        >
                            {/* Mobile Navigation Menu - Show only on mobile */}
                            <div className="md:hidden mb-4">
                                <div className="grid grid-cols-4 gap-2">
                                    <Link to="courses" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                                        theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-white hover:bg-gray-50'
                                    }`}>
                                        <BookOpen className="w-5 h-5 text-purple-500 mb-1" />
                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Courses</span>
                                    </Link>
                                    <Link to="events" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                                        theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-white hover:bg-gray-50'
                                    }`}>
                                        <Calendar className="w-5 h-5 text-blue-500 mb-1" />
                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Events</span>
                                    </Link>
                                    <Link to="book-materials" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                                        theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-white hover:bg-gray-50'
                                    }`}>
                                        <BookOpen className="w-5 h-5 text-green-500 mb-1" />
                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Materials</span>
                                    </Link>
                                    <Link to="notices" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                                        theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-white hover:bg-gray-50'
                                    }`}>
                                        <Bell className="w-5 h-5 text-orange-500 mb-1" />
                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Notices</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Student Header - Hidden on mobile */}
                            <div className="hidden md:flex items-center space-x-4 mb-6">
                                <div className="relative">
                                    <img
                                        src={currentStudent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=7B61FF&color=fff`}
                                        className="w-16 h-16 rounded-full object-cover border-4 border-purple-300 dark:border-purple-600 shadow-lg"
                                        alt={studentName}
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-3 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                        <User className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {studentName}'s Learning Journey
                                    </h3>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex items-center space-x-2`}>
                                        <TrendingUp className="w-4 h-4" />
                                        <span>Progress tracking and course management</span>
                                    </p>
                                </div>
                            </div>

                            {/* Courses Grid */}
                            <motion.div
                                ref={coursesRef}
                                initial={{ opacity: 0, y: 30 }}
                                animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.8 }}
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
                            </motion.div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                                {[
                                    { icon: Calendar, title: 'Events', count: recentEvents.length, link: 'events', gradient: 'from-blue-500 to-cyan-500' },
                                    { icon: BookOpen, title: 'Materials', count: '📚', link: 'book-materials', gradient: 'from-green-500 to-emerald-500' },
                                    { icon: Bell, title: 'Notices', count: recentNotices.length, link: 'notices', gradient: 'from-orange-500 to-red-500' },
                                    { icon: Award, title: 'Grades', count: '🏆', link: 'grade-exams', gradient: 'from-purple-500 to-pink-500' }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                                        whileHover={{ scale: 1.05 }}
                                        className="group"
                                    >
                                        <Link to={item.link} className={`block p-3 sm:p-4 rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg hover:shadow-xl transition-all duration-300 text-center`}>
                                            <item.icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300" />
                                            <h5 className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1">{item.title}</h5>
                                            <p className="text-base sm:text-lg font-bold">{item.count}</p>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </motion.section>
            </div>
        </div>
    );
};

export default StudentDashboardHomePage;