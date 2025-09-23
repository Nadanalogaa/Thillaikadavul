import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useOutletContext } from 'react-router-dom';
import { 
    User, 
    Calendar, 
    MapPin, 
    School, 
    Clock, 
    BookOpen, 
    GraduationCap,
    Edit3,
    Star,
    Award,
    CheckCircle,
    Heart,
    Music,
    Palette,
    Calculator,
    Briefcase,
    Phone,
    Mail,
    Globe,
    Save,
    X
} from 'lucide-react';
import type { User as UserType, Course } from '../../types';
import { Sex, ClassPreference, EmploymentType } from '../../types';
import { updateUserProfile, getCourses, refreshCurrentUser } from '../../api';
import { COUNTRIES } from '../../constants';
import { useTheme } from '../../contexts/ThemeContext';

const InfoField: React.FC<{ 
    label: string; 
    value?: string | null; 
    icon: React.ElementType;
    delay: number;
    onClick?: () => void;
}> = ({ label, value, icon: Icon, delay, onClick }) => {
    const [fieldRef, fieldInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const { theme } = useTheme();
    
    return (
        <motion.div
            ref={fieldRef}
            initial={{ opacity: 0, y: 20 }}
            animate={fieldInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay }}
            onClick={onClick}
            className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-purple-200/50'} backdrop-blur-sm group hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-102' : ''}`}
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

const TeacherProfilePage: React.FC = () => {
    const { user, onUpdate } = useOutletContext<{ user: UserType; onUpdate: (user: UserType) => void }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [profileRef, profileInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [formData, setFormData] = useState<Partial<UserType>>({});
    const [courses, setCourses] = useState<Course[]>([]);
    const [isCoursesLoading, setIsCoursesLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const loadUserData = async () => {
            // Wait for user to be available with ID
            if (user?.id) {
                // Refresh user data to ensure we have latest from database
                console.log('Refreshing user data on profile page load...');
                const refreshedUser = await refreshCurrentUser();
                const currentUser = refreshedUser || user;
                
                setFormData({
                    ...currentUser,
                    dob: currentUser.dob ? currentUser.dob.split('T')[0] : '', // Format for date input
                    courseExpertise: currentUser.courseExpertise || [],
                });
                
                if (refreshedUser) {
                    console.log('Profile page user data refreshed');
                }
            }
        };
        loadUserData();
    }, [user?.id]); // Only re-run when user ID changes

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setIsCoursesLoading(true);
                const fetchedCourses = await getCourses();
                setCourses(fetchedCourses);
            } catch (err) {
                console.error("Failed to load courses for dashboard", err);
            } finally {
                setIsCoursesLoading(false);
            }
        };
        fetchCourses();
    }, []); // Courses don't depend on user, run once
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCourseExpertiseChange = (courseName: string) => {
        const currentExpertise = formData.courseExpertise || [];
        setFormData({
            ...formData,
            courseExpertise: currentExpertise.includes(courseName)
                ? currentExpertise.filter(c => c !== courseName)
                : [...currentExpertise, courseName]
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const updatedUser = await updateUserProfile(formData as UserType);
            setSuccess('Profile updated successfully!');
            onUpdate(updatedUser);
            setIsEditing(false);
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const cancelEdit = () => {
        // Reset form data to original user data
        setFormData({
            ...user,
            dob: user.dob ? user.dob.split('T')[0] : '',
            courseExpertise: user.courseExpertise || [],
        });
        setIsEditing(false);
        setError(null);
        setSuccess(null);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
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
                <motion.div
                    ref={profileRef}
                    initial={{ opacity: 0, y: 50 }}
                    animate={profileInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`rounded-3xl shadow-2xl border backdrop-blur-sm overflow-hidden ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-purple-200/50'
                    }`}
                >
                    {/* Profile Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <img 
                                        src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Teacher')}&background=7B61FF&color=fff&size=128`} 
                                        alt={user.name} 
                                        className="w-20 h-20 rounded-full object-cover border-4 border-purple-300 dark:border-purple-600 shadow-lg"
                                    />
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 border-3 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                        {user.name}
                                    </h2>
                                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
                                        {user.email}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-full">
                                            Teacher
                                        </span>
                                        {user.employmentType && (
                                            <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-full">
                                                {user.employmentType}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsEditing(!isEditing)}
                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                            >
                                <Edit3 className="w-4 h-4" />
                                <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Profile Content */}
                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {isEditing ? (
                                // Edit Mode
                                <motion.form
                                    key="edit-form"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                                        >
                                            <p className="text-red-600 dark:text-red-400">{error}</p>
                                        </motion.div>
                                    )}

                                    {success && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                                        >
                                            <p className="text-green-600 dark:text-green-400">{success}</p>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Personal Information */}
                                        <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-purple-200/50'}`}>
                                            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Personal Information</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Full Name</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name || ''}
                                                        onChange={handleChange}
                                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Date of Birth</label>
                                                    <input
                                                        type="date"
                                                        name="dob"
                                                        value={formData.dob || ''}
                                                        onChange={handleChange}
                                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Gender</label>
                                                    <select
                                                        name="sex"
                                                        value={formData.sex || ''}
                                                        onChange={handleChange}
                                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                    >
                                                        <option value="">Select Gender</option>
                                                        {Object.values(Sex).map(sex => (
                                                            <option key={sex} value={sex}>{sex}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Information */}
                                        <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-blue-200/50'}`}>
                                            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Contact Information</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Contact Number</label>
                                                    <input
                                                        type="tel"
                                                        name="contactNumber"
                                                        value={formData.contactNumber || ''}
                                                        onChange={handleChange}
                                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Address</label>
                                                    <textarea
                                                        name="address"
                                                        value={formData.address || ''}
                                                        onChange={handleChange}
                                                        rows={3}
                                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Country</label>
                                                    <select
                                                        name="country"
                                                        value={formData.country || ''}
                                                        onChange={handleChange}
                                                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                    >
                                                        <option value="">Select Country</option>
                                                        {COUNTRIES.map(country => (
                                                            <option key={country} value={country}>{country}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Information */}
                                    <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-green-50 to-emerald-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-green-200/50'}`}>
                                        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Professional Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Employment Type</label>
                                                <select
                                                    name="employmentType"
                                                    value={formData.employmentType || ''}
                                                    onChange={handleChange}
                                                    className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                >
                                                    <option value="">Select Employment Type</option>
                                                    {Object.values(EmploymentType).map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Years of Experience</label>
                                                <input
                                                    type="number"
                                                    name="yearsOfExperience"
                                                    value={formData.yearsOfExperience || ''}
                                                    onChange={handleChange}
                                                    min="0"
                                                    className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Educational Qualifications</label>
                                                <textarea
                                                    name="educationalQualifications"
                                                    value={formData.educationalQualifications || ''}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Course Expertise */}
                                    <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-amber-50 to-yellow-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-amber-200/50'}`}>
                                        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Course Expertise</h3>
                                        {isCoursesLoading ? (
                                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading courses...</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-3">
                                                {courses.map(course => {
                                                    const isSelected = (formData.courseExpertise || []).includes(course.name);
                                                    const Icon = getCourseIcon(course.name);
                                                    return (
                                                        <motion.button
                                                            key={course.id}
                                                            type="button"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleCourseExpertiseChange(course.name)}
                                                            className={`flex items-center space-x-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                                                                isSelected 
                                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-600 shadow-lg' 
                                                                    : theme === 'dark'
                                                                        ? 'bg-gray-600 text-gray-300 border-gray-500 hover:border-purple-500'
                                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                                                            }`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                            <span className="font-medium">{course.name}</span>
                                                            {isSelected && <CheckCircle className="w-4 h-4" />}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end space-x-4">
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={cancelEdit}
                                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl border-2 font-semibold transition-all duration-300 ${
                                                theme === 'dark' 
                                                    ? 'bg-gray-600 text-gray-300 border-gray-500 hover:bg-gray-500' 
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Cancel</span>
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            disabled={isLoading}
                                            whileHover={{ scale: isLoading ? 1 : 1.05 }}
                                            whileTap={{ scale: isLoading ? 1 : 0.95 }}
                                            className={`flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 ${
                                                isLoading ? 'opacity-75 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <Save className="w-4 h-4" />
                                            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                                        </motion.button>
                                    </div>
                                </motion.form>
                            ) : (
                                // View Mode
                                <motion.div
                                    key="view-mode"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    {/* Personal Information Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <InfoField 
                                            label="Date of Birth" 
                                            value={user.dob ? new Date(user.dob).toLocaleDateString() : null} 
                                            icon={Calendar} 
                                            delay={0.1} 
                                        />
                                        <InfoField label="Gender" value={user.sex} icon={User} delay={0.2} />
                                        <InfoField label="Contact Number" value={user.contactNumber} icon={Phone} delay={0.3} />
                                        <InfoField label="Email" value={user.email} icon={Mail} delay={0.4} />
                                        <InfoField label="Country" value={user.country} icon={Globe} delay={0.5} />
                                        <InfoField label="Employment Type" value={user.employmentType} icon={Briefcase} delay={0.6} />
                                        <InfoField 
                                            label="Years of Experience" 
                                            value={user.yearsOfExperience ? `${user.yearsOfExperience} years` : null} 
                                            icon={Award} 
                                            delay={0.7} 
                                        />
                                        <InfoField 
                                            label="Date of Joining" 
                                            value={user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString() : null} 
                                            icon={Calendar} 
                                            delay={0.8} 
                                        />
                                    </div>

                                    {/* Address */}
                                    {user.address && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={profileInView ? { opacity: 1, y: 0 } : {}}
                                            transition={{ duration: 0.8, delay: 0.9 }}
                                            className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-blue-200/50'} backdrop-blur-sm`}
                                        >
                                            <div className="flex items-center space-x-3 mb-4">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                                    <MapPin className="w-5 h-5 text-white" />
                                                </div>
                                                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    Address
                                                </h3>
                                            </div>
                                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                                                {user.address}
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Educational Qualifications */}
                                    {user.educationalQualifications && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={profileInView ? { opacity: 1, y: 0 } : {}}
                                            transition={{ duration: 0.8, delay: 1.0 }}
                                            className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-green-50 to-emerald-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-green-200/50'} backdrop-blur-sm`}
                                        >
                                            <div className="flex items-center space-x-3 mb-4">
                                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                                                    <GraduationCap className="w-5 h-5 text-white" />
                                                </div>
                                                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    Educational Qualifications
                                                </h3>
                                            </div>
                                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                                                {user.educationalQualifications}
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Course Expertise */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={profileInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ duration: 0.8, delay: 1.1 }}
                                        className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-purple-200/50'} backdrop-blur-sm`}
                                    >
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                                <BookOpen className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                Course Expertise
                                            </h3>
                                        </div>
                                        {user.courseExpertise && user.courseExpertise.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {user.courseExpertise.map((course, idx) => {
                                                    const Icon = getCourseIcon(course);
                                                    return (
                                                        <motion.div
                                                            key={course}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={profileInView ? { opacity: 1, scale: 1 } : {}}
                                                            transition={{ duration: 0.5, delay: 1.2 + idx * 0.1 }}
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
                                                No course expertise set. Contact admin to set up your teaching areas.
                                            </p>
                                        )}
                                    </motion.div>

                                    {/* Available Time Slots */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={profileInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ duration: 0.8, delay: 1.3 }}
                                        className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-amber-50 to-orange-50'} border ${theme === 'dark' ? 'border-gray-600/30' : 'border-amber-200/50'} backdrop-blur-sm`}
                                    >
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                Available Time Slots
                                            </h3>
                                        </div>
                                        {user.availableTimeSlots && user.availableTimeSlots.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {user.availableTimeSlots.map((timing, index) => {
                                                    const timingText = typeof timing === 'string' ? timing : `${timing.day}: ${timing.timeSlot}`;
                                                    return (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={profileInView ? { opacity: 1, scale: 1 } : {}}
                                                            transition={{ duration: 0.5, delay: 1.4 + index * 0.1 }}
                                                            whileHover={{ scale: 1.05 }}
                                                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                                                        >
                                                            <span className="font-medium text-sm">{timingText}</span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} italic`}>
                                                No available time slots set. Contact admin to set up your schedule preferences.
                                            </p>
                                        )}
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TeacherProfilePage;