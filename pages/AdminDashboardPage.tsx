import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Course, DashboardStats } from '../types';
import {
    getAdminCourses, addCourseByAdmin, updateCourseByAdmin, deleteCourseByAdmin, getAdminStats
} from '../api';
import CourseTable from '../components/admin/CourseTable';
import EditCourseModal from '../components/admin/EditCourseModal';
import StatCard from '../components/admin/StatCard';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminLayout from '../components/admin/AdminLayout';
import { useTheme } from '../contexts/ThemeContext';

const AdminDashboardPage: React.FC = () => {
    const { theme } = useTheme();
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedCourses, fetchedStats] = await Promise.all([
                getAdminCourses(),
                getAdminStats()
            ]);
            setCourses(fetchedCourses);
            setStats(fetchedStats);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditCourse = (course: Course) => setEditingCourse(course);
    const handleAddNewCourse = () => setEditingCourse({}); // Empty object for new course form

    const handleDeleteCourse = async (courseId: string) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await deleteCourseByAdmin(courseId);
                setCourses(prev => prev.filter(c => c.id !== courseId));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to delete course.');
            }
        }
    };

    const handleSaveCourse = async (courseToSave: Partial<Course>) => {
        try {
            if (courseToSave.id) { // Editing existing course
                const savedCourse = await updateCourseByAdmin(courseToSave.id, courseToSave);
                setCourses(prev => prev.map(c => c.id === savedCourse.id ? savedCourse : c));
            } else { // Adding new course
                const newCourse = await addCourseByAdmin(courseToSave as Omit<Course, 'id'>);
                setCourses(prev => [...prev, newCourse]);
            }
            setEditingCourse(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save course.');
        }
    };
    
    return (
        <AdminLayout>
            <AdminPageHeader
                title="Dashboard"
                subtitle="Manage users, courses, and view system statistics."
            />

            {isLoading && (
                <div className="flex justify-center items-center py-12">
                    <div className={`text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Loading dashboard...
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {!isLoading && !error && stats && (
                <>
                    {/* Stats Section */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <StatCard title="Total Users" value={stats.totalUsers} />
                        <Link to="/admin/students">
                            <StatCard title="Students" value={stats.studentCount} isLink />
                        </Link>
                        <Link to="/admin/teachers">
                            <StatCard title="Teachers" value={stats.teacherCount} isLink />
                        </Link>
                        <StatCard title="Online Pref." value={stats.onlinePreference} />
                        <StatCard title="Offline Pref." value={stats.offlinePreference} />
                    </div>

                    {/* Course Management Section */}
                    <div className="mt-6 sm:mt-8">
                        <CourseTable
                            courses={courses}
                            onEdit={handleEditCourse}
                            onDelete={handleDeleteCourse}
                            onAddNew={handleAddNewCourse}
                        />
                    </div>
                </>
            )}

            <EditCourseModal
                isOpen={!!editingCourse}
                onClose={() => setEditingCourse(null)}
                course={editingCourse}
                onSave={handleSaveCourse}
            />
        </AdminLayout>
    );
};

export default AdminDashboardPage;