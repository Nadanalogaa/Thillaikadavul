import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Bell, FileText, AlertCircle } from 'lucide-react';
import type { Notice, User as UserType } from '../../types';
import { getNotices, getFamilyStudents, getCurrentUser } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import BeautifulLoader from '../../components/BeautifulLoader';
import DashboardHeader from '../../components/DashboardHeader';

const NoticesPage: React.FC = () => {
    const { theme } = useTheme();
    const [noticesByStudent, setNoticesByStudent] = useState<Map<string, Notice[]>>(new Map());
    const [family, setFamily] = useState<UserType[]>([]);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeStudentId, setActiveStudentId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [user, familyData, allNoticesForFamily] = await Promise.all([
                    getCurrentUser(),
                    getFamilyStudents(),
                    getNotices(),
                ]);
                
                setCurrentUser(user);
                setFamily(familyData);
                
                if (familyData.length > 0 && !activeStudentId) {
                    setActiveStudentId(familyData[0].id);
                }
                
                const noticesMap = new Map<string, Notice[]>();
                familyData.forEach(student => noticesMap.set(student.id, []));

                allNoticesForFamily.forEach(notice => {
                    familyData.forEach(student => {
                        if (notice.recipientIds?.includes(student.id)) {
                             const studentNotices = noticesMap.get(student.id) || [];
                            studentNotices.push(notice);
                            noticesMap.set(student.id, studentNotices);
                        }
                    });
                });

                 // Sort notices within each student's list by date
                for (const [studentId, studentNotices] of noticesMap.entries()) {
                    studentNotices.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
                    noticesMap.set(studentId, studentNotices);
                }

                setNoticesByStudent(noticesMap);

            } catch (err) {
                console.error("Failed to fetch notices:", err);
                setError('Failed to load notices. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [activeStudentId]);
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <BeautifulLoader message="Loading notices..." />
            </div>
        );
    }

    const hasAnyNotices = Array.from(noticesByStudent.values()).some(notices => notices.length > 0);
    const activeStudent = family.find(s => s.id === activeStudentId);
    const activeNotices = noticesByStudent.get(activeStudentId) || [];

    const getPriorityColor = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return theme === 'dark' ? 'bg-red-900/50 text-red-300 border-red-700/50' : 'bg-red-100 text-red-800 border-red-200';
            case 'low':
                return theme === 'dark' ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' : 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return theme === 'dark' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    return (
        <DashboardHeader 
            userName={currentUser?.name || family[0]?.name || 'Guardian'} 
            userRole="Guardian"
            pageTitle="Notice Board"
            pageSubtitle="Stay informed with important announcements and updates"
        >
            <div className="px-4 sm:px-6 md:px-8">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 rounded-2xl border p-4 mb-6 ${
                            theme === 'dark' 
                                ? 'border-red-800/60 bg-red-900/30 text-red-200' 
                                : 'border-red-200 bg-red-50/70 text-red-600'
                        }`}
                    >
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </motion.div>
                )}

                {family.length > 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className={`flex space-x-1 p-1 rounded-xl shadow-lg border backdrop-blur-sm ${
                            theme === 'dark' 
                                ? 'bg-gray-800/90 border-gray-700/50' 
                                : 'bg-white/90 border-purple-200/50'
                        }`}>
                            {family.map((student) => {
                                const studentNotices = noticesByStudent.get(student.id) || [];
                                const isActive = activeStudentId === student.id;
                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => setActiveStudentId(student.id)}
                                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                                            isActive
                                                ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
                                                : `${theme === 'dark' ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-700/50' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`
                                        }`}
                                    >
                                        <User className="w-4 h-4" />
                                        <span>{student.name}</span>
                                        {studentNotices.length > 0 && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                isActive ? 'bg-white/20' : theme === 'dark' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                                            }`}>
                                                {studentNotices.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {hasAnyNotices ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        {activeNotices.length > 0 ? activeNotices.map((notice, index) => (
                            <motion.div
                                key={notice.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`rounded-2xl shadow-lg border backdrop-blur-sm overflow-hidden ${
                                    theme === 'dark' 
                                        ? 'bg-gray-800/90 border-gray-700/50' 
                                        : 'bg-white/90 border-purple-200/50'
                                }`}
                            >
                                <div className={`p-6 border-b ${
                                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                                }`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                                <Bell className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h2 className={`text-xl font-bold ${
                                                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                } mb-2`}>
                                                    {notice.title}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className={`flex items-center gap-1 text-sm ${
                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{new Date(notice.issuedAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-sm ${
                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        <Clock className="w-4 h-4" />
                                                        <span>{new Date(notice.issuedAt).toLocaleTimeString()}</span>
                                                    </div>
                                                    {notice.priority && (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(notice.priority)}`}>
                                                            {notice.priority.toUpperCase()} PRIORITY
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                                            theme === 'dark' ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            For: {activeStudent?.name}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="flex items-start gap-3">
                                        <FileText className={`w-5 h-5 mt-1 flex-shrink-0 ${
                                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                        }`} />
                                        <p className={`${
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        } whitespace-pre-wrap leading-relaxed`}>
                                            {notice.content}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`text-center py-16 rounded-2xl border-2 border-dashed ${
                                    theme === 'dark' 
                                        ? 'bg-gray-800/50 border-gray-600 text-gray-400' 
                                        : 'bg-white/50 border-gray-300 text-gray-500'
                                }`}
                            >
                                <Bell className={`w-16 h-16 mx-auto mb-4 ${
                                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                                }`} />
                                <h3 className={`text-xl font-semibold mb-2 ${
                                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    No Notices
                                </h3>
                                <p>No notices available for {activeStudent?.name} at this time.</p>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-center py-20 rounded-2xl shadow-lg border backdrop-blur-sm ${
                            theme === 'dark' 
                                ? 'bg-gray-800/90 border-gray-700/50' 
                                : 'bg-white/90 border-gray-100'
                        }`}
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-full mx-auto mb-6 flex items-center justify-center">
                            <Bell className={`w-12 h-12 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`} />
                        </div>
                        <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>No Notices Found</h3>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-md mx-auto`}>
                            There are no new notices for your family at this time. Check back later for important announcements!
                        </p>
                    </motion.div>
                )}
            </div>
        </DashboardHeader>
    );
};

export default NoticesPage;