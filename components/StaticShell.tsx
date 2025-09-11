import React, { useEffect, useRef } from 'react';
import type { User } from '../types';
import { loadAllStaticAssets } from '../utils/staticAssets';

interface StaticShellProps {
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

function getDashboardPath(role?: string) {
  if (!role) return '/dashboard/student';
  const r = String(role).toLowerCase();
  if (r.includes('admin')) return '/admin/dashboard';
  if (r.includes('teacher')) return '/dashboard/teacher';
  return '/dashboard/student';
}

export default function StaticShell({ user, onLoginClick, onLogout, children }: StaticShellProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    loadAllStaticAssets();

    const inject = async () => {
      try {
        const res = await fetch('/static/index.html', { credentials: 'same-origin' });
        const html = await res.text();
        if (!mounted) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const header = doc.getElementById('header');
        const footer = doc.getElementById('mxd-footer');

        if (header && headerRef.current) {
          headerRef.current.innerHTML = header.outerHTML;
        }
        if (footer && footerRef.current) {
          footerRef.current.innerHTML = footer.outerHTML;
        }

        // Patch header controls for login/modal/dashboard/logout
        const scope = headerRef.current || document;
        const controls = scope.querySelector('.mxd-header__controls');
        if (controls) {
          const loginLink = controls.querySelector('a[href="/login"]') as HTMLAnchorElement | null;
          const enrollLink = controls.querySelector('a[href="/register"]') as HTMLAnchorElement | null;

          if (user) {
            // Replace with Dashboard + Welcome + Logout
            controls.innerHTML = '';
            const colorSwitcher = document.createElement('button');
            colorSwitcher.id = 'color-switcher';
            colorSwitcher.className = 'mxd-color-switcher';
            colorSwitcher.setAttribute('type', 'button');
            colorSwitcher.setAttribute('role', 'switch');
            colorSwitcher.setAttribute('aria-label', 'light/dark mode');
            colorSwitcher.setAttribute('aria-checked', 'true');
            controls.appendChild(colorSwitcher);

            const dash = document.createElement('a');
            dash.className = 'btn btn-anim btn-default btn-mobile-icon btn-outline slide-right-up';
            dash.href = getDashboardPath(user.role);
            dash.innerHTML = '<span class="btn-caption">Dashboard</span><i class="ph-bold ph-arrow-up-right"></i>';
            controls.appendChild(dash);

            const welcome = document.createElement('span');
            welcome.className = 'btn btn-anim btn-default btn-mobile-icon btn-ghost slide-right-up';
            welcome.textContent = `Welcome, ${user.name || 'User'}`;
            controls.appendChild(welcome);

            const logout = document.createElement('a');
            logout.href = '#logout';
            logout.className = 'btn btn-anim btn-default btn-mobile-icon btn-outline slide-right-up';
            logout.innerHTML = '<span class="btn-caption">Logout</span><i class="ph-bold ph-sign-out"></i>';
            logout.addEventListener('click', (e) => { e.preventDefault(); onLogout(); });
            controls.appendChild(logout);
          } else {
            // Wire the Login button to open modal instead of navigating
            if (loginLink) {
              loginLink.addEventListener('click', (e) => { e.preventDefault(); onLoginClick(); });
            }
            // Leave register as-is
            if (enrollLink) {
              enrollLink.setAttribute('target', '_parent');
            }
          }
        }
      } catch (e) {
        // swallow
      }
    };

    inject();
    return () => { mounted = false; };
  }, [user, onLoginClick, onLogout]);

  return (
    <div className="static-shell">
      <div ref={headerRef} />
      <main className="mxd-page-content">{children}</main>
      <div ref={footerRef} />
    </div>
  );
}

