import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useOutletContext } from 'react-router-dom';
import { 
    BookOpen, 
    Download, 
    FileText, 
    Video,
    Image as ImageIcon,
    Link as LinkIcon,
    Heart,
    Music,
    Palette,
    Calculator,
    Folder,
    Users,
    Calendar,
    Eye,
    ExternalLink
} from 'lucide-react';
import type { BookMaterial, User, Batch } from '../../types';
import { getBookMaterials, getBatches } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import TeacherLoader from '../../components/TeacherLoader';
import DashboardHeader from '../../components/DashboardHeader';

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

const TeacherBookMaterialsPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [materialsRef, materialsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [materials, setMaterials] = useState<BookMaterial[]>([]);
    const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string>('All');

    useEffect(() => {
        const fetchMaterials = async () => {
            // Wait for user to be available with ID
            if (!user?.id) {
                setIsLoading(true);
                return;
            }
            
            try {
                setIsLoading(true);
                
                console.log('Loading book materials data for teacher:', user.name);
                
                const [materialsData, batchesData] = await Promise.all([
                    getBookMaterials(),
                    getBatches()
                ]);
                
                // Filter batches where this teacher is assigned
                const filteredTeacherBatches = batchesData.filter(batch => {
                    const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id;
                    return teacherId === user.id;
                });
                
                // Get courses this teacher teaches
                const teacherCourses = Array.from(new Set(filteredTeacherBatches.map(batch => batch.courseName)));
                
                // Filter materials for courses this teacher teaches and that are sent to this teacher
                const teacherMaterials = materialsData.filter(material => {
                    const isCourseMatch = teacherCourses.includes(material.courseName);
                    const isRecipient = material.recipientIds && material.recipientIds.length > 0 
                        ? material.recipientIds.includes(user.id)
                        : isCourseMatch; // If no recipients specified, show to all teachers of the course
                    return isCourseMatch && isRecipient;
                });
                
                setMaterials(teacherMaterials);
                setTeacherBatches(filteredTeacherBatches);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch materials:", err);
                setError(err instanceof Error ? err.message : 'Failed to fetch materials');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMaterials();
    }, [user?.id]); // Only re-run when user ID changes

    if (isLoading) {
        return <TeacherLoader message="Loading book materials..." />;
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

    const teacherCourses = Array.from(new Set(teacherBatches.map(batch => batch.courseName)));
    const filteredMaterials = selectedCourse === 'All' 
        ? materials 
        : materials.filter(material => material.courseName === selectedCourse);
    
    const materialsByCourse = filteredMaterials.reduce((acc, material) => {
        if (!acc[material.courseName]) {
            acc[material.courseName] = [];
        }
        acc[material.courseName].push(material);
        return acc;
    }, {} as Record<string, BookMaterial[]>);

    const handleDownload = (material: BookMaterial) => {
        if (material.fileUrl) {
            window.open(material.fileUrl, '_blank');
        } else if (material.linkUrl) {
            window.open(material.linkUrl, '_blank');
        }
    };

    return (
        <DashboardHeader 
            userName={user?.name || 'Teacher'} 
            userRole="Teacher"
            pageTitle="Book Materials"
            pageSubtitle="Access teaching materials and resources for your courses"
        >
            <div className="px-6">

            {/* Course Filter */}
            {teacherCourses.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-4 mb-8"
                >
                    <button
                        onClick={() => setSelectedCourse('All')}
                        className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                            selectedCourse === 'All'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                : theme === 'dark'
                                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                        }`}
                    >
                        All Courses ({materials.length})
                    </button>
                    {teacherCourses.map((course, index) => {
                        const courseTheme = getCourseTheme(course, index);
                        const courseMaterials = materials.filter(m => m.courseName === course);
                        return (
                            <button
                                key={course}
                                onClick={() => setSelectedCourse(course)}
                                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                                    selectedCourse === course
                                        ? `bg-gradient-to-r ${courseTheme.gradient} text-white shadow-lg`
                                        : theme === 'dark'
                                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                                }`}
                            >
                                {course} ({courseMaterials.length})
                            </button>
                        );
                    })}
                </motion.div>
            )}

            {/* Materials Content */}
            <motion.section
                ref={materialsRef}
                initial={{ opacity: 0, y: 50 }}
                animate={materialsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1 }}
                className="max-w-7xl mx-auto"
            >
                {Object.keys(materialsByCourse).length > 0 ? (
                    <div className="space-y-12">
                        {Object.entries(materialsByCourse).map(([courseName, courseMaterials], courseIndex) => {
                            const courseTheme = getCourseTheme(courseName, courseIndex);
                            const Icon = getCourseIcon(courseName);
                            
                            return (
                                <motion.div
                                    key={courseName}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={materialsInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.8, delay: courseIndex * 0.1 }}
                                    className={`rounded-3xl p-8 ${courseTheme.bgGradient} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-white/50'} backdrop-blur-sm shadow-xl`}
                                >
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${courseTheme.gradient} flex items-center justify-center shadow-lg`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {courseName}
                                            </h2>
                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {courseMaterials.length} material{courseMaterials.length !== 1 ? 's' : ''} available
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {courseMaterials.map((material, materialIndex) => {
                                            const MaterialIcon = getMaterialIcon(material.type);
                                            
                                            return (
                                                <motion.div
                                                    key={material.id}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={materialsInView ? { opacity: 1, scale: 1 } : {}}
                                                    transition={{ duration: 0.6, delay: (courseIndex * 0.1) + (materialIndex * 0.05) }}
                                                    whileHover={{ scale: 1.02, y: -5 }}
                                                    className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group ${
                                                        theme === 'dark' 
                                                            ? 'bg-gray-800/60 border-gray-600/30' 
                                                            : 'bg-white/80 border-white/70'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${courseTheme.gradient} flex items-center justify-center`}>
                                                                <MaterialIcon className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors`}>
                                                                    {material.title}
                                                                </h3>
                                                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {material.type}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {material.description && (
                                                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                                                            {material.description}
                                                        </p>
                                                    )}
                                                    
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>{new Date(material.uploadedAt).toLocaleDateString()}</span>
                                                        </div>
                                                        
                                                        <motion.button
                                                            onClick={() => handleDownload(material)}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r ${courseTheme.gradient} text-white font-medium shadow-md hover:shadow-lg transition-all duration-300`}
                                                        >
                                                            {material.type === 'Link' ? (
                                                                <>
                                                                    <ExternalLink className="w-4 h-4" />
                                                                    <span>Open</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Download className="w-4 h-4" />
                                                                    <span>Download</span>
                                                                </>
                                                            )}
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
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
                        animate={materialsInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className={`text-center py-16 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <Folder className={`w-20 h-20 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Materials Available
                        </h3>
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} max-w-md mx-auto`}>
                            Book materials for your courses will appear here once they are uploaded by the admin.
                        </p>
                    </motion.div>
                )}
            </motion.section>
            </div>
        </DashboardHeader>
    );
};

export default TeacherBookMaterialsPage;
