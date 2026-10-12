/* Prüfung: Modelltests mit Timer, Punkten und Auswertung (Hören/Lesen automatisch, Schreiben/Sprechen Selbsteinschätzung) */
'use strict';
(function () {
  var h = DR.h, t = DR.t, R = DR.router;
  var EMO = { hoeren: 'headphone', lesen: 'book', schreiben: 'memo', sprechen: 'speech' };

  function key(id, part) { return 'pr:' + id + ':' + part; }
  function load(id) { return DR.loadExtra('pruefung-' + id); }
  function meta(id) { return (DR.INDEX.tests || []).filter(function (x) { return x.id === id; })[0]; }

  /* ---------- Übersicht ---------- */
  R.add('/pruefung', function (el) {
    var st = DR.store.get(), c = DR.section('pruef').c;
    el.appendChild(h('div', DR.ui.hero('graduation', 'Goethe · ÖSD · ÖIF', t('s_pruef'))));
    el.appendChild(h('div.list', DR.ui.item({ href: '#/pruefung/info', emoji: 'book', c: c, title: 'Wie ist die Prüfung aufgebaut?', sub: 'Как устроен экзамен' })));
    var tests = DR.INDEX.tests || [];
    el.appendChild(h('h2', 'Modelltests'));
    var l = h('div.list');
    tests.forEach(function (x) {
      var sc = 0, max = 0, all = true;
      x.parts.forEach(function (p) { var d = st.done[key(x.id, p.id)]; if (d) { sc += d.sc; max += d.max; } else all = false; });
      l.appendChild(DR.ui.item({ href: '#/pruefung/test/' + x.id, emoji: 'graduation', c: c, title: x.title, level: x.level, sub: x.exam + (max ? ' · ' + DR.pct(sc, max) + '%' : ''), done: all && max > 0 }));
    });
    if (!tests.length) l.appendChild(h('p.muted.small', t('pruef_soon')));
    el.appendChild(l);
    el.appendChild(h('h2', t('mini_test')));
    var list = h('div.list');
    DR.readyUnits().forEach(function (u) { list.appendChild(DR.ui.item({ href: '#/stadt/' + u.id + '/test', emoji: u.emoji, c: DR.ui.levelColor(u.level), title: u.city, level: u.level, sub: u.title, done: !!st.done['test:' + u.id] })); });
    el.appendChild(list);
  });

  /* ---------- Test-Startseite ---------- */
  R.add('/pruefung/test/:id', function (el, p) {
    var m = meta(p.id);
    if (!m) { R.go('#/pruefung', true); return; }
    return load(p.id).then(function (x) {
      var st = DR.store.get(), sc = 0, max = 0, all = true;
      el.appendChild(h('div', DR.ui.hero('graduation', x.exam, x.title, x.title_ru)));
      if (x.intro_ru) el.appendChild(h('div.card', DR.ui.rich(x.intro_ru)));
      var l = h('div.list');
      x.parts.forEach(function (part) {
        var d = st.done[key(x.id, part.id)];
        if (d) { sc += d.sc; max += d.max; } else all = false;
        l.appendChild(DR.ui.item({ href: '#/pruefung/test/' + x.id + '/' + part.id, emoji: EMO[part.id], c: DR.section('pruef').c, title: part.skill,
          sub: part.minutes + ' Min.' + (d ? ' · ' + d.sc + '/' + d.max + ' (' + DR.pct(d.sc, d.max) + '%)' : ''), done: !!d }));
      });
      el.appendChild(l);
      if (max) {
        var pass = all && DR.pct(sc, max) >= 60 && x.parts.every(function (part) { var d = st.done[key(x.id, part.id)]; return d && DR.pct(d.sc, d.max) >= 60; });
        el.appendChild(h('div.card.center', h('div.kicker', DR.t('result')), h('div.result-big', DR.pct(sc, max) + ' %'), h('p.muted', sc + ' / ' + max + (all ? ' · ' + (pass ? DR.t('test_pass') : DR.t('test_fail')) : ''))));
      }
      el.appendChild(h('p.small.muted', 'Ориентир «сдано» здесь — от 60 % в каждой части. Точные правила подсчёта у каждого экзамена свои — см. «Как устроен экзамен».'));
    });
  });

  /* ---------- Teil durchführen ---------- */
  R.add('/pruefung/test/:id/:part', function (el, p) {
    return load(p.id).then(function (x) {
      var part = (x.parts || []).filter(function (q) { return q.id === p.part; })[0];
      if (!part) { R.go('#/pruefung/test/' + p.id, true); return; }
      el.appendChild(h('div', DR.ui.hero(EMO[part.id], x.title, part.skill)));
      var timerChip = h('span.chip', DR.icon('timer'), h('b', fmt(part.minutes * 60)));
      el.appendChild(h('div.row', { style: { marginBottom: '12px' } }, timerChip, h('span.small.muted', part.minutes + ' Min.')));
      el.appendChild(h('div.card', DR.ui.rich(part.instructions), part.instructions_ru ? h('details', h('summary.small.muted', 'RU'), DR.ui.rich(part.instructions_ru)) : null));
      var left = part.minutes * 60, timer = null, submitted = false;
      var body = h('div'); el.appendChild(body);
      var submit;
      if (part.id === 'hoeren' || part.id === 'lesen') submit = runObjective(body, x, part);
      else submit = runSelf(body, x, part);
      var btn = h('button.btn', { type: 'button', onclick: function () { finish(); } }, DR.icon('check'), 'Abgeben / сдать');
      DR.ui.backbar([btn]);
      timer = setInterval(function () {
        left--; timerChip.lastChild.textContent = fmt(Math.max(0, left));
        if (left === 60) DR.ui.toast('Noch 1 Minute / осталась минута');
        if (left <= 0) { finish(); }
      }, 1000);
      window.addEventListener('hashchange', function once() { clearInterval(timer); DR.speech.stop(); window.removeEventListener('hashchange', once); });
      function finish() {
        if (submitted) return; submitted = true; clearInterval(timer); DR.speech.stop();
        var r = submit();
        DR.store.record(key(x.id, part.id), r.sc, r.max, part.skill, { mist: (r.mist || []).slice(0, 20) });
        DR.ui.backbar([h('a.btn', { href: '#/pruefung/test/' + x.id }, DR.icon('graduation'), 'Übersicht')]);
        window.scrollTo(0, 0);
      }
    });
  });
  function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  /* Hören / Lesen: Antworten sammeln ohne Sofort-Feedback, am Ende Auswertung */
  function runObjective(body, x, part) {
    var qs = [];
    (part.sections || []).forEach(function (sec, si) {
      var card = h('div.card', h('h3', sec.title || ('Teil ' + (si + 1))), sec.task ? DR.ui.rich(sec.task) : null, sec.task_ru ? h('p.small.muted', sec.task_ru) : null);
      (sec.blocks || []).forEach(function (b, bi) {
        var blk = h('div', { style: { borderTop: '1px dashed var(--line)', paddingTop: '10px', marginTop: '10px' } });
        if (b.lines) {
          var plays = 0, maxPlays = sec.play || 2;
          var pb = h('button.btn.small', { type: 'button', onclick: async function () {
            if (plays >= maxPlays) return;
            plays++; pb.disabled = true;
            for (var i = 0; i < b.lines.length; i++) await DR.speech.say(b.lines[i].t, b.lines[i].s === 'B' ? { voice: sec.voice, alt: true } : { voice: sec.voice });
            pb.disabled = plays >= maxPlays; pb.lastChild.textContent = 'Hören ' + (maxPlays - plays) + '×';
          } }, DR.icon('volume-2'), h('span', 'Hören ' + maxPlays + '×'));
          blk.appendChild(h('div.row', h('b', String(bi + 1) + '.'), pb));
          blk._script = b.lines;
        }
        if (b.text) blk.appendChild(h('div.reader', { style: { margin: '6px 0 10px', padding: '12px', background: 'var(--surface-solid)', borderRadius: '12px', border: '1px solid var(--line)' } }, b.text));
        (b.items || []).forEach(function (it) {
          var q = { it: it, val: null, blk: blk };
          var opts = it.type === 'tf' ? [true, false] : it.options;
          var wrap = h('div.opts' + (it.type === 'tf' ? '.tf' : ''));
          opts.forEach(function (o) {
            var bt = h('button.opt', { type: 'button', onclick: function () {
              if (q.locked) return;
              q.val = o; Array.prototype.forEach.call(wrap.children, function (c) { c.classList.toggle('sel', c === bt); });
            } }, it.type === 'tf' ? (o ? t('true_') : t('false_')) : o);
            bt._v = o; wrap.appendChild(bt);
          });
          q.wrap = wrap;
          blk.appendChild(h('p.ex-q', { style: { fontSize: '17px', margin: '10px 0 8px' } }, it.q));
          if (it.ru) blk.appendChild(h('p.ex-hint', it.ru));
          blk.appendChild(wrap);
          qs.push(q);
        });
        card.appendChild(blk);
      });
      body.appendChild(card);
    });
    return function () {
      var sc = 0, mist = [];
      qs.forEach(function (q) {
        q.locked = true;
        var ok = q.it.type === 'tf' ? q.val === q.it.answer : q.val != null && DR.norm(q.val) === DR.norm(q.it.answer);
        if (ok) sc++; else mist.push(q.it.q + ' → ' + DR.ex.solution(q.it));
        Array.prototype.forEach.call(q.wrap.children, function (c) {
          c.disabled = true;
          if (c._v === q.it.answer || (q.it.type !== 'tf' && DR.norm(c._v) === DR.norm(q.it.answer))) c.classList.add('right');
          else if (c._v === q.val) c.classList.add('wrong');
        });
        if (q.blk._script && !q.blk._shown) {
          q.blk._shown = true;
          q.blk.appendChild(h('details', h('summary.small', 'Transkript'), h('div.small', q.blk._script.map(function (l) { return h('div.line', h('span.who', l.s), h('span.t', l.t)); }))));
        }
      });
      body.insertBefore(h('div.card.center', h('div.result-big', DR.pct(sc, qs.length) + ' %'), h('p.muted', sc + ' / ' + qs.length)), body.firstChild);
      return { sc: sc, max: qs.length, mist: mist };
    };
  }

  /* Schreiben / Sprechen: Aufgaben, Text, nach Abgabe Mustertext + Selbsteinschätzung */
  function runSelf(body, x, part) {
    var tasks = part.writing || part.speaking || [], areas = [];
    tasks.forEach(function (w, i) {
      var card = h('div.card.stack', h('h3', (w.exam ? w.exam + ' · ' : '') + (w.kind || w.task)), DR.ui.rich(w.task_ru && part.id === 'sprechen' ? w.task + '\n' + w.task_ru : w.task));
      if (w.points) card.appendChild(h('ul', w.points.map(function (pt) { return h('li', pt); })));
      if (w.prompts) card.appendChild(h('div.row', w.prompts.map(function (pr) { return h('span.chip', pr); })));
      if (part.id === 'schreiben') {
        var ta = h('textarea.inp', { placeholder: t('your_text') + ' …', spellcheck: false });
        var cnt = h('span.small.muted', '0 ' + t('words_count'));
        ta.addEventListener('input', function () { cnt.textContent = (ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0) + ' ' + t('words_count'); });
        card.appendChild(ta); card.appendChild(cnt);
        areas.push({ w: w, ta: ta, card: card });
      } else {
        card.appendChild(h('p.small.muted', 'Говорите вслух (лучше — с партнёром или учителем). Можно записать себя на телефон и послушать.'));
        areas.push({ w: w, card: card });
      }
      body.appendChild(card);
    });
    return function () {
      var max = part.max_points || 25;
      areas.forEach(function (a) {
        if (a.ta) a.ta.disabled = true;
        if (a.w.model) a.card.appendChild(h('details', h('summary', h('b', t('model'))), h('div.reader', a.w.model)));
        if (a.w.checklist) a.card.appendChild(h('div', h('b', t('checklist')), h('ul.small', a.w.checklist.map(function (c) { return h('li', c); }))));
        if (a.ta) a.card.appendChild(h('button.btn.ghost.small', { type: 'button', onclick: function () {
          DR.copy(DR.aiPrompt({ level: x.level }, Object.assign({ exam: x.exam, kind: a.w.kind || '', words: a.w.words || [] }, a.w), a.ta.value)).then(function () { DR.ui.toast(t('copied')); });
        } }, DR.icon('copy'), t('copy_prompt')));
      });
      var out = h('b', '…');
      var range = h('input', { type: 'range', min: 0, max: max, step: 1, value: Math.round(max * 0.6), oninput: function () { out.textContent = this.value + ' / ' + max; } });
      out.textContent = range.value + ' / ' + max;
      var save = h('button.btn.small', { type: 'button', onclick: function () {
        DR.store.record(key(x.id, part.id), +range.value, max, part.skill);
        DR.ui.toast('✓ ' + range.value + ' / ' + max);
      } }, DR.icon('check'), 'Punkte speichern');
      body.insertBefore(h('div.card.stack', h('h3', 'Selbsteinschätzung / самооценка'), h('p.small.muted', 'Сравните с образцом и чек-листом (или попросите учителя/ИИ) и выставьте баллы.'), h('div.row.nowrap', range, out), save), body.firstChild);
      return { sc: +range.value, max: max };
    };
  }
})();
