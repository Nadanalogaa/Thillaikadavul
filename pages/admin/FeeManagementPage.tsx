import React, { useState, useEffect, useCallback } from 'react';
import type { Course } from '../../types';
import { getCourses, getGrades, purgeFeeStructures } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import TabButton from '../../components/admin/TabButton';
import { useTheme } from '../../contexts/ThemeContext';
import InvoicesPanel from '../../components/admin/InvoicesPanel';
import { Link } from 'react-router-dom';

type ActiveTab = 'invoices' | 'grades';

const FeeManagementPage: React.FC = () => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<ActiveTab>('invoices');
    const [courses, setCourses] = useState<Course[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);

    const loadGrades = useCallback(async () => {
        setLoading(true);
        try {
            const [c, g] = await Promise.all([getCourses(), getGrades()]);
            setCourses(c.filter((x, i, a) => a.findIndex(y => y.name === x.name) === i));
            setGrades(g || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadGrades(); }, [loadGrades]);

    const gradesByCourse = courses.map(c => ({
        course: c,
        grades: grades.filter((g: any) => String(g.course_id) === String(c.id)),
    }));

    const doPurge = async () => {
        if (!window.confirm('Delete ALL old fee structures (the legacy ₹ amounts)? Students, grades and invoices are NOT affected. This cannot be undone.')) return;
        try {
            const r = await purgeFeeStructures();
            setMessage(r.message || 'Legacy fee structures deleted.');
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Failed to delete legacy fees.');
        }
    };

    return (
        <AdminLayout>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <AdminPageHeader
                    title="Fee Management"
                    subtitle="Invoices, grade-based fees and discounts — one place."
                />
                <div className="mt-1 flex gap-2">
                    <Link to="/admin/grades" className="border border-brand-primary text-brand-primary text-sm font-semibold px-3 py-2 rounded-md hover:bg-brand-primary/10">Manage Grades →</Link>
                    <Link to="/admin/discounts" className="border border-brand-primary text-brand-primary text-sm font-semibold px-3 py-2 rounded-md hover:bg-brand-primary/10">Discounts →</Link>
                </div>
            </div>

            {message && <div className="p-3 my-3 rounded-md text-sm bg-blue-50 text-blue-700">{message}</div>}

            <div className={`border-b mb-6 mt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton isActive={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')}>Invoices</TabButton>
                    <TabButton isActive={activeTab === 'grades'} onClick={() => setActiveTab('grades')}>Grades &amp; Fees</TabButton>
                </nav>
            </div>

            {activeTab === 'invoices' && <InvoicesPanel />}

            {activeTab === 'grades' && (
                loading ? (
                    <p className="text-center text-gray-500 py-8">Loading…</p>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-500">Each grade sets the monthly fee for its course. Manage grades on the Grades &amp; Fees page.</p>
                            <Link to="/admin/grades" className="bg-brand-primary text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-brand-dark">+ Add / Edit Grades</Link>
                        </div>
                        {gradesByCourse.filter(gc => gc.grades.length > 0).length === 0 ? (
                            <div className="text-center text-sm text-gray-500 py-8 border-2 border-dashed rounded-lg">
                                No grades configured yet. Use “Add / Edit Grades” to set fees per course.
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {gradesByCourse.filter(gc => gc.grades.length > 0).map(gc => (
                                    <div key={gc.course.id} className="bg-white rounded-lg shadow-sm p-4">
                                        <h3 className="font-semibold text-gray-800 mb-3">{gc.course.name}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {gc.grades.map((g: any) => (
                                                <div key={g.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                                                    <span className="text-sm font-medium text-gray-700">{g.name}</span>
                                                    <span className="text-sm font-semibold text-brand-primary">₹{Number(g.monthly_fee).toFixed(0)}/mo</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 border-t pt-4">
                            <p className="text-xs text-gray-400 mb-2">Legacy cleanup — the old per-course "fee structures" are no longer used (fees come from grades).</p>
                            <button onClick={doPurge} className="text-sm text-red-600 border border-red-300 px-3 py-1.5 rounded-md hover:bg-red-50">
                                Delete old fee structures
                            </button>
                        </div>
                    </div>
                )
            )}
        </AdminLayout>
    );
};

export default FeeManagementPage;
