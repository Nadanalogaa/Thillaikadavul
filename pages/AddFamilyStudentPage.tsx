import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import type { User, Course, Location, CourseTimingSlot } from '../types';
import { Sex, ClassPreference, UserRole } from '../types';
import { registerUser, getCourses, getFamilyStudents, getPublicLocations } from '../api';
import PreferredTimingSelector from '../components/registration/PreferredTimingSelector';
import { XCircleIcon } from '../components/icons';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import { WEEKDAY_MAP } from '../constants';

const AddFamilyStudentPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>(); // The guardian
    const [studentData, setStudentData] = useState<Partial<User>>({
        classPreference: ClassPreference.Online,
        sex: Sex.Male,
        courses: [],
        preferredTimings: [] as CourseTimingSlot[],
        photoUrl: '',
        name: '',
        dob: ''
    });
    const [guardianPassword, setGuardianPassword] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    
    // Modal state for timing selection
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [modalCourse, setModalCourse] = useState<string | null>(null);
    const [timingActiveDay, setTimingActiveDay] = useState<string | null>(null);
    const [timingSelectedCourse, setTimingSelectedCourse] = useState<string | null>(null);

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
                setError("Could not load course data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrerequisites();
    }, []);
    
    // Auto-select first available course tab when data loads
    useEffect(() => {
        if (!timingSelectedCourse && courses && courses.length > 0) {
            setTimingSelectedCourse(courses[0].name);
        }
    }, [courses, timingSelectedCourse]);

    const handleChange = (field: keyof User, value: any) => {
        setStudentData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'classPreference' && value === ClassPreference.Online) {
                delete newData.locationId;
            }
            return newData;
        });
    };

    const handleCourseChange = (courseName: string, isChecked: boolean) => {
        const currentCourses = studentData.courses || [];
        const updatedCourses = isChecked
            ? [...currentCourses, courseName]
            : currentCourses.filter(c => c !== courseName);
        handleChange('courses', updatedCourses);
        
        // Auto-select first course for timing when courses are selected
        if (isChecked && !timingSelectedCourse) {
            setTimingSelectedCourse(courseName);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('photoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        handleChange('photoUrl', '');
         if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!studentData.name?.trim() || !studentData.dob) {
            setError("Student's name and date of birth are required.");
            return;
        }
        if (!guardianPassword) {
            setError("Please enter your password to confirm this action.");
            return;
        }
        if (studentData.classPreference === ClassPreference.Offline && !studentData.locationId) {
            setError("Please select a location for offline classes.");
            return;
        }


        setIsLoading(true);
        try {
            const familyStudents = await getFamilyStudents();
            const guardian = user;
            const baseEmailParts = guardian.email.split('@');
            const baseUsername = baseEmailParts[0].split('+')[0];
            const domain = baseEmailParts[1];

            const newStudentEmail = `${baseUsername}+student${familyStudents.length + 1}@${domain}`.toLowerCase();

            const userToRegister = {
                ...studentData,
                fatherName: guardian.name,
                contactNumber: guardian.contactNumber,
                email: newStudentEmail,
                password: guardianPassword,
                dateOfJoining: new Date().toISOString(),
                role: UserRole.Student,
            };

            await registerUser([userToRegister]);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while adding the student.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container mx-auto px-6 py-16 text-center">
                <h1 className="text-3xl font-bold text-green-600">Student Added Successfully!</h1>
                <p className="mt-4 text-lg text-gray-700">The new student has been added to your family account.</p>
                <Link
                    to="/dashboard/student"
                    className="mt-8 inline-block bg-brand-primary text-white font-semibold px-8 py-3 rounded-full shadow-md hover:bg-brand-dark transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 py-12">
            <style>{`
                .form-legend { font-size: 1.125rem; font-weight: 600; color: #1a237e; margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e0e0e0; }
                .form-input, .form-select { 
                    width: 100%; padding: 0.65rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; 
                    font-size: 0.875rem; font-weight: 500; transition: all 0.2s; background: #fafafa;
                }
                .form-input:focus, .form-select:focus { 
                    border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); outline: none; background: white;
                }
                .form-label { display: block; font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px; }
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
            `}</style>
            <div className="container mx-auto px-6">
                <div className="max-w-5xl mx-auto">
                    <AdminPageHeader
                        title="Add New Student"
                        subtitle={`Registering under ${user.name}'s family account.`}
                        backLinkPath="/dashboard/student"
                        backTooltipText="Back to Family Dashboard"
                    />
                    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-2xl">
                        {error && <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md my-4">{error}</div>}
                        
                        <fieldset>
                            <legend className="form-legend">Student Details</legend>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5">
                                <div className="lg:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                        <div><label className="form-label">Student's Full Name</label><input type="text" value={studentData.name || ''} onChange={e => handleChange('name', e.target.value)} required className="form-input"/></div>
                                        <div><label className="form-label">Date of Birth</label><input type="date" value={studentData.dob || ''} onChange={e => handleChange('dob', e.target.value)} required className="form-input"/></div>
                                        <div><label className="form-label">Gender</label><select value={studentData.sex} onChange={e => handleChange('sex', e.target.value)} className="form-select">{Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    </div>
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="form-label text-center">Profile Photo (Optional)</label>
                                    <div className="flex flex-col items-center">
                                        <div className="relative group w-32 h-32 bg-brand-light/30 rounded-full flex items-center justify-center overflow-hidden">
                                            <img src={studentData.photoUrl || `https://ui-avatars.com/api/?name=${studentData.name || '?'}&background=e8eaf6&color=1a237e&size=128&font-size=0.5`} alt="Profile Preview" className="w-full h-full object-cover"/>
                                            {studentData.photoUrl && <button type="button" onClick={handleRemovePhoto} className="absolute top-1 right-1 bg-white/70 text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white" aria-label="Remove photo"><XCircleIcon /></button>}
                                        </div>
                                        <input type="file" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" accept="image/png, image/jpeg"/>
                                        <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-2 text-sm text-brand-primary hover:underline">Upload Photo</button>
                                    </div>
                                </div>
                                <div className="lg:col-span-3">
                                    <label className="form-label">Class Preference</label>
                                    <div className="grid grid-cols-2 gap-2 max-w-xs">
                                        <button type="button" onClick={() => handleChange('classPreference', ClassPreference.Online)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors border ${studentData.classPreference === ClassPreference.Online ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>Online</button>
                                        <button type="button" onClick={() => handleChange('classPreference', ClassPreference.Offline)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors border ${studentData.classPreference === ClassPreference.Offline ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>Offline</button>
                                    </div>
                                </div>
                                 {studentData.classPreference === ClassPreference.Offline && (
                                    <div className="lg:col-span-3">
                                        <label className="form-label">Location</label>
                                        <select
                                            value={studentData.locationId || ''}
                                            onChange={e => handleChange('locationId', e.target.value)}
                                            required
                                            className="form-select w-full max-w-xs"
                                        >
                                            <option value="" disabled>Select a location</option>
                                            {locations.map(loc => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="lg:col-span-3 space-y-4">
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-1">Select your Course</h4>
                                        <p className="text-sm text-gray-600 mb-6">You can select multiple courses</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {courses.map(course => {
                                            const courseName = course.name;
                                            const courseSlots = (Array.isArray(studentData.preferredTimings)
                                                ? (studentData.preferredTimings as CourseTimingSlot[]).filter(t => t && typeof t === 'object' && t.courseName === courseName)
                                                : []);
                                            const isActive = timingSelectedCourse === courseName;
                                            const isSelected = (studentData.courses || []).includes(courseName);
                                            return (
                                                <div
                                                    key={course.id}
                                                    className={`relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                                                        isSelected ? 'border-blue-300 bg-blue-50 shadow-lg' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                                    } ${isActive ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
                                                    onClick={() => {
                                                        // Toggle course selection
                                                        const currentCourses = studentData.courses || [];
                                                        const newCourses = currentCourses.includes(courseName) 
                                                            ? currentCourses.filter(c => c !== courseName)
                                                            : [...currentCourses, courseName];
                                                        handleChange('courses', newCourses);
                                                        
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
                        </fieldset>

                        <fieldset className="mt-6 pt-6 border-t">
                            <legend className="form-legend">Confirm Action</legend>
                            <div>
                                <label className="form-label">Enter Your Password</label>
                                <p className="text-sm text-gray-500 mb-2">For security, please confirm your account password to add a new student.</p>
                                <input type="password" value={guardianPassword} onChange={e => setGuardianPassword(e.target.value)} required className="form-input max-w-sm" />
                            </div>
                        </fieldset>
                        
                        <div className="pt-6 mt-6 border-t flex justify-end items-center">
                            <button type="button" onClick={() => navigate('/dashboard/student')} disabled={isLoading} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold px-6 py-3 rounded-md shadow-sm transition-colors border mr-4">
                                Cancel
                            </button>
                            <button type="submit" disabled={isLoading} className="inline-flex justify-center py-3 px-8 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-indigo-400">
                                {isLoading ? 'Adding Student...' : 'Add Student'}
                            </button>
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
                                            <p className="text-xs text-gray-600">Times shown in your timezone ({user.timezone || 'Kolkata'}) with IST reference</p>
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
                                                    Array.isArray(studentData.preferredTimings) 
                                                        ? (studentData.preferredTimings as CourseTimingSlot[]).filter(t => t && typeof t === 'object')
                                                        : []
                                                } 
                                                onChange={(timings) => handleChange('preferredTimings', timings)}
                                                userTimezone={user.timezone}
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
                                                    Array.isArray(studentData.preferredTimings) 
                                                        ? (studentData.preferredTimings as CourseTimingSlot[])
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
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddFamilyStudentPage;