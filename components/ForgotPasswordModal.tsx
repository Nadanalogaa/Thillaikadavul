import React, { useState } from 'react';
import { forgotPassword, resetPassword } from '../api';
import { useTheme } from '../contexts/ThemeContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, initialIdentifier }) => {
  const { theme } = useTheme();
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState(initialIdentifier || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep(1); setOtp(''); setPassword(''); setConfirm('');
    setEmailHint(null); setError(null); setInfo(null);
  };
  const close = () => { reset(); onClose(); };

  const dark = theme === 'dark';
  const inputCls = `mt-1 block w-full px-4 py-3 rounded-xl border-2 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 ${
    dark ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400'
         : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:bg-white'}`;
  const labelCls = `block text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`;

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!identifier.trim()) { setError('Enter your phone number, email, or ID.'); return; }
    setLoading(true);
    try {
      const r = await forgotPassword(identifier.trim());
      setEmailHint(r.emailHint || null);
      setInfo(r.emailHint ? `A 6-digit code was emailed to ${r.emailHint}.` : 'If an account exists, a code was emailed to it.');
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code.');
    } finally { setLoading(false); }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp.trim()) { setError('Enter the code from your email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await resetPassword(identifier.trim(), otp.trim(), password);
      setInfo('Password updated! You can now log in with your new password.');
      setError(null);
      setTimeout(close, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={close}>
      <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${dark ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            {step === 1 ? 'Reset your password' : 'Enter code & new password'}
          </h2>
          <button onClick={close} className={`text-2xl leading-none ${dark ? 'text-gray-400' : 'text-gray-500'} hover:opacity-70`}>&times;</button>
        </div>

        {step === 1 ? (
          <form onSubmit={requestCode} className="space-y-4">
            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
              Enter your phone number, email, or NDA ID. We'll email a reset code to the address on your account.
            </p>
            <div>
              <label className={labelCls}>Phone number, Email, or ID</label>
              <input className={inputCls} value={identifier} onChange={e => setIdentifier(e.target.value)}
                placeholder="Phone number / Email / NDA-ID" disabled={loading} autoFocus />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={doReset} className="space-y-4">
            {info && <p className={`text-sm rounded-md px-3 py-2 ${dark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'}`}>{info}</p>}
            <div>
              <label className={labelCls}>6-digit code</label>
              <input className={inputCls} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" inputMode="numeric" disabled={loading} autoFocus />
            </div>
            <div>
              <label className={labelCls}>New password</label>
              <input type="password" className={inputCls} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters" disabled={loading} />
            </div>
            <div>
              <label className={labelCls}>Confirm new password</label>
              <input type="password" className={inputCls} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={loading} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setStep(1); setError(null); setInfo(null); }} disabled={loading}
                className={`flex-1 py-3 rounded-xl font-medium border ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                Back
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
                {loading ? 'Saving…' : 'Reset password'}
              </button>
            </div>
            <button type="button" onClick={requestCode} disabled={loading}
              className={`w-full text-sm ${dark ? 'text-indigo-400' : 'text-indigo-600'} hover:underline`}>
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
