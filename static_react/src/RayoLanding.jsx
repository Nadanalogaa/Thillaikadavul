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
  const wrapper = document.createElement("section");
  wrapper.className = "nad-cta";
  wrapper.setAttribute("aria-label", "Primary actions");

  wrapper.innerHTML = `
    <div class="nad-cta__wrap">
      <div class="nad-cta__card demo">
        <div class="nad-cta__content">
          <h2 class="nad-cta__title">Book a Demo Class</h2>
          <p class="nad-cta__text">Experience our teaching style with a complimentary session.</p>
        </div>
        <div class="nad-cta__actions nad-cta__actions--split">
          <a class="nad-btn nad-btn--primary" href="/contact">Book Now</a>
        </div>
      </div>
      <div class="nad-cta__card auth">
        <div class="nad-cta__content">
          <h2 class="nad-cta__title">Login / Register</h2>
          <p class="nad-cta__text">Access your student portal or create a new account.</p>
        </div>
        <div class="nad-cta__actions nad-cta__actions--split">
          <a class="nad-btn nad-btn--dark" href="#" data-action="login">Login</a>
          <a class="nad-btn nad-btn--ghost" href="/register">Register</a>
        </div>
      </div>
    </div>
  `;

  const loginBtn = wrapper.querySelector('[data-action="login"]');
  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof onLoginClick === "function") onLoginClick();
    });
  }
  return wrapper;
}

export default function RayoLanding({ htmlPath = "/static/index.html", onLoginClick }) {
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

      // If already inserted, skip
      if (document.querySelector("section.nad-cta")) return true;

      const cta = buildCtaSection(onLoginClick);
      header.parentNode.insertBefore(cta, pageContent);
      return true;
    };

    // Attempt immediately and then retry shortly as the static DOM settles
    if (!tryInsertCTA()) {
      const t1 = setTimeout(tryInsertCTA, 200);
      const t2 = setTimeout(tryInsertCTA, 800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [onLoginClick]);

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
