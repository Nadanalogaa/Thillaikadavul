import React, { useState, useEffect, useCallback } from 'react';
import { getReport, reportCsvUrl } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';

type ReportType = 'collections' | 'outstanding' | 'students';

const REPORTS: { key: ReportType; label: string }[] = [
  { key: 'collections', label: 'Fee Collections' },
  { key: 'outstanding', label: 'Outstanding Fees' },
  { key: 'students', label: 'Student Roster' },
];

const COLUMNS: Record<ReportType, { key: string; label: string }[]> = {
  collections: [
    { key: 'date', label: 'Date' }, { key: 'student', label: 'Student' },
    { key: 'course', label: 'Course/Grade' }, { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method' }, { key: 'txn', label: 'Transaction ID' },
  ],
  outstanding: [
    { key: 'student', label: 'Student' }, { key: 'phone', label: 'Phone' },
    { key: 'course', label: 'Course/Grade' }, { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' }, { key: 'billing_period', label: 'Period' },
    { key: 'due', label: 'Due' },
  ],
  students: [
    { key: 'student', label: 'Student' }, { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' }, { key: 'courses', label: 'Courses' },
    { key: 'grades', label: 'Grades' }, { key: 'joined', label: 'Joined' },
    { key: 'status', label: 'Status' },
  ],
};

const ReportsPage: React.FC = () => {
  const [type, setType] = useState<ReportType>('collections');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const params = useCallback((): Record<string, string> => {
    const p: Record<string, string> = {};
    if (type === 'collections') {
      if (from) p.from = from;
      if (to) p.to = to;
    } else if (status !== 'all') {
      p.status = status;
    }
    return p;
  }, [type, from, to, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReport(type, params());
      setRows(data.rows || []);
      setTotal(typeof data.total === 'number' ? data.total : null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [type, params]);

  useEffect(() => { load(); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const cols = COLUMNS[type];

  return (
    <AdminLayout>
      <AdminPageHeader title="Reports" subtitle="Fee collections, outstanding dues and student roster — filter and download as CSV." />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Report</label>
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)}
            className="border border-gray-300 rounded-md px-3 py-2">
            {REPORTS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>

        {type === 'collections' ? (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2" />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2">
              {(type === 'outstanding' ? ['all', 'pending', 'overdue'] : ['all', 'active', 'inactive']).map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        )}

        <button onClick={load} className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md">
          Apply
        </button>
        <a href={reportCsvUrl(type, params())} className="border border-brand-primary text-brand-primary font-semibold px-4 py-2 rounded-md hover:bg-brand-primary/10">
          ⬇ Download CSV
        </a>
      </div>

      {total !== null && (
        <div className="mt-4 bg-brand-primary/5 rounded-md px-4 py-3 text-brand-primary font-semibold">
          {type === 'collections' ? 'Total collected' : 'Total outstanding'}: ₹{Number(total).toFixed(0)} · {rows.length} rows
        </div>
      )}

      <div className="mt-4 bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td></tr>}
            {!loading && rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {c.key === 'amount' ? `₹${Number(r[c.key] || 0).toFixed(0)}` : (r[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-gray-500">No data for this report/filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
