import React, { useState, useEffect, useCallback } from 'react';
import type { Course } from '../../types';
import { getGrades, createGrade, updateGrade, deleteGrade, getCourses } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';

interface Grade {
  id?: number;
  course_id?: number | null;
  course_name?: string;
  name?: string;
  monthly_fee?: number;
}

const GradeForm: React.FC<{
  grade?: Partial<Grade>;
  courses: Course[];
  onSave: (grade: Partial<Grade>) => void;
  isLoading: boolean;
}> = ({ grade, courses, onSave, isLoading }) => {
  const [form, setForm] = useState<Partial<Grade>>({});

  useEffect(() => {
    setForm({
      id: grade?.id,
      course_id: grade?.course_id ?? (courses[0] ? Number(courses[0].id) : undefined),
      name: grade?.name || '',
      monthly_fee: grade?.monthly_fee ?? 0,
    });
  }, [grade, courses]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
        <select
          value={form.course_id ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, course_id: Number(e.target.value) }))}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="" disabled>Select a course</option>
          {courses.map((c) => (
            <option key={c.id} value={Number(c.id)}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Grade Name</label>
        <input
          type="text"
          value={form.name || ''}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
          placeholder="e.g. Grade 1 / Beginner"
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee (₹)</label>
        <input
          type="number"
          min={0}
          value={form.monthly_fee ?? 0}
          onChange={(e) => setForm((p) => ({ ...p, monthly_fee: Number(e.target.value) }))}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md disabled:opacity-50"
        >
          {isLoading ? 'Saving…' : 'Save Grade'}
        </button>
      </div>
    </form>
  );
};

const GradeManagementPage: React.FC = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Grade> | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [g, c] = await Promise.all([getGrades(), getCourses()]);
      setGrades(g);
      setCourses(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grades.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (grade: Partial<Grade>) => {
    setIsFormLoading(true);
    try {
      if (grade.id) {
        await updateGrade(grade.id, grade);
      } else {
        await createGrade(grade);
      }
      setEditing(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save grade.');
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this grade? Existing invoices are not affected.')) {
      try {
        await deleteGrade(id);
        await fetchData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete grade.');
      }
    }
  };

  return (
    <AdminLayout>
      <AdminPageHeader title="Grades & Fees" subtitle="Define grades under each course and set the monthly fee. A student's fee comes from their grade." />

      <div className="mt-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setEditing({})}
            disabled={courses.length === 0}
            className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm disabled:opacity-50"
          >
            + Add Grade
          </button>
        </div>
        {isLoading && <p>Loading grades…</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && !error && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Fee</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.map((g) => (
                  <tr key={g.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{g.course_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{g.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">₹{Number(g.monthly_fee || 0).toFixed(0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                      <button onClick={() => setEditing(g)} className="text-brand-primary hover:text-brand-dark">Edit</button>
                      <button onClick={() => handleDelete(g.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
                {grades.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      {courses.length === 0 ? 'Create a course first.' : 'No grades yet. Add one to set a fee.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} size="lg">
        <ModalHeader title={editing?.id ? 'Edit Grade' : 'Add Grade'} />
        <GradeForm grade={editing || {}} courses={courses} onSave={handleSave} isLoading={isFormLoading} />
      </Modal>
    </AdminLayout>
  );
};

export default GradeManagementPage;
