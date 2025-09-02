import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import type { User, Event, Notice, CourseTimingSlot } from '../../types';
import { getFamilyStudents, getEvents, getNotices } from '../../api';
import NotificationBell from '../../components/NotificationBell';

const StatCard: React.FC<{ title: string; value: string | number; linkTo: string; bgColor: string; textColor: string }> = ({ title, value, linkTo, bgColor, textColor }) => (
    <Link to={linkTo} className={`block p-6 rounded-xl shadow-md transition-transform hover:-translate-y-1 ${bgColor}`}>
        <h4 className={`text-sm font-medium uppercase ${textColor} opacity-80`}>{title}</h4>
        <p className={`text-3xl font-bold mt-2 ${textColor}`}>{value}</p>
    </Link>
);

const StudentDashboardHomePage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const [family, setFamily] = useState<User[]>([]);
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [familyData, eventsData, noticesData] = await Promise.all([
                    getFamilyStudents(),
                    getEvents(),
                    getNotices(),
                ]);
                setFamily(familyData);
                setRecentEvents(eventsData.slice(0, 3));
                setRecentNotices(noticesData.slice(0, 3));
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const guardianName = user.fatherName || user.name;

    const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

    const onChangePhotoClick = (studentId: string) => {
        const ref = fileInputsRef.current[studentId];
        if (ref) ref.click();
    };

    const onPhotoSelected = (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        // Placeholder: wire to API later
        const file = e.target.files?.[0];
        if (file) {
            // Optimistically preview
            const url = URL.createObjectURL(file);
            setFamily(prev => prev.map(s => s.id === studentId ? { ...s, photoUrl: url } as User : s));
        }
    };

    const formatPreferredTimes = (student: User): CourseTimingSlot[] => {
        const slots = Array.isArray(student.preferredTimings) ? (student.preferredTimings as CourseTimingSlot[]) : [];
        // Limit to first few for compact view
        return slots.slice(0, 6);
    };

    const formatAllocated = (student: User): string[] => {
        const sch = Array.isArray(student.schedules) ? student.schedules : [];
        return sch.slice(0, 4).map(s => `${s.course}: ${s.timing}`);
    };


    if (isLoading) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark-text">Welcome, {guardianName}!</h1>
                    <p className="text-light-text mt-1">{dateString}</p>
                </div>
                 <div className="flex items-center space-x-4">
                    <NotificationBell user={user} />
                    <div className="flex items-center space-x-3">
                        <span className="text-dark-text font-medium">{guardianName}</span>
                        <img src={user.photoUrl || `https://ui-avatars.com/api/?name=${(guardianName || 'User').replace(/\s/g, '+')}&background=7B61FF&color=fff`} alt={guardianName || 'User'} className="w-12 h-12 rounded-full object-cover" />
                    </div>
                </div>
            </div>

            {/* Students Panel Row */}
            <div className={`${family.length <= 1 ? 'justify-start' : 'justify-center'} flex flex-wrap gap-4`}>
                {family.map(stu => {
                    const displayName = stu.name || 'Student';
                    const avatar = stu.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=E5E7EB&color=111827`;
                    const courseList = (stu.courses || []).join(', ');
                    const pref = formatPreferredTimes(stu);
                    const allocated = formatAllocated(stu);
                    return (
                        <div key={stu.id} className="bg-white rounded-xl shadow-md p-4 w-full sm:w-[320px]">
                            <div className="flex items-center gap-3">
                                <img src={avatar} alt={displayName} className="w-14 h-14 rounded-full object-cover border" />
                                <div className="flex-1">
                                    <div className="text-base font-semibold text-dark-text">{displayName}</div>
                                    <div className="text-xs text-light-text truncate">{courseList || 'No courses selected yet'}</div>
                                </div>
                                <div>
                                    <button type="button" onClick={() => onChangePhotoClick(stu.id)} className="text-xs px-2 py-1 rounded-md border bg-white hover:bg-gray-50">Change Photo</button>
                                    <input ref={el => (fileInputsRef.current[stu.id] = el)} onChange={(e) => onPhotoSelected(stu.id, e)} type="file" accept="image/*" className="hidden" />
                                </div>
                            </div>
                            {/* Timings */}
                            <div className="mt-3 space-y-2">
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preferred Times</div>
                                    {pref.length > 0 ? (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {pref.map((slot, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-[11px] text-gray-700 border">
                                                    <span className="font-semibold mr-1">{slot.courseName}:</span>
                                                    {slot.day} {slot.timeSlot}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 mt-1">None selected</div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Allocated</div>
                                    {allocated.length > 0 ? (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {allocated.map((t, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-green-50 text-xs text-green-800 border border-green-200">{t}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 mt-1">No allocations yet</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Enrolled Students" value={family.length} linkTo="family-profile" bgColor="bg-light-purple" textColor="text-brand-purple" />
                <StatCard title="Upcoming Events" value={recentEvents.length} linkTo="events" bgColor="bg-yellow-100" textColor="text-yellow-800" />
                <StatCard title="Recent Notices" value={recentNotices.length} linkTo="notices" bgColor="bg-blue-100" textColor="text-blue-800" />
                <StatCard title="Payment History" value={"View"} linkTo="payment-history" bgColor="bg-green-100" textColor="text-green-800" />
            </div>

            {/* Recent Activity */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Notices */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-dark-text">Recent Notices</h3>
                        <Link to="notices" className="text-sm font-medium text-brand-purple hover:underline">View All</Link>
                    </div>
                    <ul className="space-y-3">
                        {recentNotices.map(notice => (
                            <li key={notice.id} className="p-3 bg-light-purple/50 rounded-lg">
                                <p className="font-semibold text-dark-text">{notice.title}</p>
                                <p className="text-xs text-light-text mt-1">{new Date(notice.issuedAt).toLocaleDateString()}</p>
                            </li>
                        ))}
                         {recentNotices.length === 0 && <p className="text-sm text-light-text">No recent notices.</p>}
                    </ul>
                </div>
                {/* Upcoming Events */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-dark-text">Upcoming Events</h3>
                        <Link to="events" className="text-sm font-medium text-brand-purple hover:underline">View All</Link>
                    </div>
                     <ul className="space-y-3">
                        {recentEvents.map(event => (
                            <li key={event.id} className="p-3 bg-light-purple/50 rounded-lg">
                                <p className="font-semibold text-dark-text">{event.title}</p>
                                <p className="text-xs text-light-text mt-1">{new Date(event.date).toLocaleString()}</p>
                            </li>
                        ))}
                        {recentEvents.length === 0 && <p className="text-sm text-light-text">No upcoming events.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboardHomePage;
