import React, { useState, useEffect, useCallback } from 'react';
import type { GradeExam } from '../../types';
import { getAdminGradeExams, addGradeExam, updateGradeExam, deleteGradeExam, getCourses } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import { useTheme } from '../../contexts/ThemeContext';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';
import SendContentNotificationModal from '../../components/admin/SendContentNotificationModal';
import { isSuperAdmin } from '../../utils/adminRole';

// Fields match the grade_exams table: exam_name, course, exam_date,
// exam_time, location, syllabus. A course limits the exam to families with a
// child in that course; leave it empty for everyone.
const GradeExamForm: React.FC<{ exam?: Partial<GradeExam>, onSave: (exam: Partial<GradeExam>) => void, isLoading: boolean }> = ({ exam, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Partial<GradeExam> & { dateText?: string }>({});
    const [courses, setCourses] = useState<string[]>([]);

    useEffect(() => {
        getCourses().then(cs => setCourses(cs.map(c => c.name))).catch(() => setCourses([]));
    }, []);

    useEffect(() => {
        const d = exam?.date ? new Date(exam.date as any) : null;
        setFormData({
            id: exam?.id,
            title: exam?.title || '',
            description: exam?.description || '',
            course: exam?.course || '',
            time: exam?.time ? String(exam.time).slice(0, 5) : '',
            location: exam?.location || '',
            dateText: d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '',
        });
    }, [exam]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { dateText, ...rest } = formData;
        onSave({ ...rest, date: dateText ? new Date(`${dateText}T00:00:00`) : (undefined as any) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="form-label">Exam name</label>
                <input name="title" value={formData.title || ''} onChange={handleChange} required className="form-input w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="form-label">Course</label>
                    <select name="course" value={formData.course || ''} onChange={handleChange} className="form-select w-full">
                        <option value="">Everyone</option>
                        {courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Place</label>
                    <input name="location" value={formData.location || ''} onChange={handleChange} className="form-input w-full" />
                </div>
                <div>
                    <label className="form-label">Exam date</label>
                    <input name="dateText" type="date" value={formData.dateText || ''} onChange={handleChange} required className="form-input w-full" />
                </div>
                <div>
                    <label className="form-label">Time</label>
                    <input name="time" type="time" value={formData.time || ''} onChange={handleChange} className="form-input w-full" />
                </div>
            </div>
            <div>
                <label className="form-label">Syllabus / details</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={4} className="form-textarea w-full" />
            </div>
            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save exam'}
                </button>
            </div>
        </form>
    );
};

const showDate = (d: any) => {
    const x = d ? new Date(d) : null;
    return x && !isNaN(x.getTime()) ? x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

const GradeExamsManagementPage: React.FC = () => {
    const canDelete = isSuperAdmin();
    const { theme } = useTheme();
    const [exams, setExams] = useState<GradeExam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingExam, setEditingExam] = useState<Partial<GradeExam> | null>(null);
    const [notifyingExam, setNotifyingExam] = useState<GradeExam | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminGradeExams();
            setExams(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch grade exams.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (exam: Partial<GradeExam>) => {
        setIsFormLoading(true);
        try {
            if (exam.id) {
                await updateGradeExam(exam.id, exam);
            } else {
                await addGradeExam(exam as Omit<GradeExam, 'id'>);
            }
            setEditingExam(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save exam.');
        } finally {
            setIsFormLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this exam information?')) {
            try {
                await deleteGradeExam(id);
                await fetchData();
            } catch (err) {
                 alert(err instanceof Error ? err.message : 'Failed to delete exam.');
            }
        }
    };

    return (
        <AdminLayout>
            <AdminPageHeader title="Grade Exams" subtitle="Manage information about grade exams." />

                <div className="mt-8">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setEditingExam({})} className="btn-primary">
                            + Add New Exam
                        </button>
                    </div>
                    {isLoading && <p>Loading exams...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="th-base">Exam</th>
                                        <th className="th-base">Course</th>
                                        <th className="th-base">Date</th>
                                        <th className="th-base">Time</th>
                                        <th className="th-base">Place</th>
                                        <th className="th-base text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {exams.map(exam => (
                                        <tr key={exam.id}>
                                            <td className="td-base font-medium">{exam.title}</td>
                                            <td className="td-base">{exam.course || 'Everyone'}</td>
                                            <td className="td-base">{showDate(exam.date)}</td>
                                            <td className="td-base">{exam.time ? String(exam.time).slice(0, 5) : '—'}</td>
                                            <td className="td-base">{exam.location || '—'}</td>
                                            <td className="td-base text-right space-x-2">
                                                <button onClick={() => setNotifyingExam(exam)} className="btn-send">Send</button>
                                                <button onClick={() => setEditingExam(exam)} className="btn-secondary">Edit</button>
                                                {canDelete && <button onClick={() => handleDelete(exam.id)} className="btn-danger">Delete</button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            <Modal isOpen={!!editingExam} onClose={() => setEditingExam(null)} size="lg">
                <ModalHeader title={editingExam?.id ? 'Edit Grade Exam' : 'Add New Grade Exam'} />
                <GradeExamForm exam={editingExam || {}} onSave={handleSave} isLoading={isFormLoading} />
            </Modal>
            
            <SendContentNotificationModal
                isOpen={!!notifyingExam}
                onClose={() => setNotifyingExam(null)}
                contentItem={notifyingExam}
                contentType="GradeExam"
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

export default GradeExamsManagementPage;
