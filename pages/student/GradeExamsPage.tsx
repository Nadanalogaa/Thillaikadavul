import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
    GraduationCap, 
    Users, 
    Calendar, 
    Clock, 
    Download, 
    Star,
    CheckCircle,
    Award,
    FileText,
    AlertCircle,
    TrendingUp,
    BookOpen
} from 'lucide-react';
import type { GradeExam, User } from '../../types';
import { getGradeExams, getFamilyStudents } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';

const GradeExamsPage: React.FC = () => {
    const { theme } = useTheme();
    const [examsByStudent, setExamsByStudent] = useState<Map<string, GradeExam[]>>(new Map());
    const [family, setFamily] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    const [tabsRef, tabsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [examsRef, examsInView] = useInView({ threshold: 0.1, triggerOnce: true });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [familyData, allExamsForFamily] = await Promise.all([
                    getFamilyStudents(),
                    getGradeExams(),
                ]);

                setFamily(familyData);
                
                const examsMap = new Map<string, GradeExam[]>();
                familyData.forEach(student => examsMap.set(student.id, []));

                allExamsForFamily.forEach(exam => {
                    familyData.forEach(student => {
                        if (exam.recipientIds?.includes(student.id)) {
                            const studentExams = examsMap.get(student.id) || [];
                            studentExams.push(exam);
                            examsMap.set(student.id, studentExams);
                        }
                    });
                });

                setExamsByStudent(examsMap);

            } catch (error) {
                console.error("Failed to fetch grade exams:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading grade exam information...</p>
                </div>
            </div>
        );
    }

    const currentStudent = family[activeTabIndex];
    const studentExams = examsByStudent.get(currentStudent?.id) || [];
    const studentName = currentStudent?.name || `Student ${activeTabIndex + 1}`;

    const getExamStatus = (exam: GradeExam) => {
        const now = new Date();
        const examDate = new Date(exam.examDate);
        const registrationDeadline = new Date(exam.registrationDeadline);

        if (now > examDate) {
            return { status: 'completed', color: 'green', text: 'Completed' };
        } else if (now > registrationDeadline) {
            return { status: 'registration-closed', color: 'red', text: 'Registration Closed' };
        } else {
            return { status: 'upcoming', color: 'blue', text: 'Upcoming' };
        }
    };

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
                {/* Student Tabs */}
                {family.length > 0 && (
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
                        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-purple-200'}`}>
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Grade Exams
                                    </h2>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        View and manage exams for each student
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Student Navigation Tabs */}
                        <div className={`px-6 py-4 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-r from-purple-50/50 to-blue-50/50'}`}>
                            <div className="flex space-x-2 overflow-x-auto">
                                {family.map((student, index) => {
                                    const active = index === activeTabIndex;
                                    const studentName = student.name || `Student ${index + 1}`;
                                    const studentExamCount = examsByStudent.get(student.id)?.length || 0;
                                    
                                    return (
                                        <motion.button
                                            key={student.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={tabsInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ duration: 0.6, delay: index * 0.1 }}
                                            className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 whitespace-nowrap font-semibold min-w-fit ${
                                                active 
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg ring-2 ring-purple-300 dark:ring-purple-600 transform scale-105' 
                                                    : theme === 'dark'
                                                        ? 'bg-gray-600/50 text-gray-300 hover:bg-gray-500/50 hover:text-white'
                                                        : 'bg-white/70 text-gray-700 hover:bg-white hover:text-purple-600 border border-gray-200 hover:border-purple-300'
                                            }`}
                                            onClick={() => setActiveTabIndex(index)}
                                        >
                                            <div className="relative">
                                                <img
                                                    src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=${active ? 'fff' : '7B61FF'}&color=${active ? '7B61FF' : 'fff'}`}
                                                    className="w-10 h-10 rounded-full object-cover shadow-md"
                                                    alt={studentName}
                                                />
                                                {active && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <span>{studentName}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                active 
                                                    ? 'bg-white/20 text-white'
                                                    : theme === 'dark'
                                                        ? 'bg-gray-700 text-gray-300'
                                                        : 'bg-purple-100 text-purple-700'
                                            }`}>
                                                {studentExamCount}
                                            </span>
                                            {active && <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTabIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                                className="p-6"
                            >

                                {/* Exams Content */}
                                <motion.div
                                    ref={examsRef}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={examsInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.8 }}
                                >
                                    {studentExams.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {studentExams.map((exam, idx) => {
                                                const examStatus = getExamStatus(exam);
                                                return (
                                                    <motion.div
                                                        key={exam.id}
                                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                        animate={examsInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                                                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                        className={`rounded-2xl p-6 border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden group ${
                                                            theme === 'dark' 
                                                                ? 'bg-gray-700/50 border-gray-600/30' 
                                                                : 'bg-white/80 border-gray-200/50'
                                                        }`}
                                                    >
                                                        {/* Background decoration */}
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full -translate-y-6 translate-x-6"></div>
                                                        
                                                        <div className="relative z-10">
                                                            {/* Exam Header */}
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                                                        <GraduationCap className="w-6 h-6 text-white" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                                                            {exam.title}
                                                                        </h4>
                                                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            Grade Examination
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                                    examStatus.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                                    examStatus.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                                                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                                                }`}>
                                                                    {examStatus.text}
                                                                </span>
                                                            </div>

                                                            {/* Exam Description */}
                                                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-4 text-sm leading-relaxed`}>
                                                                {exam.description}
                                                            </p>

                                                            {/* Exam Details */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50/50 border-blue-200/50'}`}>
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                                                            Exam Date
                                                                        </h5>
                                                                    </div>
                                                                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                                                        {new Date(exam.examDate).toLocaleDateString('en-US', {
                                                                            weekday: 'long',
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                                
                                                                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-orange-900/20 border-orange-700/30' : 'bg-orange-50/50 border-orange-200/50'}`}>
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                                                        <h5 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                                                                            Registration Deadline
                                                                        </h5>
                                                                    </div>
                                                                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                                                        {new Date(exam.registrationDeadline).toLocaleDateString('en-US', {
                                                                            weekday: 'long',
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Syllabus Link */}
                                                            {exam.syllabusLink && (
                                                                <motion.a
                                                                    href={exam.syllabusLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    className="inline-flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                    <span>Download Syllabus</span>
                                                                </motion.a>
                                                            )}
                                                        </div>

                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`text-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'}`}
                                        >
                                            <GraduationCap className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                No Grade Exams Posted
                                            </h3>
                                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                No grade exams have been assigned to {studentName} at this time.
                                            </p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    </motion.section>
                )}

                {family.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <Users className={`w-24 h-24 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Students Found
                        </h3>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            No students found in this family account.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default GradeExamsPage;