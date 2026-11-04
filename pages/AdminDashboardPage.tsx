import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Course, DashboardStats } from '../types';
import {
    getAdminCourses, addCourseByAdmin, updateCourseByAdmin, deleteCourseByAdmin, getAdminStats
} from '../api';
import CourseTable from '../components/admin/CourseTable';
import EditCourseModal from '../components/admin/EditCourseModal';
import AdminLayout from '../components/admin/AdminLayout';
import { useTheme } from '../contexts/ThemeContext';
import { AdminDashboardView } from '../components/admin/AdminInsights';

const AdminDashboardPage: React.FC = () => {
    const { theme } = useTheme();
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
    const coursesRef = useRef<HTMLDivElement>(null);

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
            {error && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
                    {error}
                </div>
            )}

            <AdminDashboardView
                teacherCount={stats?.teacherCount}
                courseCount={isLoading ? undefined : courses.length}
                onCourses={() => coursesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />

            {/* Courses: managed here */}
            <div ref={coursesRef} className="mt-8 scroll-mt-20">
                {isLoading
                    ? <p className={`py-6 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading courses…</p>
                    : <CourseTable courses={courses} onEdit={handleEditCourse} onDelete={handleDeleteCourse} onAddNew={handleAddNewCourse} />}
            </div>

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