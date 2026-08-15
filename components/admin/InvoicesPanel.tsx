import React, { useState, useEffect, useCallback } from 'react';
import { getInvoices, getCourses, getBatches, getGrades, markInvoicePaid, generateMonthlyInvoicesApi } from '../../api';
import type { Course, Batch } from '../../types';

const statusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return 'bg-green-100 text-green-800';
  if (s === 'overdue') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800'; // pending
};

const InvoicesPanel: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [c, b, g] = await Promise.all([getCourses(), getBatches(), getGrades()]);
      setCourses(c.filter((x, i, a) => a.findIndex(y => y.name === x.name) === i));
      setBatches(b);
      setGrades(g || []);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (courseId) params.course_id = courseId;
      if (batchId) params.batch_id = batchId;
      if (gradeId) params.grade_id = gradeId;
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      setInvoices(await getInvoices(params));
    } finally {
      setLoading(false);
    }
  }, [courseId, batchId, gradeId, status, search]);

  useEffect(() => { load(); }, [courseId, batchId, gradeId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const gradesForCourse = courseId ? grades.filter((g: any) => String(g.course_id) === String(courseId)) : grades;
  const batchesForCourse = courseId ? batches.filter(b => String((b as any).courseId) === String(courseId)) : batches;

  const doMarkPaid = async (inv: any) => {
    if (!window.confirm(`Mark ${inv.student?.name || 'this'} invoice for ${inv.billing_period} as PAID (offline)?`)) return;
    setBusyId(String(inv.id)); setMessage(null);
    try {
      await markInvoicePaid(inv.id, { transaction_id: 'OFFLINE', notes: 'Marked paid by admin' });
      setMessage('Invoice marked as paid.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to mark paid.');
    } finally {
      setBusyId(null);
    }
  };

  const doGenerate = async () => {
    if (!window.confirm("Generate this month's invoices for all students?")) return;
    setLoading(true); setMessage(null);
    try {
      const r = await generateMonthlyInvoicesApi();
      setMessage(`Generated ${r.created ?? 0} invoice(s)${r.skipped ? `, ${r.skipped} already existed` : ''}.`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to generate.');
    } finally {
      setLoading(false);
    }
  };

  const total = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Course</label>
          <select value={courseId} onChange={e => { setCourseId(e.target.value); setBatchId(''); setGradeId(''); }} className="border border-gray-300 rounded-md px-3 py-2">
            <option value="">All courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Batch</label>
          <select value={batchId} onChange={e => setBatchId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2">
            <option value="">All batches</option>
            {batchesForCourse.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Grade</label>
          <select value={gradeId} onChange={e => setGradeId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2">
            <option value="">All grades</option>
            {gradesForCourse.map((g: any) => <option key={g.id} value={g.id}>{g.name}{g.course_name ? ` (${g.course_name})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-xs text-gray-500 mb-1">Search student</label>
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="Name, email, or ID…" className="flex-1 border border-gray-300 rounded-md px-3 py-2" />
            <button onClick={load} className="bg-brand-primary text-white px-3 py-2 rounded-md">Go</button>
          </div>
        </div>
        <button onClick={doGenerate} className="border border-brand-primary text-brand-primary font-semibold px-4 py-2 rounded-md hover:bg-brand-primary/10 whitespace-nowrap">
          + Generate Monthly
        </button>
      </div>

      {message && <div className="mb-3 text-sm bg-blue-50 text-blue-700 rounded-md px-3 py-2">{message}</div>}

      <div className="bg-brand-primary/5 rounded-md px-4 py-2 mb-3 text-sm text-brand-primary font-semibold">
        {invoices.length} invoice(s){status ? ` · ${status}` : ''} · Total ₹{total.toFixed(0)}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Student', 'Course / Grade', 'Period', 'Amount', 'Status', 'Due', ''].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td></tr>}
            {!loading && invoices.map(inv => {
              const hasDisc = Number(inv.discount_percentage || 0) > 0;
              const isPaid = (inv.status || '').toLowerCase() === 'paid';
              return (
                <tr key={inv.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">{inv.student?.name || inv.student_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{inv.course_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{inv.billing_period}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className="font-medium text-gray-800">₹{Number(inv.amount || 0).toFixed(0)}</span>
                    {hasDisc && <span className="ml-2 text-xs text-gray-400 line-through">₹{Number(inv.original_amount || 0).toFixed(0)}</span>}
                    {hasDisc && <span className="ml-1 text-xs text-green-600">−{Number(inv.discount_percentage)}%</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {!isPaid && (
                      <button onClick={() => doMarkPaid(inv)} disabled={busyId === String(inv.id)}
                        className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md disabled:opacity-50">
                        {busyId === String(inv.id) ? '…' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No invoices match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesPanel;
