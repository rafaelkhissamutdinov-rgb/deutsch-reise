/* Sprachausgabe über die Web Speech API (de-DE / de-AT) */
'use strict';
DR.speech = (function () {
  var synth = window.speechSynthesis, voices = [];
  function loadVoices() { voices = synth ? synth.getVoices() : []; }
  if (synth) { loadVoices(); if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices); else synth.onvoiceschanged = loadVoices; }
  function pick(lang) {
    lang = lang || DR.store.get().settings.voice || 'de-DE';
    var exact = voices.filter(function (v) { return v.lang.replace('_', '-') === lang; });
    var de = voices.filter(function (v) { return /^de/i.test(v.lang); });
    var pool = exact.length ? exact : de;
    // natürlich klingende Stimmen bevorzugen
    pool = pool.slice().sort(function (a, b) { return score(b) - score(a); });
    return pool[0] || null;
  }
  function score(v) { return (/natural|neural|premium|enhanced/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 1 : 0) + (v.localService ? 0.5 : 0); }
  return {
    available: function () { return !!synth && voices.some(function (v) { return /^de/i.test(v.lang); }); },
    supported: function () { return !!synth; },
    voices: function () { return voices.filter(function (v) { return /^de/i.test(v.lang); }); },
    /* Text sprechen; Promise wird nach Ende erfüllt */
    say: function (text, opt) {
      opt = opt || {};
      return new Promise(function (res) {
        if (!synth) { res(false); return; }
        var u = new SpeechSynthesisUtterance(String(text).replace(/[„“]/g, ''));
        var v = pick(opt.voice);
        u.lang = v ? v.lang : (opt.voice || 'de-DE');
        if (v) u.voice = v;
        u.rate = opt.rate || DR.store.get().settings.rate || 0.95;
        u.onend = function () { res(true); };
        u.onerror = function () { res(false); };
        if (!opt.queue) synth.cancel();
        synth.speak(u);
        // Sicherheitsnetz, falls onend nie kommt
        setTimeout(function () { res(true); }, 1500 + String(text).length * 140 / (u.rate || 1));
      });
    },
    stop: function () { if (synth) synth.cancel(); }
  };
})();
DR.speakBtn = function (text, opt) {
  return DR.h('button.btn.ghost.small.icon-only', {
    type: 'button', title: DR.t('play'), 'aria-label': DR.t('play'),
    onclick: function (e) { e.stopPropagation(); DR.speech.say(text, opt); }
  }, DR.icon('volume-2'));
};
