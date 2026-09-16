import React, { useState } from 'react';
import { setPassword } from '../api';
import { useTheme } from '../contexts/ThemeContext';

interface SetPasswordModalProps {
  isOpen: boolean;
  onDone: () => void;
}

// Forced first-login password change — cannot be dismissed until a new password is set.
const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ isOpen, onDone }) => {
  const { theme } = useTheme();
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dark = theme === 'dark';

  if (!isOpen) return null;

  const inputCls = `mt-1 block w-full px-4 py-3 rounded-xl border-2 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 ${
    dark ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400'
         : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`;
  const labelCls = `block text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await setPassword(password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Set your password</h2>
        <p className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          For your security, please set your own password before continuing. You're using the default password given by the academy.
        </p>
        <form onSubmit={submit} className="space-y-4 mt-4">
          <div>
            <label className={labelCls}>New password</label>
            <input type="password" className={inputCls} value={password} autoFocus
              onChange={e => setPasswordValue(e.target.value)} placeholder="At least 6 characters" disabled={loading} />
          </div>
          <div>
            <label className={labelCls}>Confirm new password</label>
            <input type="password" className={inputCls} value={confirm}
              onChange={e => setConfirm(e.target.value)} disabled={loading} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save & continue'}
          </button>
          {/* "Later" so a failure here can never lock someone out of the app —
              they are prompted again on the next login. Matches the mobile sheet. */}
          <button type="button" disabled={loading} onClick={onDone}
            className={`w-full py-2 text-sm font-medium ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} disabled:opacity-50`}>
            Later
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordModal;
