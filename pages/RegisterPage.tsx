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

    // Auto-select first course for timing when student changes or courses change
    useEffect(() => {
        const currentStudent = students[activeStudentIndex];
        if (currentStudent && currentStudent.courses && currentStudent.courses.length > 0) {
            if (!timingSelectedCourse || !currentStudent.courses.includes(timingSelectedCourse)) {
                setTimingSelectedCourse(currentStudent.courses[0]);
            }
        } else {
            setTimingSelectedCourse(null);
        }
    }, [activeStudentIndex, students, timingSelectedCourse]);

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

    const handleStudentCourseChange = (index: number, courseName: string, isChecked: boolean) => {
        const student = students[index];
        const currentCourses = student.courses || [];
        const updatedCourses = isChecked ? [...currentCourses, courseName] : currentCourses.filter(c => c !== courseName);
        handleStudentDataChange(index, 'courses', updatedCourses);
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
                .course-card { 
                    border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; text-align: center; 
                    transition: all 0.3s; cursor: pointer; background: #fafafa;
                }
                .course-card:hover { border-color: #667eea; background: white; }
                .course-card.selected { border-color: #667eea; background: linear-gradient(135deg, #667eea15, #764ba215); }
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

                            {currentStep === 2 && registrationType === 'student' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Student Details</h3>
                                    
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
                                                    role: UserRole.Student, classPreference: ClassPreference.Online, 
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
                                    {students[activeStudentIndex] && (
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
                                                <div>
                                                    <label className="form-label">Learning Preference</label>
                                                    <select 
                                                        value={students[activeStudentIndex].classPreference} 
                                                        onChange={e => handleStudentDataChange(activeStudentIndex, 'classPreference', e.target.value)} 
                                                        className="form-select"
                                                    >
                                                        <option value={ClassPreference.Online}>Online Classes</option>
                                                        <option value={ClassPreference.Offline}>In-Person Classes</option>
                                                    </select>
                                                </div>
                                                {students[activeStudentIndex].classPreference === ClassPreference.Offline && (
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

                                            <div>
                                                <label className="form-label">Course Selection</label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                                    {courses.map(course => (
                                                        <label key={course.id} className={`course-card ${students[activeStudentIndex].courses?.includes(course.name) ? 'selected' : ''}`}>
                                                            <input 
                                                                type="checkbox" 
                                                                value={course.name} 
                                                                checked={students[activeStudentIndex].courses?.includes(course.name) || false} 
                                                                onChange={(e) => handleStudentCourseChange(activeStudentIndex, course.name, e.target.checked)} 
                                                                className="sr-only"
                                                            />
                                                            <div className="text-sm font-semibold">{course.name}</div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Day Selection and Course Selection for Timing moved to main form */}
                                            {(students[activeStudentIndex].courses?.length || 0) > 0 && (
                                                <div className="space-y-4 mt-6">
                                                    <h4 className="text-sm font-semibold text-gray-800 border-b pb-2">Preferred Class Times (Optional)</h4>
                                                    <p className="text-xs text-gray-600">Help us find the best schedule for you</p>
                                                    
                                                    {/* Course Selection for Timing */}
                                                    <div>
                                                        <label className="form-label">Select course to schedule:</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(students[activeStudentIndex].courses || []).map(course => {
                                                                const courseSlots = (Array.isArray(students[activeStudentIndex].preferredTimings) 
                                                                    ? (students[activeStudentIndex].preferredTimings as CourseTimingSlot[]).filter(t => t && typeof t === 'object' && t.courseName === course)
                                                                    : []);
                                                                return (
                                                                    <button
                                                                        key={course}
                                                                        type="button"
                                                                        onClick={() => setTimingSelectedCourse(course)}
                                                                        className={`px-3 py-2 text-sm font-medium rounded-md border transition-all ${
                                                                            timingSelectedCourse === course 
                                                                                ? 'bg-purple-100 text-purple-800 border-purple-300 ring-2 ring-offset-1 ring-purple-300'
                                                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        {course} ({courseSlots.length}/2)
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Day Selection */}
                                                    <div>
                                                        <label className="form-label">Toggle a day to see available time slots:</label>
                                                        <div className="flex rounded-md shadow-sm">
                                                            {Object.keys(WEEKDAY_MAP).map((dayKey) => (
                                                                <button
                                                                    type="button"
                                                                    key={dayKey}
                                                                    onClick={() => setTimingActiveDay(prev => prev === dayKey ? null : dayKey)}
                                                                    className={`flex-1 px-3 py-2 text-sm font-medium border border-gray-300 -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                                                                        timingActiveDay === dayKey ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    {dayKey}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Timing Selection Component */}
                                                    <div>
                                                        <PreferredTimingSelector 
                                                            selectedCourses={students[activeStudentIndex].courses || []}
                                                            selectedTimings={
                                                                Array.isArray(students[activeStudentIndex].preferredTimings) 
                                                                    ? (students[activeStudentIndex].preferredTimings as CourseTimingSlot[]).filter(t => t && typeof t === 'object')
                                                                    : []
                                                            } 
                                                            onChange={(timings) => handleStudentDataChange(activeStudentIndex, 'preferredTimings', timings)}
                                                            userTimezone={guardianData.timezone}
                                                            showOnlySelections={false}
                                                            activeDay={timingActiveDay}
                                                            selectedCourse={timingSelectedCourse}
                                                            onDayToggle={setTimingActiveDay}
                                                            onCourseChange={setTimingSelectedCourse}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 2 && registrationType === 'teacher' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Professional Details</h3>
                                    
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
                                        <div>
                                            <label className="form-label">Teaching Preference</label>
                                            <select 
                                                name="classPreference" 
                                                value={teacherData.classPreference} 
                                                onChange={handleTeacherChange} 
                                                className="form-select"
                                            >
                                                {Object.values(ClassPreference).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {teacherData.classPreference === ClassPreference.Offline && (
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

                        {/* Right Sidebar */}
                        <div className="w-96 space-y-6">
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
                                            selectedCourses={students[activeStudentIndex].courses || []}
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