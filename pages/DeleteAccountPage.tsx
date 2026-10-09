import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

// Account deletion page — Google Play requires a publicly reachable page where
// users can ask for their account and data to be deleted without installing the
// app. The in-app route is Profile → Delete my account.
const DeleteAccountPage: React.FC = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [form, setForm] = useState({ name: '', identifier: '', reason: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.identifier.trim()) {
      setError('Please enter the email address or phone number of the account.');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const response = await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Request failed');
      setStatus('sent');
    } catch {
      setStatus('error');
      setError('Could not send the request. Please email nadanaloga2026@gmail.com instead.');
    }
  };

  const card = `rounded-2xl border p-6 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;
  const label = `mb-1 block text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className={`text-3xl sm:text-4xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
          Delete your account
        </h1>
        <p className={`mt-3 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          Nadanaloga Fine Arts Academy · App: Nadanaloga (com.nadanaloga.nadanaloga_mobile)
        </p>

        <div className="mt-10 space-y-6">
          <section className={card}>
            <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>In the app</h2>
            <ol className={`mt-3 space-y-2 list-decimal pl-5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Open the Nadanaloga app and sign in.</li>
              <li>Go to <strong>More → Profile</strong>.</li>
              <li>Scroll to the bottom and tap <strong>Delete my account</strong>.</li>
              <li>Confirm. Your account closes straight away and you are signed out.</li>
            </ol>
          </section>

          <section className={card}>
            <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>What is deleted</h2>
            <ul className={`mt-3 space-y-2 list-disc pl-5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li><strong>Deleted:</strong> your login, name, email address, phone number, address, date of birth, profile photo, course enrolments, class schedules and notifications — along with the student profiles of your children linked to the account.</li>
              <li><strong>Removed within 30 days:</strong> the above is taken out of our systems entirely, including backups taken before the request.</li>
              <li><strong>Kept:</strong> invoices and payment receipts, which Indian accounting and tax rules require us to hold for up to 8 years. They are stored separately and are not used to contact you.</li>
            </ul>
          </section>

          <section className={card}>
            <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Request deletion without the app</h2>
            <p className={`mt-2 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
              Fill this in and we will delete the account within 7 days and confirm by email. You can also write to{' '}
              <a className="text-indigo-600 dark:text-indigo-400 underline" href="mailto:nadanaloga2026@gmail.com">nadanaloga2026@gmail.com</a>.
            </p>

            {status === 'sent' ? (
              <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                Request received. We will delete the account within 7 days and confirm by email.
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4">
                <div>
                  <label className={label} htmlFor="del-name">Your name</label>
                  <input id="del-name" className="form-input w-full" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className={label} htmlFor="del-id">Email address or phone number on the account *</label>
                  <input id="del-id" required className="form-input w-full" value={form.identifier}
                    onChange={e => setForm({ ...form, identifier: e.target.value })} />
                </div>
                <div>
                  <label className={label} htmlFor="del-reason">Reason (optional)</label>
                  <textarea id="del-reason" rows={3} className="form-textarea w-full" value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })} />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button type="submit" disabled={status === 'sending'}
                  className="rounded-md bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {status === 'sending' ? 'Sending…' : 'Request account deletion'}
                </button>
              </form>
            )}
          </section>

          <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            See also our <Link className="text-indigo-600 dark:text-indigo-400 underline" to="/privacy-policy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountPage;
