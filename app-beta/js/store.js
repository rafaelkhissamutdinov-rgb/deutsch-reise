/* Fortschritt in localStorage: Laden, Speichern, Rückgängig, Export/Import, Zurücksetzen */
'use strict';
DR.store = (function () {
  var KEY = 'dr.state.v1', UNDO = 'dr.undo.v1', MAX_UNDO = 20;
  var state = null, mem = {};
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
  };
  function fresh() {
    return {
      v: 1, created: Date.now(),
      settings: { lang: 'de', mode: 'auto', theme: 'auto', rate: 0.92, voice: 'de-DE', voiceName: '', subs: true, motion: 'auto' },
      days: {},     // 'YYYY-MM-DD' → Anzahl Aktivitäten
      words: {},    // Wort-ID → {s: Stabilität (Tage), t: letzte Wiederholung (ms), n: richtig, l: falsch}
      done: {},     // Aktivitäts-Schlüssel → {t, sc, max}
      units: {},    // Einheit → {s, t} (Stempel)
      skills: {},   // Fertigkeit → {c: richtig, n: gesamt}
      hw: {}        // Hausaufgaben-Ergebnisse
    };
  }
  function migrate(s) {
    var f = fresh();
    if (!s || typeof s !== 'object') return f;
    Object.keys(f).forEach(function (k) { if (s[k] == null || typeof s[k] !== typeof f[k]) s[k] = f[k]; });
    Object.keys(f.settings).forEach(function (k) { if (s.settings[k] == null) s.settings[k] = f.settings[k]; });
    return s;
  }
  function load() {
    if (state) return state;
    var raw = ls.get(KEY);
    try { state = migrate(raw ? JSON.parse(raw) : null); } catch (e) { state = fresh(); }
    return state;
  }
  function save() { ls.set(KEY, JSON.stringify(state)); }
  function undoStack() { try { return JSON.parse(ls.get(UNDO) || '[]'); } catch (e) { return []; } }
  function pushUndo(label) {
    var st = undoStack();
    st.push({ label: label || '', t: Date.now(), s: JSON.stringify(state) });
    while (st.length > MAX_UNDO) st.shift();
    ls.set(UNDO, JSON.stringify(st));
  }
  var listeners = [];
  return {
    get: load,
    /* Änderung mit Rückgängig-Punkt. label beschreibt den Schritt. */
    update: function (fn, label, noUndo) {
      load();
      if (!noUndo) pushUndo(label);
      fn(state);
      save();
      listeners.forEach(function (l) { l(state); });
    },
    setting: function (k, v) { this.update(function (s) { s.settings[k] = v; }, null, true); },
    onChange: function (fn) { listeners.push(fn); },
    undoInfo: function () { var st = undoStack(); return st.length ? st[st.length - 1] : null; },
    undo: function () {
      var st = undoStack(); if (!st.length) return null;
      var last = st.pop();
      ls.set(UNDO, JSON.stringify(st));
      var keepSettings = load().settings;
      state = migrate(JSON.parse(last.s));
      state.settings = keepSettings;
      save();
      listeners.forEach(function (l) { l(state); });
      return last;
    },
    exportCode: function () { return 'DR1.' + DR.b64enc(JSON.stringify(load())); },
    importCode: function (code) {
      code = String(code || '').trim();
      if (code.indexOf('DR1.') !== 0) throw new Error('prefix');
      var obj = JSON.parse(DR.b64dec(code.slice(4)));
      if (!obj || obj.v !== 1 || typeof obj.words !== 'object') throw new Error('format');
      load(); pushUndo('import');
      state = migrate(obj); save();
      listeners.forEach(function (l) { l(state); });
    },
    reset: function () {
      load(); pushUndo('reset');
      var keep = state.settings;
      state = fresh(); state.settings = keep; save();
      listeners.forEach(function (l) { l(state); });
    },
    /* Aktivität für Serie zählen */
    touch: function (s) { var d = DR.today(); s.days[d] = (s.days[d] || 0) + 1; },
    streak: function () {
      var s = load(), n = 0, d = new Date();
      if (!s.days[DR.today(d)]) d = new Date(d.getTime() - DR.DAY);
      while (s.days[DR.today(d)]) { n++; d = new Date(d.getTime() - DR.DAY); }
      return n;
    },
    /* Ergebnis einer Übungsreihe speichern */
    record: function (key, sc, max, skill, extra) {
      this.update(function (s) {
        var prev = s.done[key];
        s.done[key] = { t: Date.now(), sc: sc, max: max, best: Math.max(sc, prev ? prev.best || prev.sc : 0) };
        if (extra) Object.assign(s.done[key], extra);
        if (skill) {
          var k = s.skills[skill] || (s.skills[skill] = { c: 0, n: 0 });
          k.c += sc; k.n += max;
        }
        DR.store.touch(s);
      }, key);
    }
  };
})();
