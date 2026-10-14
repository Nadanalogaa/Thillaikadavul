"""Regenerate every app and web icon from appIcon.png in the repo root.

Run after changing the logo:   python3 scripts/generate-icons.py
Then rebuild the Flutter web bundle:   scripts/stage-app-web.sh

The source is a transparent-background logo whose globe interior is also
transparent, so icons are composited on white: without it the artwork reads
as disconnected strokes on a dark launcher, and iOS rejects alpha outright.

Covers: the website favicons + apple-touch-icon, the Flutter web icons and
maskable icons served at /app, the Android launcher mipmaps, the iOS
AppIcon set, and the 512px Google Play listing icon.
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = Image.open(os.path.join(ROOT, 'appIcon.png')).convert('RGBA')

def render(size, content=0.86, bg=(255, 255, 255), alpha=False):
    """Square icon: logo scaled to `content` of the canvas, centred."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0) if alpha else bg + (255,))
    box = int(round(size * content))
    w, h = SRC.size
    scale = min(box / w, box / h)
    art = SRC.resize((max(1, int(round(w * scale))), max(1, int(round(h * scale)))), Image.LANCZOS)
    canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
    return canvas if alpha else canvas.convert('RGB')

def save(img, path):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    img.save(full, 'PNG', optimize=True)
    print(f'{os.path.getsize(full):>8} B  {path}')

# --- Website (public/ is copied to the site root by Vite) ---
for size, name in ((16, 'favicon-16.png'), (32, 'favicon-32.png'),
                   (180, 'apple-touch-icon.png'), (512, 'favicon.png')):
    save(render(size, content=0.92), f'public/{name}')

# --- Flutter web (served at /app) ---
save(render(64, content=0.92), 'nadanaloga_mobile/web/favicon.png')
for size in (192, 512):
    save(render(size, content=0.88), f'nadanaloga_mobile/web/icons/Icon-{size}.png')
    # Maskable: launchers crop to a circle, so keep art inside the safe zone.
    save(render(size, content=0.60), f'nadanaloga_mobile/web/icons/Icon-maskable-{size}.png')

# --- Android launcher ---
for d, size in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
    save(render(size, content=0.84), f'nadanaloga_mobile/android/app/src/main/res/mipmap-{d}/ic_launcher.png')

# --- iOS (no alpha anywhere) ---
IOS = [('20x20@1x',20),('20x20@2x',40),('20x20@3x',60),('29x29@1x',29),('29x29@2x',58),
       ('29x29@3x',87),('40x40@1x',40),('40x40@2x',80),('40x40@3x',120),('60x60@2x',120),
       ('60x60@3x',180),('76x76@1x',76),('76x76@2x',152),('83.5x83.5@2x',167),('1024x1024@1x',1024)]
for name, size in IOS:
    save(render(size, content=0.80),
         f'nadanaloga_mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-{name}.png')

# --- Google Play listing icon ---
save(render(512, content=0.84), 'docs/play-store/app-icon-512.png')
