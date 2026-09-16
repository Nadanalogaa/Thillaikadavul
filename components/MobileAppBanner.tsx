import React, { useEffect, useState } from 'react';

/**
 * Smart mobile entry point for the Flutter web app served at /app.
 *
 * - On a phone, shows a dismissible banner offering to open the app.
 * - "Open App" sends the visitor to /app (a full page load — /app is served by
 *   the backend, not react-router) and remembers the choice.
 * - A returning visitor who previously chose the app is auto-forwarded to /app.
 * - Escape hatch: visiting the site with `?web=1` clears the preference and
 *   never redirects, so the marketing site is always reachable.
 *
 * Desktop visitors never see any of this.
 */

const PREF_KEY = 'nada_prefer_app';
const DISMISS_KEY = 'nada_app_banner_dismissed';
const APP_URL = '/app/';

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
};

const safeGet = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const safeSet = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* private mode / blocked */ }
};
const safeRemove = (k: string) => {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
};

const MobileAppBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobileDevice()) return;

    const params = new URLSearchParams(window.location.search);
    // Escape hatch: ?web=1 forces the website and forgets the app preference.
    if (params.has('web')) {
      safeRemove(PREF_KEY);
      return;
    }

    // Returning app users: forward straight to the app (only from the home page,
    // so deep links to specific marketing pages still open normally).
    if (safeGet(PREF_KEY) === '1' && window.location.pathname === '/') {
      window.location.replace(APP_URL);
      return;
    }

    // Otherwise, offer the app via a dismissible banner (unless already dismissed).
    if (safeGet(DISMISS_KEY) !== '1') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const openApp = () => {
    safeSet(PREF_KEY, '1');
    window.location.href = APP_URL;
  };

  const dismiss = () => {
    safeSet(DISMISS_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="sm:hidden sticky top-0 z-50 flex items-center gap-3 bg-indigo-600 text-white px-4 py-2.5 shadow-md">
      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-base">📱</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Open the Nadanaloga app</p>
        <p className="text-[11px] text-indigo-100 leading-tight">Faster, full-screen experience</p>
      </div>
      <button
        onClick={openApp}
        className="shrink-0 bg-white text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-lg"
      >
        Open
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-indigo-100 hover:text-white text-lg leading-none px-1"
      >
        ×
      </button>
    </div>
  );
};

export default MobileAppBanner;
