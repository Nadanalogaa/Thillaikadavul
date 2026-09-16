import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface ProfilePickerModalProps {
  isOpen: boolean;
  profiles: UserProfile[];
  onPick: (profile: UserProfile) => Promise<void>;
}

// "Continue as…" — shown after login when one phone number unlocks several
// profiles (e.g. a teacher who is also a student, plus her children).
// Not dismissible: a profile must be chosen to enter the app.
const ProfilePickerModal: React.FC<ProfilePickerModalProps> = ({ isOpen, profiles, onPick }) => {
  const { theme } = useTheme();
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dark = theme === 'dark';

  if (!isOpen) return null;

  const pick = async (p: UserProfile) => {
    setError(null);
    setBusyId(p.id);
    try {
      await onPick(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that profile.');
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Continue as</h2>
        <p className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          This login has more than one profile. Choose who you want to continue as — you can switch later.
        </p>
        <div className="mt-4 space-y-2">
          {profiles.map(p => {
            const busy = busyId === p.id;
            const avatar = p.photo_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=4f46e5&color=fff`;
            return (
              <button
                key={p.id}
                onClick={() => pick(p)}
                disabled={busyId !== null}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors disabled:opacity-60 ${
                  dark ? 'border-gray-700 hover:bg-gray-700/60' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                  <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {p.role}{p.kind === 'child' ? ' · Child' : ''}
                    {p.courses && p.courses.length > 0 ? ` · ${p.courses.join(', ')}` : ''}
                  </p>
                </div>
                {busy
                  ? <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Opening…</span>
                  : <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">Open →</span>}
              </button>
            );
          })}
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default ProfilePickerModal;
