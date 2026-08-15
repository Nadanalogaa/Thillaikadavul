import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { User, Course } from '../../types';
import { getAdminUsers, getCourses, getStudentDiscounts, createStudentDiscount, deleteStudentDiscount } from '../../api';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const DiscountManagementPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [percentage, setPercentage] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const [c, u] = await Promise.all([getCourses(), getAdminUsers()]);
      const uniq = c.filter((x, i, a) => a.findIndex(y => y.name === x.name) === i);
      setCourses(uniq);
      setStudents(u.filter(x => x.role === 'Student'));
    })();
  }, []);

  const selectedCourse = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);

  const loadDiscounts = useCallback(async () => {
    if (!courseId) { setDiscounts([]); return; }
    const d = await getStudentDiscounts({ discount_type: 'course', course_id: courseId });
    setDiscounts(d || []);
  }, [courseId]);

  useEffect(() => { loadDiscounts(); setSelected(new Set()); }, [courseId, loadDiscounts]);

  // Students enrolled in the selected course.
  const courseStudents = useMemo(() => {
    if (!selectedCourse) return [];
    return students.filter(s => (s.courses || []).includes(selectedCourse.name));
  }, [students, selectedCourse]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courseStudents;
    return courseStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      String(s.id).toLowerCase().includes(q));
  }, [courseStudents, search]);

  const discountByStudent = useMemo(() => {
    const m = new Map<string, any>();
    discounts.forEach(d => m.set(String(d.student_id), d));
    return m;
  }, [discounts]);

  const studentName = useCallback((id: any) => students.find(s => String(s.id) === String(id))?.name || `Student ${id}`, [students]);

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const apply = async () => {
    const pct = Number(percentage);
    if (!courseId) { setMessage({ type: 'error', text: 'Select a course first.' }); return; }
    if (!(pct >= 0 && pct <= 100)) { setMessage({ type: 'error', text: 'Enter a percentage between 0 and 100.' }); return; }
    if (selected.size === 0) { setMessage({ type: 'error', text: 'Select at least one student.' }); return; }
    setSaving(true); setMessage(null);
    try {
      await Promise.all(Array.from(selected).map(sid =>
        createStudentDiscount({ student_id: Number(sid), discount_type: 'course', course_id: Number(courseId), discount_percentage: pct, reason: reason || undefined })
      ));
      setMessage({ type: 'success', text: `Applied ${pct}% to ${selected.size} student(s).` });
      setSelected(new Set()); setPercentage(''); setReason('');
      await loadDiscounts();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to apply discount.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Remove this discount?')) return;
    try { await deleteStudentDiscount(id); await loadDiscounts(); }
    catch (e) { setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to remove.' }); }
  };

  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selected.has(String(s.id)));

  return (
    <AdminLayout>
      <AdminPageHeader title="Discounts" subtitle="Give a percentage discount per course to one or many students at once." />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: apply form */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-5 space-y-4 h-fit">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="">Select course…</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
            <input type="number" min={0} max={100} value={percentage} onChange={e => setPercentage(e.target.value)}
              placeholder="e.g. 10" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Sibling / scholarship" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <button onClick={apply} disabled={saving}
            className="w-full bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md disabled:opacity-50">
            {saving ? 'Applying…' : `Apply to ${selected.size} selected`}
          </button>
          {message && (
            <div className={`text-sm rounded-md px-3 py-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Right: student picker */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-5">
          {!selectedCourse ? (
            <p className="text-sm text-gray-500 text-center py-10">Select a course to choose students.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 gap-3">
                <input type="text" placeholder="Search students by name, email, or ID…" value={search}
                  onChange={e => setSearch(e.target.value)} className="flex-1 border border-gray-300 rounded-md px-3 py-2" />
                <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <input type="checkbox" checked={allSelected}
                    onChange={e => {
                      const n = new Set(selected);
                      if (e.target.checked) filteredStudents.forEach(s => n.add(String(s.id)));
                      else filteredStudents.forEach(s => n.delete(String(s.id)));
                      setSelected(n);
                    }} /> Select all
                </label>
              </div>
              <div className="border rounded-md divide-y max-h-[28rem] overflow-y-auto">
                {filteredStudents.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No students enrolled in this course.</p>}
                {filteredStudents.map(s => {
                  const existing = discountByStudent.get(String(s.id));
                  const isSel = selected.has(String(s.id));
                  return (
                    <label key={s.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${isSel ? 'bg-brand-primary/5' : ''}`}>
                      <input type="checkbox" checked={isSel} onChange={() => toggle(String(s.id))} className="h-4 w-4" />
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                      {existing && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{Number(existing.discount_percentage)}% off</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Existing discounts for this course */}
      {selectedCourse && discounts.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Current discounts — {selectedCourse.name}</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {discounts.map(d => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-sm text-gray-800">{studentName(d.student_id)}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-brand-primary">{Number(d.discount_percentage)}%</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{d.reason || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(d.id)} className="text-sm text-red-600 hover:text-red-800">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default DiscountManagementPage;
