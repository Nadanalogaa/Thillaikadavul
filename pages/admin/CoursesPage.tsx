import React, { useCallback, useEffect, useState } from 'react';
import type { Course } from '../../types';
import { getAdminCourses, addCourseByAdmin, updateCourseByAdmin, deleteCourseByAdmin } from '../../api';
import CourseTable from '../../components/admin/CourseTable';
import EditCourseModal from '../../components/admin/EditCourseModal';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

// Admin -> Courses: the courses the academy teaches (moved off the dashboard).
const CoursesPage: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Partial<Course> | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setCourses(await getAdminCourses()); setError(null); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not load courses.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const remove = async (courseId: string) => {
        if (!window.confirm('Are you sure you want to delete this course?')) return;
        try {
            await deleteCourseByAdmin(courseId);
            setCourses(prev => prev.filter(c => c.id !== courseId));
        } catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete course.'); }
    };

    const save = async (course: Partial<Course>) => {
        try {
            if (course.id) {
                const saved = await updateCourseByAdmin(course.id, course);
                setCourses(prev => prev.map(c => (c.id === saved.id ? saved : c)));
            } else {
                const created = await addCourseByAdmin(course as Omit<Course, 'id'>);
                setCourses(prev => [...prev, created]);
            }
            setEditing(null);
        } catch (e) { alert(e instanceof Error ? e.message : 'Failed to save course.'); }
    };

    return (
        <AdminLayout>
            <AdminPageHeader title="Courses" subtitle="The courses the academy teaches. Grades and fees are set per course under Fees → Grades & Fees." />
            {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {loading ? <p className="py-10 text-center text-gray-500">Loading courses…</p>
                : <CourseTable courses={courses} onEdit={c => setEditing(c)} onDelete={remove} onAddNew={() => setEditing({})} />}
            <EditCourseModal isOpen={!!editing} onClose={() => setEditing(null)} course={editing} onSave={save} />
        </AdminLayout>
    );
};

export default CoursesPage;
