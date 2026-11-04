import React, { useState, useEffect } from 'react';
import { TeacherHome } from '../../components/home/HomeWidgets';
import { greetingName } from '../../utils/greetingName';
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
import type { User, Event, Notice, Batch, HouseholdFees } from '../../types';
import { getEvents, getNotices, getBatches, getUsersByIds, getHouseholdFees } from '../../api';
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
    // Household fees (this teacher's children), for the Airtel-style bill card.
    const [fees, setFees] = useState<HouseholdFees | null>(null);
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
                
                const [eventsData, noticesData, batchesData, feesData] = await Promise.all([
                    getEvents(5), // Limit to 5 recent events for dashboard
                    getNotices(5), // Limit to 5 recent notices for dashboard
                    getBatches(),
                    getHouseholdFees(), // this teacher's household bill (her children)
                ]);
                setFees(feesData);

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* My Children — shown when this teacher is also a parent. One login
                surfaces every family profile; opens the parent view to switch. */}
            {((user as any)?.students?.length ?? 0) > 0 && (
                <div className="px-6 pb-2">
                    <Link
                        to="/parent/dashboard"
                        className="flex items-center justify-between rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">👨‍👩‍👧‍👦</span>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">My Children</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    View {(user as any).students.length} child {(user as any).students.length === 1 ? 'profile' : 'profiles'} on this account
                                </p>
                            </div>
                        </div>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">Open →</span>
                    </Link>
                </div>
            )}

            {/* Main Content */}
            <div className="px-4 pb-6 pt-4 sm:px-6">

                {/* Household fees — the teacher's children (Airtel-style bill card) */}
                {fees && fees.students.length > 0 && (() => {
                    const title = !fees.has_bill
                        ? `No fees generated for ${fees.period} yet`
                        : fees.all_paid ? `Paid for ${fees.period} ✓` : `Your family's fees for ${fees.period}`;
                    const amount = fees.all_paid ? fees.total_paid : fees.total_due;
                    return (
                        <div className={`mb-4 sm:mb-6 p-4 rounded-2xl border ${fees.all_paid
                            ? (theme === 'dark' ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200')
                            : (theme === 'dark' ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200')}`}>
                            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</p>
                            {fees.has_bill && (
                                <>
                                    <p className={`text-3xl font-bold mt-1 ${fees.all_paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                        ₹{Math.round(amount).toLocaleString()}
                                    </p>
                                    {!fees.all_paid && fees.due_date && (
                                        <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Due by {new Date(fees.due_date).toLocaleDateString()}
                                        </p>
                                    )}
                                    {fees.students.length > 1 && (
                                        <ul className="mt-3 space-y-1">
                                            {fees.students.map(s => (
                                                <li key={s.student_id} className={`flex justify-between text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    <span>{s.student_name}</span>
                                                    <span className="font-medium">
                                                        ₹{Math.round(fees.all_paid ? s.month_paid : s.month_due).toLocaleString()}{fees.all_paid ? ' paid' : ' due'}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {!fees.all_paid && (
                                        <Link to="fees" className="inline-flex items-center mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
                                            Pay now
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })()}

                <TeacherHome name={greetingName(user?.name) || 'Teacher'} attendancePath="/dashboard/teacher/attendance"
                    batchesPath="/dashboard/teacher/batches" studentsPath="/dashboard/teacher/students" />
            </div>
        </div>
    );
};

export default TeacherDashboardHomePage;
