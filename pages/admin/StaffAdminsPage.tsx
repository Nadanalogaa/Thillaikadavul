import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, ShieldCheck, UserCog } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/Modal';
import { isSuperAdmin } from '../../utils/adminRole';

// Super admin -> Staff admins: logins for office staff. Staff admins see and
// edit everything (students, batches, fees, expenses…) but cannot delete;
// the super admin turns them on/off and resets their password here.

interface Admin { id: number; name: string; email: string; phone: string | null; user_id: string | null; status: 'active' | 'inactive'; is_super_admin: boolean; must_change_password: boolean; created_at: string }

const send = async (url: string, method: string, body?: unknown) => {
    const r = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Something went wrong.');
    return d;
};

const StaffAdminsPage: React.FC = () => {
    const [list, setList] = useState<Admin[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Admin> | null>(null);
    const [reset, setReset] = useState<Admin | null>(null);
    const me = (() => { try { return Number(JSON.parse(localStorage.getItem('currentUser') || '{}').id); } catch { return 0; } })();

    const load = useCallback(() => fetch('/api/staff-admins', { credentials: 'include' })
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); setList(d); setError(null); }).catch(e => setError(e.message)), []);
    useEffect(() => { load(); }, [load]);

    if (!isSuperAdmin()) {
        return <AdminLayout><AdminPageHeader title="Staff admins" /><p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Only the super admin manages admin logins.</p></AdminLayout>;
    }
    const act = async (fn: () => Promise<unknown>, done: string) => {
        setMsg(null); setError(null);
        try { await fn(); setMsg(done); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    };

    return (
        <AdminLayout>
            <AdminPageHeader title="Staff admins" subtitle="Office staff who monitor and edit. Only the super admin can delete anything." />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-100">
                <ul className="list-disc space-y-0.5 pl-5">
                    <li><b>Staff admins</b> see everything, add and edit students, batches, fees, attendance and expenses.</li>
                    <li>They <b>cannot delete</b>, reverse a receipt, close a bill, or see Accounts and this page.</li>
                </ul>
                <button type="button" onClick={() => setForm({})} className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add staff admin</button>
            </div>
            {msg && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {!list && !error && <p className="py-8 text-center text-gray-500">Loading…</p>}
            <ul className="space-y-2">
                {(list || []).map(a => {
                    const self = a.id === me;
                    return (
                        <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.is_super_admin ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{a.is_super_admin ? <ShieldCheck className="h-5 w-5" /> : <UserCog className="h-5 w-5" />}</span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-gray-900 dark:text-white">{a.name}</span>
                                    {a.is_super_admin ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Super admin</span>
                                        : a.status === 'active' ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
                                            : <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">Turned off</span>}
                                    {self && <span className="text-xs text-gray-400">(you)</span>}</span>
                                <span className="block text-xs text-gray-500">{[a.email, a.phone, a.user_id].filter(Boolean).join(' · ')}{a.must_change_password && !a.is_super_admin ? ' · will set own password at first sign-in' : ''}</span>
                            </span>
                            {!a.is_super_admin && (
                                <span className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setForm(a)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:text-gray-200">Edit</button>
                                    <button type="button" onClick={() => setReset(a)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:text-gray-200"><KeyRound className="h-3.5 w-3.5" /> Reset password</button>
                                    <button type="button" onClick={() => window.confirm(a.status === 'active' ? `Turn off ${a.name}'s access? They are signed out at once.` : `Turn ${a.name}'s access back on?`)
                                        && act(() => send(`/api/staff-admins/${a.id}`, 'PUT', { status: a.status === 'active' ? 'inactive' : 'active' }), a.status === 'active' ? `${a.name}'s access turned off.` : `${a.name} can sign in again.`)}
                                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${a.status === 'active' ? 'border-amber-300 text-amber-800 hover:bg-amber-50' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}>{a.status === 'active' ? 'Turn off' : 'Turn on'}</button>
                                    <button type="button" onClick={() => window.confirm(`Remove ${a.name} as an admin? Their login stops working.`) && act(() => send(`/api/staff-admins/${a.id}`, 'DELETE'), `${a.name} removed.`)}
                                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Remove</button>
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
            {form && <AdminForm admin={form} onClose={() => setForm(null)} onSaved={m => { setForm(null); setMsg(m); load(); }} />}
            {reset && <ResetForm admin={reset} onClose={() => setReset(null)} onSaved={m => { setReset(null); setMsg(m); }} />}
        </AdminLayout>
    );
};

const fld = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-200';

const AdminForm: React.FC<{ admin: Partial<Admin>; onClose: () => void; onSaved: (m: string) => void }> = ({ admin, onClose, onSaved }) => {
    const [name, setName] = useState(admin.name || '');
    const [email, setEmail] = useState(admin.email || '');
    const [phone, setPhone] = useState(admin.phone || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setBusy(true); setError(null);
        try {
            if (admin.id) await send(`/api/staff-admins/${admin.id}`, 'PUT', { name, email, phone });
            else await send('/api/staff-admins', 'POST', { name, email, phone, password });
            onSaved(admin.id ? `${name} updated.` : `${name} added. They sign in at the admin login with ${email} and the password you set, then choose their own.`);
        } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.'); setBusy(false); }
    };
    return (
        <Modal isOpen onClose={onClose} size="md">
            <form onSubmit={submit} className="bg-white p-5 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{admin.id ? `Edit ${admin.name}` : 'Add staff admin'}</h3>
                <div className="mt-4 space-y-3">
                    <label className={lbl}>Name<input required value={name} onChange={e => setName(e.target.value)} className={fld} /></label>
                    <label className={lbl}>Email (used to sign in)<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={fld} /></label>
                    <label className={lbl}>Phone <span className="font-normal text-gray-400">(optional)</span><input value={phone} onChange={e => setPhone(e.target.value)} className={fld} inputMode="tel" /></label>
                    {!admin.id && <label className={lbl}>First password <span className="font-normal text-gray-400">(at least 6 characters; they change it at first sign-in)</span><input required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className={fld} /></label>}
                </div>
                {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-200">Cancel</button>
                    <button type="submit" disabled={busy} className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : admin.id ? 'Save' : 'Add admin'}</button>
                </div>
            </form>
        </Modal>
    );
};

const ResetForm: React.FC<{ admin: Admin; onClose: () => void; onSaved: (m: string) => void }> = ({ admin, onClose, onSaved }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null);
        try { await send(`/api/staff-admins/${admin.id}`, 'PUT', { password }); onSaved(`New password set for ${admin.name}. They choose their own at the next sign-in.`); }
        catch (err) { setError(err instanceof Error ? err.message : 'Could not reset.'); }
    };
    return (
        <Modal isOpen onClose={onClose} size="md">
            <form onSubmit={submit} className="bg-white p-5 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset password · {admin.name}</h3>
                <label className={`${lbl} mt-4`}>New password (at least 6 characters)<input required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className={fld} /></label>
                {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-200">Cancel</button>
                    <button type="submit" className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white">Set password</button>
                </div>
            </form>
        </Modal>
    );
};

export default StaffAdminsPage;
