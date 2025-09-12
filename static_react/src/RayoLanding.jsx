import React, { useEffect, useRef, useState } from "react";

// RayoLanding
// - Loads the original static HTML into React without iframes
// - Injects the same CSS and JS to preserve styles/animations/parallax
// - Expects the assets folders (`css`, `js`, `images`, `fonts`, `media`) to be publicly served
//   at the app origin (e.g., put them under your React app's `public/`)
//
// Usage:
// <RayoLanding htmlPath="/index.html" />
// If you placed the static html somewhere else (e.g. /rayo/index.html), pass that path.

const CSS_LINKS = [
  // Use assets from our app's public/static folder
  { href: "/static/css/loader.min.css", id: "rayo-css-loader" },
  { href: "/static/css/plugins.min.css", id: "rayo-css-plugins" },
  { href: "/static/css/main.min.css", id: "rayo-css-main" },
  { href: "/static/css/custom.css", id: "rayo-css-custom" },
];

// Inline CTA styles found in <head> of the prototype HTML
const INLINE_CTA_STYLE = `
  .tkd-cta-row{position:absolute;left:0;right:0;top:56%;transform:translateY(-50%);display:flex;justify-content:space-between;gap:24px;padding:0 24px;pointer-events:none}
  .tkd-cta{pointer-events:auto;flex:0 1 420px;max-width:44%;border-radius:20px;padding:20px 24px;color:#fff;box-shadow:0 12px 30px rgba(16,24,40,.25);backdrop-filter:blur(8px)}
  .tkd-cta h3{margin:0 0 8px 0;font-size:22px;line-height:1.25}
  .tkd-cta p{margin:0 0 16px 0;opacity:.9}
  .tkd-cta .btns{display:flex;gap:12px;flex-wrap:wrap}
  .tkd-cta .btn{display:inline-flex;align-items:center;justify-content:center;height:42px;padding:0 18px;border-radius:12px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,.35);transition:all .2s ease}
  .tkd-cta .btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,24,40,.2)}
  .tkd-cta.demo{background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)}
  .tkd-cta.auth{background:linear-gradient(135deg,#7C3AED 0%,#4338CA 100%)}
  .tkd-cta .btn.light{background:#fff;color:#4338CA;border-color:#fff}
  .tkd-cta .btn.ghost{background:transparent;color:#fff}
  @media (max-width: 1024px){.tkd-cta-row{top:auto;transform:none;position:static;margin:24px 0 0;flex-direction:column;align-items:stretch}.tkd-cta{max-width:100%;flex-basis:auto}}
`;

const SCRIPT_SOURCES = [
  { src: "/static/js/libs.min.js", id: "rayo-js-libs" },
  { src: "/static/js/app.min.js", id: "rayo-js-app" },
];

function ensureCssInjected() {
  CSS_LINKS.forEach(({ href, id }) => {
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.id = id;
      document.head.appendChild(link);
    }
  });

  if (!document.getElementById("rayo-inline-cta-style")) {
    const style = document.createElement("style");
    style.type = "text/css";
    style.id = "rayo-inline-cta-style";
    style.appendChild(document.createTextNode(INLINE_CTA_STYLE));
    document.head.appendChild(style);
  }
}

function loadScriptsSequentially(sources) {
  return sources.reduce((p, { src, id }) => {
    return p.then(
      () =>
        new Promise((resolve, reject) => {
          if (document.getElementById(id)) return resolve();
          const s = document.createElement("script");
          s.src = src;
          s.async = false; // preserve execution order
          s.id = id;
          s.onload = () => resolve();
          s.onerror = reject;
          document.body.appendChild(s);
        })
    );
  }, Promise.resolve());
}

function extractBodyHtml(htmlText) {
  // Use DOMParser to robustly extract the body content
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  const body = doc.body;
  if (!body) return htmlText;

  // Remove any script tags from the extracted content; we load scripts separately
  const cloned = body.cloneNode(true);
  cloned.querySelectorAll("script").forEach((el) => el.parentNode && el.parentNode.removeChild(el));

  return cloned.innerHTML;
}

function buildCtaSection(onLoginClick) {
  // Match template section wrapper class for spacing
  const wrapper = document.createElement("div");
  wrapper.className = "mxd-section nad-cta";
  wrapper.setAttribute("data-injected-cta", "true");
  wrapper.setAttribute("aria-label", "Primary actions");

  wrapper.innerHTML = `
    <div class="nad-cta__wrap">
      <div class="nad-cta__card demo">
        <div class="nad-cta__content">
          <h2 class="nad-cta__title">Book a Demo Class</h2>
          <p class="nad-cta__text">Experience our teaching style with a complimentary session.</p>
        </div>
        <div class="nad-cta__actions nad-cta__actions--split">
          <a class="nad-btn nad-btn--primary" href="/contact" data-action="enroll">Enroll Now</a>
        </div>
      </div>
      <div class="nad-cta__card auth">
        <div class="nad-cta__content">
          <h2 class="nad-cta__title">Login / Register</h2>
          <p class="nad-cta__text">Access your student portal or create a new account.</p>
        </div>
        <div class="nad-cta__actions nad-cta__actions--split">
          <a class="nad-btn nad-btn--dark" href="#" data-action="login">Login</a>
          <a class="nad-btn nad-btn--ghost" href="/register" data-action="register">Register</a>
        </div>
      </div>
    </div>
  `;

  // Handle Login button click
  const loginBtn = wrapper.querySelector('[data-action="login"]');
  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof onLoginClick === "function") onLoginClick();
    });
  }

  // Handle Enroll Now button click - navigate using React Router
  const enrollBtn = wrapper.querySelector('[data-action="enroll"]');
  if (enrollBtn) {
    enrollBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Use React Router navigation instead of direct href
      window.history.pushState({}, '', '/contact');
      const navEvent = new PopStateEvent('popstate');
      window.dispatchEvent(navEvent);
    });
  }

  // Handle Register button click - navigate using React Router
  const registerBtn = wrapper.querySelector('[data-action="register"]');
  if (registerBtn) {
    registerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Use React Router navigation instead of direct href
      window.history.pushState({}, '', '/register');
      const navEvent = new PopStateEvent('popstate');
      window.dispatchEvent(navEvent);
    });
  }

  return wrapper;
}


export default function RayoLanding({ htmlPath = "/static/index.html", onLoginClick, user = null, onLogout = () => {} }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    ensureCssInjected();

    // Fetch the prototype HTML and inject the body markup
    fetch(htmlPath, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load HTML: ${res.status}`);
        return res.text();
      })
      .then((htmlText) => {
        if (!mounted) return;
        const bodyHtml = extractBodyHtml(htmlText);
        if (containerRef.current) {
          containerRef.current.innerHTML = bodyHtml;
          
        }
        // Load required scripts once (libs then app)
        return loadScriptsSequentially(SCRIPT_SOURCES).then(() => {
          // Re-dispatch lifecycle events for templates that initialize on load/ready
          try {
            document.dispatchEvent(new Event('DOMContentLoaded'));
          } catch {}
          try {
            window.dispatchEvent(new Event('load'));
          } catch {}

          // Force-complete the loader if present
          const loader = document.getElementById('loader');
          if (loader) {
            loader.classList.add('loaded');
            document.body && document.body.classList && document.body.classList.add('loaded');
            setTimeout(() => {
              try { loader.remove(); } catch {}
            }, 600);
          }

          // Ensure header visibility even if GSAP intro didn't run
          const header = document.getElementById('header') || document.querySelector('.mxd-header');
          if (header) {
            header.classList.add('loaded');
            header.style.transform = 'translateY(0)';
            const fades = header.querySelectorAll('.loading__fade');
            fades.forEach((el) => {
              el.classList.remove('loading__fade');
              el.style.opacity = '1';
            });
          }

          // Handle any existing login/register buttons in the static HTML
          const staticLoginButtons = document.querySelectorAll('a[href*="/login"], a[href*="/admin/login"]');
          staticLoginButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              if (typeof onLoginClick === "function") onLoginClick();
            });
          });

          // Handle register buttons
          const staticRegisterButtons = document.querySelectorAll('a[href*="/register"]');
          staticRegisterButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/register');
              const navEvent = new PopStateEvent('popstate');
              window.dispatchEvent(navEvent);
            });
          });

          // Handle contact/enroll buttons
          const staticContactButtons = document.querySelectorAll('a[href*="/contact"]');
          staticContactButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/contact');
              const navEvent = new PopStateEvent('popstate');
              window.dispatchEvent(navEvent);
            });
          });

          // Initialize theme from localStorage and hook the switcher
          const applyTheme = (theme) => {
            const root = document.documentElement;
            root.classList.remove('theme-light', 'theme-dark');
            root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
            try { localStorage.setItem('theme', theme); } catch {}
            const switcher = document.getElementById('color-switcher');
            if (switcher) switcher.setAttribute('aria-checked', theme === 'dark' ? 'false' : 'true');
          };
          const saved = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
          applyTheme(saved === 'dark' ? 'dark' : 'light');
          const switcher = document.getElementById('color-switcher');
          if (switcher) {
            switcher.addEventListener('click', (e) => {
              e.preventDefault();
              const isDark = document.documentElement.classList.contains('theme-dark');
              applyTheme(isDark ? 'light' : 'dark');
            }, { once: false });
          }

          // Remove unwanted blocks: bottom two stats cards; keep top two. Also remove Our Partners section
          try {
            const removed = new Set();
            const removeSectionOf = (el) => {
              if (!el) return;
              const sec = el.closest('.mxd-section');
              if (sec && !removed.has(sec)) { sec.parentNode && sec.parentNode.removeChild(sec); removed.add(sec); }
            };
            // Remove only bottom two statistics cards (ids: stats-counter-3 and stats-counter-4)
            const removeStatsItemById = (id) => {
              const cnt = document.getElementById(id);
              if (cnt) {
                const item = cnt.closest('.mxd-stats-cards__item');
                if (item && item.parentNode) item.parentNode.removeChild(item);
              }
            };
            removeStatsItemById('stats-counter-3');
            removeStatsItemById('stats-counter-4');
            // Marquee with "Our Partners" text
            document.querySelectorAll('.marquee__text').forEach((p) => {
              if (p.textContent && p.textContent.toLowerCase().includes('our partners')) {
                removeSectionOf(p);
              }
            });
            // Partners cards grid
            document.querySelectorAll('.mxd-partners-cards').forEach((el) => removeSectionOf(el));
          } catch {}

          // Patch header controls to reflect auth state
          const getDashboardPath = (role) => {
            const r = (role || '').toLowerCase();
            if (r.includes('admin')) return '/admin/dashboard';
            if (r.includes('teacher')) return '/dashboard/teacher';
            return '/dashboard/student';
          };
          const controls = document.querySelector('.mxd-header__controls');
          if (controls) {
            const loginLink = controls.querySelector('a[href="/login"]');
            const enrollLink = controls.querySelector('a[href="/register"]');

            if (user) {
              controls.innerHTML = '';
              const colorSwitcher = document.createElement('button');
              colorSwitcher.id = 'color-switcher';
              colorSwitcher.className = 'mxd-color-switcher';
              colorSwitcher.setAttribute('type','button');
              colorSwitcher.setAttribute('role','switch');
              colorSwitcher.setAttribute('aria-label','light/dark mode');
              colorSwitcher.setAttribute('aria-checked','true');
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
              if (loginLink) loginLink.addEventListener('click', (e) => { e.preventDefault(); onLoginClick(); });
              if (enrollLink) enrollLink.setAttribute('target','_parent');
            }
          }

          // Pin the "Our Programs" left panel under the header while right column scrolls
          try {
            const pinTarget = document.querySelector('.mxd-pinned-projects__static-inner');
            const section = document.querySelector('.mxd-pinned-projects');
            const headerEl = document.querySelector('.mxd-header');
            const gsap = window.gsap;
            const ScrollTrigger = window.ScrollTrigger;
            if (pinTarget && section) {
              const headerH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 72;
              const offset = headerH + 28; // slightly lower under header
              document.documentElement.style.setProperty('--header-offset', `${offset}px`);

              if (gsap && ScrollTrigger) {
                // Clean existing pin triggers for idempotency
                ScrollTrigger.getAll().forEach(t => {
                  if (t.vars && t.vars.pin === pinTarget) t.kill();
                });

                ScrollTrigger.create({
                  trigger: section,
                  start: `top+=${offset} top`,
                  end: 'bottom bottom',
                  pin: pinTarget,
                  pinSpacing: true, // keep layout space for smoother bi-directional scroll
                  anticipatePin: 1,
                  invalidateOnRefresh: true,
                });

                window.addEventListener('resize', () => {
                  const newH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 72;
                  const newOffset = newH + 28;
                  document.documentElement.style.setProperty('--header-offset', `${newOffset}px`);
                  ScrollTrigger.refresh();
                });

                // A delayed refresh after initial paint helps when background images
                // set heights asynchronously (prevents jumpiness on reverse scroll)
                setTimeout(() => { try { ScrollTrigger.refresh(); } catch {} }, 400);
              }
            }
          } catch {}
        });
      })
      .catch((e) => {
        if (mounted) setError(e.message || String(e));
      });

    return () => {
      mounted = false;
      // We intentionally leave CSS/JS in place to avoid reloading between navigations
      // and to preserve animations state across mounts where applicable.
    };
  }, [htmlPath]);

  // After the content and scripts load, inject CTA under the header
  useEffect(() => {
    const tryInsertCTA = () => {
      const header = document.getElementById("header") || document.querySelector(".mxd-header");
      const pageContent = document.getElementById("mxd-page-content") || document.querySelector(".mxd-page-content");
      if (!header || !pageContent) return false;

      // If already inserted, stop
      if (document.querySelector(".nad-cta[data-injected-cta]")) return true;

      // Remove any existing CTAs from the static HTML to avoid duplicates
      document.querySelectorAll(".nad-cta:not([data-injected-cta])").forEach((el) => el.parentNode && el.parentNode.removeChild(el));

      const cta = buildCtaSection(onLoginClick);
      header.parentNode.insertBefore(cta, pageContent);

      // Run a delayed cleanup in case the template adds another CTA later
      setTimeout(() => {
        document.querySelectorAll(".nad-cta:not([data-injected-cta])").forEach((el) => el.parentNode && el.parentNode.removeChild(el));
      }, 1200);
      setTimeout(() => {
        document.querySelectorAll(".nad-cta:not([data-injected-cta])").forEach((el) => el.parentNode && el.parentNode.removeChild(el));
      }, 2500);
      return true;
    };

    // Attempt immediately and then retry shortly as the static DOM settles
    const done = tryInsertCTA();
    const timers = [];
    if (!done) timers.push(setTimeout(tryInsertCTA, 200));
    timers.push(setTimeout(tryInsertCTA, 800));
    return () => { timers.forEach(clearTimeout); };
  }, [onLoginClick, user]);

  if (error) {
    return (
      <div style={{ padding: 16, color: "#b00020" }}>
        Failed to render page: {error}
      </div>
    );
  }

  // We render into a div container. Scripts are loaded via useEffect.
  return <div ref={containerRef} data-rayo-container />;
}
