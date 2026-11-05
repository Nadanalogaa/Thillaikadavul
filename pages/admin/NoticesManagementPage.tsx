import React, { useState, useEffect, useCallback } from 'react';
import type { Notice } from '../../types';
import { getAdminNotices, addNotice, updateNotice, deleteNotice } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import { useTheme } from '../../contexts/ThemeContext';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';
import SendContentNotificationModal from '../../components/admin/SendContentNotificationModal';
import { isSuperAdmin } from '../../utils/adminRole';

const NoticeForm: React.FC<{ notice?: Partial<Notice>, onSave: (notice: Partial<Notice>) => void, isLoading: boolean }> = ({ notice, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Partial<Notice>>({});

    useEffect(() => {
        setFormData({
            id: notice?.id,
            title: notice?.title || '',
            content: notice?.content || '',
            priority: notice?.priority || 'normal',
            expiryDate: notice?.expiryDate ? String(notice.expiryDate).slice(0, 10) : '',
        });
    }, [notice]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="form-label">Title</label>
                <input name="title" value={formData.title} onChange={handleChange} required className="form-input w-full" />
            </div>
            <div>
                <label className="form-label">Content</label>
                <textarea name="content" value={formData.content} onChange={handleChange} required rows={5} className="form-textarea w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="form-label">Priority</label>
                    <select name="priority" value={formData.priority || 'normal'} onChange={handleChange} className="form-select w-full">
                        <option value="normal">Normal</option>
                        <option value="medium">Important</option>
                        <option value="high">Urgent</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Show until (optional)</label>
                    <input name="expiryDate" type="date" value={formData.expiryDate || ''} onChange={handleChange} className="form-input w-full" />
                    <p className="mt-1 text-xs text-gray-500">Families stop seeing it after this day.</p>
                </div>
            </div>
            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save Notice'}
                </button>
            </div>
        </form>
    );
};


const NoticesManagementPage: React.FC = () => {
    const canDelete = isSuperAdmin();
    const { theme } = useTheme();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingNotice, setEditingNotice] = useState<Partial<Notice> | null>(null);
    const [notifyingNotice, setNotifyingNotice] = useState<Notice | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminNotices();
            setNotices(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch notices.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (notice: Partial<Notice>) => {
        setIsFormLoading(true);
        try {
            if (notice.id) {
                await updateNotice(notice.id, notice);
            } else {
                await addNotice(notice as Omit<Notice, 'id'>);
            }
            setEditingNotice(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save notice.');
        } finally {
            setIsFormLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this notice?')) {
            try {
                await deleteNotice(id);
                await fetchData();
            } catch (err) {
                 alert(err instanceof Error ? err.message : 'Failed to delete notice.');
            }
        }
    };

    return (
        <AdminLayout>
            <AdminPageHeader title="Notices" subtitle="Create and manage school-wide notices." />

                <div className="mt-8">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setEditingNotice({})} className="btn-primary">
                            + Add New Notice
                        </button>
                    </div>
                    {isLoading && <p>Loading notices...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="th-base">Title</th>
                                        <th className="th-base">Priority</th>
                                        <th className="th-base">Posted</th>
                                        <th className="th-base">Show until</th>
                                        <th className="th-base text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {notices.map(notice => (
                                        <tr key={notice.id}>
                                            <td className="td-base font-medium">{notice.title}</td>
                                            <td className="td-base capitalize">{notice.priority === 'high' ? 'Urgent' : notice.priority === 'medium' ? 'Important' : 'Normal'}</td>
                                            <td className="td-base">{notice.issuedAt ? new Date(notice.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                            <td className="td-base">{notice.expiryDate ? new Date(String(notice.expiryDate).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Always'}</td>
                                            <td className="td-base text-right space-x-2">
                                                <button onClick={() => setNotifyingNotice(notice)} className="btn-send">Send</button>
                                                <button onClick={() => setEditingNotice(notice)} className="btn-secondary">Edit</button>
                                                {canDelete && <button onClick={() => handleDelete(notice.id)} className="btn-danger">Delete</button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            <Modal isOpen={!!editingNotice} onClose={() => setEditingNotice(null)} size="lg">
                <ModalHeader title={editingNotice?.id ? 'Edit Notice' : 'Add New Notice'} />
                <NoticeForm notice={editingNotice || {}} onSave={handleSave} isLoading={isFormLoading} />
            </Modal>
            
            <SendContentNotificationModal
                isOpen={!!notifyingNotice}
                onClose={() => setNotifyingNotice(null)}
                contentItem={notifyingNotice}
                contentType="Notice"
            />
            
            <style>{`
                .th-base { padding: 12px 24px; text-align: left; font-size: 12px; font-weight: 500; color: #4B5563; text-transform: uppercase; letter-spacing: 0.05em; }
                .td-base { padding: 16px 24px; vertical-align: middle; font-size: 14px; color: #374151; }
                .btn-primary { background-color: #1a237e; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0d113d; }
                .btn-primary:disabled { background-color: #9fa8da; cursor: not-allowed; }
                .btn-secondary { background-color: #e8eaf6; color: #1a237e; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-danger { background-color: #fee2e2; color: #b91c1c; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-send { background-color: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
            `}</style>
        </AdminLayout>
    );
};

export default NoticesManagementPage;
