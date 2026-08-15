import React, { useState, useEffect, useCallback } from 'react';
import type { FeeStructure, Course } from '../../types';
import {
    getFeeStructures, addFeeStructure, updateFeeStructure, deleteFeeStructure,
    getAdminCourses
} from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import TabButton from '../../components/admin/TabButton';
import { useTheme } from '../../contexts/ThemeContext';
import FeeStructureTable from '../../components/admin/FeeStructureTable';
import EditFeeStructureModal from '../../components/admin/EditFeeStructureModal';
import InvoicesPanel from '../../components/admin/InvoicesPanel';
import { Link } from 'react-router-dom';

type ActiveTab = 'invoices' | 'structures';

const FeeManagementPage: React.FC = () => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<ActiveTab>('invoices');

    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingStructure, setEditingStructure] = useState<Partial<FeeStructure> | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedStructures, fetchedCourses] = await Promise.all([
                getFeeStructures(),
                getAdminCourses(),
            ]);
            setStructures(fetchedStructures);
            setCourses(fetchedCourses);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch fee management data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleActionMessage = (type: 'success' | 'error', text: string) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 5000);
    };

    const handleSaveStructure = async (data: Partial<FeeStructure>) => {
        try {
            if (data.id) {
                const updated = await updateFeeStructure(data.id, data);
                setStructures(prev => prev.map(s => s.id === updated.id ? updated : s));
                handleActionMessage('success', 'Fee structure updated successfully.');
            } else {
                const newStructure = await addFeeStructure(data as Omit<FeeStructure, 'id'>);
                setStructures(prev => [...prev, newStructure]);
                handleActionMessage('success', 'New fee structure added successfully.');
            }
            setEditingStructure(null);
        } catch (err) {
            handleActionMessage('error', err instanceof Error ? err.message : 'Failed to save structure.');
        }
    };

    const handleDeleteStructure = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this fee structure? This cannot be undone.')) {
            try {
                await deleteFeeStructure(id);
                setStructures(prev => prev.filter(s => s.id !== id));
                handleActionMessage('success', 'Fee structure deleted.');
            } catch (err) {
                handleActionMessage('error', err instanceof Error ? err.message : 'Failed to delete structure.');
            }
        }
    };

    return (
        <AdminLayout>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <AdminPageHeader
                    title="Fee Management"
                    subtitle="Invoices, fee structures, grades and discounts — all fees in one place."
                />
                <div className="mt-1 flex gap-2">
                    <Link to="/admin/grades" className="border border-brand-primary text-brand-primary text-sm font-semibold px-3 py-2 rounded-md hover:bg-brand-primary/10">Grades &amp; Fees →</Link>
                    <Link to="/admin/discounts" className="border border-brand-primary text-brand-primary text-sm font-semibold px-3 py-2 rounded-md hover:bg-brand-primary/10">Discounts →</Link>
                </div>
            </div>

            {actionMessage && (
                <div className={`p-4 mb-4 rounded-md text-sm ${
                    actionMessage.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                    {actionMessage.text}
                </div>
            )}

            <div className={`border-b mb-6 mt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton isActive={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')}>Invoices</TabButton>
                    <TabButton isActive={activeTab === 'structures'} onClick={() => setActiveTab('structures')}>Fee Structures</TabButton>
                </nav>
            </div>

            {activeTab === 'invoices' && <InvoicesPanel />}

            {activeTab === 'structures' && (
                isLoading ? (
                    <p className="text-center text-gray-500 py-8">Loading data...</p>
                ) : error ? (
                    <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>
                ) : (
                    <FeeStructureTable
                        structures={structures}
                        onEdit={setEditingStructure}
                        onDelete={handleDeleteStructure}
                        onAddNew={() => setEditingStructure({})}
                    />
                )
            )}

            <EditFeeStructureModal
                isOpen={!!editingStructure}
                onClose={() => setEditingStructure(null)}
                structure={editingStructure}
                courses={courses}
                existingStructures={structures}
                onSave={handleSaveStructure}
            />
        </AdminLayout>
    );
};

export default FeeManagementPage;
