import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import type { User, Event, Notice, Batch } from '../../types';
import { getEvents, getNotices, getBatches, getAdminUsers } from '../../api';
import UnifiedNotificationBell from '../../components/UnifiedNotificationBell';
import { useTheme } from '../../contexts/ThemeContext';

const TeacherDashboardHomePage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [statsRef, statsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [activityRef, activityInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [stats, setStats] = useState({ totalStudents: 0, totalBatches: 0 });
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setIsLoading(true);
                const [eventsData, noticesData, batchesData, allUsers] = await Promise.all([
                    getEvents(),
                    getNotices(),
                    getBatches(),
                    getAdminUsers()
                ]);

                // Calculate stats
                const filteredTeacherBatches = batchesData.filter(b => {
                    const teacherId = typeof b.teacherId === 'string' ? b.teacherId : (b.teacherId as User)?.id;
                    return teacherId === user.id;
                });
                
                const studentIds = new Set<string>();
                filteredTeacherBatches.forEach(batch => {
                    batch.schedule.forEach(s => s.studentIds.forEach(id => studentIds.add(id)));
                });

                setTeacherBatches(filteredTeacherBatches);
                setStats({
                    totalStudents: studentIds.size,
                    totalBatches: filteredTeacherBatches.length
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
    }, [user]);
    
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (isLoading) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-blue-50 to-purple-100 dark:from-gray-800 dark:via-emerald-900 dark:to-blue-900"></div>
                
                {/* Floating Elements */}
                <motion.div
                    className="absolute top-20 right-10 w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full opacity-20"
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
                <motion.div
                    className="absolute top-1/3 left-20 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20"
                    animate={{
                        y: [0, 20, 0],
                        rotate: [360, 180, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-1/4 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"
                    animate={{
                        y: [0, -30, 0],
                        x: [0, 20, 0],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>
            
            <div className="relative z-10 p-4 sm:p-6 md:p-8 space-y-8">
                {/* Header */}
                <motion.div
                    ref={heroRef}
                    initial={{ opacity: 0, y: 50 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/20 rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/30"
                >
                    <div className="flex justify-between items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={heroInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 1, delay: 0.2 }}
                        >
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">Welcome, {user.name}!</h1>
                            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{dateString}</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={heroInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="flex items-center space-x-4"
                        >
                            <UnifiedNotificationBell user={user} />
                            <div className="flex items-center space-x-3">
                                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.name}</span>
                                <motion.img
                                    whileHover={{ scale: 1.1 }}
                                    src={user.photoUrl || `https://ui-avatars.com/api/?name=${(user.name || 'User').replace(/\s/g, '+')}&background=7B61FF&color=fff`}
                                    alt={user.name || 'User'}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300 shadow-lg"
                                />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Stat Cards */}
                <motion.div
                    ref={statsRef}
                    initial={{ opacity: 0, y: 50 }}
                    animate={statsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {[
                        { title: "Total Students", value: stats.totalStudents, bgColor: "bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50", textColor: "text-purple-800 dark:text-purple-300" },
                        { title: "Total Batches", value: stats.totalBatches, bgColor: "bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50", textColor: "text-yellow-800 dark:text-yellow-300" },
                        { title: "Your Courses", value: (user.courseExpertise || []).length, linkTo: "courses", bgColor: "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50", textColor: "text-blue-800 dark:text-blue-300" },
                        { title: "Payment History", value: "View", linkTo: "payment-history", bgColor: "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50", textColor: "text-green-800 dark:text-green-300" }
                    ].map((stat, index) => {
                        const content = (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={statsInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                transition={{ duration: 0.8, delay: index * 0.1 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className={`block p-6 rounded-2xl shadow-lg ${stat.linkTo ? 'transition-all hover:shadow-xl cursor-pointer' : ''} ${stat.bgColor} backdrop-blur-sm border border-white/20 dark:border-gray-700/30`}
                            >
                                <h4 className={`text-sm font-medium uppercase ${stat.textColor} opacity-80`}>{stat.title}</h4>
                                <p className={`text-3xl font-bold mt-2 ${stat.textColor}`}>{stat.value}</p>
                            </motion.div>
                        );
                        return stat.linkTo ? <Link key={index} to={stat.linkTo}>{content}</Link> : <div key={index}>{content}</div>;
                    })}
                </motion.div>

                {/* Teacher's Batches & Students */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={statsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/20 rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/30"
                >
                    <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6`}>Your Classes & Students</h3>
                    
                    {teacherBatches.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-2">📚</div>
                            <p className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>No batches assigned yet</p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Your assigned classes will appear here</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teacherBatches.slice(0, 6).map((batch, index) => (
                                <motion.div
                                    key={batch.id}
                                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                    animate={statsInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {batch.name}
                                            </h4>
                                            <p className={`text-sm ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                                {batch.courseName}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            batch.mode === 'Online' 
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                        }`}>
                                            {batch.mode}
                                        </span>
                                    </div>
                                    
                                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                            <span>{batch.schedule.reduce((total, schedule) => total + schedule.studentIds.length, 0)} students</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            <span>{batch.schedule.length} time slots</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        {batch.schedule.slice(0, 2).map((schedule, idx) => (
                                            <div key={idx} className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                <span className="font-medium">{schedule.day}</span>: {schedule.timeSlot}
                                            </div>
                                        ))}
                                        {batch.schedule.length > 2 && (
                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                +{batch.schedule.length - 2} more slots
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                    
                    {teacherBatches.length > 6 && (
                        <div className="text-center mt-6">
                            <Link 
                                to="batches" 
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300"
                            >
                                View All Batches ({teacherBatches.length})
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Recent Activity */}
                <motion.div
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
                        className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/20 rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/30"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recent Notices</h3>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link to="notice" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline transition-colors duration-300">View All</Link>
                            </motion.div>
                        </div>
                        <ul className="space-y-4">
                            {recentNotices.map((notice, i) => (
                                <motion.li
                                    key={notice.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={activityInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    className="p-4 bg-gradient-to-r from-purple-100/50 to-blue-100/50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl backdrop-blur-sm border border-purple-200/30 dark:border-purple-700/30 hover:shadow-lg transition-all duration-300"
                                >
                                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{notice.title}</p>
                                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{new Date(notice.issuedAt).toLocaleDateString()}</p>
                                </motion.li>
                            ))}
                            {recentNotices.length === 0 && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={activityInView ? { opacity: 1 } : {}}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-8`}
                                >
                                    No recent notices.
                                </motion.p>
                            )}
                        </ul>
                    </motion.div>
                    
                    {/* Upcoming Events */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={activityInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/20 rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/30"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Upcoming Events</h3>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link to="events" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline transition-colors duration-300">View All</Link>
                            </motion.div>
                        </div>
                        <ul className="space-y-4">
                            {recentEvents.map((event, i) => (
                                <motion.li
                                    key={event.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={activityInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                                    whileHover={{ scale: 1.02, x: -5 }}
                                    className="p-4 bg-gradient-to-r from-emerald-100/50 to-cyan-100/50 dark:from-emerald-900/30 dark:to-cyan-900/30 rounded-xl backdrop-blur-sm border border-emerald-200/30 dark:border-emerald-700/30 hover:shadow-lg transition-all duration-300"
                                >
                                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{event.title}</p>
                                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{new Date(event.date).toLocaleString()}</p>
                                </motion.li>
                            ))}
                            {recentEvents.length === 0 && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={activityInView ? { opacity: 1 } : {}}
                                    transition={{ duration: 1, delay: 0.7 }}
                                    className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-8`}
                                >
                                    No upcoming events.
                                </motion.p>
                            )}
                        </ul>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default TeacherDashboardHomePage;