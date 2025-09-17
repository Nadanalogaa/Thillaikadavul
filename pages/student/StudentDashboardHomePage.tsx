import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import type { User, Event, Notice, CourseTimingSlot, StudentEnrollment } from '../../types';
import { getFamilyStudents, getEvents, getNotices, getCourses, getStudentEnrollmentsForFamily } from '../../api';
import type { Course } from '../../types';
import UnifiedNotificationBell from '../../components/UnifiedNotificationBell';
import { useTheme } from '../../contexts/ThemeContext';
import BeautifulLoader from '../../components/BeautifulLoader';

const StatCard: React.FC<{ title: string; value: string | number; linkTo: string; bgColor: string; textColor: string }> = ({ title, value, linkTo, bgColor, textColor }) => (
    <Link to={linkTo} className={`block p-6 rounded-xl shadow-md transition-transform hover:-translate-y-1 ${bgColor}`}>
        <h4 className={`text-sm font-medium uppercase ${textColor} opacity-80`}>{title}</h4>
        <p className={`text-3xl font-bold mt-2 ${textColor}`}>{value}</p>
    </Link>
);

// Course-specific color themes matching registration screen
const getCourseColors = (courseName: string, index: number) => {
    const courseColorMap: Record<string, { bg: string; border: string; text: string }> = {
        'Vocal': { 
            bg: 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100', 
            border: 'border-blue-300', 
            text: 'text-blue-800' 
        },
        'Drawing': { 
            bg: 'bg-gradient-to-br from-orange-100 via-yellow-50 to-pink-100', 
            border: 'border-orange-300', 
            text: 'text-orange-800' 
        },
        'Abacus': { 
            bg: 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100', 
            border: 'border-green-300', 
            text: 'text-green-800' 
        },
        'Bharatanatyam': { 
            bg: 'bg-gradient-to-br from-purple-100 via-pink-50 to-rose-100', 
            border: 'border-purple-300', 
            text: 'text-purple-800' 
        }
    };
    
    // Return specific course colors if available, otherwise use alternating colors
    return courseColorMap[courseName] || (index % 2 === 0 
        ? { bg: 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100', border: 'border-blue-300', text: 'text-blue-800' }
        : { bg: 'bg-gradient-to-br from-orange-100 via-yellow-50 to-pink-100', border: 'border-orange-300', text: 'text-orange-800' }
    );
};

const StudentDashboardHomePage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [coursesRef, coursesInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [eventsRef, eventsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [family, setFamily] = useState<User[]>([]);
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Map<string, StudentEnrollment[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [activeIdx, setActiveIdx] = useState(0);
    const [mediaIndex, setMediaIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [familyData, eventsData, noticesData, coursesData] = await Promise.all([
                    getFamilyStudents(),
                    getEvents(),
                    getNotices(),
                    getCourses(),
                ]);
                setFamily(familyData);
                setRecentEvents(eventsData.slice(0, 3));
                setRecentNotices(noticesData.slice(0, 3));
                setCourses(coursesData);

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

    const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

    const onChangePhotoClick = (studentId: string) => {
        const ref = fileInputsRef.current[studentId];
        if (ref) ref.click();
    };

    const onPhotoSelected = (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        // Placeholder: wire to API later
        const file = e.target.files?.[0];
        if (file) {
            // Optimistically preview
            const url = URL.createObjectURL(file);
            setFamily(prev => prev.map(s => s.id === studentId ? { ...s, photoUrl: url } as User : s));
        }
    };

    const formatPreferredTimes = (student: User): CourseTimingSlot[] => {
        const slots = Array.isArray(student.preferredTimings) ? (student.preferredTimings as CourseTimingSlot[]) : [];
        // Limit to first few for compact view
        return slots.slice(0, 6);
    };

    const formatAllocated = (student: User): string[] => {
        const sch = Array.isArray(student.schedules) ? student.schedules : [];
        return sch.slice(0, 4).map(s => `${s.course}: ${s.timing}`);
    };

    // Helpers to group timings by course
    const groupPreferredByCourse = (student: User): Record<string, CourseTimingSlot[]> => {
        const map: Record<string, CourseTimingSlot[]> = {};
        (Array.isArray(student.preferredTimings) ? (student.preferredTimings as CourseTimingSlot[]) : []).forEach(s => {
            if (!s || typeof s !== 'object') return;
            map[s.courseName] = map[s.courseName] || [];
            map[s.courseName].push(s);
        });
        return map;
    };

    const groupAllocatedByCourse = (student: User): Record<string, string[]> => {
        const map: Record<string, string[]> = {};
        (Array.isArray(student.schedules) ? student.schedules : []).forEach(s => {
            map[s.course] = map[s.course] || [];
            map[s.course].push(s.timing);
        });
        return map;
    };


    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <BeautifulLoader message="Loading dashboard..." size="large" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 bg-transparent">
            {/* Subtle Background Elements */}
            <div className="absolute top-20 right-10 opacity-3 dark:opacity-5 pointer-events-none">
                <img 
                    src="/danceImages/bharatanatyam1.jpg" 
                    alt="" 
                    className="w-24 h-24 object-cover rounded-full"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="space-y-4">
                {/* Student Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1, delay: 0.6 }}
                className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/30"
            >
                    <div className="flex items-center justify-between p-4 pb-0">
                        <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Family Students
                        </h2>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link to="add" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300">
                                Add Students
                            </Link>
                        </motion.div>
                    </div>
                    
                    {/* Tab Headers */}
                    <div className="flex border-b border-white/20 dark:border-gray-700/30 overflow-x-auto">
                        {family.map((stu, idx) => {
                            const active = idx === activeIdx;
                            const name = stu.name || `Student ${idx + 1}`;
                            return (
                                <motion.button
                                    key={stu.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex items-center space-x-3 px-6 py-4 border-b-2 transition-all duration-300 whitespace-nowrap ${
                                        active 
                                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' 
                                            : 'border-transparent hover:bg-white/20 dark:hover:bg-gray-700/20'
                                    }`}
                                    onClick={() => setActiveIdx(idx)}
                                >
                                    <img
                                        src={stu.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(stu.name || 'Student')}&background=E5E7EB&color=111827`}
                                        className="w-8 h-8 rounded-full object-cover border-2 border-purple-300 dark:border-purple-600"
                                        alt={name}
                                    />
                                    <span className={`font-medium ${
                                        active 
                                            ? 'text-purple-600 dark:text-purple-400' 
                                            : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                        {name}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Tab Content */}
                {family.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/30"
                    >
                        {(() => {
                            const currentStudent = family[activeIdx];
                            const studentEnrollments = enrollments.get(currentStudent?.id) || [];
                            const studentName = currentStudent?.name || `Student ${activeIdx + 1}`;

                            return (
                                <div className="space-y-4">
                                    {/* Student Header */}
                                    <div className="flex items-center space-x-4 pb-6 border-b border-white/20 dark:border-gray-700/30">
                                        <img
                                            src={currentStudent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=E5E7EB&color=111827`}
                                            className="w-16 h-16 rounded-full object-cover border-4 border-purple-300 dark:border-purple-600 shadow-lg"
                                            alt={studentName}
                                        />
                                        <div>
                                            <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {studentName}
                                            </h3>
                                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Student Dashboard
                                            </p>
                                        </div>
                                    </div>

                                    {/* Horizontal Content Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* Enrolled Courses - Takes 2 columns on desktop */}
                                        <div className="lg:col-span-2 space-y-4">
                        {/* Enrolled Courses */}
                        <motion.div
                            ref={coursesRef}
                            initial={{ opacity: 0, y: 50 }}
                            animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 1 }}
                            className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50 dark:border-gray-700/30"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <motion.h2
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={coursesInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 1, delay: 0.2 }}
                                    className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                                >
                                    Enrolled Courses
                                </motion.h2>
                                <motion.div
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={coursesInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 1, delay: 0.4 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Link to="courses" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline transition-colors duration-300">
                                        See all
                                    </Link>
                                </motion.div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(() => {
                                    
                                    if (studentEnrollments.length === 0) {
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={coursesInView ? { opacity: 1 } : {}}
                                                transition={{ duration: 1, delay: 0.5 }}
                                                className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} col-span-2 text-center py-8`}
                                            >
                                                No courses enrolled yet.
                                            </motion.div>
                                        );
                                    }

                                    return studentEnrollments.map((enrollment, i) => {
                                        // Get course-specific colors matching registration screen
                                        const colors = getCourseColors(enrollment.courseName, i);
                                        
                                        // Find course data from database for uploaded image
                                        const courseData = courses.find(c => c.name === enrollment.courseName);
                                        const courseImage = courseData?.image;

                                        // Get preferred timings for comparison
                                        const preferredTimings = groupPreferredByCourse(currentStudent)[enrollment.courseName] || [];
                                        
                                        return (
                                            <motion.div
                                                key={enrollment.batchName}
                                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                                animate={coursesInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                className={`relative rounded-xl p-3 border ${colors.border} ${colors.bg} backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300`}
                                            >
                                                <div className={`text-lg font-semibold ${colors.text}`}>{enrollment.courseName}</div>
                                                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                                                    Batch: {enrollment.batchName}
                                                </div>
                                                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                                    Teacher: {enrollment.teacher?.name || 'Not Assigned'}
                                                </div>
                                                <div className={`mt-2 text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    Batch Timings:
                                                </div>
                                                <div className={`mt-1 space-y-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {enrollment.timings.slice(0, 3).map((timing, idx2) => (
                                                        <div key={idx2} className="flex items-center gap-2">
                                                            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                            </svg>
                                                            <span className="font-medium">{timing}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Show mismatched preferred timings */}
                                                {preferredTimings.length > 0 && (
                                                    <div className={`mt-3 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                        <div className="font-medium">Your preferred times:</div>
                                                        {preferredTimings.map((pref, idx) => {
                                                            const prefStr = `${pref.day}: ${pref.timeSlot}`;
                                                            const isMatched = enrollment.timings.some(t => 
                                                                t.toLowerCase().includes(pref.day.toLowerCase()) && 
                                                                t.toLowerCase().includes(pref.timeSlot.toLowerCase())
                                                            );
                                                            return (
                                                                <div key={idx} className={`flex items-center gap-1 ${isMatched ? 'text-green-600' : 'text-gray-400'}`}>
                                                                    {isMatched ? '✓' : '✗'}
                                                                    <span className={isMatched ? '' : 'line-through'}>{prefStr}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {courseImage ? (
                                                    <motion.img
                                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                                        src={courseImage}
                                                        alt={enrollment.courseName}
                                                        className="absolute right-3 bottom-2 w-20 h-20 object-contain pointer-events-none select-none rounded-lg shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="absolute right-3 bottom-2 w-20 h-20 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                                                        <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                        </svg>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    });
                                })()}
                            </div>
                        </motion.div>

                        {/* Course instructors */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50 dark:border-gray-700/30"
                        >
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Your Teachers</h3>
                            <div className="flex gap-6 flex-wrap">
                                {(() => {
                                    const stu = family[activeIdx];
                                    const studentEnrollments = enrollments.get(stu?.id) || [];
                                    const teachersMap = new Map();
                                    
                                    // Get unique teachers from enrollments
                                    studentEnrollments.forEach(enrollment => {
                                        if (enrollment.teacher) {
                                            teachersMap.set(enrollment.teacher.id, {
                                                ...enrollment.teacher,
                                                course: enrollment.courseName,
                                                batch: enrollment.batchName
                                            });
                                        }
                                    });
                                    
                                    const teachers = Array.from(teachersMap.values());
                                    
                                    if (teachers.length === 0) {
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={coursesInView ? { opacity: 1 } : {}}
                                                transition={{ duration: 1, delay: 0.8 }}
                                                className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                                            >
                                                No teachers assigned yet
                                            </motion.div>
                                        );
                                    }
                                    
                                    return teachers.slice(0, 3).map((teacher, i) => (
                                        <motion.div
                                            key={teacher.id}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={coursesInView ? { opacity: 1, scale: 1 } : {}}
                                            transition={{ duration: 0.6, delay: 0.6 + i * 0.1 }}
                                            whileHover={{ scale: 1.05, y: -5 }}
                                            className="flex flex-col items-center p-4 bg-white/20 dark:bg-gray-700/30 rounded-xl backdrop-blur-sm border border-white/30 dark:border-gray-600/30"
                                        >
                                            <motion.img
                                                whileHover={{ rotate: 360 }}
                                                transition={{ duration: 0.8 }}
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name || 'T')}&background=7B61FF&color=fff`}
                                                className="w-14 h-14 rounded-full border-4 border-purple-300 shadow-lg"
                                            />
                                            <div className={`mt-2 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {teacher.name}
                                            </div>
                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{teacher.course}</div>
                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{teacher.batch}</div>
                                        </motion.div>
                                    ));
                                })()}
                            </div>
                        </motion.div>

                        {/* Recent Media carousel */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 1, delay: 0.6 }}
                            className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50 dark:border-gray-700/30"
                        >
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Recent Media</h3>
                            <div className="flex items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setMediaIndex(i => Math.max(0, i - 1))}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg hover:shadow-xl transition-shadow duration-300"
                                >
                                    ◀
                                </motion.button>
                                <div className="flex-1 overflow-hidden rounded-xl">
                                    <motion.div
                                        className="flex gap-4 transition-transform duration-500 ease-in-out"
                                        animate={{ x: -mediaIndex * 200 }}
                                    >
                                        {["drawing.png","semi_classical.png","vocal.png"].map((img, i) => (
                                            <motion.img
                                                key={i}
                                                whileHover={{ scale: 1.1 }}
                                                src={`/images/${img}`}
                                                className="h-28 w-auto object-contain rounded-lg shadow-md"
                                            />
                                        ))}
                                    </motion.div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setMediaIndex(i => Math.min(2, i + 1))}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg hover:shadow-xl transition-shadow duration-300"
                                >
                                    ▶
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>

                                        {/* Right sidebar - Student info and quick links */}
                                        <div className="lg:col-span-1 space-y-3">
                                            {/* Student Events */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 50 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 1 }}
                                                className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/30"
                                            >
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                        📅 Events
                                                    </h4>
                                                    <Link to="events" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                                        See all
                                                    </Link>
                                                </div>
                                                <div className="space-y-2">
                                                    {recentEvents.slice(0, 2).map((event, i) => (
                                                        <motion.div
                                                            key={event.id}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.1 }}
                                                            className="p-2 rounded-lg bg-gradient-to-r from-purple-100/50 to-blue-100/50 dark:from-purple-900/30 dark:to-blue-900/30 backdrop-blur-sm border border-purple-200/30 dark:border-purple-700/30"
                                                        >
                                                            <div className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                {event.title}
                                                            </div>
                                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                                                {new Date(event.date).toLocaleDateString()}
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                    {recentEvents.length === 0 && (
                                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>
                                                            No upcoming events
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>

                                            {/* Student Book Materials */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 50 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 1, delay: 0.2 }}
                                                className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/30"
                                            >
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                        📚 Materials
                                                    </h4>
                                                    <Link to="book-materials" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                                        See all
                                                    </Link>
                                                </div>
                                                <div className="space-y-2">
                                                    <motion.div
                                                        className="p-2 rounded-lg bg-gradient-to-r from-green-100/50 to-blue-100/50 dark:from-green-900/30 dark:to-blue-900/30 backdrop-blur-sm border border-green-200/30 dark:border-green-700/30"
                                                    >
                                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-2`}>
                                                            Materials specific to {studentName}'s courses will appear here
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            </motion.div>

                                            {/* Student Notices */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 50 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 1, delay: 0.4 }}
                                                className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/30"
                                            >
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                        📢 Notices
                                                    </h4>
                                                    <Link to="notices" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                                        See all
                                                    </Link>
                                                </div>
                                                <div className="space-y-2">
                                                    {recentNotices.slice(0, 2).map((notice, i) => (
                                                        <motion.div
                                                            key={notice.id}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.1 }}
                                                            className="p-2 rounded-lg bg-gradient-to-r from-orange-100/50 to-red-100/50 dark:from-orange-900/30 dark:to-red-900/30 backdrop-blur-sm border border-orange-200/30 dark:border-orange-700/30"
                                                        >
                                                            <div className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                {notice.title}
                                                            </div>
                                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                                                {new Date(notice.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                    {recentNotices.length === 0 && (
                                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>
                                                            No recent notices
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>

                                            {/* Quick Stats for Student */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 50 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 1, delay: 0.6 }}
                                                className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/30"
                                            >
                                                <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    📊 Stats
                                                </h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="text-center p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/30">
                                                        <div className={`text-2xl font-bold text-blue-600 dark:text-blue-400`}>
                                                            {studentEnrollments.length}
                                                        </div>
                                                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Courses
                                                        </div>
                                                    </div>
                                                    <div className="text-center p-2 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                                                        <div className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                                                            {recentEvents.length}
                                                        </div>
                                                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Events
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboardHomePage;
