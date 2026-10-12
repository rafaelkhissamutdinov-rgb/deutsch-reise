/* Sprachausgabe über die Web Speech API (de-DE / de-AT).
   Natürlich klingende Stimmen werden bevorzugt; in den Einstellungen kann man eine Stimme fest wählen.
   Lange Texte werden satzweise gesprochen (klingt natürlicher, Chrome bricht sonst nach ~15 s ab). */
'use strict';
DR.speech = (function () {
  var synth = window.speechSynthesis, voices = [];
  function loadVoices() { voices = synth ? synth.getVoices() : []; }
  if (synth) { loadVoices(); if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices); else synth.onvoiceschanged = loadVoices; }

  /* Qualität schätzen: neuronale/„natürliche“ Stimmen zuerst, alte Systemstimmen zuletzt */
  function score(v) {
    var n = v.name, s = 0;
    if (/natural|neural|online/i.test(n)) s += 6;          // Edge/Windows: „Microsoft Katja Online (Natural)“
    if (/premium/i.test(n)) s += 6;                        // Apple Premium
    if (/enhanced|verbessert|erweitert/i.test(n)) s += 5;  // Apple Enhanced
    if (/google/i.test(n)) s += 3;                         // Chrome
    if (/anna|petra|helena|markus|yannick|viktor|conrad|katja|amala|seraphina|florian|jonas|ingrid/i.test(n)) s += 1;
    if (/espeak|compact|hedda|stefan(?!.*natural)|desktop/i.test(n)) s -= 3;
    if (v.localService === false) s += 1;
    return s;
  }
  function germanVoices() { return voices.filter(function (v) { return /^de([-_]|$)/i.test(v.lang); }); }
  /* alt = true: eine andere Stimme als die Hauptstimme (zweite Person im Dialog) */
  function pick(lang, alt) {
    var st = DR.store.get().settings, de = germanVoices();
    if (!de.length) return null;
    var ranked = de.slice().sort(function (a, b) { return score(b) - score(a); });
    var main = (st.voiceName && de.filter(function (v) { return v.name === st.voiceName; })[0]) ||
      ranked.filter(function (v) { return v.lang.replace('_', '-') === (st.voice || 'de-DE'); })[0] || ranked[0];
    if (!alt) {
      if (!lang || lang === st.voice || st.voiceName) return main;
      return ranked.filter(function (v) { return v.lang.replace('_', '-') === lang; })[0] || main;
    }
    var others = ranked.filter(function (v) { return v !== main; });
    return others.filter(function (v) { return v.lang.replace('_', '-') === lang; })[0] || others[0] || main;
  }
  /* Text in Sätze teilen, Abkürzungen nicht trennen */
  function chunks(text) {
    var t = String(text).replace(/[„“”]/g, '').replace(/\s+/g, ' ').trim();
    var parts = t.match(/[^.!?…]+(?:[.!?…]+|$)/g) || [t];
    var out = [];
    parts.forEach(function (p) {
      p = p.trim(); if (!p) return;
      var last = out[out.length - 1];
      if (last && (/\b(z\.B|bzw|ca|Nr|Str|Dr|Hr|Fr|usw|u\.a)\.$/i.test(last) || /\d\.$/.test(last) || last.length < 12)) out[out.length - 1] = last + ' ' + p;
      else out.push(p);
    });
    return out;
  }
  var token = 0;
  function sayOne(text, v, opt) {
    return new Promise(function (res) {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = v ? v.lang : (opt.voice || 'de-DE');
      if (v) u.voice = v;
      u.rate = opt.rate || DR.store.get().settings.rate || 0.92;
      u.pitch = 1;
      var done = false, fin = function () { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      synth.speak(u);
      setTimeout(fin, 2500 + text.length * 120 / (u.rate || 1)); // Sicherheitsnetz
    });
  }
  return {
    available: function () { return !!synth && germanVoices().length > 0; },
    supported: function () { return !!synth; },
    voices: function () { return germanVoices().slice().sort(function (a, b) { return score(b) - score(a); }); },
    best: function () { return pick(); },
    /* Text sprechen; Promise wird nach Ende erfüllt */
    say: function (text, opt) {
      opt = opt || {};
      if (!synth) return Promise.resolve(false);
      if (!opt.queue) synth.cancel();
      var my = ++token, v = pick(opt.voice, opt.alt), list = chunks(text);
      var p = Promise.resolve();
      list.forEach(function (c, i) {
        p = p.then(function () {
          if (my !== token) return;
          return sayOne(c, v, opt).then(function () {
            if (i < list.length - 1 && my === token) return new Promise(function (r) { setTimeout(r, 120); });
          });
        });
      });
      return p.then(function () { return my === token; });
    },
    stop: function () { token++; if (synth) synth.cancel(); }
  };
})();
DR.speakBtn = function (text, opt) {
  return DR.h('button.btn.ghost.small.icon-only', {
    type: 'button', title: DR.t('play'), 'aria-label': DR.t('play'),
    onclick: function (e) { e.stopPropagation(); DR.speech.say(text, opt); }
  }, DR.icon('volume-2'));
};
