/* Deutsch-Reise — Kern: Namensraum, DOM-Helfer, Lader, Hilfsfunktionen */
'use strict';
var DR = window.DR = window.DR || {};
DR.units = DR.units || {};
DR.extra = DR.extra || {};

/* Element bauen: h('div.card#x', {onclick}, kinder…) */
DR.h = function (sel, attrs) {
  var m = String(sel).match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i) || [];
  var el = document.createElement(m[1] || 'div');
  (m[2] || '').replace(/([.#])([\w-]+)/g, function (_, t, v) {
    if (t === '.') el.classList.add(v); else el.id = v;
  });
  var kids = Array.prototype.slice.call(arguments, 2);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  if (attrs) Object.keys(attrs).forEach(function (k) {
    var v = attrs[k];
    if (v == null || v === false) return;
    if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (sk) { if (sk.slice(0, 2) === '--') el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; });
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className += ' ' + v;
    else if (k in el && k !== 'list' && k !== 'type' && k.indexOf('-') < 0) { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
    else el.setAttribute(k, v === true ? '' : v);
  });
  DR.append(el, kids);
  return el;
};
DR.append = function (el, kids) {
  (kids || []).forEach(function (k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) DR.append(el, k);
    else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  });
  return el;
};
DR.icon = function (name, cls) {
  var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
  s.setAttribute('aria-hidden', 'true');
  var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#i-' + name);
  s.appendChild(u);
  return s;
};
DR.emoji = function (key, alt) {
  return DR.h('img', { src: 'assets/emoji/' + key + '.webp', alt: alt || '', width: 192, height: 192, draggable: false, loading: 'lazy', decoding: 'async' });
};
DR.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
};

/* Skripte nachladen (Daten werden erst beim Öffnen eines Bereichs geladen) */
DR._loaded = {};
DR.loadScript = function (src) {
  if (DR._loaded[src]) return DR._loaded[src];
  DR._loaded[src] = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = src + (DR.BUILD ? '?v=' + DR.BUILD : '');
    s.onload = function () { res(); };
    s.onerror = function () { delete DR._loaded[src]; rej(new Error('Laden fehlgeschlagen: ' + src)); };
    document.head.appendChild(s);
  });
  return DR._loaded[src];
};
DR.unitMeta = function (id) { return (DR.INDEX.units || []).filter(function (u) { return u.id === id; })[0]; };
DR.loadUnit = function (id) {
  var meta = DR.unitMeta(id);
  if (!meta || !meta.ready) return Promise.resolve(null);
  if (DR.units[id]) return Promise.resolve(DR.units[id]);
  return DR.loadScript('data/unit-' + id + '.js').then(function () { return DR.units[id]; });
};
DR.readyUnits = function () { return (DR.INDEX.units || []).filter(function (u) { return u.ready; }); };
DR.loadAllUnits = function () { return Promise.all(DR.readyUnits().map(function (u) { return DR.loadUnit(u.id); })); };
DR.loadExtra = function (name) {
  if (DR.extra[name]) return Promise.resolve(DR.extra[name]);
  return DR.loadScript('data/' + name + '.js').then(function () { return DR.extra[name]; });
};

/* Hilfsfunktionen */
DR.shuffle = function (a) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
DR.norm = function (s) {
  return String(s == null ? '' : s).replace(/[’‘`´]/g, "'").replace(/[„“”"«»]/g, '"').replace(/\s+/g, ' ').trim();
};
DR.fold = function (s) {
  return DR.norm(s).toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
};
DR.today = function (d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
DR.DAY = 86400000;
DR.clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
DR.pct = function (a, b) { return b ? Math.round(100 * a / b) : 0; };
DR.reducedMotion = function () {
  var s = DR.store && DR.store.get().settings.motion;
  if (s === 'off') return true;
  if (s === 'on') return false;
  return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
};
DR.copy = function (text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
  return Promise.resolve(fallback());
  function fallback() {
    var t = DR.h('textarea', { value: text, style: { position: 'fixed', opacity: 0 } });
    document.body.appendChild(t); t.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* egal */ }
    t.remove(); return ok;
  }
};
/* UTF-8-sicheres Base64 */
DR.b64enc = function (str) {
  var bytes = new TextEncoder().encode(str), bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
DR.b64dec = function (b64) {
  b64 = String(b64).trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  var bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};
