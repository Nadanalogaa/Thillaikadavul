#!/usr/bin/env bash
# Build the Flutter web app and stage it into app_web/ (served by the backend
# at /app) with CACHE-BUSTED JavaScript URLs.
#
# Why: the host reverse proxy (openresty, outside this repo) overrides
# Cache-Control for *.js with max-age ~12h, so after a deploy phones keep the
# OLD main.dart.js for up to 12 hours. index.html is served no-cache, so
# pointing it at main.dart.js?v=<hash> makes every deploy fetch fresh JS.
#
# Usage: scripts/stage-app-web.sh            # build + stage + bust
#        scripts/stage-app-web.sh --no-build # re-bust the existing app_web/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "${1:-}" != "--no-build" ]]; then
  (cd "$ROOT/nadanaloga_mobile" && flutter build web --release --base-href /app/ --pwa-strategy=none)
  rm -rf "$ROOT/app_web" && mkdir -p "$ROOT/app_web"
  cp -R "$ROOT/nadanaloga_mobile/build/web/." "$ROOT/app_web/"
fi
cd "$ROOT/app_web"
H="$(shasum main.dart.js | cut -c1-10)"
# BSD (macOS) vs GNU sed in-place flag
if sed --version >/dev/null 2>&1; then SEDI=(-i); else SEDI=(-i ''); fi
# Idempotent: strip any previous ?v=… then apply the current hash.
sed "${SEDI[@]}" -E 's/(flutter_bootstrap\.js)(\?v=[0-9a-f]+)?"/\1?v='"$H"'"/' index.html
sed "${SEDI[@]}" -E "s/(register\('sw\.js)(\?v=[0-9a-f]+)?'\)/\1?v=$H')/" index.html
sed "${SEDI[@]}" -E 's/("mainJsPath":"main\.dart\.js)(\?v=[0-9a-f]+)?"/\1?v='"$H"'"/' flutter_bootstrap.js
echo "staged app_web with cache-bust v=$H"
echo "index -> bootstrap: $(grep -c "flutter_bootstrap.js?v=$H" index.html)  index -> sw: $(grep -c "sw.js?v=$H" index.html)  bootstrap -> main: $(grep -c "main.dart.js?v=$H" flutter_bootstrap.js)"
