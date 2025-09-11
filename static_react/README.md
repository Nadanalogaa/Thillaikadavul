Rayo static HTML → React component

What’s included
- `src/RayoLanding.jsx`: A React component that renders the original static page inside React without iframes and preserves styles, animations, and parallax.

How it works
- Injects the same CSS (`/css/loader.min.css`, `/css/plugins.min.css`, `/css/main.min.css`, `/css/custom.css`) into `document.head`.
- Fetches the prototype HTML, extracts the `<body>` markup, and mounts it via `dangerouslySetInnerHTML`.
- Loads the original JS bundles (`/js/libs.min.js`, then `/js/app.min.js`) to initialize animations and interactions.

Setup
1) Move assets to your React app’s public root so they are served at these paths:
   - `/css/*`, `/js/*`, `/images/*`, `/fonts/*`, `/media/*`
   Tip: copy the `css`, `js`, `images`, `fonts`, and `media` folders into your React app’s `public/` directory.

2) Place the prototype HTML where it can be fetched by the app (e.g. `public/rayo/index.html`).

3) Import and use the component in your React app:

   import RayoLanding from "./src/RayoLanding";
   
   export default function Page() {
     return <RayoLanding htmlPath="/rayo/index.html" />;
   }

Notes
- Do not use the root `/index.html` of your React app as `htmlPath` (that file is used by the bundler). Instead, place the prototype at a different public path (e.g., `/rayo/index.html`).
- The component avoids duplicate CSS/JS by adding identifiable `id`s to injected tags.
- No iframes are used; the original DOM is mounted directly in React.

