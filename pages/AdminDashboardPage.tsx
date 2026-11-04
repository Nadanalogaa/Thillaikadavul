import React, { useEffect, useState } from 'react';
import type { DashboardStats } from '../types';
import { getAdminCourses, getAdminStats } from '../api';
import AdminLayout from '../components/admin/AdminLayout';
import { AdminDashboardView } from '../components/admin/AdminInsights';

// Admin dashboard. Courses are managed under Admin -> Courses.
const AdminDashboardPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [courseCount, setCourseCount] = useState<number | undefined>(undefined);

    useEffect(() => {
        getAdminStats().then(setStats).catch(() => {});
        getAdminCourses().then(c => setCourseCount(c.length)).catch(() => {});
    }, []);

    return (
        <AdminLayout>
            <AdminDashboardView teacherCount={stats?.teacherCount} courseCount={courseCount} />
        </AdminLayout>
    );
};

export default AdminDashboardPage;
