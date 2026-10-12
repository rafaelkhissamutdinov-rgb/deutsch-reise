/* Intervallwiederholung: Erinnerung = e^(−Tage / Stabilität) */
'use strict';
DR.srs = {
  LONG: 21,        // ab dieser Stabilität (Tage) gilt ein Wort als „im Langzeitgedächtnis“
  DUE: 0.8,        // unter dieser Erinnerungswahrscheinlichkeit ist ein Wort fällig
  memory: function (w, now) {
    if (!w || !w.t) return 0;
    var days = ((now || Date.now()) - w.t) / DR.DAY;
    return Math.exp(-days / Math.max(0.2, w.s || 0.5));
  },
  /* neue Stabilität nach einer Antwort */
  next: function (w, correct, now) {
    var p = this.memory(w, now), s = (w && w.s) || 0;
    if (!correct) return Math.max(0.3, s * 0.35);
    if (!s) return 1;
    // Je schwerer der Abruf (kleines p), desto größer der Zuwachs
    var gain = 1.6 + 1.6 * (1 - p);
    return Math.min(365, s * gain);
  },
  review: function (id, correct) {
    DR.store.update(function (st) {
      var w = st.words[id] || (st.words[id] = { s: 0, t: 0, n: 0, l: 0 });
      var now = Date.now();
      w.s = DR.srs.next(w, correct, now);
      w.t = now;
      if (correct) w.n++; else w.l++;
      DR.store.touch(st);
      var k = st.skills.Wortschatz || (st.skills.Wortschatz = { c: 0, n: 0 });
      k.n++; if (correct) k.c++;
    }, 'Wort ' + id);
  },
  add: function (id) {
    DR.store.update(function (st) {
      if (!st.words[id]) st.words[id] = { s: 0.3, t: Date.now() - DR.DAY, n: 0, l: 0 };
    }, 'Karte ' + id);
  },
  due: function (ids) {
    var st = DR.store.get().words, now = Date.now();
    return ids.filter(function (id) { return st[id] && DR.srs.memory(st[id], now) < DR.srs.DUE; })
      .sort(function (a, b) { return DR.srs.memory(st[a], now) - DR.srs.memory(st[b], now); });
  },
  fresh: function (ids) { var st = DR.store.get().words; return ids.filter(function (id) { return !st[id]; }); },
  dueCount: function () {
    var st = DR.store.get().words, now = Date.now(), n = 0;
    Object.keys(st).forEach(function (id) { if (DR.srs.memory(st[id], now) < DR.srs.DUE) n++; });
    return n;
  },
  longCount: function () {
    var st = DR.store.get().words, n = 0;
    Object.keys(st).forEach(function (id) { if (st[id].s >= DR.srs.LONG) n++; });
    return n;
  },
  /* Stempel: frisch nach Test, verblasst mit der Zeit, Wiederholung stärkt */
  stampMemory: function (unitId) {
    var u = DR.store.get().units[unitId];
    if (!u) return 0;
    return Math.exp(-((Date.now() - u.t) / DR.DAY) / Math.max(1, u.s));
  },
  stampReview: function (st, unitId) {
    var u = st.units[unitId];
    if (!u) st.units[unitId] = { s: 4, t: Date.now(), first: Date.now() };
    else { u.s = Math.min(180, u.s * (1.8 + 1.4 * (1 - DR.srs.stampMemory(unitId)))); u.t = Date.now(); }
  }
};
