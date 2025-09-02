
import React, { useState, useEffect } from 'react';
import { getFamilyStudents, getStudentEnrollmentsForFamily } from '../../api';
import type { User, StudentEnrollment, CourseTimingSlot } from '../../types';
import AccordionItem from '../../components/AccordionItem';
import { MapPinIcon } from '../../components/icons';

const StudentCoursesPage: React.FC = () => {
    const [family, setFamily] = useState<User[]>([]);
    const [enrollments, setEnrollments] = useState<Map<string, StudentEnrollment[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const familyData = await getFamilyStudents();
                setFamily(familyData);

                const enrollmentPromises = familyData.map(student =>
                    getStudentEnrollmentsForFamily(student.id).then(data => ({ studentId: student.id, data }))
                );
                const results = await Promise.all(enrollmentPromises);
                
                const newEnrollments = new Map<string, StudentEnrollment[]>();
                results.forEach(result => {
                    newEnrollments.set(result.studentId, result.data);
                });
                setEnrollments(newEnrollments);
            } catch (error) {
                console.error("Failed to load family course data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // Helper function to get student's preferred timings for a specific course
    const getPreferredTimingsForCourse = (student: User, courseName: string): CourseTimingSlot[] => {
        if (!Array.isArray(student.preferredTimings)) return [];
        return (student.preferredTimings as CourseTimingSlot[]).filter(
            timing => timing && typeof timing === 'object' && timing.courseName === courseName
        );
    };

    // Helper function to format timing slot for display
    const formatTimingSlot = (timing: CourseTimingSlot): string => {
        return `${timing.day}: ${timing.timeSlot}`;
    };

    // Helper function to check if a preferred timing matches any assigned timing
    const isPreferredTimingMatched = (preferredTiming: CourseTimingSlot, assignedTimings: string[]): boolean => {
        const preferredStr = formatTimingSlot(preferredTiming);
        return assignedTimings.some(assigned => 
            assigned.toLowerCase().includes(preferredTiming.day.toLowerCase()) &&
            assigned.toLowerCase().includes(preferredTiming.timeSlot.toLowerCase())
        );
    };

    if (isLoading) return <div className="p-8 text-center">Loading course information...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8">
             <style>{`
                .badge { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 9999px; }
                .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
                .badge-purple { background-color: #EDE9FE; color: #5B21B6; }
            `}</style>
            <h1 className="text-3xl font-bold text-dark-text mb-6">My Courses</h1>

            <div className="space-y-4">
                {family.map((student, index) => {
                    const studentEnrollments = enrollments.get(student.id) || [];
                    return (
                        <AccordionItem key={student.id} title={student.name} startOpen={index === 0}>
                            {studentEnrollments.length > 0 ? (
                                <div className="space-y-4">
                                    {studentEnrollments.map((enrollment, idx) => {
                                        const preferredTimings = getPreferredTimingsForCourse(student, enrollment.courseName);
                                        
                                        return (
                                            <div key={idx} className="p-6 bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-200 shadow-lg">
                                                {/* Header with course info */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-800 mb-1">{enrollment.courseName}</h3>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-sm font-medium text-gray-600">Batch:</span>
                                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{enrollment.batchName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-sm font-medium text-gray-600">Teacher:</span>
                                                            <span className="text-sm text-gray-700">{enrollment.teacher?.name || 'Not Assigned'}</span>
                                                        </div>
                                                        {enrollment.mode === 'Offline' && enrollment.location && (
                                                            <a 
                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enrollment.location.address)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center space-x-1 text-sm text-purple-700 hover:text-purple-900 hover:underline transition-colors"
                                                            >
                                                                <MapPinIcon className="h-4 w-4" />
                                                                <span>{enrollment.location.name}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                    {enrollment.mode && (
                                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${enrollment.mode === 'Online' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                                            {enrollment.mode}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Timing comparison section */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Preferred Timings */}
                                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Your Preferred Times</h4>
                                                        {preferredTimings.length > 0 ? (
                                                            <ul className="space-y-2">
                                                                {preferredTimings.map((timing, timingIdx) => {
                                                                    const isMatched = isPreferredTimingMatched(timing, enrollment.timings);
                                                                    return (
                                                                        <li key={timingIdx} className={`text-sm flex items-center gap-2 ${isMatched ? 'text-green-700' : 'text-gray-500'}`}>
                                                                            {isMatched ? (
                                                                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                                </svg>
                                                                            )}
                                                                            <span className={isMatched ? '' : 'line-through decoration-2'}>
                                                                                {formatTimingSlot(timing)}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 italic">No preferred times set</p>
                                                        )}
                                                    </div>

                                                    {/* Assigned Timings */}
                                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                                        <h4 className="text-sm font-semibold text-green-800 mb-3 uppercase tracking-wide">Assigned Batch Times</h4>
                                                        {enrollment.timings.length > 0 ? (
                                                            <ul className="space-y-2">
                                                                {enrollment.timings.map((timing, timingIdx) => (
                                                                    <li key={timingIdx} className="text-sm flex items-center gap-2 text-green-700">
                                                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                        </svg>
                                                                        <span className="font-medium">{timing}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 italic">No assigned times yet</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Status indicator */}
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    {preferredTimings.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            {preferredTimings.every(timing => isPreferredTimingMatched(timing, enrollment.timings)) ? (
                                                                <>
                                                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                    </svg>
                                                                    <span className="text-sm font-medium text-green-700">Perfect match! All your preferred times were accommodated.</span>
                                                                </>
                                                            ) : preferredTimings.some(timing => isPreferredTimingMatched(timing, enrollment.timings)) ? (
                                                                <>
                                                                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                                                    </svg>
                                                                    <span className="text-sm font-medium text-yellow-700">Partial match. Some of your preferred times were accommodated.</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                    </svg>
                                                                    <span className="text-sm font-medium text-blue-700">Different schedule assigned based on availability.</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                        </svg>
                                    </div>
                                    <p className="text-lg font-medium text-gray-600 mb-2">No courses enrolled yet</p>
                                    <p className="text-sm text-gray-500">Start your learning journey by enrolling in courses!</p>
                                </div>
                            )}
                        </AccordionItem>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentCoursesPage;
