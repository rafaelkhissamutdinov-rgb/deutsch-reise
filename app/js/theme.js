/* Tagesthemen (Mo–So), helle und dunkle Varianten, Bereichsfarben */
'use strict';
DR.THEMES = [
  { id: 'kaffeehaus', day: 1, name: 'Kaffeehaus', ru: 'Кофейня', emoji: ['coffee', 'croissant', 'cake', 'newspaper', 'pretzel'], particles: 'steam',
    light: { bg: '#f8efe2', bg2: '#ecd9bd', blobs: ['#e8b98a', '#c98b5e', '#f3d7a7'], text: '#2e2017', muted: '#6d5643', primary: '#8a3f17', primaryD: '#5c2709', onPrimary: '#fff' },
    dark: { bg: '#1e1611', bg2: '#2c2018', blobs: ['#6b3e22', '#8c5a32', '#3d2a1c'], text: '#f5e9dc', muted: '#c8b29c', primary: '#f0a35e', primaryD: '#a9652a', onPrimary: '#24150a' } },
  { id: 'reisen', day: 2, name: 'Reisen', ru: 'Путешествия', emoji: ['airplane', 'luggage', 'worldmap', 'train', 'compass'], particles: 'clouds',
    light: { bg: '#eef5fc', bg2: '#d6e7f8', blobs: ['#9cc8f2', '#ffc38a', '#bfe0ff'], text: '#14243a', muted: '#4c5f78', primary: '#1d4ed8', primaryD: '#173a9e', onPrimary: '#fff' },
    dark: { bg: '#0d1626', bg2: '#13223a', blobs: ['#1d4f8a', '#8a4b1d', '#173a66'], text: '#e8f0fb', muted: '#a3b5cc', primary: '#7fb0ff', primaryD: '#3f6fc0', onPrimary: '#0b1730' } },
  { id: 'natur', day: 3, name: 'Natur', ru: 'Природа', emoji: ['tree', 'mushroom', 'sunflower', 'leaf', 'hedgehog'], particles: 'leaves',
    light: { bg: '#f1f5ea', bg2: '#dfe9cf', blobs: ['#b9d79b', '#f2c879', '#d7e8b8'], text: '#1f2a17', muted: '#566248', primary: '#b4400f', primaryD: '#7d2c08', onPrimary: '#fff' },
    dark: { bg: '#111a10', bg2: '#1a2617', blobs: ['#2f5a2a', '#6b5a1d', '#22401f'], text: '#eef4e6', muted: '#adbb9e', primary: '#ff9a62', primaryD: '#b65a2a', onPrimary: '#2a1205' } },
  { id: 'regen', day: 4, name: 'Regentag', ru: 'Дождливый день', emoji: ['umbrella', 'raincloud', 'snail', 'rainbow', 'frog'], particles: 'rain',
    light: { bg: '#edf0f5', bg2: '#d7dde8', blobs: ['#a9b8d4', '#c9b6e4', '#b7d0e0'], text: '#1b2233', muted: '#535d73', primary: '#4338ca', primaryD: '#2f2794', onPrimary: '#fff' },
    dark: { bg: '#10131c', bg2: '#181d2b', blobs: ['#2b3a5c', '#3e2f5f', '#203a4a'], text: '#e9edf6', muted: '#a6aec2', primary: '#a5a1ff', primaryD: '#5f59c9', onPrimary: '#14123a' } },
  { id: 'party', day: 5, name: 'Party', ru: 'Вечеринка', emoji: ['party', 'balloon', 'notes', 'confetti', 'pretzel'], particles: 'confetti',
    light: { bg: '#fdf0f6', bg2: '#f6d9e9', blobs: ['#ffb3d4', '#ffd36e', '#c4b5fd'], text: '#2a1424', muted: '#6c4a62', primary: '#be185d', primaryD: '#86103f', onPrimary: '#fff' },
    dark: { bg: '#1a0f1a', bg2: '#271428', blobs: ['#7a1f5a', '#6a4a10', '#3f2a7a'], text: '#fbeaf4', muted: '#d0aac4', primary: '#ff7ab6', primaryD: '#b23b78', onPrimary: '#2a0618' } },
  { id: 'berge', day: 6, name: 'Berge', ru: 'Горы', emoji: ['mountain', 'bicycle', 'cheese', 'tent', 'sunflower'], particles: 'snow',
    light: { bg: '#eef6f8', bg2: '#d5e9ee', blobs: ['#a5d4e0', '#d9ecf2', '#f5d6a8'], text: '#132630', muted: '#4b6470', primary: '#0b5d82', primaryD: '#07425d', onPrimary: '#fff' },
    dark: { bg: '#0c1a20', bg2: '#11262e', blobs: ['#1d4a5a', '#2c5560', '#5a4220'], text: '#e6f3f7', muted: '#9fbcc6', primary: '#5cc8f0', primaryD: '#2a86a8', onPrimary: '#04212c' } },
  { id: 'nacht', day: 0, name: 'Sternennacht', ru: 'Звёздная ночь', emoji: ['moon', 'star', 'owl', 'candle', 'milkyway'], particles: 'stars',
    light: { bg: '#f1effa', bg2: '#dedaf2', blobs: ['#c3b8f0', '#f0d9a8', '#b7c3f0'], text: '#1d1834', muted: '#585174', primary: '#6d28d9', primaryD: '#4c1a9e', onPrimary: '#fff' },
    dark: { bg: '#0b0a1a', bg2: '#141230', blobs: ['#2d2466', '#4a2a6e', '#1c2c5c'], text: '#ecebff', muted: '#aaa6cf', primary: '#c4a5ff', primaryD: '#7d58c9', onPrimary: '#1a0d3a' } }
];
/* Feste Feedbackfarben pro Modus (bewusst unabhängig vom Thema) */
DR.FEEDBACK = {
  light: { ok: '#15803d', okD: '#0e5a2a', onOk: '#fff', bad: '#c42b2b', badD: '#8b1c1c', onBad: '#fff', warn: '#a86412', der: '#1d5fd8', die: '#c2185b', das: '#0b7a52' },
  dark: { ok: '#3ccf74', okD: '#1f8a47', onOk: '#04210f', bad: '#ff6b6b', badD: '#b43c3c', onBad: '#2a0505', warn: '#f2b34d', der: '#7fb0ff', die: '#ff7ab6', das: '#4fd8a0' }
};
/* Bereichsfarben (Kacheln) */
DR.SECTIONS = [
  { id: 'reise', route: '#/karte', emoji: 'worldmap', c: '#2f6fd6' },
  { id: 'wort', route: '#/wortschatz', emoji: 'cards', c: '#d9822b' },
  { id: 'gram', route: '#/grammatik', emoji: 'puzzle', c: '#7c4ddb' },
  { id: 'hoeren', route: '#/hoeren', emoji: 'headphone', c: '#0e8fa8' },
  { id: 'lesen', route: '#/lesen', emoji: 'book', c: '#c83a6a' },
  { id: 'schreiben', route: '#/schreiben', emoji: 'memo', c: '#5b6ad0' },
  { id: 'dialog', route: '#/dialoge', emoji: 'speech', c: '#e0602a' },
  { id: 'pruef', route: '#/pruefung', emoji: 'graduation', c: '#3c4fb8' },
  { id: 'haus', route: '#/hausaufgaben', emoji: 'backpack', c: '#b5409c' },
  { id: 'pass', route: '#/pass', emoji: 'passport', c: '#8a5a1c' },
  { id: 'settings', route: '#/einstellungen', emoji: 'gear', c: '#5d6878' },
  { id: 'quellen', route: '#/quellen', emoji: 'newspaper', c: '#6e6a62' }
];
DR.section = function (id) { return DR.SECTIONS.filter(function (s) { return s.id === id; })[0]; };

DR.theme = {
  current: function () {
    var set = DR.store.get().settings.theme, d = new Date().getDay();
    var th = DR.THEMES.filter(function (t) { return set === 'auto' ? t.day === d : t.id === set; })[0];
    return th || DR.THEMES[0];
  },
  isDark: function () {
    var m = DR.store.get().settings.mode;
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  },
  vars: function (th, dark) {
    var p = dark ? th.dark : th.light, f = dark ? DR.FEEDBACK.dark : DR.FEEDBACK.light;
    return {
      '--bg': p.bg, '--bg2': p.bg2, '--text': p.text, '--muted': p.muted,
      '--surface': dark ? 'rgba(28,28,40,.78)' : 'rgba(255,255,255,.80)', '--surface-solid': dark ? mix(p.bg, '#ffffff', 0.08) : '#ffffff',
      '--line': dark ? 'rgba(255,255,255,.14)' : 'rgba(30,20,10,.13)',
      '--primary': p.primary, '--primary-d': p.primaryD, '--on-primary': p.onPrimary,
      '--ok': f.ok, '--ok-d': f.okD, '--on-ok': f.onOk, '--bad': f.bad, '--bad-d': f.badD, '--on-bad': f.onBad, '--warn': f.warn,
      '--der': f.der, '--die': f.die, '--das': f.das
    };
  },
  apply: function () {
    var th = this.current(), dark = this.isDark(), v = this.vars(th, dark), root = document.documentElement;
    Object.keys(v).forEach(function (k) { root.style.setProperty(k, v[k]); });
    root.style.colorScheme = dark ? 'dark' : 'light';
    root.dataset.theme = th.id; root.dataset.mode = dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', dark ? th.dark.bg : th.light.bg);
    document.body.classList.toggle('reduce-motion', DR.reducedMotion());
    if (DR.bg) DR.bg.setTheme(th, dark);
  }
};
function mix(a, b, t) {
  var pa = hex(a), pb = hex(b);
  return '#' + [0, 1, 2].map(function (i) { return Math.round(pa[i] + (pb[i] - pa[i]) * t).toString(16).padStart(2, '0'); }).join('');
}
function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
DR.color = { mix: mix, hex: hex };
if (window.matchMedia) {
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { DR.theme.apply(); }); } catch (e) { /* alte Browser */ }
}
