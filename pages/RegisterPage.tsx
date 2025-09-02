import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UserRole, Sex, ClassPreference, EmploymentType } from '../types';
import type { User, Course, Location, CourseTimingSlot } from '../types';
import { registerUser, getCourses, checkEmailExists, getPublicLocations } from '../api';
import PreferredTimingSelector from '../components/registration/PreferredTimingSelector';
import { XCircleIcon } from '../components/icons';
import { COUNTRIES, TIMEZONES, WEEKDAY_MAP } from '../constants';

interface RegisterPageProps {
  onLoginNeeded: (email: string) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onLoginNeeded }) => {
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

    // Form handlers (keeping existing logic but simplified)
    const handleGuardianChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newGuardianData = { ...guardianData, [name]: value };
        setGuardianData(newGuardianData);
        
        // Validate country/timezone consistency
        if (name === 'country' || name === 'timezone') {
            const country = name === 'country' ? value : newGuardianData.country;
            const timezone = name === 'timezone' ? value : newGuardianData.timezone;
            
            if (country && timezone) {
                const validation = validateCountryTimezone(country, timezone);
                setTimezoneValidation(validation);
            }
        }
        
        // Debounced email validation
        if (name === 'email') {
            if (emailCheckTimeoutRef.current) {
                clearTimeout(emailCheckTimeoutRef.current);
            }
            emailCheckTimeoutRef.current = setTimeout(() => {
                validateEmail(value, false);
            }, 500);
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
        
        // Validate country/timezone consistency for teachers too
        if (name === 'country' || name === 'timezone') {
            const country = name === 'country' ? value : newTeacherData.country;
            const timezone = name === 'timezone' ? value : newTeacherData.timezone;
            
            if (country && timezone) {
                const validation = validateCountryTimezone(country, timezone);
                setTimezoneValidation(validation);
            }
        }
        
        setTeacherData(newTeacherData);
        
        // Debounced email validation for teachers
        if (name === 'email') {
            if (emailCheckTimeoutRef.current) {
                clearTimeout(emailCheckTimeoutRef.current);
            }
            emailCheckTimeoutRef.current = setTimeout(() => {
                validateEmail(value, true);
            }, 500);
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Nadanaloga!</h1>
                    <p className="text-gray-600 mb-6">Your registration is complete. Ready to begin your artistic journey?</p>
                    <button 
                        onClick={() => onLoginNeeded(loginEmail)} 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
                    >
                        Login to Your Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
            {/* Modern CSS-in-JS styles */}
            <style>{`
                .form-card { background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
                .form-input, .form-select, .form-textarea { 
                    width: 100%; padding: 0.65rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; 
                    font-size: 0.875rem; font-weight: 500; transition: all 0.2s; background: #fafafa;
                }
                .form-input:focus, .form-select:focus, .form-textarea:focus { 
                    border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); outline: none; background: white;
                }
                .form-label { display: block; font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px; }
                .btn-primary { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem;
                    border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.15); }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
                .btn-secondary { 
                    background: white; color: #6b7280; padding: 0.75rem 1.5rem; border: 2px solid #e5e7eb; 
                    border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.3s;
                }
                .btn-secondary:hover { border-color: #d1d5db; background: #f9fafb; }
                .course-tile { 
                    border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;
                    transition: all 0.3s ease; cursor: pointer; background: white;
                    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
                }
                .course-tile:hover { 
                    border-color: #d1d5db; transform: translateY(-2px); 
                    box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.15);
                }
                .course-tile.selected { 
                    border-color: #93c5fd; background: #eff6ff;
                    box-shadow: 0 4px 14px -3px rgba(59, 130, 246, 0.2);
                }
                .course-tile.active { 
                    border-color: #60a5fa; 
                    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
                }
                .student-tab { 
                    padding: 0.5rem 1rem; border-radius: 6px 6px 0 0; font-size: 0.75rem; font-weight: 600; 
                    cursor: pointer; transition: all 0.2s; margin-right: 0.25rem;
                }
                .student-tab.active { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
                .student-tab.inactive { background: #f3f4f6; color: #6b7280; }
                .student-tab.inactive:hover { background: #e5e7eb; }
                .registration-type-card { 
                    border: 2px solid #e5e7eb; border-radius: 12px; padding: 2rem; text-align: center; 
                    transition: all 0.3s; cursor: pointer; background: white;
                }
                .registration-type-card:hover { 
                    border-color: #667eea; transform: translateY(-2px); 
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .error-alert { 
                    background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; 
                    padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; margin: 1rem 0;
                }
            `}</style>

            <div className="container mx-auto px-4 max-w-7xl">
                {!registrationType ? (
                    <div className="form-card">
                        <div className="form-header">
                            <h1 className="text-2xl font-bold mb-2">Join Nadanaloga Fine Arts Academy</h1>
                            <p className="opacity-90">Discover your artistic potential with expert guidance</p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button 
                                    onClick={() => setRegistrationType('student')} 
                                    className="registration-type-card"
                                >
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">Student & Guardian</h2>
                                    <p className="text-gray-600 text-sm">Enroll in our arts programs and begin your creative journey</p>
                                </button>
                                <button 
                                    onClick={() => setRegistrationType('teacher')} 
                                    className="registration-type-card"
                                >
                                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 6V8a2 2 0 00-2-2H10a2 2 0 00-2 2v8a2 2 0 002 2h4a2 2 0 002-2v-2"></path>
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">Instructor</h2>
                                    <p className="text-gray-600 text-sm">Join our team of passionate arts educators</p>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : registrationType && !learningMode ? (
                    <div className="form-card">
                        <div className="form-header">
                            <h1 className="text-2xl font-bold mb-2">Choose Your {registrationType === 'student' ? 'Learning' : 'Teaching'} Experience</h1>
                            <p className="opacity-90">{registrationType === 'student' ? 'How would you prefer to attend your arts classes?' : 'How would you prefer to conduct your arts classes?'}</p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button 
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
                                    className="registration-type-card"
                                >
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">Online Classes</h2>
                                    <p className="text-gray-600 text-sm">{registrationType === 'student' ? 'Learn from anywhere with live virtual sessions and interactive lessons' : 'Teach from anywhere with live virtual sessions and interactive lessons'}</p>
                                </button>
                                <button 
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
                                    className="registration-type-card"
                                >
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">In-Person Classes</h2>
                                    <p className="text-gray-600 text-sm">{registrationType === 'student' ? 'Experience hands-on learning in our beautiful studio spaces with direct guidance' : 'Provide hands-on instruction in our beautiful studio spaces with direct student interaction'}</p>
                                </button>
                            </div>
                            <div className="mt-6 text-center">
                                <button 
                                    onClick={() => setRegistrationType(null)} 
                                    className="btn-secondary"
                                >
                                    ← Back to Role Selection
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Compact Header */}
                        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 2L13 7l5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1z"/>
                                        </svg>
                                    </div>
                                    <h1 className="text-lg font-bold text-gray-900">
                                        {registrationType === 'student' ? 'Student Registration' : 'Instructor Application'}
                                    </h1>
                                </div>
                                
                                {/* Cute compact steps in center */}
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                        currentStep >= 1 ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>1</div>
                                    <div className={`w-8 h-0.5 ${currentStep > 1 ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-200'}`}></div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                        currentStep >= 2 ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>2</div>
                                </div>
                                
                                <div className="text-right">
                                    <div className="text-sm font-medium text-gray-700">
                                        {currentStep === 1 ? (registrationType === 'student' ? 'Guardian Account Details' : 'Your Account Details') : 'Additional Information'}
                                    </div>
                                    <div className="text-xs text-gray-500">Step {currentStep} of 2</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            {/* Main Form */}
                            <div className="flex-1">
                                <div className="form-card">
                                    {error && <div className="error-alert mx-6 mt-6">{error}</div>}

                                <form onSubmit={handleSubmit} className="p-6">
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                        {registrationType === 'student' ? 'Guardian Account Details' : 'Your Account Details'}
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">Full Name</label>
                                            <input 
                                                name="name" 
                                                value={registrationType === 'student' ? guardianData.name : teacherData.name || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className="form-input"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Email Address</label>
                                            <div className="relative">
                                                <input 
                                                    name="email" 
                                                    type="email" 
                                                    value={registrationType === 'student' ? guardianData.email : teacherData.email || ''} 
                                                    onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                    required 
                                                    className={`form-input ${
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
                                        </div>
                                        <div>
                                            <label className="form-label">Password</label>
                                            <input 
                                                name="password" 
                                                type="password" 
                                                value={registrationType === 'student' ? guardianData.password : teacherData.password || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className="form-input"
                                                placeholder="Minimum 6 characters"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Confirm Password</label>
                                            <input 
                                                type="password" 
                                                value={registrationType === 'student' ? passwordConfirmation : teacherPasswordConfirmation} 
                                                onChange={(e) => registrationType === 'student' ? setPasswordConfirmation(e.target.value) : setTeacherPasswordConfirmation(e.target.value)} 
                                                required 
                                                className="form-input"
                                                placeholder="Re-enter password"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Contact Number</label>
                                            <input 
                                                name="contactNumber" 
                                                type="tel" 
                                                value={registrationType === 'student' ? guardianData.contactNumber : teacherData.contactNumber || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className="form-input"
                                                placeholder="+1 234 567 8900"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Country</label>
                                            <select 
                                                name="country" 
                                                value={registrationType === 'student' ? guardianData.country : teacherData.country || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className="form-select"
                                            >
                                                <option value="">Select your country</option>
                                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="form-label">State/Province</label>
                                            <input 
                                                name="state" 
                                                value={registrationType === 'student' ? guardianData.state : teacherData.state || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className="form-input"
                                                placeholder="State/Province"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">City</label>
                                            <input 
                                                name="city" 
                                                value={registrationType === 'student' ? guardianData.city : teacherData.city || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className="form-input"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Postal Code</label>
                                            <input 
                                                name="postalCode" 
                                                value={registrationType === 'student' ? guardianData.postalCode : teacherData.postalCode || ''} 
                                                onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                                required 
                                                className="form-input"
                                                placeholder="12345"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="form-label">Address</label>
                                        <textarea 
                                            name="address" 
                                            value={registrationType === 'student' ? guardianData.address : teacherData.address || ''} 
                                            onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                            required 
                                            className="form-textarea" 
                                            rows={3}
                                            placeholder="Enter your complete address"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Time Zone</label>
                                        <select 
                                            name="timezone" 
                                            value={registrationType === 'student' ? guardianData.timezone : teacherData.timezone || ''} 
                                            onChange={registrationType === 'student' ? handleGuardianChange : handleTeacherChange} 
                                            required 
                                            className="form-select"
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

                            {currentStep === 2 && registrationType === 'student' && students[activeStudentIndex] && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
                                        <div className="inline-flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Learning Mode:</span>
                                            <span className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                                                learningMode === 'online' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {learningMode === 'online' ? 'Online Classes' : 'In-Person Classes'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Student tabs */}
                                    <div className="flex border-b">
                                        {students.map((student, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setActiveStudentIndex(index)}
                                                className={`student-tab ${activeStudentIndex === index ? 'active' : 'inactive'}`}
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
                                            className="student-tab inactive text-blue-600"
                                        >
                                            + Add Student
                                        </button>
                                    </div>

                                    {/* Current student form */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="form-label">Student Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={students[activeStudentIndex].name || ''} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'name', e.target.value)} 
                                                        required 
                                                        className="form-input"
                                                        placeholder="Full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label">Date of Birth</label>
                                                    <input 
                                                        type="date" 
                                                        value={students[activeStudentIndex].dob || ''} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'dob', e.target.value)} 
                                                        required 
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label">Gender</label>
                                                    <select 
                                                        value={students[activeStudentIndex].sex} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'sex', e.target.value)} 
                                                        className="form-select"
                                                    >
                                                        {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                {learningMode === 'inperson' && (
                                                    <div>
                                                        <label className="form-label">Location</label>
                                                        <select 
                                                            value={students[activeStudentIndex].locationId || ''} 
                                                            onChange={e => handleStudentDataChange(activeStudentIndex, 'locationId', e.target.value)} 
                                                            required 
                                                            className="form-select"
                                                        >
                                                            <option value="">Choose location</option>
                                                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Course Selection */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Select your Course</h4>
                                                    <p className="text-sm text-gray-600 mb-6">You can select multiple courses</p>
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
                                                                    isSelected ? 'border-blue-300 bg-blue-50 shadow-lg' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
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
                                                                    <img 
                                                                        src={course.image || "/images/Barathanatyam.png"} 
                                                                        alt={courseName}
                                                                        className="w-full h-32 object-contain p-4"
                                                                    />
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
                                                                    
                                                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                                                        <span>Time Slots: {courseSlots.length}/2</span>
                                                                        <span className="text-blue-600 font-medium">
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
                            )}

                            {currentStep === 2 && registrationType === 'teacher' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">Professional Details</h3>
                                        <div className="inline-flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Teaching Mode:</span>
                                            <span className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                                                learningMode === 'online' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {learningMode === 'online' ? 'Online Classes' : 'In-Person Classes'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">Date of Birth</label>
                                            <input 
                                                name="dob" 
                                                type="date" 
                                                value={teacherData.dob || ''} 
                                                onChange={handleTeacherChange} 
                                                required 
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Gender</label>
                                            <select 
                                                name="sex" 
                                                value={teacherData.sex} 
                                                onChange={handleTeacherChange} 
                                                className="form-select"
                                            >
                                                {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Employment Type</label>
                                            <select 
                                                name="employmentType" 
                                                value={teacherData.employmentType} 
                                                onChange={handleTeacherChange} 
                                                className="form-select"
                                            >
                                                {Object.values(EmploymentType).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {learningMode === 'inperson' && (
                                        <div>
                                            <label className="form-label">Preferred Location</label>
                                            <select 
                                                name="locationId" 
                                                value={teacherData.locationId || ''} 
                                                onChange={handleTeacherChange} 
                                                required 
                                                className="form-select"
                                            >
                                                <option value="">Select location</option>
                                                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="form-label">Educational Qualifications</label>
                                        <input 
                                            name="educationalQualifications" 
                                            value={teacherData.educationalQualifications || ''} 
                                            onChange={handleTeacherChange} 
                                            required 
                                            className="form-input"
                                            placeholder="e.g., Master's in Fine Arts, Bachelor's in Music"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Course Expertise</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                            {courses.map(course => (
                                                <label key={course.id} className={`course-card ${teacherData.courseExpertise?.includes(course.name) ? 'selected' : ''}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        value={course.name} 
                                                        checked={teacherData.courseExpertise?.includes(course.name) || false} 
                                                        onChange={(e) => handleTeacherExpertiseChange(course.name, e.target.checked)} 
                                                        className="sr-only"
                                                    />
                                                    <div className="text-sm font-semibold">{course.name}</div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex justify-between items-center pt-8 border-t">
                                <div className="flex space-x-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setRegistrationType(null)} 
                                        className="btn-secondary"
                                    >
                                        ← Back to Selection
                                    </button>
                                    {currentStep > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => setCurrentStep(prev => prev - 1)} 
                                            className="btn-secondary"
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
                                        className="btn-primary"
                                    >
                                        {isLoading ? 'Verifying...' : 'Next →'}
                                    </button>
                                ) : (
                                    <button 
                                        type="submit" 
                                        disabled={isLoading} 
                                        className="btn-primary bg-gradient-to-r from-green-500 to-green-600"
                                    >
                                        {isLoading ? 'Creating Account...' : 'Complete Registration'}
                                    </button>
                                )}
                            </div>
                        </form>
                        </div>
                        </div>

                        {/* Time Selection Modal */}
                        {isTimeModalOpen && modalCourse && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                                    {/* Modal Header */}
                                    <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Choose Preferred Times</h3>
                                                    <p className="text-sm text-gray-600">{modalCourse} - Select your preferred class schedule</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsTimeModalOpen(false);
                                                    setModalCourse(null);
                                                }}
                                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                            >
                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                                <span className="font-semibold text-gray-900">Class Schedule Information</span>
                                            </div>
                                            <p className="text-sm text-gray-700 mb-1">Each course requires 2 time slots (1 hour × 2 days per week)</p>
                                            <p className="text-xs text-gray-600">Times shown in your timezone ({guardianData.timezone || 'Kolkata'}) with IST reference</p>
                                        </div>

                                        {/* Day Selection */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                Select a day to see available time slots:
                                            </label>
                                            <div className="grid grid-cols-7 gap-2">
                                                {Object.keys(WEEKDAY_MAP).map((dayKey) => (
                                                    <button
                                                        type="button"
                                                        key={dayKey}
                                                        onClick={() => setTimingActiveDay(prev => prev === dayKey ? null : dayKey)}
                                                        className={`px-3 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                                                            timingActiveDay === dayKey 
                                                                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-lg' 
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        <div className="text-center">
                                                            <div className="font-bold">{dayKey}</div>
                                                            <div className="text-xs opacity-75 mt-1">{WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP]}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Timing Selection Component */}
                                        <div className="min-h-[300px]">
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
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-600">
                                                Selected: {
                                                    Array.isArray(students[activeStudentIndex].preferredTimings) 
                                                        ? (students[activeStudentIndex].preferredTimings as CourseTimingSlot[])
                                                            .filter(t => t && typeof t === 'object' && t.courseName === modalCourse).length
                                                        : 0
                                                }/2 time slots for {modalCourse}
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
                        <div className="w-96 space-y-6">
                            {registrationType === 'student' && (
                                <div className="form-card">
                                    <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 border-b">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-gray-800 text-sm">Registration Progress</h3>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={currentStep >= 1 ? 'text-green-700 font-medium' : 'text-gray-500'}>Guardian Details</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className={currentStep >= 2 ? 'text-green-700 font-medium' : 'text-gray-500'}>Student Information</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {registrationType === 'student' && currentStep === 2 && students[activeStudentIndex] && (students[activeStudentIndex].courses?.length || 0) > 0 && (
                                <div className="form-card">
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-gray-800 text-sm">Schedule Selection</h3>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">Choose your preferred class times</p>
                                    </div>
                                    <div className="p-4">
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
                                    </div>
                                </div>
                            )}

                            <div className="form-card">
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </div>
                                        <h3 className="font-semibold text-gray-800 text-sm">Need Help?</h3>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2">
                                    <p className="text-xs text-gray-600">Having trouble with registration?</p>
                                    <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Contact Support</button>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                )}

                <div className="text-center mt-8">
                    <Link to="/login" className="text-sm text-gray-600 hover:text-blue-600 font-medium">
                        Already have an account? Sign in here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
