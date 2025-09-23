import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useOutletContext } from 'react-router-dom';
import { 
    Bell, 
    Clock, 
    User,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Info,
    CheckCircle,
    AlertTriangle,
    Megaphone,
    Calendar,
    Eye,
    Heart,
    Music,
    Palette,
    Calculator,
    BookOpen
} from 'lucide-react';
import type { Notice, User as UserType, Batch } from '../../types';
import { getNotices, getBatches } from '../../api';
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

const getNoticeTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ElementType> = {
        'Info': Info,
        'Warning': AlertTriangle,
        'Success': CheckCircle,
        'Alert': AlertCircle,
        'Announcement': Megaphone
    };
    return iconMap[type] || Info;
};

const getNoticeTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
        'Info': 'from-blue-500 to-indigo-500',
        'Warning': 'from-yellow-500 to-orange-500',
        'Success': 'from-green-500 to-emerald-500',
        'Alert': 'from-red-500 to-pink-500',
        'Announcement': 'from-purple-500 to-violet-500'
    };
    return colorMap[type] || 'from-gray-500 to-gray-600';
};

const getNoticeTypeBg = (type: string, theme: string) => {
    const bgMap: Record<string, string> = {
        'Info': theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50',
        'Warning': theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50',
        'Success': theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50',
        'Alert': theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50',
        'Announcement': theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'
    };
    return bgMap[type] || (theme === 'dark' ? 'bg-gray-900/20' : 'bg-gray-50');
};

const TeacherNoticesPage: React.FC = () => {
    const { user } = useOutletContext<{ user: UserType }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [noticesRef, noticesInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [notices, setNotices] = useState<Notice[]>([]);
    const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [readNotices, setReadNotices] = useState<Set<string>>(new Set());
    const noticesPerPage = 6;

    useEffect(() => {
        const fetchNotices = async () => {
            // Wait for user to be available with ID
            if (!user?.id) {
                setIsLoading(true);
                return;
            }
            
            try {
                setIsLoading(true);
                const [noticesData, batchesData] = await Promise.all([
                    getNotices(),
                    getBatches()
                ]);
                
                // Filter batches where this teacher is assigned
                const filteredTeacherBatches = batchesData.filter(batch => {
                    const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as UserType)?.id;
                    return teacherId === user.id;
                });
                
                // Get courses this teacher teaches
                const teacherCourses = Array.from(new Set(filteredTeacherBatches.map(batch => batch.courseName)));
                
                // Filter notices for courses this teacher teaches or general notices
                const relevantNotices = noticesData.filter(notice => 
                    !notice.courseName || teacherCourses.includes(notice.courseName) || notice.targetAudience === 'Teachers' || notice.targetAudience === 'All'
                );
                
                setNotices(relevantNotices);
                setTeacherBatches(filteredTeacherBatches);
                setError(null);
                
                // Load read notices from localStorage
                const savedReadNotices = localStorage.getItem(`readNotices_${user.id}`);
                if (savedReadNotices) {
                    setReadNotices(new Set(JSON.parse(savedReadNotices)));
                }
            } catch (err) {
                console.error("Failed to fetch notices:", err);
                setError(err instanceof Error ? err.message : 'Failed to fetch notices');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotices();
    }, [user?.id]); // Only re-run when user ID changes

    const markAsRead = (noticeId: string) => {
        const newReadNotices = new Set(readNotices);
        newReadNotices.add(noticeId);
        setReadNotices(newReadNotices);
        
        // Save to localStorage
        localStorage.setItem(`readNotices_${user.id}`, JSON.stringify(Array.from(newReadNotices)));
    };

    if (isLoading) {
        return <BeautifulLoader message="Loading notices..." />;
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

    // Filter notices based on search and type
    const filteredNotices = notices.filter(notice => {
        const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            notice.content?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || notice.type === filterType;
        return matchesSearch && matchesType;
    });

    // Sort notices by date (newest first) and read status
    const sortedNotices = filteredNotices.sort((a, b) => {
        const aRead = readNotices.has(a.id);
        const bRead = readNotices.has(b.id);
        
        // Unread notices first
        if (aRead !== bRead) {
            return aRead ? 1 : -1;
        }
        
        // Then by date
        return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    });

    // Pagination
    const indexOfLastNotice = currentPage * noticesPerPage;
    const indexOfFirstNotice = indexOfLastNotice - noticesPerPage;
    const currentNotices = sortedNotices.slice(indexOfFirstNotice, indexOfLastNotice);
    const totalPages = Math.ceil(sortedNotices.length / noticesPerPage);

    const noticeTypes = Array.from(new Set(notices.map(notice => notice.type).filter(Boolean)));
    const unreadCount = notices.filter(notice => !readNotices.has(notice.id)).length;

    const formatNoticeDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 168) { // 7 days
            return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

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
                    <div className="relative inline-block">
                        <Bell className="w-16 h-16 mx-auto mb-4 text-purple-600 dark:text-purple-400" />
                        {unreadCount > 0 && (
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        Notices & Announcements
                    </h1>
                    <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                        Stay informed with important notices and announcements from the administration
                    </p>
                </motion.div>
            </motion.section>

            {/* Search and Filter */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl mx-auto"
            >
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search notices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                            theme === 'dark' 
                                ? 'bg-gray-800/60 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                                : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className={`pl-10 pr-8 py-3 rounded-xl border backdrop-blur-sm appearance-none cursor-pointer transition-all duration-300 ${
                            theme === 'dark' 
                                ? 'bg-gray-800/60 border-gray-600 text-white focus:border-purple-500' 
                                : 'bg-white/80 border-gray-200 text-gray-900 focus:border-purple-500'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                        <option value="All">All Types</option>
                        {noticeTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </motion.div>

            {/* Notices List */}
            <motion.section
                ref={noticesRef}
                initial={{ opacity: 0, y: 50 }}
                animate={noticesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1 }}
                className="max-w-4xl mx-auto"
            >
                {currentNotices.length > 0 ? (
                    <>
                        <div className="space-y-6 mb-8">
                            {currentNotices.map((notice, index) => {
                                const isRead = readNotices.has(notice.id);
                                const TypeIcon = getNoticeTypeIcon(notice.type);
                                const typeGradient = getNoticeTypeColor(notice.type);
                                const typeBg = getNoticeTypeBg(notice.type, theme);
                                const CourseIcon = notice.courseName ? getCourseIcon(notice.courseName) : null;
                                
                                return (
                                    <motion.div
                                        key={notice.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={noticesInView ? { opacity: 1, x: 0 } : {}}
                                        transition={{ duration: 0.6, delay: index * 0.1 }}
                                        whileHover={{ scale: 1.01, x: 5 }}
                                        onClick={() => !isRead && markAsRead(notice.id)}
                                        className={`relative p-6 rounded-2xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                                            isRead
                                                ? theme === 'dark' 
                                                    ? 'bg-gray-800/40 border-gray-600/30' 
                                                    : 'bg-white/60 border-gray-200/50'
                                                : theme === 'dark'
                                                    ? 'bg-gray-800/80 border-gray-600/50 ring-2 ring-purple-500/20'
                                                    : 'bg-white/90 border-purple-200/70 ring-2 ring-purple-500/20'
                                        } ${typeBg}`}
                                    >
                                        {/* Unread indicator */}
                                        {!isRead && (
                                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                        )}
                                        
                                        <div className="flex items-start space-x-4">
                                            {/* Type Icon */}
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeGradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                                <TypeIcon className="w-6 h-6 text-white" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h3 className={`font-bold text-lg ${
                                                            isRead 
                                                                ? theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                                : theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                        } group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors`}>
                                                            {notice.title}
                                                        </h3>
                                                        
                                                        <div className="flex items-center space-x-4 mt-2">
                                                            <div className="flex items-center space-x-2 text-sm">
                                                                <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {formatNoticeDate(notice.issuedAt)}
                                                                </span>
                                                            </div>
                                                            
                                                            {notice.issuedBy && (
                                                                <div className="flex items-center space-x-2 text-sm">
                                                                    <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                        {notice.issuedBy}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {notice.courseName && CourseIcon && (
                                                                <div className="flex items-center space-x-2 text-sm">
                                                                    <CourseIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                        {notice.courseName}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                                        {notice.type && (
                                                            <span className={`px-3 py-1 bg-gradient-to-r ${typeGradient} text-white text-xs font-semibold rounded-full shadow-md`}>
                                                                {notice.type}
                                                            </span>
                                                        )}
                                                        
                                                        {!isRead && (
                                                            <div className="flex items-center space-x-1 text-xs text-red-500">
                                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                                <span>New</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {notice.content && (
                                                    <p className={`text-sm ${
                                                        isRead 
                                                            ? theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                                                            : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                                    } leading-relaxed`}>
                                                        {notice.content}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={noticesInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="flex justify-center items-center space-x-4"
                            >
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        currentPage === 1
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : theme === 'dark'
                                                ? 'text-gray-300 hover:bg-gray-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                
                                <div className="flex space-x-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-lg font-semibold transition-all duration-300 ${
                                                currentPage === page
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                                    : theme === 'dark'
                                                        ? 'text-gray-300 hover:bg-gray-700'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        currentPage === totalPages
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : theme === 'dark'
                                                ? 'text-gray-300 hover:bg-gray-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={noticesInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className={`text-center py-16 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <Bell className={`w-20 h-20 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Notices Found
                        </h3>
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} max-w-md mx-auto`}>
                            {searchTerm || filterType !== 'All' 
                                ? 'Try adjusting your search or filter to find notices.'
                                : 'Important notices and announcements will appear here.'
                            }
                        </p>
                    </motion.div>
                )}
            </motion.section>
        </div>
    );
};

export default TeacherNoticesPage;