import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
    User, 
    Calendar, 
    MapPin, 
    School, 
    Clock, 
    BookOpen, 
    GraduationCap,
    Users,
    Edit3,
    Plus,
    Star,
    Award,
    CheckCircle,
    Sparkles,
    Heart,
    Music,
    Palette,
    Calculator
} from 'lucide-react';
import type { User as UserType, StudentEnrollment, CourseTimingSlot } from '../../types';
import { getFamilyStudents, getStudentEnrollmentsForFamily } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import BeautifulLoader from '../../components/BeautifulLoader';

const getGuardianEmail = (email?: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const username = parts[0].split('+')[0];
    return `${username}@${parts[1]}`;
};

const InfoField: React.FC<{ 
    label: string; 
    value?: string | null; 
    icon: React.ElementType;
    delay: number;
}> = ({ label, value, icon: Icon, delay }) => {
    const [fieldRef, fieldInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const { theme } = useTheme();
    
    return (
        <motion.div
            ref={fieldRef}
            initial={{ opacity: 0, y: 20 }}
            animate={fieldInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay }}
            className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-purple-200/50'} backdrop-blur-sm group hover:shadow-lg transition-all duration-300`}
        >
            <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <h4 className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {label}
                </h4>
            </div>
            <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
                {value || <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} italic font-normal`}>Not Provided</span>}
            </p>
        </motion.div>
    );
};

const getCourseIcon = (courseName: string) => {
    const iconMap: Record<string, React.ElementType> = {
        'Bharatanatyam': Heart,
        'Vocal': Music,
        'Drawing': Palette,
        'Abacus': Calculator
    };
    return iconMap[courseName] || BookOpen;
};

const StudentProfileTab: React.FC<{ student: UserType }> = ({ student }) => {
    const [tabRef, tabInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const { theme } = useTheme();
    
    return (
        <motion.div
            ref={tabRef}
            initial={{ opacity: 0, y: 30 }}
            animate={tabInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField label="Full Name" value={student.name} icon={User} delay={0.1} />
                <InfoField 
                    label="Date of Birth" 
                    value={student.dob ? new Date(student.dob).toLocaleDateString() : null} 
                    icon={Calendar} 
                    delay={0.2} 
                />
                <InfoField label="Gender" value={student.sex} icon={User} delay={0.3} />
                <InfoField label="School" value={student.schoolName} icon={School} delay={0.4} />
                <InfoField label="Standard" value={student.standard} icon={GraduationCap} delay={0.5} />
                <InfoField label="Grade" value={student.grade} icon={Award} delay={0.6} />
                <InfoField 
                    label="Date of Joining" 
                    value={student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString() : null} 
                    icon={Calendar} 
                    delay={0.7} 
                />
                <InfoField label="Class Preference" value={student.classPreference} icon={Clock} delay={0.8} />
                
                {student.classPreference === 'Offline' && student.location && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={tabInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-green-50 to-emerald-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-green-200/50'} backdrop-blur-sm group hover:shadow-lg transition-all duration-300`}
                    >
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-white" />
                            </div>
                            <h4 className={`text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                Location
                            </h4>
                        </div>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(student.location.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'} font-medium hover:underline transition-colors duration-300`}
                        >
                            {student.location.name}
                        </a>
                    </motion.div>
                )}
            </div>

            {/* Enrolled Courses Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={tabInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.4 }}
                className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-purple-200/50'} backdrop-blur-sm`}
            >
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Enrolled Courses
                    </h3>
                </div>
                {student.courses && student.courses.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {student.courses.map((course, idx) => {
                            const Icon = getCourseIcon(course);
                            return (
                                <motion.div
                                    key={course}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={tabInView ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }}
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="font-medium text-sm">{course}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} italic`}>
                        Not enrolled in any courses.
                    </p>
                )}
            </motion.div>

            {/* Preferred Timings Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={tabInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.6 }}
                className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-amber-50 to-orange-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-amber-200/50'} backdrop-blur-sm`}
            >
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                    </div>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Preferred Timings
                    </h3>
                </div>
                {student.preferredTimings && student.preferredTimings.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {student.preferredTimings.map((timing: string | CourseTimingSlot, index: number) => {
                            let displayText = '';
                            if (typeof timing === 'string') {
                                displayText = timing;
                            } else if (timing && typeof timing === 'object' && timing.courseName && timing.day && timing.timeSlot) {
                                displayText = `${timing.courseName}: ${timing.day.substring(0, 3)} ${timing.timeSlot}`;
                            }
                            
                            if (!displayText) return null;
                            
                            return (
                                <motion.div
                                    key={timing.id || `${displayText}-${index}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={tabInView ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium text-sm">{displayText}</span>
                                </motion.div>
                            );
                        }).filter(Boolean)}
                    </div>
                ) : (
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} italic`}>
                        No preferred timings set.
                    </p>
                )}
            </motion.div>
        </motion.div>
    );
};

const StudentScheduleTab: React.FC<{ studentId: string }> = ({ studentId }) => {
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tabRef, tabInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const { theme } = useTheme();

    useEffect(() => {
        const fetchEnrollments = async () => {
            setIsLoading(true);
            try {
                const data = await getStudentEnrollmentsForFamily(studentId);
                setEnrollments(data);
            } catch (error) {
                console.error("Failed to fetch enrollments for student", studentId, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEnrollments();
    }, [studentId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <BeautifulLoader message="Loading schedule..." size="small" />
            </div>
        );
    }

    return (
        <motion.div
            ref={tabRef}
            initial={{ opacity: 0, y: 30 }}
            animate={tabInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-6"
        >
            {enrollments.length > 0 ? enrollments.map((enrollment, idx) => {
                const Icon = getCourseIcon(enrollment.courseName);
                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={tabInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-white to-purple-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-purple-200/50'} backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden group`}
                    >
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full -translate-y-6 translate-x-6"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                            {enrollment.courseName}
                                        </h3>
                                        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-medium`}>
                                            Batch: {enrollment.batchName}
                                        </p>
                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Teacher: {enrollment.teacher?.name || 'Not Assigned'}
                                        </p>
                                    </div>
                                </div>
                                {enrollment.mode && (
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${
                                            enrollment.mode === 'Online' 
                                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        }`}
                                    >
                                        {enrollment.mode}
                                    </motion.div>
                                )}
                            </div>

                            {enrollment.mode === 'Offline' && enrollment.location && (
                                <motion.a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enrollment.location.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center space-x-2 mb-4 ${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'} hover:underline transition-colors duration-300`}
                                    whileHover={{ x: 5 }}
                                >
                                    <MapPin className="w-4 h-4" />
                                    <span className="font-medium">{enrollment.location.name}</span>
                                </motion.a>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 mb-3">
                                    <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <h4 className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Class Schedule:
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {enrollment.timings.map((timing, timingIdx) => (
                                        <motion.div
                                            key={timing}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={tabInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ duration: 0.5, delay: 0.2 + timingIdx * 0.1 }}
                                            className={`flex items-center space-x-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-600/50' : 'bg-gradient-to-r from-green-50 to-emerald-50'} border ${theme === 'dark' ? 'border-gray-500/30' : 'border-green-200/50'}`}
                                        >
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                                {timing}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </motion.div>
                );
            }) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={tabInView ? { opacity: 1, y: 0 } : {}}
                    className={`text-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'}`}
                >
                    <Calendar className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        No Schedule Yet
                    </h3>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        This student is not currently assigned to any batch.
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
};

const FamilyProfilePage: React.FC = () => {
    const [family, setFamily] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStudentIndex, setActiveStudentIndex] = useState(0);
    const [activeSubTab, setActiveSubTab] = useState<'profile' | 'schedule'>('profile');
    const { theme } = useTheme();
    
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [tabsRef, tabsInView] = useInView({ threshold: 0.1, triggerOnce: true });

    useEffect(() => {
        const fetchFamily = async () => {
            setIsLoading(true);
            try {
                const data = await getFamilyStudents();
                setFamily(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not fetch family data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchFamily();
    }, []);

    const activeStudent = family[activeStudentIndex];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading family profiles...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
                <div className="text-center p-8 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="text-red-600 dark:text-red-400 text-lg font-semibold">{error}</div>
                </div>
            </div>
        );
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
            </div>

            {/* Main Content */}
            <div className="relative z-10 p-6 space-y-8">

                {family.length > 0 && activeStudent ? (
                    <motion.div
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
                        {/* Student Navigation Tabs */}
                        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-700/50' : 'border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50'}`}>
                            <div className="flex space-x-2 overflow-x-auto">
                                {family.map((student, index) => {
                                    const active = activeStudentIndex === index;
                                    return (
                                        <motion.button
                                            key={student.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={tabsInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ duration: 0.6, delay: index * 0.1 }}
                                            onClick={() => { setActiveStudentIndex(index); setActiveSubTab('profile'); }}
                                            className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 whitespace-nowrap font-semibold min-w-fit ${
                                                active 
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg ring-2 ring-purple-300 dark:ring-purple-600 transform scale-105' 
                                                    : theme === 'dark'
                                                        ? 'bg-gray-600/50 text-gray-300 hover:bg-gray-500/50 hover:text-white'
                                                        : 'bg-white/70 text-gray-700 hover:bg-white hover:text-purple-600 border border-gray-200 hover:border-purple-300'
                                            }`}
                                        >
                                            <div className="relative">
                                                <img 
                                                    src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || 'Student')}&background=${active ? 'fff' : '7B61FF'}&color=${active ? '7B61FF' : 'fff'}`} 
                                                    alt={student.name} 
                                                    className="w-10 h-10 rounded-full object-cover shadow-md"
                                                />
                                                {active && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <span>{student.name}</span>
                                            {active && <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Student Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <img 
                                            src={activeStudent.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStudent.name || 'Student')}&background=7B61FF&color=fff&size=128`} 
                                            alt={activeStudent.name} 
                                            className="w-20 h-20 rounded-full object-cover border-4 border-purple-300 dark:border-purple-600 shadow-lg"
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 border-3 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                            {activeStudent.name}
                                        </h2>
                                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
                                            {getGuardianEmail(activeStudent.email)}
                                        </p>
                                    </div>
                                </div>
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Edit Profile</span>
                                </motion.button>
                            </div>
                        </div>

                        {/* Sub-tabs */}
                        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="flex space-x-8">
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => setActiveSubTab('profile')} 
                                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 text-sm font-semibold transition-all duration-300 ${
                                        activeSubTab === 'profile' 
                                            ? `border-purple-500 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}` 
                                            : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
                                    }`}
                                >
                                    <User className="w-4 h-4" />
                                    <span>Profile Details</span>
                                </motion.button>
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => setActiveSubTab('schedule')} 
                                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 text-sm font-semibold transition-all duration-300 ${
                                        activeSubTab === 'schedule' 
                                            ? `border-purple-500 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}` 
                                            : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
                                    }`}
                                >
                                    <Calendar className="w-4 h-4" />
                                    <span>Schedule & Batches</span>
                                </motion.button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            <AnimatePresence mode="wait">
                                {activeSubTab === 'profile' && (
                                    <motion.div
                                        key="profile"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <StudentProfileTab student={activeStudent} />
                                    </motion.div>
                                )}
                                {activeSubTab === 'schedule' && (
                                    <motion.div
                                        key="schedule"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <StudentScheduleTab studentId={activeStudent.id} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <Users className={`w-24 h-24 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Students Found
                        </h3>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
                            No students found in this family account.
                        </p>
                        <Link 
                            to="/dashboard/student/add" 
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Add Your First Student</span>
                        </Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default FamilyProfilePage;