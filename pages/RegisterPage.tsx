import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UserRole, Sex, ClassPreference, EmploymentType } from '../types';
import type { User, Course, Location, CourseTimingSlot } from '../types';
import { registerUser, getCourses, checkEmailExists, getPublicLocations } from '../api';
import PreferredTimingSelector from '../components/registration/PreferredTimingSelector';
import { XCircleIcon } from '../components/icons';
import { COUNTRIES, TIMEZONES, WEEKDAY_MAP } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
    Users, BookOpen, Clock, MapPin, Phone, Mail, User as UserIcon,
    ChevronLeft, ChevronRight, Check, X, Eye, EyeOff, ArrowRight,
    Sparkles, Star, Heart, Globe, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import {
  validateFullName,
  validateEmail as validateEmailField,
  validatePassword,
  validatePhoneNumber,
  validateAddress,
  validateCity,
  validateState,
  validatePostalCode,
  validateRegistrationForm,
  type FieldValidationResult
} from '../utils/registrationValidation';

interface RegisterPageProps {
  onLoginNeeded: (email: string) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onLoginNeeded }) => {
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [cardsRef, cardsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [registrationType, setRegistrationType] = useState<'student' | 'teacher' | null>(null);
    const [learningMode, setLearningMode] = useState<'online' | 'inperson' | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [emailValidation, setEmailValidation] = useState<{
        isChecking: boolean;
        isValid: boolean | null;
        message: string | null;
    }>({ isChecking: false, isValid: null, message: null });

    const [timezoneValidation, setTimezoneValidation] = useState<{
        isValid: boolean;
        warning: string;
    }>({ isValid: true, warning: '' });

    // Field validation states
    const [fieldValidations, setFieldValidations] = useState<{
        [key: string]: FieldValidationResult;
    }>({});

    const [showPasswordStrength, setShowPasswordStrength] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    
    // Guardian & Student Form State
    const [guardianData, setGuardianData] = useState({ 
        name: '', email: '', password: '', contactNumber: '',
        address: '', country: '', state: '', city: '', postalCode: '', timezone: '',
    });
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [students, setStudents] = useState<Partial<User>[]>([
        { role: UserRole.Student, classPreference: ClassPreference.Online, sex: Sex.Male, courses: [], preferredTimings: [] as CourseTimingSlot[], photoUrl: '' }
    ]);
    const [activeStudentIndex, setActiveStudentIndex] = useState(0);
    
    // Timing selector state
    const [timingActiveDay, setTimingActiveDay] = useState<string | null>(null);
    const [timingSelectedCourse, setTimingSelectedCourse] = useState<string | null>(null);
    
    // Modal state
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [modalCourse, setModalCourse] = useState<string | null>(null);

    // Teacher Form State
    const [teacherData, setTeacherData] = useState<Partial<User>>({ 
        role: UserRole.Teacher, sex: Sex.Male, employmentType: EmploymentType.PartTime, 
        classPreference: ClassPreference.Hybrid, courseExpertise: [], photoUrl: '', timezone: ''
    });
    const [teacherPasswordConfirmation, setTeacherPasswordConfirmation] = useState('');
    
    const photoInputRef = useRef<HTMLInputElement>(null);
    const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchPrerequisites = async () => {
            setIsLoading(true);
            try {
                const [fetchedCourses, fetchedLocations] = await Promise.all([
                    getCourses(),
                    getPublicLocations(),
                ]);
                setCourses(fetchedCourses);
                setLocations(fetchedLocations);
            } catch (err) {
                setError("Could not load registration data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrerequisites();
    }, []);

    // Helper function to get suggested country based on timezone
    const getSuggestedCountry = (timezone: string): string => {
        const timezoneCountryMap: { [key: string]: string } = {
            'Asia/Kolkata': 'India',
            'Asia/Singapore': 'Singapore',
            'Europe/London': 'United Kingdom',
            'Europe/Berlin': 'Germany',
            'Asia/Dubai': 'United Arab Emirates',
            'Australia/Sydney': 'Australia',
            'America/New_York': 'United States of America',
            'America/Chicago': 'United States of America',
            'America/Denver': 'United States of America',
            'America/Los_Angeles': 'United States of America',
        };
        return timezoneCountryMap[timezone] || '';
    };

    // Helper function to validate country/timezone consistency
    const validateCountryTimezone = (country: string, timezone: string): { isValid: boolean; warning: string } => {
        const expectedCountry = getSuggestedCountry(timezone);

        if (!expectedCountry || !country) {
            return { isValid: true, warning: '' };
        }

        if (country !== expectedCountry) {
            return {
                isValid: false,
                warning: `You selected ${country} but ${timezone.split('/')[1]?.replace('_', ' ')} timezone. Are you currently in ${expectedCountry}?`
            };
        }

        return { isValid: true, warning: '' };
    };

    // Helper function to get validation styling for inputs
    const getValidationStyle = (fieldName: string, theme: string) => {
        const validation = fieldValidations[fieldName];
        if (!validation) return '';

        const baseStyle = theme === 'dark'
            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400'
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white';

        if (validation.isValid === false) {
            return theme === 'dark'
                ? 'bg-red-900/20 border-red-500 text-white placeholder-gray-400 focus:border-red-400'
                : 'bg-red-50 border-red-300 text-gray-900 placeholder-gray-500 focus:border-red-500';
        } else if (validation.isValid === true && !validation.warning) {
            return theme === 'dark'
                ? 'bg-green-900/20 border-green-500 text-white placeholder-gray-400 focus:border-green-400'
                : 'bg-green-50 border-green-300 text-gray-900 placeholder-gray-500 focus:border-green-500';
        }

        return baseStyle;
    };

    // Helper function to render validation message
    const renderValidationMessage = (fieldName: string) => {
        const validation = fieldValidations[fieldName];
        if (!validation || (!validation.error && !validation.warning)) return null;

        return (
            <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-xs mt-1 flex items-center gap-1 ${
                    validation.error ? 'text-red-600' : 'text-amber-600'
                }`}
            >
                {validation.error ? <X className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {validation.error || validation.warning}
            </motion.p>
        );
    };

    // Password strength calculator
    const getPasswordStrength = (password: string) => {
        if (!password) return { score: 0, label: '', color: '' };

        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        score = Object.values(checks).filter(Boolean).length;

        if (score <= 2) return { score, label: 'Weak', color: 'text-red-500' };
        if (score === 3) return { score, label: 'Fair', color: 'text-amber-500' };
        if (score === 4) return { score, label: 'Good', color: 'text-blue-500' };
        return { score, label: 'Strong', color: 'text-green-500' };
    };

    // Auto-select first available course tab when data loads
    useEffect(() => {
        if (!timingSelectedCourse && courses && courses.length > 0) {
            setTimingSelectedCourse(courses[0].name);
        }
    }, [courses, timingSelectedCourse]);

    // Auto-detect timezone based on browser
    useEffect(() => {
        const detectAndSetTimezone = () => {
            try {
                const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                
                // Map detected timezone to our TIMEZONES options
                const matchingTimezone = TIMEZONES.find(tz => tz.value === detectedTimezone);
                
                if (matchingTimezone) {
                    const suggestedCountry = getSuggestedCountry(matchingTimezone.value);
                    
                    // Auto-populate timezone and suggest country for both guardian and teacher
                    setGuardianData(prev => ({ 
                        ...prev, 
                        timezone: matchingTimezone.value,
                        country: suggestedCountry || prev.country
                    }));
                    setTeacherData(prev => ({ 
                        ...prev, 
                        timezone: matchingTimezone.value,
                        country: suggestedCountry || prev.country
                    }));
                } else {
                    // Fallback to IST if exact match not found
                    const fallbackTimezone = 'Asia/Kolkata';
                    setGuardianData(prev => ({ 
                        ...prev, 
                        timezone: fallbackTimezone 
                    }));
                    setTeacherData(prev => ({ 
                        ...prev, 
                        timezone: fallbackTimezone 
                    }));
                }
            } catch (error) {
                // Fallback to IST if detection fails
                const fallbackTimezone = 'Asia/Kolkata';
                setGuardianData(prev => ({ 
                    ...prev, 
                    timezone: fallbackTimezone 
                }));
                setTeacherData(prev => ({ 
                    ...prev, 
                    timezone: fallbackTimezone 
                }));
            }
        };

        detectAndSetTimezone();
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (emailCheckTimeoutRef.current) {
                clearTimeout(emailCheckTimeoutRef.current);
            }
        };
    }, []);

    // Real-time field validation helper
    const validateField = (fieldName: string, value: string, additionalParams?: any) => {
        let validation: FieldValidationResult = { isValid: true };

        switch (fieldName) {
            case 'name':
                validation = validateFullName(value);
                break;
            case 'email':
                validation = validateEmailField(value);
                break;
            case 'password':
                validation = validatePassword(value, additionalParams?.confirmPassword);
                break;
            case 'contactNumber':
                validation = validatePhoneNumber(value, additionalParams?.country);
                break;
            case 'address':
                validation = validateAddress(value);
                break;
            case 'city':
                validation = validateCity(value);
                break;
            case 'state':
                validation = validateState(value);
                break;
            case 'postalCode':
                validation = validatePostalCode(value, additionalParams?.country || '');
                break;
            default:
                break;
        }

        setFieldValidations(prev => ({
            ...prev,
            [fieldName]: validation
        }));

        return validation;
    };

    // Email validation with debouncing
    const validateEmail = async (email: string, isTeacher: boolean = false) => {
        if (!email.trim() || !email.includes('@')) {
            setEmailValidation({ isChecking: false, isValid: null, message: null });
            return;
        }

        setEmailValidation({ isChecking: true, isValid: null, message: 'Checking email...' });

        try {
            const { exists } = await checkEmailExists(email.toLowerCase().trim());
            if (exists) {
                setEmailValidation({
                    isChecking: false,
                    isValid: false,
                    message: 'Email already registered. Please login or use different email.'
                });
            } else {
                setEmailValidation({
                    isChecking: false,
                    isValid: true,
                    message: 'Email is available'
                });
            }
        } catch (error) {
            setEmailValidation({
                isChecking: false,
                isValid: null,
                message: 'Could not verify email. Please try again.'
            });
        }
    };

    // Form handlers with enhanced validation
    const handleGuardianChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newGuardianData = { ...guardianData, [name]: value };
        setGuardianData(newGuardianData);

        // Real-time field validation
        if (['name', 'contactNumber', 'address', 'city', 'state', 'postalCode'].includes(name)) {
            validateField(name, value, {
                country: newGuardianData.country,
                confirmPassword: name === 'password' ? passwordConfirmation : undefined
            });
        }

        // Special handling for password
        if (name === 'password') {
            setShowPasswordStrength(value.length > 0);
            validateField('password', value, { confirmPassword: passwordConfirmation });
        }

        // Email validation (both format and availability)
        if (name === 'email') {
            // First validate format
            validateField('email', value);

            // Then check availability with debouncing
            if (emailCheckTimeoutRef.current) {
                clearTimeout(emailCheckTimeoutRef.current);
            }
            emailCheckTimeoutRef.current = setTimeout(() => {
                validateEmail(value, false);
            }, 1200);
        }

        // Validate country/timezone consistency
        if (name === 'country' || name === 'timezone') {
            const country = name === 'country' ? value : newGuardianData.country;
            const timezone = name === 'timezone' ? value : newGuardianData.timezone;

            if (country && timezone) {
                const validation = validateCountryTimezone(country, timezone);
                setTimezoneValidation(validation);
            }

            // Re-validate postal code when country changes
            if (name === 'country' && newGuardianData.postalCode) {
                validateField('postalCode', newGuardianData.postalCode, { country: value });
            }
        }
    };

    // Password confirmation handler
    const handlePasswordConfirmationChange = (value: string, isTeacher: boolean = false) => {
        if (isTeacher) {
            setTeacherPasswordConfirmation(value);
            if (teacherData.password) {
                validateField('password', teacherData.password, { confirmPassword: value });
            }
        } else {
            setPasswordConfirmation(value);
            if (guardianData.password) {
                validateField('password', guardianData.password, { confirmPassword: value });
            }
        }
    };

    const handleStudentDataChange = (index: number, field: keyof User, value: any) => setStudents(prev => {
        const newStudents = [...prev];
        const student = { ...newStudents[index], [field]: value };
        if (field === 'classPreference' && value === ClassPreference.Online) {
            delete student.locationId;
        }
        newStudents[index] = student;
        
        // Auto-select first course for timing when courses are selected
        if (field === 'courses' && Array.isArray(value) && value.length > 0 && !timingSelectedCourse) {
            setTimingSelectedCourse(value[0]);
        }
        
        return newStudents;
    });

    // Ensure a course exists in student's list when they schedule for it
    const ensureStudentHasCourse = (index: number, courseName: string) => {
        const student = students[index];
        const currentCourses = student.courses || [];
        if (!currentCourses.includes(courseName)) {
            handleStudentDataChange(index, 'courses', [...currentCourses, courseName]);
        }
    };

    const handleTeacherChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newTeacherData = {...teacherData, [name]: value};
        if (name === 'classPreference' && value !== ClassPreference.Offline) {
            delete newTeacherData.locationId;
        }

        // Real-time field validation for teachers
        if (['name', 'contactNumber', 'address', 'city', 'state', 'postalCode'].includes(name)) {
            validateField(name, value, {
                country: newTeacherData.country,
                confirmPassword: name === 'password' ? teacherPasswordConfirmation : undefined
            });
        }

        // Special handling for password
        if (name === 'password') {
            setShowPasswordStrength(value.length > 0);
            validateField('password', value, { confirmPassword: teacherPasswordConfirmation });
        }

        // Validate country/timezone consistency for teachers too
        if (name === 'country' || name === 'timezone') {
            const country = name === 'country' ? value : newTeacherData.country;
            const timezone = name === 'timezone' ? value : newTeacherData.timezone;

            if (country && timezone) {
                const validation = validateCountryTimezone(country, timezone);
                setTimezoneValidation(validation);
            }

            // Re-validate postal code when country changes
            if (name === 'country' && newTeacherData.postalCode) {
                validateField('postalCode', newTeacherData.postalCode, { country: value });
            }
        }

        setTeacherData(newTeacherData);

        // Email validation (both format and availability)
        if (name === 'email') {
            // First validate format
            validateField('email', value);

            // Then check availability with debouncing
            if (emailCheckTimeoutRef.current) {
                clearTimeout(emailCheckTimeoutRef.current);
            }
            emailCheckTimeoutRef.current = setTimeout(() => {
                validateEmail(value, true);
            }, 1200);
        }
    };

    const handleTeacherExpertiseChange = (courseName: string, isChecked: boolean) => {
        const current = teacherData.courseExpertise || [];
        const updated = isChecked ? [...current, courseName] : current.filter(c => c !== courseName);
        setTeacherData(prev => ({...prev, courseExpertise: updated}));
    };

    const validateAndProceed = async () => {
        setError(null);
        const isTeacher = registrationType === 'teacher';
        const data = isTeacher ? teacherData : guardianData;
        const confirmation = isTeacher ? teacherPasswordConfirmation : passwordConfirmation;

        if (!data.name?.trim() || !data.email?.trim() || !data.password || !data.contactNumber?.trim()) {
            return setError("All account details are required.");
        }
        if (data.password.length < 6) return setError("Password must be at least 6 characters long.");
        if (data.password !== confirmation) return setError("Passwords do not match.");
        
        // Check if email validation failed
        if (emailValidation.isValid === false) {
            return setError("Please use a different email address. This email is already registered.");
        }
        
        setIsLoading(true);
        try {
            // Final email check before proceeding
            const { exists } = await checkEmailExists(data.email.toLowerCase());
            if (exists) {
                setError("This email is already registered. Please log in instead.");
                onLoginNeeded(data.email);
            } else {
                setCurrentStep(2);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not verify email.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            let usersToRegister: Partial<User>[] = [];

            if (registrationType === 'student') {
                // Validate all students
                for (let i = 0; i < students.length; i++) {
                    const student = students[i];
                    if (!student.name?.trim() || !student.dob || !student.courses || student.courses.length === 0) {
                        throw new Error(`Please complete all required fields for Student ${i + 1}.`);
                    }
                    if (student.classPreference === ClassPreference.Offline && !student.locationId) {
                         throw new Error(`Please select a location for Student ${i + 1}.`);
                    }
                }

                usersToRegister = students.map((student, index) => ({
                    ...student, 
                    fatherName: guardianData.name, 
                    contactNumber: guardianData.contactNumber,
                    address: guardianData.address,
                    country: guardianData.country,
                    state: guardianData.state,
                    city: guardianData.city,
                    postalCode: guardianData.postalCode,
                    email: index === 0 ? guardianData.email.toLowerCase() : 
                          `${guardianData.email.split('@')[0]}+student${index + 1}@${guardianData.email.split('@')[1]}`.toLowerCase(),
                    password: guardianData.password, 
                    dateOfJoining: new Date().toISOString(),
                }));
            } else if (registrationType === 'teacher') {
                 if (!teacherData.dob || !teacherData.educationalQualifications?.trim() || (teacherData.courseExpertise || []).length === 0) {
                    throw new Error("Please complete your professional details, including DOB, qualifications, and at least one course expertise.");
                }
                if (teacherData.classPreference === ClassPreference.Offline && !teacherData.locationId) {
                    throw new Error("Please select a location for offline classes.");
                }
                usersToRegister.push({ 
                    ...teacherData, 
                    email: teacherData.email!.toLowerCase(), 
                    dateOfJoining: new Date().toISOString() 
                });
            }

            await registerUser(usersToRegister);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not complete registration.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        const loginEmail = registrationType === 'student' ? guardianData.email : teacherData.email || '';
        return (
            <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
                theme === 'dark' 
                    ? 'bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900' 
                    : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
            }`}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-center p-8 rounded-2xl shadow-xl max-w-md backdrop-blur-sm border transition-all duration-300 ${
                        theme === 'dark'
                            ? 'bg-gray-800/90 border-gray-700/50'
                            : 'bg-white/90 border-white/20'
                    }`}
                >
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                            theme === 'dark' ? 'bg-green-800/50' : 'bg-green-100'
                        }`}
                    >
                        <Check className="w-8 h-8 text-green-600" />
                    </motion.div>
                    <h1 className={`text-2xl font-bold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>Welcome to Nadanaloga!</h1>
                    <p className={`mb-6 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Your registration is complete. Ready to begin your artistic journey?</p>
                    <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onLoginNeeded(loginEmail)} 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                    >
                        <span>Login to Your Account</span>
                        <ArrowRight className="w-4 h-4" />
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen py-8 transition-colors duration-300 relative overflow-hidden ${
            theme === 'dark' 
                ? 'bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900' 
                : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
        }`}>
            
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl ${
                        theme === 'dark' 
                            ? 'bg-gradient-to-br from-purple-600 to-pink-600' 
                            : 'bg-gradient-to-br from-purple-200 to-pink-200'
                    }`}
                    animate={{
                        y: [0, -20, 0],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl ${
                        theme === 'dark' 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600' 
                            : 'bg-gradient-to-br from-blue-200 to-indigo-200'
                    }`}
                    animate={{
                        y: [0, 20, 0],
                        rotate: [360, 180, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                {!registrationType ? (
                    <motion.div 
                        ref={heroRef}
                        initial={{ opacity: 0, y: 50 }}
                        animate={heroInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 1 }}
                        className={`rounded-2xl shadow-2xl backdrop-blur-lg border transition-all duration-300 ${
                            theme === 'dark'
                                ? 'bg-gray-800/90 border-gray-700/50'
                                : 'bg-white/90 border-white/20'
                        }`}
                    >
                        <div className="text-center p-4 sm:p-8 border-b border-gray-200 dark:border-gray-700">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent`}
                            >
                                Join Nadanaloga Fine Arts Academy
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                className={`text-sm sm:text-base md:text-lg ${
                                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                }`}
                            >
                                Discover your artistic potential with expert guidance
                            </motion.p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setRegistrationType('student')} 
                                    className={`p-8 text-center rounded-2xl border-2 transition-all duration-300 group ${
                                        theme === 'dark'
                                            ? 'border-gray-600 bg-gray-700/50 hover:border-blue-400 hover:bg-blue-900/20'
                                            : 'border-gray-200 bg-white/80 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 ${
                                        theme === 'dark' ? 'bg-blue-800/50 group-hover:bg-blue-700/70' : 'bg-blue-100 group-hover:bg-blue-200'
                                    }`}>
                                        <BookOpen className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h2 className={`text-xl font-bold mb-2 ${
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>Student & Guardian</h2>
                                    <p className={`text-sm ${
                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                    }`}>Enroll in our arts programs and begin your creative journey</p>
                                </motion.button>
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ duration: 0.6, delay: 0.5 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setRegistrationType('teacher')} 
                                    className={`p-8 text-center rounded-2xl border-2 transition-all duration-300 group ${
                                        theme === 'dark'
                                            ? 'border-gray-600 bg-gray-700/50 hover:border-purple-400 hover:bg-purple-900/20'
                                            : 'border-gray-200 bg-white/80 hover:border-purple-400 hover:bg-purple-50'
                                    }`}
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 ${
                                        theme === 'dark' ? 'bg-purple-800/50 group-hover:bg-purple-700/70' : 'bg-purple-100 group-hover:bg-purple-200'
                                    }`}>
                                        <Users className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h2 className={`text-xl font-bold mb-2 ${
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>Instructor</h2>
                                    <p className={`text-sm ${
                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                    }`}>Join our team of passionate arts educators</p>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                ) : registrationType && !learningMode ? (
                    <motion.div 
                        ref={cardsRef}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className={`rounded-2xl shadow-2xl backdrop-blur-lg border transition-all duration-300 ${
                            theme === 'dark'
                                ? 'bg-gray-800/90 border-gray-700/50'
                                : 'bg-white/90 border-white/20'
                        }`}
                    >
                        <div className="text-center p-8 border-b border-gray-200 dark:border-gray-700">
                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className={`text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent`}
                            >
                                Choose Your {registrationType === 'student' ? 'Learning' : 'Teaching'} Experience
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                className={`text-lg ${
                                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                }`}
                            >
                                {registrationType === 'student' ? 'How would you prefer to attend your arts classes?' : 'How would you prefer to conduct your arts classes?'}
                            </motion.p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setLearningMode('online');
                                        if (registrationType === 'student') {
                                            setStudents([
                                                { role: UserRole.Student, classPreference: ClassPreference.Online, sex: Sex.Male, courses: [], preferredTimings: [] as CourseTimingSlot[], photoUrl: '' }
                                            ]);
                                        } else {
                                            setTeacherData(prev => ({ ...prev, classPreference: ClassPreference.Online }));
                                        }
                                    }} 
                                    className={`p-8 text-center rounded-2xl border-2 transition-all duration-300 group ${
                                        theme === 'dark'
                                            ? 'border-gray-600 bg-gray-700/50 hover:border-green-400 hover:bg-green-900/20'
                                            : 'border-gray-200 bg-white/80 hover:border-green-400 hover:bg-green-50'
                                    }`}
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 ${
                                        theme === 'dark' ? 'bg-green-800/50 group-hover:bg-green-700/70' : 'bg-green-100 group-hover:bg-green-200'
                                    }`}>
                                        <Globe className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h2 className={`text-xl font-bold mb-2 ${
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>Online Classes</h2>
                                    <p className={`text-sm ${
                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                    }`}>{registrationType === 'student' ? 'Learn from anywhere with live virtual sessions and interactive lessons' : 'Teach from anywhere with live virtual sessions and interactive lessons'}</p>
                                </motion.button>
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6, delay: 0.5 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setLearningMode('inperson');
                                        if (registrationType === 'student') {
                                            setStudents([
                                                { role: UserRole.Student, classPreference: ClassPreference.Offline, sex: Sex.Male, courses: [], preferredTimings: [] as CourseTimingSlot[], photoUrl: '' }
                                            ]);
                                        } else {
                                            setTeacherData(prev => ({ ...prev, classPreference: ClassPreference.Offline }));
                                        }
                                    }} 
                                    className={`p-8 text-center rounded-2xl border-2 transition-all duration-300 group ${
                                        theme === 'dark'
                                            ? 'border-gray-600 bg-gray-700/50 hover:border-blue-400 hover:bg-blue-900/20'
                                            : 'border-gray-200 bg-white/80 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 ${
                                        theme === 'dark' ? 'bg-blue-800/50 group-hover:bg-blue-700/70' : 'bg-blue-100 group-hover:bg-blue-200'
                                    }`}>
                                        <MapPin className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h2 className={`text-xl font-bold mb-2 ${
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>In-Person Classes</h2>
                                    <p className={`text-sm ${
                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                    }`}>{registrationType === 'student' ? 'Experience hands-on learning in our beautiful studio spaces with direct guidance' : 'Provide hands-on instruction in our beautiful studio spaces with direct student interaction'}</p>
                                </motion.button>
                            </div>
                            <div className="mt-6 text-center">
                                <motion.button 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.6 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setRegistrationType(null)} 
                                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 border-2 ${
                                        theme === 'dark'
                                            ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                                            : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                    }`}
                                >
                                    <ChevronLeft className="w-4 h-4 inline mr-1" />
                                    Back to Role Selection
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div>
                        {/* Compact Header */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-2xl shadow-lg mb-6 p-6 backdrop-blur-sm border transition-all duration-300 ${
                                theme === 'dark'
                                    ? 'bg-gray-800/80 border-gray-700/50'
                                    : 'bg-white/90 border-white/20'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    </div>
                                    <h1 className={`text-base sm:text-lg md:text-xl font-bold ${
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {registrationType === 'student' ? 'Student Registration' : 'Instructor Application'}
                                    </h1>
                                </div>

                                {/* Compact steps and info */}
                                <div className="flex items-center justify-between sm:gap-3">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all ${
                                            currentStep >= 1 ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>1</div>
                                        <div className={`w-6 sm:w-8 h-0.5 ${currentStep > 1 ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-200'}`}></div>
                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all ${
                                            currentStep >= 2 ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>2</div>
                                    </div>

                                    <div className="text-right ml-3 sm:ml-0">
                                        <div className={`text-xs sm:text-sm font-medium ${
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            <span className="hidden sm:inline">{currentStep === 1 ? (registrationType === 'student' ? 'Guardian Account Details' : 'Your Account Details') : 'Additional Information'}</span>
                                            <span className="sm:hidden">Step {currentStep} of 2</span>
                                        </div>
                                        <div className={`text-[10px] sm:text-xs ${
                                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                        } hidden sm:block`}>Step {currentStep} of 2</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Main Form */}
                            <div className="flex-1 lg:order-1 order-2">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className={`rounded-2xl shadow-2xl backdrop-blur-lg border transition-all duration-300 ${
                                        theme === 'dark'
                                            ? 'bg-gray-800/90 border-gray-700/50'
                                            : 'bg-white/90 border-white/20'
                                    }`}
                                >
                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`mx-6 mt-6 px-4 py-3 rounded-xl text-sm border ${
                                                theme === 'dark'
                                                    ? 'bg-red-900/30 border-red-700/50 text-red-300'
                                                    : 'bg-red-50 border-red-200 text-red-700'
                                            }`}
                                        >
                                            {error}
                                        </motion.div>
                                    )}

                                <form onSubmit={handleSubmit} className="p-6">
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <h3 className={`text-lg font-semibold border-b pb-2 ${
                                        theme === 'dark' 
                                            ? 'text-white border-gray-700' 
                                            : 'text-gray-900 border-gray-200'
                                    }`}>
                                        {registrationType === 'student' ? 'Guardian Account Details' : 'Your Account Details'}
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${
                                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                            }`}>Full Name</label>
                                            <input
                                                name="name"
                                                value={registrationType === 'student' ? guardianData.name : teacherData.name || ''}
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange}
                                                required
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                    getValidationStyle('name', theme) ||
                                                    (theme === 'dark'
                                                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400'
                                                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                                }`}
                                                placeholder="Enter your full name"
                                            />
                                            {renderValidationMessage('name')}
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${
                                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                            }`}>Email Address</label>
                                            <div className="relative">
                                                <input 
                                                    name="email" 
                                                    type="email" 
                                                    value={registrationType === 'student' ? guardianData.email : teacherData.email || ''} 
                                                    onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                    required 
                                                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                        theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'
                                                    } ${
                                                        emailValidation.isValid === false ? 'border-red-500' : 
                                                        emailValidation.isValid === true ? 'border-green-500' : ''
                                                    }`}
                                                    placeholder="your.email@example.com"
                                                />
                                                {emailValidation.isChecking && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                    </div>
                                                )}
                                            </div>
                                            {emailValidation.message && (
                                                <p className={`text-xs mt-1 ${
                                                    emailValidation.isValid === false ? 'text-red-600' : 
                                                    emailValidation.isValid === true ? 'text-green-600' : 'text-gray-500'
                                                }`}>
                                                    {emailValidation.message}
                                                </p>
                                            )}
                                        </motion.div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                                            <div className="relative">
                                                <input
                                                    name="password"
                                                    type={passwordVisible ? "text" : "password"}
                                                    value={registrationType === 'student' ? guardianData.password : teacherData.password || ''}
                                                    onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange}
                                                    required
                                                    className={`w-full px-4 py-3 pr-10 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                        getValidationStyle('password', theme) ||
                                                        (theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                                    }`}
                                                    placeholder="Minimum 6 characters"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setPasswordVisible(!passwordVisible)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {showPasswordStrength && (
                                                <div className="mt-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-gray-500">Password strength:</span>
                                                        <span className={`text-xs font-medium ${getPasswordStrength(registrationType === 'student' ? guardianData.password : teacherData.password || '').color}`}>
                                                            {getPasswordStrength(registrationType === 'student' ? guardianData.password : teacherData.password || '').label}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                                getPasswordStrength(registrationType === 'student' ? guardianData.password : teacherData.password || '').score <= 2 ? 'bg-red-500' :
                                                                getPasswordStrength(registrationType === 'student' ? guardianData.password : teacherData.password || '').score === 3 ? 'bg-amber-500' :
                                                                getPasswordStrength(registrationType === 'student' ? guardianData.password : teacherData.password || '').score === 4 ? 'bg-blue-500' : 'bg-green-500'
                                                            }`}
                                                            style={{ width: `${(getPasswordStrength(registrationType === 'student' ? guardianData.password : teacherData.password || '').score / 5) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                            {renderValidationMessage('password')}
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
                                            <div className="relative">
                                                <input
                                                    type={confirmPasswordVisible ? "text" : "password"}
                                                    value={registrationType === 'student' ? passwordConfirmation : teacherPasswordConfirmation}
                                                    onChange={(e) => handlePasswordConfirmationChange(e.target.value, registrationType === 'teacher')}
                                                    required
                                                    className={`w-full px-4 py-3 pr-10 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                        getValidationStyle('password', theme) ||
                                                        (theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                                    }`}
                                                    placeholder="Re-enter password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {confirmPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {/* Password match indicator */}
                                            {(passwordConfirmation || teacherPasswordConfirmation) && (
                                                <div className="mt-1 flex items-center gap-1">
                                                    {(registrationType === 'student' ? guardianData.password === passwordConfirmation : teacherData.password === teacherPasswordConfirmation) ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                            <span className="text-xs text-green-600">Passwords match</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="w-3 h-3 text-red-500" />
                                                            <span className="text-xs text-red-600">Passwords don't match</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Contact Number</label>
                                            <input
                                                name="contactNumber"
                                                type="tel"
                                                value={registrationType === 'student' ? guardianData.contactNumber : teacherData.contactNumber || ''}
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange}
                                                required
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                    getValidationStyle('contactNumber', theme) ||
                                                    (theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                                }`}
                                                placeholder="+1 234 567 8900"
                                            />
                                            {renderValidationMessage('contactNumber')}
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Country</label>
                                            <select 
                                                name="country" 
                                                value={registrationType === 'student' ? guardianData.country : teacherData.country || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white'}`}
                                            >
                                                <option value="">Select your country</option>
                                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>State/Province</label>
                                            <input
                                                name="state"
                                                value={registrationType === 'student' ? guardianData.state : teacherData.state || ''}
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange}
                                                required
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                    getValidationStyle('state', theme) ||
                                                    (theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                                }`}
                                                placeholder="State/Province"
                                            />
                                            {renderValidationMessage('state')}
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>City</label>
                                            <input
                                                name="city"
                                                value={registrationType === 'student' ? guardianData.city : teacherData.city || ''}
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange}
                                                required
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                    getValidationStyle('city', theme) ||
                                                    (theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                                }`}
                                                placeholder="City"
                                            />
                                            {renderValidationMessage('city')}
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Postal Code</label>
                                            <input
                                                name="postalCode"
                                                value={registrationType === 'student' ? guardianData.postalCode : teacherData.postalCode || ''}
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange}
                                                required
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${
                                                    getValidationStyle('postalCode', theme) ||
                                                    (theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                                }`}
                                                placeholder="12345"
                                            />
                                            {renderValidationMessage('postalCode')}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
                                        <textarea
                                            name="address"
                                            value={registrationType === 'student' ? guardianData.address : teacherData.address || ''}
                                            onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange}
                                            required
                                            className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 resize-none ${
                                                getValidationStyle('address', theme) ||
                                                (theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white')
                                            }`}
                                            rows={3}
                                            placeholder="Enter your complete address"
                                        />
                                        {renderValidationMessage('address')}
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Time Zone</label>
                                        <select 
                                            name="timezone" 
                                            value={registrationType === 'student' ? guardianData.timezone : teacherData.timezone || ''} 
                                            onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                            required 
                                            className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white'}`}
                                        >
                                            <option value="">Select your timezone</option>
                                            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                                        </select>
                                        
                                        {/* Timezone validation warning */}
                                        {timezoneValidation.warning && (
                                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                                                <div className="flex items-start">
                                                    <svg className="h-5 w-5 text-amber-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    <div className="text-sm text-amber-700">
                                                        <p className="font-medium">Timezone Mismatch Detected</p>
                                                        <p className="mt-1">{timezoneValidation.warning}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                registrationType === 'student' && students[activeStudentIndex] ? (
                                <div className="space-y-6">
                                    <div className={`flex items-center justify-between border-b pb-2 ${
                                        theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                                    }`}>
                                        <h3 className={`text-lg font-semibold ${
                                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                                        }`}>Student Details</h3>
                                        <div className="inline-flex items-center gap-2">
                                            <span className={`text-sm ${
                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                            }`}>Learning Mode:</span>
                                            <span className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                                                learningMode === 'online' 
                                                    ? theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                                    : theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {learningMode === 'online' ? 'Online Classes' : 'In-Person Classes'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Student tabs */}
                                    <div className={`flex border-b ${
                                        theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                                    }`}>
                                        {students.map((student, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setActiveStudentIndex(index)}
                                                className={`px-4 py-2 rounded-t-xl text-xs font-semibold cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${activeStudentIndex === index ? 'active' : 'inactive'}`}
                                            >
                                                {student.name || `Student ${index + 1}`}
                                                {students.length > 1 && (
                                                    <span 
                                                        className="ml-2 text-xs opacity-75 hover:opacity-100"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (students.length > 1) {
                                                                const newStudents = students.filter((_, i) => i !== index);
                                                                setStudents(newStudents);
                                                                setActiveStudentIndex(prev => Math.min(prev, newStudents.length - 1));
                                                            }
                                                        }}
                                                    >
                                                        ×
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newStudents = [...students, { 
                                                    role: UserRole.Student, 
                                                    classPreference: learningMode === 'online' ? ClassPreference.Online : ClassPreference.Offline, 
                                                    sex: Sex.Male, courses: [], preferredTimings: [], photoUrl: '' 
                                                }];
                                                setStudents(newStudents);
                                                setActiveStudentIndex(newStudents.length - 1);
                                            }}
                                            className={`px-4 py-2 rounded-t-xl text-xs font-semibold cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} inactive text-blue-600`}
                                        >
                                            + Add Student
                                        </button>
                                    </div>

                                    {/* Current student form */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div>
                                                    <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Student Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={students[activeStudentIndex].name || ''} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'name', e.target.value)} 
                                                        required 
                                                        className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`}
                                                        placeholder="Full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Date of Birth</label>
                                                    <input 
                                                        type="date" 
                                                        value={students[activeStudentIndex].dob || ''} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'dob', e.target.value)} 
                                                        required 
                                                        className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                                                    <select 
                                                        value={students[activeStudentIndex].sex} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'sex', e.target.value)} 
                                                        className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white'}`}
                                                    >
                                                        {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Student Photo Upload */}
                                            <div>
                                                <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Student Photo (Optional)</label>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-center w-full">
                                                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                                            theme === 'dark'
                                                                ? 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50'
                                                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                                        }`}>
                                                            {students[activeStudentIndex].photoUrl ? (
                                                                <div className="relative w-full h-full">
                                                                    <img 
                                                                        src={students[activeStudentIndex].photoUrl} 
                                                                        alt="Student photo preview" 
                                                                        className="w-full h-full object-cover rounded-lg"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                                                        <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity">Click to change</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                    <svg className={`w-8 h-8 mb-4 ${
                                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                                    }`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                                                    </svg>
                                                                    <p className={`mb-2 text-sm ${
                                                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                                                                    }`}><span className="font-semibold">Click to upload</span> student photo</p>
                                                                    <p className={`text-xs ${
                                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                                    }`}>PNG, JPG or JPEG (MAX. 5MB)</p>
                                                                </div>
                                                            )}
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const reader = new FileReader();
                                                                        reader.onload = (e) => {
                                                                            const result = e.target?.result as string;
                                                                            handleStudentDataChange(activeStudentIndex, 'photoUrl', result);
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                    <p className={`text-xs ${
                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Upload a photo for the student profile</p>
                                                </div>
                                            </div>

                                            {learningMode === 'inperson' && (
                                                <div>
                                                    <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Location</label>
                                                    <select 
                                                        value={students[activeStudentIndex].locationId || ''} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'locationId', e.target.value)} 
                                                        required 
                                                        className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white'}`}
                                                    >
                                                        <option value="">Choose location</option>
                                                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Course Selection */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className={`text-lg font-semibold mb-1 ${
                                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                    }`}>Select your Course</h4>
                                                    <p className={`text-sm mb-6 ${
                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>You can select multiple courses</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {courses.map(course => {
                                                        const courseName = course.name;
                                                        const courseSlots = (Array.isArray(students[activeStudentIndex].preferredTimings)
                                                            ? (students[activeStudentIndex].preferredTimings as CourseTimingSlot[]).filter(t => t && typeof t === 'object' && t.courseName === courseName)
                                                            : []);
                                                        const isActive = timingSelectedCourse === courseName;
                                                        const isSelected = (students[activeStudentIndex].courses || []).includes(courseName);
                                                        return (
                                                            <div
                                                                key={course.id}
                                                                className={`relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                                                                    isSelected ? (theme === 'dark' ? 'border-blue-400 bg-blue-900/30 shadow-lg' : 'border-blue-300 bg-blue-50 shadow-lg') : (theme === 'dark' ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md')
                                                                } ${isActive ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
                                                                onClick={() => {
                                                                    // Toggle course selection
                                                                    const currentCourses = students[activeStudentIndex].courses || [];
                                                                    const newCourses = currentCourses.includes(courseName) 
                                                                        ? currentCourses.filter(c => c !== courseName)
                                                                        : [...currentCourses, courseName];
                                                                    handleStudentDataChange(activeStudentIndex, 'courses', newCourses);
                                                                    
                                                                    // Set for timing selection if selected
                                                                    if (!currentCourses.includes(courseName)) {
                                                                        setTimingSelectedCourse(courseName);
                                                                    }
                                                                }}
                                                            >
                                                                {/* Course Image */}
                                                                <div className="aspect-w-16 aspect-h-12 bg-gradient-to-br from-orange-100 via-yellow-50 to-pink-100">
                                                                    {course.image ? (
                                                                        <img 
                                                                            src={course.image} 
                                                                            alt={courseName}
                                                                            className="w-full h-32 object-contain p-4"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex items-center justify-center h-32 p-4">
                                                                            <div className="text-center text-gray-500">
                                                                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                                                </svg>
                                                                                <p className="text-xs font-medium">{courseName}</p>
                                                                                <p className="text-xs text-gray-400">No image uploaded</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Course Content */}
                                                                <div className="p-4">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <h3 className="text-sm font-bold text-gray-900 truncate">{courseName}</h3>
                                                                        {isSelected && (
                                                                            <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                                                </svg>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className={`flex items-center justify-between text-xs ${
                                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                                    }`}>
                                                                        <span>Time Slots: {courseSlots.length}/2</span>
                                                                        <span className={`font-medium ${
                                                                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                                                        }`}>
                                                                            {isSelected ? 'Selected' : 'Select'}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* Time Selection Button - Only show for selected courses */}
                                                                    {isSelected && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setModalCourse(courseName);
                                                                                setTimingSelectedCourse(courseName);
                                                                                setIsTimeModalOpen(true);
                                                                            }}
                                                                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium rounded-md hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                            </svg>
                                                                            Choose Preferred Time
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Gradient Overlay for selected state */}
                                                                {isSelected && (
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"></div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                </div>
                                </div>
                                ) : registrationType === 'teacher' ? (
                                <div className="space-y-6">
                                    <div className={`flex items-center justify-between border-b pb-2 ${
                                        theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                                    }`}>
                                        <h3 className={`text-lg font-semibold ${
                                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                                        }`}>Professional Details</h3>
                                        <div className="inline-flex items-center gap-2">
                                            <span className={`text-sm ${
                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                            }`}>Teaching Mode:</span>
                                            <span className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                                                learningMode === 'online' 
                                                    ? theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                                    : theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {learningMode === 'online' ? 'Online Classes' : 'In-Person Classes'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Date of Birth</label>
                                            <input 
                                                name="dob" 
                                                type="date" 
                                                value={teacherData.dob || ''} 
                                                onChange={handleTeacherChange} 
                                                required 
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                                            <select 
                                                name="sex" 
                                                value={teacherData.sex} 
                                                onChange={handleTeacherChange} 
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white'}`}
                                            >
                                                {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Employment Type</label>
                                            <select 
                                                name="employmentType" 
                                                value={teacherData.employmentType} 
                                                onChange={handleTeacherChange} 
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white'}`}
                                            >
                                                {Object.values(EmploymentType).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Years of Experience</label>
                                            <input 
                                                name="yearsOfExperience" 
                                                type="number" 
                                                min="0"
                                                max="50"
                                                value={teacherData.yearsOfExperience || ''} 
                                                onChange={handleTeacherChange} 
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`}
                                                placeholder="e.g., 5"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Alternate Contact Number</label>
                                            <input 
                                                name="alternateContactNumber" 
                                                type="tel" 
                                                value={teacherData.alternateContactNumber || ''} 
                                                onChange={handleTeacherChange} 
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`}
                                                placeholder="+1 234 567 8901 (Optional)"
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Profile Photo (Optional)</label>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-center w-full">
                                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                                        theme === 'dark'
                                                            ? 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50'
                                                            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                                    }`}>
                                                        {teacherData.photoUrl ? (
                                                            <div className="relative w-full h-full">
                                                                <img 
                                                                    src={teacherData.photoUrl} 
                                                                    alt="Profile preview" 
                                                                    className="w-full h-full object-cover rounded-lg"
                                                                />
                                                                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                                                    <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity">Click to change</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                <svg className={`w-8 h-8 mb-4 ${
                                                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                                }`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                                                </svg>
                                                                <p className={`mb-2 text-sm ${
                                                                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                                                                }`}><span className="font-semibold">Click to upload</span> profile photo</p>
                                                                <p className={`text-xs ${
                                                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                                }`}>PNG, JPG or JPEG (MAX. 5MB)</p>
                                                            </div>
                                                        )}
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (e) => {
                                                                        const result = e.target?.result as string;
                                                                        setTeacherData({...teacherData, photoUrl: result});
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <p className={`text-xs ${
                                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                }`}>Upload a professional photo for your instructor profile</p>
                                            </div>
                                        </div>
                                    </div>

                                    {learningMode === 'inperson' && (
                                        <div>
                                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Preferred Location</label>
                                            <select 
                                                name="locationId" 
                                                value={teacherData.locationId || ''} 
                                                onChange={handleTeacherChange} 
                                                required 
                                                className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500 focus:bg-white'}`}
                                            >
                                                <option value="">Select location</option>
                                                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Educational Qualifications</label>
                                        <input 
                                            name="educationalQualifications" 
                                            value={teacherData.educationalQualifications || ''} 
                                            onChange={handleTeacherChange} 
                                            required 
                                            className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-300 focus:ring-4 focus:ring-indigo-500/30 ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`}
                                            placeholder="e.g., Master's in Fine Arts, Bachelor's in Music"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className={`text-lg font-semibold mb-1 ${
                                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                                            }`}>Course Expertise</h4>
                                            <p className={`text-sm mb-6 ${
                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                            }`}>Select your areas of expertise (you can choose multiple courses)</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {courses.map(course => {
                                                const courseName = course.name;
                                                const courseSlots = (Array.isArray(teacherData.availableTimeSlots)
                                                    ? (teacherData.availableTimeSlots as CourseTimingSlot[]).filter(t => t && typeof t === 'object' && t.courseName === courseName)
                                                    : []);
                                                const isSelected = (teacherData.courseExpertise || []).includes(courseName);
                                                return (
                                                    <div
                                                        key={course.id}
                                                        className={`relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                                                            isSelected ? (theme === 'dark' ? 'border-blue-400 bg-blue-900/30 shadow-lg' : 'border-blue-300 bg-blue-50 shadow-lg') : (theme === 'dark' ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md')
                                                        }`}
                                                        onClick={() => handleTeacherExpertiseChange(courseName, !isSelected)}
                                                    >
                                                        {/* Course Image */}
                                                        <div className="aspect-w-16 aspect-h-12 bg-gradient-to-br from-orange-100 via-yellow-50 to-pink-100">
                                                            {course.image ? (
                                                                <img 
                                                                    src={course.image} 
                                                                    alt={courseName}
                                                                    className="w-full h-32 object-contain p-4"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-32 p-4">
                                                                    <div className="text-center text-gray-500">
                                                                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                                        </svg>
                                                                        <p className="text-xs font-medium">{courseName}</p>
                                                                        <p className="text-xs text-gray-400">No image uploaded</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Course Content */}
                                                        <div className="p-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h3 className="text-sm font-bold text-gray-900 truncate">{courseName}</h3>
                                                                {isSelected && (
                                                                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className={`flex items-center justify-between text-xs ${
                                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                            }`}>
                                                                <span>Time Slots: {courseSlots.length}</span>
                                                                <span className={`font-medium ${
                                                                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                                                }`}>
                                                                    {isSelected ? 'Selected' : 'Select'}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Time Selection Button - Only show for selected courses */}
                                                            {isSelected && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setModalCourse(courseName);
                                                                        setTimingSelectedCourse(courseName);
                                                                        setIsTimeModalOpen(true);
                                                                    }}
                                                                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium rounded-md hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                    </svg>
                                                                    Set Available Hours
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Gradient Overlay for selected state */}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"></div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                                ) : null
                            )}

                            {/* Form Actions */}
                            <div className={`flex justify-between items-center pt-8 border-t ${
                                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                                <div className="flex space-x-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setRegistrationType(null)} 
                                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 border-2 ${
                                            theme === 'dark' 
                                                ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50' 
                                                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        ← Back to Selection
                                    </button>
                                    {currentStep > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => setCurrentStep(prev => prev - 1)} 
                                            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 border-2 ${
                                            theme === 'dark' 
                                                ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50' 
                                                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                        >
                                            Previous
                                        </button>
                                    )}
                                </div>

                                {currentStep === 1 ? (
                                    <button 
                                        type="button" 
                                        onClick={validateAndProceed} 
                                        disabled={isLoading} 
                                        className="px-8 py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isLoading ? 'Verifying...' : (
                                            <>
                                                Next 
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button 
                                        type="submit" 
                                        disabled={isLoading} 
                                        className="px-8 py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isLoading ? 'Creating Account...' : (
                                            <>
                                                Complete Registration
                                                <Check className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                        </motion.div>
                        </div>

                        {/* Time Selection Modal */}
                        {isTimeModalOpen && modalCourse && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                                <div className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-lg border transition-all duration-300 ${
                                    theme === 'dark'
                                        ? 'bg-gray-800/90 border-gray-700/50'
                                        : 'bg-white/90 border-white/20'
                                }`}>
                                    {/* Modal Header */}
                                    <div className={`sticky top-0 border-b px-6 py-4 rounded-t-2xl ${
                                        theme === 'dark'
                                            ? 'bg-gray-800/95 border-gray-700'
                                            : 'bg-white/95 border-gray-200'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className={`text-xl font-bold ${
                                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                    }`}>
                                                        {registrationType === 'student' ? 'Choose Preferred Times' : 'Set Available Hours'}
                                                    </h3>
                                                    <p className={`text-sm ${
                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        {modalCourse} - {registrationType === 'student' ? 'Select your preferred class schedule' : 'Set your teaching availability'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsTimeModalOpen(false);
                                                    setModalCourse(null);
                                                }}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                            theme === 'dark'
                                                ? 'bg-gray-700 hover:bg-gray-600'
                                                : 'bg-gray-100 hover:bg-gray-200'
                                        }`}
                                            >
                                                <svg className={`w-5 h-5 ${
                                                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modal Content */}
                                    <div className="p-6 space-y-6">
                                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                <span className="font-semibold text-gray-900">
                                                    {registrationType === 'student' ? 'Class Schedule Information' : 'Instructor Availability'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 mb-1">
                                                {registrationType === 'student' 
                                                    ? 'Each course requires 2 time slots (1 hour × 2 days per week)'
                                                    : 'Select your available teaching hours for this course'
                                                }
                                            </p>
                                            <p className={`text-xs ${
                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                            }`}>
                                                Times shown in your timezone ({(registrationType === 'student' ? guardianData.timezone : teacherData.timezone) || 'Kolkata'}) with IST reference
                                            </p>
                                        </div>

                                        {/* Day Selection */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                {registrationType === 'student' 
                                                    ? 'Select a day to see available time slots:'
                                                    : 'Select days when you are available to teach:'
                                                }
                                            </label>
                                            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                                {Object.keys(WEEKDAY_MAP).map((dayKey) => (
                                                    <button
                                                        type="button"
                                                        key={dayKey}
                                                        onClick={() => setTimingActiveDay(prev => prev === dayKey ? null : dayKey)}
                                                        className={`px-1 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                                                            timingActiveDay === dayKey
                                                                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-lg'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        <div className="text-center">
                                                            <div className="font-bold">{dayKey}</div>
                                                            <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1 hidden sm:block">{WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP]}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Timing Selection Component */}
                                        <div className="min-h-[300px]">
                                            {registrationType === 'student' ? (
                                                <PreferredTimingSelector 
                                                    selectedCourses={courses.map(c => c.name) || []}
                                                    selectedTimings={
                                                        Array.isArray(students[activeStudentIndex].preferredTimings) 
                                                            ? (students[activeStudentIndex].preferredTimings as CourseTimingSlot[]).filter(t => t && typeof t === 'object')
                                                            : []
                                                    } 
                                                    onChange={(timings) => handleStudentDataChange(activeStudentIndex, 'preferredTimings', timings)}
                                                    userTimezone={guardianData.timezone}
                                                    showOnlySelections={false}
                                                    activeDay={timingActiveDay}
                                                    selectedCourse={modalCourse}
                                                    onDayToggle={setTimingActiveDay}
                                                    onCourseChange={setTimingSelectedCourse}
                                                />
                                            ) : (
                                                <PreferredTimingSelector 
                                                    selectedCourses={courses.map(c => c.name) || []}
                                                    selectedTimings={
                                                        Array.isArray(teacherData.availableTimeSlots) 
                                                            ? (teacherData.availableTimeSlots as CourseTimingSlot[]).filter(t => t && typeof t === 'object')
                                                            : []
                                                    } 
                                                    onChange={(timings) => setTeacherData({...teacherData, availableTimeSlots: timings})}
                                                    userTimezone={teacherData.timezone || 'Asia/Kolkata'}
                                                    showOnlySelections={false}
                                                    activeDay={timingActiveDay}
                                                    selectedCourse={modalCourse}
                                                    onDayToggle={setTimingActiveDay}
                                                    onCourseChange={setTimingSelectedCourse}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className={`sticky bottom-0 px-6 py-4 rounded-b-2xl border-t ${
                                        theme === 'dark'
                                            ? 'bg-gray-800 border-gray-700'
                                            : 'bg-gray-50 border-gray-200'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className={`text-sm ${
                                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                            }`}>
                                                Selected: {
                                                    registrationType === 'student' ? (
                                                        Array.isArray(students[activeStudentIndex].preferredTimings) 
                                                            ? (students[activeStudentIndex].preferredTimings as CourseTimingSlot[])
                                                                .filter(t => t && typeof t === 'object' && t.courseName === modalCourse).length
                                                            : 0
                                                    ) : (
                                                        Array.isArray(teacherData.availableTimeSlots) 
                                                            ? (teacherData.availableTimeSlots as CourseTimingSlot[])
                                                                .filter(t => t && typeof t === 'object' && t.courseName === modalCourse).length
                                                            : 0
                                                    )
                                                }{registrationType === 'student' ? '/2' : ''} time slots for {modalCourse}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsTimeModalOpen(false);
                                                    setModalCourse(null);
                                                    setTimingActiveDay(null);
                                                }}
                                                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Right Sidebar */}
                        <div className="w-full lg:w-96 lg:order-2 order-1 space-y-6">
                            <div className={`rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-300 ${
                                    theme === 'dark'
                                        ? 'bg-gray-800/90 border-gray-700/50'
                                        : 'bg-white/90 border-white/20'
                                }`}>
                                <div className={`p-4 border-b ${
                                    theme === 'dark' 
                                        ? 'bg-gradient-to-r from-green-900/30 to-teal-900/30 border-gray-700'
                                        : 'bg-gradient-to-r from-green-50 to-teal-50 border-gray-200'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                            theme === 'dark' ? 'bg-green-800/50' : 'bg-green-100'
                                        }`}>
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </div>
                                        <h3 className={`font-semibold text-sm ${
                                            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                                        }`}>Registration Progress</h3>
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className={currentStep >= 1 
                                            ? theme === 'dark' ? 'text-green-400 font-medium' : 'text-green-700 font-medium'
                                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                        }>
                                            {registrationType === 'student' ? 'Guardian Details' : 'Your Account Details'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className={currentStep >= 2 
                                            ? theme === 'dark' ? 'text-green-400 font-medium' : 'text-green-700 font-medium'
                                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                        }>
                                            {registrationType === 'student' ? 'Student Information' : 'Professional Details'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {((registrationType === 'student' && currentStep === 2 && students[activeStudentIndex] && (students[activeStudentIndex].courses?.length || 0) > 0) || 
                              (registrationType === 'teacher' && currentStep === 2 && (teacherData.courseExpertise?.length || 0) > 0)) && (
                                <div className={`rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-300 ${
                                    theme === 'dark'
                                        ? 'bg-gray-800/90 border-gray-700/50'
                                        : 'bg-white/90 border-white/20'
                                }`}>
                                    <div className={`p-4 border-b ${
                                        theme === 'dark'
                                            ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-gray-700'
                                            : 'bg-gradient-to-r from-purple-50 to-blue-50 border-gray-200'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                theme === 'dark' ? 'bg-purple-800/50' : 'bg-purple-100'
                                            }`}>
                                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                            <h3 className={`font-semibold text-sm ${
                                                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                                            }`}>
                                                {registrationType === 'student' ? 'Schedule Selection' : 'Availability Schedule'}
                                            </h3>
                                        </div>
                                        <p className={`text-xs mt-1 ${
                                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                            {registrationType === 'student' ? 'Choose your preferred class times' : 'Set your teaching availability'}
                                        </p>
                                    </div>
                                    <div className="p-4">
                                        {registrationType === 'student' ? (
                                            <PreferredTimingSelector 
                                                selectedCourses={courses.map(c => c.name) || []}
                                                selectedTimings={
                                                    Array.isArray(students[activeStudentIndex].preferredTimings) 
                                                        ? (students[activeStudentIndex].preferredTimings as CourseTimingSlot[]).filter(t => t && typeof t === 'object')
                                                        : []
                                                } 
                                                onChange={(timings) => handleStudentDataChange(activeStudentIndex, 'preferredTimings', timings)}
                                                userTimezone={guardianData.timezone}
                                                showOnlySelections={true}
                                            />
                                        ) : (
                                            <PreferredTimingSelector 
                                                selectedCourses={teacherData.courseExpertise || []}
                                                selectedTimings={
                                                    Array.isArray(teacherData.availableTimeSlots) 
                                                        ? (teacherData.availableTimeSlots as CourseTimingSlot[]).filter(t => t && typeof t === 'object')
                                                        : []
                                                } 
                                                onChange={(timings) => setTeacherData({...teacherData, availableTimeSlots: timings})}
                                                userTimezone={teacherData.timezone || 'Asia/Kolkata'}
                                                showOnlySelections={true}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className={`rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-300 ${
                                    theme === 'dark'
                                        ? 'bg-gray-800/90 border-gray-700/50'
                                        : 'bg-white/90 border-white/20'
                                }`}>
                                <div className={`p-4 border-b ${
                                    theme === 'dark'
                                        ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-gray-700'
                                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                            theme === 'dark' ? 'bg-blue-800/50' : 'bg-blue-100'
                                        }`}>
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </div>
                                        <h3 className={`font-semibold text-sm ${
                                            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                                        }`}>Need Help?</h3>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2">
                                    <p className={`text-xs ${
                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        {registrationType === 'student' 
                                            ? 'Having trouble with student registration?' 
                                            : 'Having trouble with instructor application?'
                                        }
                                    </p>
                                    <button type="button" className={`text-xs font-medium transition-colors ${
                                        theme === 'dark' 
                                            ? 'text-blue-400 hover:text-blue-300'
                                            : 'text-blue-600 hover:text-blue-800'
                                    }`}>Contact Support</button>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                )}

                <div className="text-center mt-8">
                    <Link to="/login" className={`text-sm font-medium transition-colors ${
                        theme === 'dark'
                            ? 'text-gray-400 hover:text-blue-400'
                            : 'text-gray-600 hover:text-blue-600'
                    }`}>
                        Already have an account? Sign in here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
