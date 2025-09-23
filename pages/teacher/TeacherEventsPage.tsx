import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useOutletContext } from 'react-router-dom';
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Users,
    Star,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Bell,
    Award,
    Music,
    Heart,
    Palette,
    Calculator,
    BookOpen
} from 'lucide-react';
import type { Event, User, Batch } from '../../types';
import { getEvents, getBatches } from '../../api';
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

const getEventTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
        'Workshop': 'from-blue-500 to-indigo-500',
        'Performance': 'from-purple-500 to-pink-500',
        'Competition': 'from-orange-500 to-red-500',
        'Seminar': 'from-green-500 to-emerald-500',
        'Exhibition': 'from-cyan-500 to-teal-500'
    };
    return colorMap[type] || 'from-gray-500 to-gray-600';
};

const TeacherEventsPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [eventsRef, eventsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [events, setEvents] = useState<Event[]>([]);
    const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const eventsPerPage = 6;

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) return;
            
            try {
                setIsLoading(true);
                const [eventsData, batchesData] = await Promise.all([
                    getEvents(),
                    getBatches()
                ]);
                
                // Filter batches where this teacher is assigned
                const filteredTeacherBatches = batchesData.filter(batch => {
                    const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id;
                    return teacherId === user.id;
                });
                
                // Get courses this teacher teaches
                const teacherCourses = Array.from(new Set(filteredTeacherBatches.map(batch => batch.courseName)));
                
                // Filter events for courses this teacher teaches or general events
                const relevantEvents = eventsData.filter(event => 
                    !event.courseName || teacherCourses.includes(event.courseName)
                );
                
                setEvents(relevantEvents);
                setTeacherBatches(filteredTeacherBatches);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch events:", err);
                setError(err instanceof Error ? err.message : 'Failed to fetch events');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, [user]);

    if (isLoading) {
        return <BeautifulLoader message="Loading events..." />;
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

    // Filter events based on search and type
    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || event.type === filterType;
        return matchesSearch && matchesType;
    });

    // Pagination
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
    const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

    const eventTypes = Array.from(new Set(events.map(event => event.type).filter(Boolean)));

    const isEventUpcoming = (eventDate: string) => {
        return new Date(eventDate) > new Date();
    };

    const formatEventDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.toLocaleDateString('en-US', { day: 'numeric' }),
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
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
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-purple-600 dark:text-purple-400" />
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        Events & Activities
                    </h1>
                    <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                        Stay updated with events, workshops, and activities related to your courses
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
                        placeholder="Search events..."
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
                        {eventTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </motion.div>

            {/* Events Grid */}
            <motion.section
                ref={eventsRef}
                initial={{ opacity: 0, y: 50 }}
                animate={eventsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1 }}
                className="max-w-7xl mx-auto"
            >
                {currentEvents.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                            {currentEvents.map((event, index) => {
                                const eventDate = formatEventDate(event.date);
                                const isUpcoming = isEventUpcoming(event.date);
                                const typeGradient = getEventTypeColor(event.type);
                                const Icon = event.courseName ? getCourseIcon(event.courseName) : CalendarDays;
                                
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                        animate={eventsInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                        transition={{ duration: 0.6, delay: index * 0.1 }}
                                        whileHover={{ scale: 1.02, y: -8 }}
                                        className={`relative rounded-3xl p-8 border backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group ${
                                            theme === 'dark' 
                                                ? 'bg-gray-800/60 border-gray-600/30' 
                                                : 'bg-white/90 border-white/70'
                                        }`}
                                    >
                                        {/* Background decoration */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full -translate-y-8 translate-x-8"></div>
                                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-400/5 to-indigo-400/5 rounded-full translate-y-6 -translate-x-6"></div>
                                        
                                        <div className="relative z-10">
                                            {/* Date Badge */}
                                            <div className="flex items-start justify-between mb-6">
                                                <div className={`flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br ${typeGradient} text-white shadow-lg`}>
                                                    <span className="text-sm font-medium">{eventDate.month}</span>
                                                    <span className="text-2xl font-bold">{eventDate.day}</span>
                                                    <span className="text-xs">{eventDate.weekday}</span>
                                                </div>
                                                
                                                <div className="flex flex-col items-end space-y-2">
                                                    {isUpcoming && (
                                                        <span className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                                                            Upcoming
                                                        </span>
                                                    )}
                                                    {event.type && (
                                                        <span className={`px-3 py-1 bg-gradient-to-r ${typeGradient} text-white text-xs font-semibold rounded-full shadow-md`}>
                                                            {event.type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-3 mb-4">
                                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${typeGradient} flex items-center justify-center`}>
                                                    <Icon className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'} group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors`}>
                                                        {event.title}
                                                    </h3>
                                                    {event.courseName && (
                                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            {event.courseName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {event.description && (
                                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6 line-clamp-3`}>
                                                    {event.description}
                                                </p>
                                            )}
                                            
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2 text-sm">
                                                    <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {eventDate.time}
                                                    </span>
                                                </div>
                                                
                                                {event.location && (
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <MapPin className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            {event.location}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {event.maxParticipants && (
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <Users className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            Max {event.maxParticipants} participants
                                                        </span>
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={eventsInView ? { opacity: 1, y: 0 } : {}}
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
                        animate={eventsInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className={`text-center py-16 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <Bell className={`w-20 h-20 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Events Found
                        </h3>
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} max-w-md mx-auto`}>
                            {searchTerm || filterType !== 'All' 
                                ? 'Try adjusting your search or filter to find events.'
                                : 'Events and activities for your courses will appear here once they are scheduled.'
                            }
                        </p>
                    </motion.div>
                )}
            </motion.section>
        </div>
    );
};

export default TeacherEventsPage;