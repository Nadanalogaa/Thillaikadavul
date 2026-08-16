import React, { useState, useEffect, useCallback } from 'react';
import { getInvoices, getCourses, getBatches, getGrades, markInvoicePaid, generateMonthlyInvoicesApi, purgeLegacyInvoices, sendInvoiceReminders } from '../../api';
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const doPurgeLegacy = async () => {
    if (!window.confirm("Delete OLD unpaid invoices (the pre-grade ₹ ones)? Grade-based and paid invoices are kept. Then use 'Generate Monthly' to recreate them from grades.")) return;
    setLoading(true); setMessage(null);
    try {
      const r = await purgeLegacyInvoices();
      setMessage(`${r.message} Now click "Generate Monthly" to recreate from grades.`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to clear old invoices.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const unpaidSelected = invoices.filter(i => selected.has(String(i.id)) && (i.status || '').toLowerCase() !== 'paid');

  const doRemind = async () => {
    if (unpaidSelected.length === 0) { setMessage('Select one or more unpaid invoices first.'); return; }
    setMessage(null);
    try {
      const r = await sendInvoiceReminders(unpaidSelected.map(i => i.id));
      const links = (r.reminders || []).filter((x: any) => x.wa_link);
      // Open WhatsApp for each parent (first few directly, rest listed).
      links.slice(0, 5).forEach((x: any) => window.open(x.wa_link, '_blank'));
      setMessage(`Reminders sent to ${r.count} student(s) (in-app). WhatsApp opened for ${Math.min(links.length, 5)}${links.length > 5 ? ` — ${links.length - 5} more, click rows individually` : ''}.`);
      setSelected(new Set());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to send reminders.');
    }
  };

  const waLinkFor = (inv: any) => {
    let d = String(inv.student?.phone || '').replace(/\D/g, '');
    if (d.length === 10) d = '91' + d;
    const msg = `Dear Parent, reminder from Nadanaloga Academy: ${inv.student?.name || ''}'s fee of INR ${Number(inv.amount || 0).toFixed(0)} for ${inv.billing_period || 'this month'} is pending. Kindly pay soon. Thank you.`;
    return d ? `https://wa.me/${d}?text=${encodeURIComponent(msg)}` : null;
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
        <button onClick={doPurgeLegacy} className="border border-red-300 text-red-600 font-semibold px-4 py-2 rounded-md hover:bg-red-50 whitespace-nowrap">
          Clear old (₹) invoices
        </button>
      </div>

      {message && <div className="mb-3 text-sm bg-blue-50 text-blue-700 rounded-md px-3 py-2">{message}</div>}

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="bg-brand-primary/5 rounded-md px-4 py-2 text-sm text-brand-primary font-semibold">
          {invoices.length} invoice(s){status ? ` · ${status}` : ''} · Total ₹{total.toFixed(0)}
        </div>
        <button onClick={doRemind} disabled={unpaidSelected.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-md whitespace-nowrap">
          ⟟ Remind {unpaidSelected.length > 0 ? `(${unpaidSelected.length})` : ''} via WhatsApp
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3"></th>
              {['Student', 'Phone', 'Course / Grade', 'Period', 'Amount', 'Status', 'Due', ''].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td></tr>}
            {!loading && invoices.map(inv => {
              const hasDisc = Number(inv.discount_percentage || 0) > 0;
              const isPaid = (inv.status || '').toLowerCase() === 'paid';
              const phone = inv.student?.phone || inv.student_phone;
              const wa = waLinkFor(inv);
              return (
                <tr key={inv.id} className={selected.has(String(inv.id)) ? 'bg-brand-primary/5' : ''}>
                  <td className="px-3 py-3">
                    {!isPaid && <input type="checkbox" checked={selected.has(String(inv.id))} onChange={() => toggle(String(inv.id))} className="h-4 w-4" />}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">{inv.student?.name || inv.student_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {phone ? <a href={`tel:${phone}`} className="text-brand-primary hover:underline">{phone}</a> : '—'}
                  </td>
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!isPaid && wa && (
                      <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp reminder"
                        className="inline-block text-sm border border-green-500 text-green-700 px-2 py-1.5 rounded-md hover:bg-green-50 mr-2">
                        WhatsApp
                      </a>
                    )}
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
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">No invoices match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesPanel;
