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
    const [activeIdx, setActiveIdx] = useState(0);
    const [mediaIndex, setMediaIndex] = useState(0);

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

    // Helpers to group timings by course
    const groupPreferredByCourse = (student: User): Record<string, CourseTimingSlot[]> => {
        const map: Record<string, CourseTimingSlot[]> = {};
        (Array.isArray(student.preferredTimings) ? (student.preferredTimings as CourseTimingSlot[]) : []).forEach(s => {
            if (!s || typeof s !== 'object') return;
            map[s.courseName] = map[s.courseName] || [];
            map[s.courseName].push(s);
        });
        return map;
    };

    const groupAllocatedByCourse = (student: User): Record<string, string[]> => {
        const map: Record<string, string[]> = {};
        (Array.isArray(student.schedules) ? student.schedules : []).forEach(s => {
            map[s.course] = map[s.course] || [];
            map[s.course].push(s.timing);
        });
        return map;
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

            {/* Student Tabs Timeline */}
            <div className="flex items-center justify-between">
                <div />
                <Link to="add" className="text-brand-purple font-semibold hover:underline">Add Students</Link>
            </div>
            <div className="relative pt-0 -mt-2">
                {/* timeline bar */}
                <div className="absolute left-0 right-0 top-6 h-2 bg-gray-300 rounded-full" />
                <div className={`relative z-10 flex ${family.length > 1 ? 'justify-center' : 'justify-start'} gap-10`}>
                    {family.map((stu, idx) => {
                        const active = idx === activeIdx;
                        const name = stu.name || `Student ${idx + 1}`;
                        return (
                            <div key={stu.id} className="flex flex-col items-center">
                                <button
                                    className={`rounded-2xl p-1 shadow-md transition-colors ${active ? 'bg-gray-400' : 'bg-gray-200'}`}
                                    onClick={() => setActiveIdx(idx)}
                                    title={name}
                                >
                                    <img
                                        src={stu.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(stu.name || 'Student')}&background=E5E7EB&color=111827`}
                                        className="w-16 h-16 rounded-full object-cover border-4 border-white"
                                        alt={name}
                                    />
                                </button>
                                <div className={`mt-2 text-sm font-semibold ${active ? 'text-dark-text' : 'text-gray-500'}`}>{name}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left content */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Enrolled Courses */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-dark-text">Enrolled Courses</h2>
                        <Link to="courses" className="text-brand-purple font-semibold hover:underline">See all</Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {(family[activeIdx]?.courses || []).map((courseName, i) => {
                            const stu = family[activeIdx];
                            const allocatedByCourse = groupAllocatedByCourse(stu)[courseName] || [];
                            const preferredByCourse = (groupPreferredByCourse(stu)[courseName] || []).map(s => `${s.day}:  ${s.timeSlot}`);
                            const times = allocatedByCourse.length > 0 ? allocatedByCourse : preferredByCourse;
                            const themed = i % 2 === 0;
                            return (
                                <div key={courseName} className={`relative rounded-2xl p-4 border-2 ${themed ? 'border-brand-purple bg-light-purple/40' : 'border-green-400 bg-green-50'}`}>
                                    <div className={`text-lg font-semibold ${themed ? 'text-brand-purple' : 'text-green-800'}`}>{courseName}</div>
                                    <div className="mt-2 text-sm font-semibold text-dark-text">{allocatedByCourse.length > 0 ? 'Allocated Times' : 'Preferred Times'}</div>
                                    <div className="mt-1 space-y-1 text-sm text-dark-text">
                                        {times.length > 0 ? times.slice(0, 3).map((t, idx2) => <div key={idx2}>{t}</div>) : <div className="text-gray-400">No times yet</div>}
                                    </div>
                                    <img src={`/images/${courseName.toString().toLowerCase().replace(/\s+/g,'_')}.png`} alt="" className="absolute right-3 bottom-2 w-20 h-20 object-contain pointer-events-none select-none" />
                                </div>
                            );
                        })}
                        {((family[activeIdx]?.courses || []).length === 0) && (
                            <div className="text-sm text-gray-500">No courses selected yet.</div>
                        )}
                    </div>

                    {/* Course instructors (placeholder using allocated teacher if present) */}
                    <div>
                        <h3 className="text-lg font-semibold text-dark-text mb-3">Course instructors</h3>
                        <div className="flex gap-6">
                            {(Array.isArray(family[activeIdx]?.schedules) ? family[activeIdx]?.schedules : []).slice(0,3).map((s, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent((s as any).teacherName || 'T')}&background=7B61FF&color=fff`} className="w-14 h-14 rounded-full border-4 border-purple-300" />
                                    <div className="mt-2 text-sm font-semibold text-dark-text">{(s as any).teacherName || 'Unassigned'}</div>
                                    <div className="text-xs text-light-text">{s.course}</div>
                                </div>
                            ))}
                            {(!family[activeIdx]?.schedules || family[activeIdx]?.schedules?.length === 0) && (
                                <div className="text-sm text-gray-500">No teachers assigned yet</div>
                            )}
                        </div>
                    </div>

                    {/* Recent Media carousel (simple) */}
                    <div>
                        <h3 className="text-lg font-semibold text-dark-text mb-3">Recent Media</h3>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setMediaIndex(i => Math.max(0, i - 1))} className="px-2 py-1 rounded border bg-white">◀</button>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex gap-4 transition-transform" style={{ transform: `translateX(-${mediaIndex * 200}px)` }}>
                                    {["drawing.png","semi_classical.png","vocal.png"].map((img, i) => (
                                        <img key={i} src={`/images/${img}`} className="h-28 w-auto object-contain" />
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setMediaIndex(i => Math.min(2, i + 1))} className="px-2 py-1 rounded border bg-white">▶</button>
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="lg:col-span-4">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-dark-text">Recent Events</h3>
                            <Link to="events" className="text-sm font-medium text-brand-purple hover:underline">See more</Link>
                        </div>
                        <ul className="space-y-3">
                            {recentEvents.slice(0,4).map(ev => (
                                <li key={ev.id} className="p-3 rounded-lg bg-gray-50">
                                    <div className="font-semibold text-dark-text">{ev.title}</div>
                                    <div className="text-xs text-light-text mt-1">{new Date(ev.date).toLocaleDateString()}</div>
                                </li>
                            ))}
                            {recentEvents.length === 0 && (
                                <div className="text-sm text-gray-500">No upcoming events.</div>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
            {/* Notices & summary can be added back below if needed */}
        </div>
    );
};

export default StudentDashboardHomePage;
