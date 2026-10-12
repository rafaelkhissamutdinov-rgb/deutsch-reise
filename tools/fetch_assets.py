#!/usr/bin/env python3
"""Lädt externe Assets einmalig herunter und legt sie in app/assets ab.

- Microsoft Fluent Emoji 3D (MIT): sucht den Ordner über metadata.json (Feld glyph),
  verkleinert auf 192 px und speichert als WebP.
- Schriften Nunito und Literata (OFL) aus den @fontsource-Paketen (npm).
- Lucide-Icons (ISC) aus lucide-static → Inline-Sprite js/icons.js.

Aufruf: python3 tools/fetch_assets.py [emoji|fonts|icons]
"""
import io
import json
import os
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'app')
RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main'

# key → Ordnername im fluentui-emoji-Repo
EMOJI = {
    # Tageshintergründe
    'coffee': 'Hot beverage', 'croissant': 'Croissant', 'cake': 'Shortcake', 'newspaper': 'Newspaper',
    'pretzel': 'Pretzel', 'airplane': 'Airplane', 'luggage': 'Luggage', 'worldmap': 'World map',
    'train': 'Locomotive', 'compass': 'Compass', 'tree': 'Evergreen tree', 'mushroom': 'Mushroom',
    'sunflower': 'Sunflower', 'leaf': 'Fallen leaf', 'hedgehog': 'Hedgehog', 'umbrella': 'Umbrella with rain drops',
    'raincloud': 'Cloud with rain', 'snail': 'Snail', 'rainbow': 'Rainbow', 'frog': 'Frog',
    'party': 'Party popper', 'balloon': 'Balloon', 'notes': 'Musical notes', 'confetti': 'Confetti ball',
    'mountain': 'Snow-capped mountain', 'bicycle': 'Bicycle', 'cheese': 'Cheese wedge', 'tent': 'Tent',
    'moon': 'Crescent moon', 'star': 'Glowing star', 'owl': 'Owl', 'candle': 'Candle', 'milkyway': 'Milky way',
    # Bereiche
    'cards': 'Card index dividers', 'puzzle': 'Puzzle piece', 'headphone': 'Headphone', 'book': 'Open book',
    'memo': 'Memo', 'speech': 'Speech balloon', 'trophy': 'Trophy', 'backpack': 'Backpack',
    'passport': 'Passport control', 'gear': 'Gear', 'graduation': 'Graduation cap',
    # Feedback
    'check': 'Check mark button', 'cross': 'Cross mark', 'fire': 'Fire', 'sparkles': 'Sparkles', 'brain': 'Brain',
    'speaker': 'Speaker high volume', 'hourglass': 'Hourglass not done', 'key': 'Key', 'bell': 'Bell',
    # Städte
    'anchor': 'Anchor', 'building': 'Classical building', 'violin': 'Violin', 'church': 'Church',
    'apple': 'Red apple', 'castle': 'Castle', 'car': 'Automobile', 'beer': 'Beer mug', 'score': 'Musical score',
    'pie': 'Pie', 'clock': 'Mantelpiece clock', 'ferris': 'Ferris wheel', 'bear': 'Bear',
}


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


def emoji():
    from PIL import Image
    out = os.path.join(APP, 'assets', 'emoji')
    os.makedirs(out, exist_ok=True)
    found = {}
    for key, folder in EMOJI.items():
        base = f'{RAW}/assets/{urllib.parse.quote(folder)}'
        try:
            meta = json.loads(get(base + '/metadata.json'))
        except Exception as e:  # noqa: BLE001
            print('MISSING', key, folder, e)
            continue
        name = meta['cldr'].replace(' ', '_').replace('-', '_').replace(':', '').lower()
        candidates = [f'{name}_3d.png', f'{folder.lower().replace(" ", "_")}_3d.png']
        img = None
        for c in candidates:
            for sub in ('3D', 'Default/3D'):
                try:
                    img = get(f'{base}/{sub}/{urllib.parse.quote(c)}')
                    break
                except Exception:  # noqa: BLE001
                    pass
            if img:
                break
        if not img:
            print('NO PNG', key, folder, candidates)
            continue
        im = Image.open(io.BytesIO(img)).convert('RGBA')
        im.thumbnail((192, 192), Image.LANCZOS)
        im.save(os.path.join(out, key + '.webp'), 'WEBP', quality=82, method=6)
        found[key] = meta['glyph']
        print('ok', key, meta['glyph'])
    with open(os.path.join(out, 'LICENSE'), 'wb') as f:
        f.write(get(RAW + '/LICENSE'))
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump(found, f, ensure_ascii=False, indent=1, sort_keys=True)


def npm_extract(pkg, version, pattern, dest):
    tmp = tempfile.mkdtemp()
    subprocess.run(['npm', 'pack', f'{pkg}@{version}', '--silent'], cwd=tmp, check=True, capture_output=True)
    tgz = [f for f in os.listdir(tmp) if f.endswith('.tgz')][0]
    got = []
    with tarfile.open(os.path.join(tmp, tgz)) as t:
        for m in t.getmembers():
            if re.search(pattern, m.name):
                data = t.extractfile(m).read()
                name = os.path.basename(m.name)
                with open(os.path.join(dest, name), 'wb') as f:
                    f.write(data)
                got.append(name)
            if m.name.endswith('LICENSE'):
                with open(os.path.join(dest, pkg.split('/')[-1] + '-LICENSE'), 'wb') as f:
                    f.write(t.extractfile(m).read())
    return got


def fonts():
    dest = os.path.join(APP, 'assets', 'fonts')
    os.makedirs(dest, exist_ok=True)
    print(npm_extract('@fontsource/nunito', '5', r'files/nunito-(latin|latin-ext|cyrillic)-(400|700|800)-normal\.woff2$', dest))
    print(npm_extract('@fontsource/literata', '5', r'files/literata-(latin|latin-ext|cyrillic)-(400|600)-(normal|italic)\.woff2$', dest))


def icons():
    names = ['house', 'map', 'map-pin', 'book-open', 'layers', 'puzzle', 'headphones', 'pen-line', 'messages-square',
             'trophy', 'clipboard-list', 'stamp', 'settings', 'chevron-left', 'chevron-right', 'check', 'x',
             'volume-2', 'play', 'pause', 'rotate-ccw', 'undo-2', 'copy', 'download', 'upload', 'trash-2',
             'eye', 'eye-off', 'timer', 'flame', 'brain', 'sun', 'moon', 'languages', 'info', 'lock', 'star',
             'mic', 'captions', 'gauge', 'shuffle', 'arrow-right', 'plus', 'link', 'share-2', 'grip-vertical',
             'circle-help', 'sparkles', 'type', 'zap', 'list-checks', 'scroll-text', 'graduation-cap']
    tmp = tempfile.mkdtemp()
    subprocess.run(['npm', 'pack', 'lucide-static@0.4', '--silent'], cwd=tmp, check=False, capture_output=True)
    if not [f for f in os.listdir(tmp) if f.endswith('.tgz')]:
        subprocess.run(['npm', 'pack', 'lucide-static', '--silent'], cwd=tmp, check=True, capture_output=True)
    tgz = [f for f in os.listdir(tmp) if f.endswith('.tgz')][0]
    sym = []
    lic = ''
    with tarfile.open(os.path.join(tmp, tgz)) as t:
        files = {m.name: m for m in t.getmembers()}
        for n in names:
            m = files.get(f'package/icons/{n}.svg')
            if not m:
                print('missing icon', n)
                continue
            svg = t.extractfile(m).read().decode()
            inner = re.sub(r'^.*?<svg[^>]*>|</svg>\s*$', '', svg, flags=re.S).strip()
            inner = re.sub(r'<!--.*?-->', '', inner, flags=re.S)
            inner = re.sub(r'\s+', ' ', inner)
            sym.append(f'<symbol id="i-{n}" viewBox="0 0 24 24">{inner}</symbol>')
        if 'package/LICENSE' in files:
            lic = t.extractfile(files['package/LICENSE']).read().decode()
    sprite = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none" fill="none" stroke="currentColor" '
              'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ''.join(sym) + '</svg>')
    with open(os.path.join(APP, 'js', 'icons.js'), 'w') as f:
        f.write('/* Lucide Icons (ISC License, https://lucide.dev) — generiert von tools/fetch_assets.py */\n')
        f.write('document.body.insertAdjacentHTML("afterbegin", ' + json.dumps(sprite) + ');\n')
    with open(os.path.join(APP, 'assets', 'lucide-LICENSE'), 'w') as f:
        f.write(lic)
    print('icons', len(sym))


if __name__ == '__main__':
    what = sys.argv[1:] or ['emoji', 'fonts', 'icons']
    for w in what:
        globals()[w]()
