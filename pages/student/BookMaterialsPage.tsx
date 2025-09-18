import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
    BookOpen, 
    Users, 
    Download, 
    FileText, 
    Video,
    Image as ImageIcon,
    Link as LinkIcon,
    Star,
    CheckCircle,
    Calendar,
    Heart,
    Music,
    Palette,
    Calculator,
    Award,
    TrendingUp,
    Folder
} from 'lucide-react';
import type { BookMaterial, User } from '../../types';
import { getBookMaterials, getFamilyStudents } from '../../api';
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

const getMaterialIcon = (type: string) => {
    const iconMap: Record<string, React.ElementType> = {
        'PDF': FileText,
        'Video': Video,
        'Image': ImageIcon,
        'Link': LinkIcon,
        'Document': FileText
    };
    return iconMap[type] || FileText;
};

const getCourseTheme = (courseName: string, index: number) => {
    const courseThemes: Record<string, { gradient: string; bgGradient: string }> = {
        'Bharatanatyam': { 
            gradient: 'from-pink-500 to-rose-500',
            bgGradient: 'bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 dark:from-pink-900/30 dark:via-rose-900/30 dark:to-purple-900/30'
        },
        'Vocal': { 
            gradient: 'from-blue-500 to-indigo-500',
            bgGradient: 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30'
        },
        'Drawing': { 
            gradient: 'from-orange-500 to-amber-500',
            bgGradient: 'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-orange-900/30 dark:via-amber-900/30 dark:to-yellow-900/30'
        },
        'Abacus': { 
            gradient: 'from-green-500 to-emerald-500',
            bgGradient: 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30'
        }
    };
    
    const fallbackThemes = [
        { gradient: 'from-purple-500 to-blue-500', bgGradient: 'bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-indigo-900/30' },
        { gradient: 'from-cyan-500 to-teal-500', bgGradient: 'bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 dark:from-cyan-900/30 dark:via-teal-900/30 dark:to-emerald-900/30' }
    ];
    
    return courseThemes[courseName] || fallbackThemes[index % fallbackThemes.length];
};

const BookMaterialsPage: React.FC = () => {
    const { theme } = useTheme();
    const [materialsByStudent, setMaterialsByStudent] = useState<Map<string, BookMaterial[]>>(new Map());
    const [family, setFamily] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [tabsRef, tabsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [materialsRef, materialsInView] = useInView({ threshold: 0.1, triggerOnce: true });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [familyData, allMaterialsForFamily] = await Promise.all([
                    getFamilyStudents(),
                    getBookMaterials(),
                ]);
                
                setFamily(familyData);
                
                const materialsMap = new Map<string, BookMaterial[]>();
                familyData.forEach(student => materialsMap.set(student.id, []));

                allMaterialsForFamily.forEach(material => {
                    familyData.forEach(student => {
                        if (material.recipientIds?.includes(student.id)) {
                            const studentMaterials = materialsMap.get(student.id) || [];
                            studentMaterials.push(material);
                            materialsMap.set(student.id, studentMaterials);
                        }
                    });
                });

                setMaterialsByStudent(materialsMap);

            } catch (error) {
                console.error("Failed to fetch book materials:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
                <BeautifulLoader message="Loading materials..." size="large" />
            </div>
        );
    }

    const currentStudent = family[activeTabIndex];
    const studentMaterials = materialsByStudent.get(currentStudent?.id) || [];
    const studentName = currentStudent?.name || `Student ${activeTabIndex + 1}`;
    
    // Group materials by course
    const materialsByCourse = studentMaterials.reduce((acc, material) => {
        const course = material.courseName;
        if (!acc[course]) acc[course] = [];
        acc[course].push(material);
        return acc;
    }, {} as Record<string, BookMaterial[]>);

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
                {/* Hero Section */}
                <motion.section
                    ref={heroRef}
                    initial={{ opacity: 0, y: 50 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1 }}
                    className="text-center py-8"
                >
                    <div className="flex items-center justify-center space-x-4 mb-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 1.2, delay: 0.2 }}
                            className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg"
                        >
                            <Folder className="w-8 h-8 text-white" />
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, x: 50 }}
                            animate={heroInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent"
                        >
                            Book Materials
                        </motion.h1>
                    </div>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={heroInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 1, delay: 0.4 }}
                        className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                        Access course materials and resources for each student
                    </motion.p>
                </motion.section>

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
                                    <Folder className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Book & Course Materials
                                    </h2>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Access course materials and resources for each student
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
                                    const studentMaterialCount = materialsByStudent.get(student.id)?.length || 0;
                                    
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
                                                {studentMaterialCount}
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
                                {/* Student Header */}
                                <div className="flex items-center space-x-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                                    <div className="relative">
                                        <img
                                            src={currentStudent?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=7B61FF&color=fff`}
                                            className="w-16 h-16 rounded-full object-cover border-4 border-purple-300 dark:border-purple-600 shadow-lg"
                                            alt={studentName}
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-3 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                            {studentName}'s Materials
                                        </h3>
                                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex items-center space-x-2`}>
                                            <TrendingUp className="w-4 h-4" />
                                            <span>{studentMaterials.length} material{studentMaterials.length !== 1 ? 's' : ''} available</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Materials Content */}
                                <motion.div
                                    ref={materialsRef}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={materialsInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.8 }}
                                    className="mt-6"
                                >
                                    {Object.keys(materialsByCourse).length > 0 ? (
                                        <div className="space-y-8">
                                            {Object.entries(materialsByCourse).map(([courseName, courseMaterials], courseIdx) => {
                                                const courseTheme = getCourseTheme(courseName, courseIdx);
                                                const CourseIcon = getCourseIcon(courseName);
                                                
                                                return (
                                                    <motion.div
                                                        key={courseName}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={materialsInView ? { opacity: 1, y: 0 } : {}}
                                                        transition={{ duration: 0.6, delay: courseIdx * 0.1 }}
                                                        className={`${courseTheme.bgGradient} rounded-2xl p-6 border ${theme === 'dark' ? 'border-gray-600/30' : 'border-white/50'} backdrop-blur-sm`}
                                                    >
                                                        {/* Course Header */}
                                                        <div className="flex items-center space-x-4 mb-6">
                                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${courseTheme.gradient} flex items-center justify-center shadow-lg`}>
                                                                <CourseIcon className="w-6 h-6 text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                                                    {courseName}
                                                                </h3>
                                                                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex items-center space-x-2`}>
                                                                    <FileText className="w-4 h-4" />
                                                                    <span>{courseMaterials.length} material{courseMaterials.length !== 1 ? 's' : ''}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Materials Grid */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {courseMaterials.map((material, materialIdx) => {
                                                                const MaterialIcon = getMaterialIcon(material.type);
                                                                return (
                                                                    <motion.a
                                                                        key={material.id}
                                                                        href={material.type === 'PDF' ? material.data : material.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                        animate={materialsInView ? { opacity: 1, scale: 1 } : {}}
                                                                        transition={{ duration: 0.5, delay: 0.2 + materialIdx * 0.1 }}
                                                                        whileHover={{ scale: 1.05, y: -5 }}
                                                                        className={`block p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-white/80 hover:bg-white'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-white/50'} shadow-lg hover:shadow-xl transition-all duration-300 group`}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                                                material.type === 'PDF' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                                                                                material.type === 'Video' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                                                                material.type === 'Image' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                                                                                'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                                                            }`}>
                                                                                {material.type}
                                                                            </span>
                                                                            <MaterialIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-purple-600'} transition-colors duration-300`} />
                                                                        </div>
                                                                        
                                                                        <h4 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300`}>
                                                                            {material.title}
                                                                        </h4>
                                                                        
                                                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                                                                            {material.description}
                                                                        </p>

                                                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/30">
                                                                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                                Click to open
                                                                            </span>
                                                                            <Download className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-purple-600'} transition-colors duration-300`} />
                                                                        </div>
                                                                    </motion.a>
                                                                );
                                                            })}
                                                        </div>
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
                                            <Folder className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                No Materials Available
                                            </h3>
                                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                No materials have been assigned to {studentName} yet.
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

export default BookMaterialsPage;