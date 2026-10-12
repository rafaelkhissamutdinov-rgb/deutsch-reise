/* Bildschirme: Hören, Lesen, Schreiben, Dialoge, Sprechkarten */
'use strict';
(function () {
  var h = DR.h, t = DR.t, R = DR.router;

  /* Übersichtsliste eines Bereichs über alle Städte */
  function overview(el, secId, key, pre, base, sub) {
    var sec = DR.section(secId), st = DR.store.get();
    el.appendChild(h('div', DR.ui.hero(sec.emoji, 'A1 → B2', t('s_' + secId))));
    var any = false;
    DR.readyUnits().forEach(function (u) {
      var arr = u[key] || [];
      if (!arr.length) return;
      any = true;
      el.appendChild(h('h2', h('span.lvl', { style: { background: DR.ui.levelColor(u.level), color: '#fff' } }, u.level), ' ', u.city));
      var list = h('div.list');
      arr.forEach(function (x) { list.appendChild(DR.ui.item({ href: base + u.id + '/' + x.id, emoji: sec.emoji, c: sec.c, title: x.title, sub: sub(x), done: !!st.done[pre + x.id] })); });
      el.appendChild(list);
    });
    if (!any) el.appendChild(DR.ui.empty(t('city_soon')));
  }
  function find(u, key, id) { return (u && u[key] || []).filter(function (x) { return x.id === id; })[0]; }

  /* ---------- Hören ---------- */
  R.add('/hoeren', function (el) { overview(el, 'hoeren', 'listening', 'h:', '#/hoeren/', function (x) { return x.kind; }); });
  R.add('/hoeren/:unit/:id', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var x = find(u, 'listening', p.id);
      if (!x) { R.go('#/hoeren', true); return; }
      var st = DR.store.get().settings;
      el.appendChild(h('div', DR.ui.hero('headphone', u.level + ' · ' + x.kind, x.title)));
      if (!DR.speech.available()) el.appendChild(h('div.card.small', DR.icon('info'), ' ', t('no_voice')));
      var lines = h('div.card' + (st.subs ? '' : '.subs-off'));
      var voiceOpt = function (sp) { return sp === 'A' || !sp ? { voice: x.voice } : { voice: x.voice, alt: true }; };
      x.lines.forEach(function (ln, i) {
        lines.appendChild(h('div.line', { 'data-i': i }, h('span.who', ln.s), h('span.t.grow', ln.t), DR.speakBtn(ln.t, voiceOpt(ln.s))));
      });
      var playing = false;
      var playBtn = h('button.btn', { type: 'button', onclick: function () { playing ? stop() : play(); } }, DR.icon('play'), h('span', t('play')));
      async function play() {
        playing = true; playBtn.lastChild.textContent = '■';
        for (var i = 0; i < x.lines.length && playing; i++) {
          var row = lines.querySelector('[data-i="' + i + '"]');
          Array.prototype.forEach.call(lines.children, function (c) { c.classList.remove('now'); });
          row.classList.add('now');
          await DR.speech.say(x.lines[i].t, voiceOpt(x.lines[i].s));
          await new Promise(function (r) { setTimeout(r, 350); });
        }
        stop();
      }
      function stop() { playing = false; DR.speech.stop(); playBtn.lastChild.textContent = t('play'); Array.prototype.forEach.call(lines.children, function (c) { c.classList.remove('now'); }); }
      var rate = h('input', { type: 'range', min: 0.6, max: 1.2, step: 0.05, value: st.rate, 'aria-label': t('speed'), oninput: function () { DR.store.setting('rate', +this.value); rl.textContent = (+this.value).toFixed(2) + '×'; } });
      var rl = h('span.small.muted', (+st.rate).toFixed(2) + '×');
      var subs = h('button.btn.ghost.small', { type: 'button', onclick: function () { var on = !DR.store.get().settings.subs; DR.store.setting('subs', on); lines.classList.toggle('subs-off', !on); subs.lastChild.textContent = t('subtitles') + ': ' + (on ? t('on') : t('off')); } }, DR.icon('captions'), h('span', t('subtitles') + ': ' + (st.subs ? t('on') : t('off'))));
      el.appendChild(h('div.card', h('div.player', playBtn, subs), h('div.row.nowrap', { style: { marginTop: '12px' } }, DR.icon('gauge'), h('span.small', t('speed')), rate, rl)));
      el.appendChild(lines);
      var c = DR.section('hoeren').c;
      var modes = h('div.list',
        DR.ui.item({ href: '#/hoeren/' + u.id + '/' + x.id + '/fragen', icon: 'list-checks', c: c, title: t('questions'), sub: x.questions.length + ' · richtig/falsch, a/b/c', done: !!DR.store.get().done['h:' + x.id] }),
        x.dictation && x.dictation.length ? DR.ui.item({ href: '#/hoeren/' + u.id + '/' + x.id + '/diktat', icon: 'pen-line', c: c, title: t('dictation'), sub: x.dictation.length + ' Sätze' }) : null,
        DR.ui.item({ href: '#/hoeren/' + u.id + '/' + x.id + '/shadowing', icon: 'mic', c: c, title: t('shadowing'), sub: 'Satz hören → Pause → nachsprechen' }));
      el.appendChild(modes);
      window.addEventListener('hashchange', function once() { playing = false; window.removeEventListener('hashchange', once); });
    });
  });
  R.add('/hoeren/:unit/:id/fragen', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var x = find(u, 'listening', p.id);
      if (!x) { R.go('#/hoeren', true); return; }
      var playAll = h('button.btn.ghost.small', { type: 'button', onclick: function () { DR.speech.say(x.lines.map(function (l) { return l.t; }).join(' '), { voice: x.voice }); } }, DR.icon('volume-2'), t('play'));
      var wrap = h('div'); el.appendChild(h('div.row', { style: { marginBottom: '8px' } }, playAll)); el.appendChild(wrap);
      DR.ex.run(wrap, { title: x.title, items: x.questions, key: 'h:' + x.id, skill: 'Hören', color: DR.section('hoeren').c });
    });
  });
  /* Diktat mit Fehlermarkierung */
  function diff(target, given) {
    var a = DR.norm(target).split(' '), b = DR.norm(given).split(' ');
    var clean = function (w) { return w.replace(/[.,!?;:]/g, ''); };
    // LCS über Wörter
    var n = a.length, m = b.length, L = [];
    for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = clean(a[i]) === clean(b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = [], ok = 0; i = 0; j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && clean(a[i]) === clean(b[j])) { out.push(h('span.diff-ok', b[j])); ok++; i++; j++; }
      else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { out.push(h('span.diff-bad', b[j])); j++; }
      else { out.push(h('span.diff-miss', '[' + a[i] + ']')); i++; }
      out.push(' ');
    }
    return { nodes: out, ok: ok, total: n };
  }
  DR.diffWords = diff;
  R.add('/hoeren/:unit/:id/diktat', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var x = find(u, 'listening', p.id);
      if (!x) { R.go('#/hoeren', true); return; }
      var i = 0, okSum = 0, totSum = 0;
      var stage = h('div'); el.appendChild(h('div.kicker', t('dictation') + ' · ' + x.title)); el.appendChild(stage);
      function show() {
        stage.innerHTML = '';
        if (i >= x.dictation.length) {
          DR.store.record('dk:' + x.id, okSum, totSum, 'Hören');
          stage.appendChild(h('div.card.center', h('div.result-big', DR.pct(okSum, totSum) + ' %'), h('p.muted', okSum + ' / ' + totSum + ' Wörter')));
          DR.ui.backbar([]); return;
        }
        var s = x.dictation[i];
        var inp = h('textarea.inp', { rows: 3, placeholder: t('type_here'), autocapitalize: 'sentences', spellcheck: false, style: { minHeight: '110px' } });
        var res = h('div');
        stage.appendChild(h('div.card', h('div.row', h('b', (i + 1) + ' / ' + x.dictation.length), h('span.grow'),
          h('button.btn.small', { type: 'button', onclick: function () { DR.speech.say(s, { voice: x.voice }); } }, DR.icon('volume-2'), t('play')),
          h('button.btn.ghost.small', { type: 'button', onclick: function () { DR.speech.say(s, { voice: x.voice, rate: 0.7 }); } }, '0.7×')), h('div', { style: { height: '10px' } }), inp, res));
        DR.speech.say(s, { voice: x.voice });
        var checkBtn = h('button.btn', { type: 'button', onclick: function () {
          var d = diff(s, inp.value); okSum += d.ok; totSum += d.total;
          res.innerHTML = '';
          res.appendChild(h('div.feedback.' + (d.ok === d.total ? 'ok' : 'bad'), h('div', d.nodes), h('div.why', t('solution') + ': ', h('b', s))));
          DR.ui.backbar([h('button.btn', { type: 'button', onclick: function () { i++; show(); } }, t('next'))]);
        } }, t('check'));
        DR.ui.backbar([checkBtn]);
      }
      show();
    });
  });
  R.add('/hoeren/:unit/:id/shadowing', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var x = find(u, 'listening', p.id);
      if (!x) { R.go('#/hoeren', true); return; }
      var i = 0;
      el.appendChild(h('div', DR.ui.hero('speaker', t('shadowing'), x.title, 'Слушай фразу, потом повтори её вслух в паузе. Старайся копировать мелодию и ударения.')));
      var box = h('div.card'); el.appendChild(box);
      function show() {
        var ln = x.lines[i];
        box.innerHTML = '';
        box.appendChild(h('div.kicker', (i + 1) + ' / ' + x.lines.length));
        box.appendChild(h('p.reader', ln.t));
        var status = h('p.muted', '');
        box.appendChild(status);
        DR.ui.backbar([
          h('button.btn.ghost.icon-only', { type: 'button', 'aria-label': 'zurück', onclick: function () { if (i > 0) { i--; show(); } } }, DR.icon('chevron-left')),
          h('button.btn', { type: 'button', onclick: async function () {
            status.textContent = '🔊 …'; var t0 = Date.now();
            await DR.speech.say(ln.t, { voice: x.voice });
            var dur = Math.max(1500, (Date.now() - t0) * 1.2);
            status.textContent = '🗣 Jetzt du! / Теперь ты!';
            setTimeout(function () { status.textContent = '✓'; }, dur);
          } }, DR.icon('play'), t('play')),
          h('button.btn.ghost.icon-only', { type: 'button', 'aria-label': t('next'), onclick: function () { if (i < x.lines.length - 1) { i++; show(); } else { DR.store.record('sh:' + x.id, 1, 1, 'Sprechen'); DR.ui.toast('✓'); } } }, DR.icon('chevron-right'))]);
      }
      show();
    });
  });

  /* ---------- Lesen ---------- */
  R.add('/lesen', function (el) { overview(el, 'lesen', 'texts', 't:', '#/lesen/', function (x) { return x.kind; }); });
  R.add('/lesen/:unit/:id', function (el, p) {
    return Promise.all([DR.loadUnit(p.unit), DR.allWords()]).then(function (r) {
      var u = r[0], words = r[1], x = find(u, 'texts', p.id);
      if (!x) { R.go('#/lesen', true); return; }
      var dict = {};
      words.forEach(function (w) { dict[DR.fold(w.de)] = w; if (w.pl && w.pl !== 'Sg.' && w.pl !== 'Pl.') dict[DR.fold(w.pl)] = w; });
      el.appendChild(h('div', DR.ui.hero('book', u.level + ' · ' + x.kind, x.title)));
      el.appendChild(h('p.small.muted', DR.icon('info'), ' ', t('lesen_hint')));
      var reader = h('div.card.reader');
      String(x.text).split(/(\s+)/).forEach(function (part) {
        if (/^\s+$/.test(part) || !part) { reader.appendChild(document.createTextNode(part)); return; }
        var m = part.match(/^([^\wÄÖÜäöüß]*)([\wÄÖÜäöüß-]+)(.*)$/);
        if (!m) { reader.appendChild(document.createTextNode(part)); return; }
        reader.appendChild(document.createTextNode(m[1]));
        reader.appendChild(h('span.w', { onclick: function () { pop(this, m[2]); } }, m[2]));
        reader.appendChild(document.createTextNode(m[3]));
      });
      el.appendChild(reader);
      function lookup(word) {
        var gl = x.glossary || {};
        if (gl[word]) return { ru: gl[word] };
        var lw = word.toLowerCase();
        if (DR.FUNC[lw]) return { ru: DR.FUNC[lw] };
        var f = DR.fold(word);
        if (dict[f]) return dict[f];
        // einfache Formen: Endungen abschneiden
        var tries = [f.replace(/(en|n|e|s|es|er|em|st|t|te|ten)$/, ''), f.replace(/(e|en|er|es|em)$/, ''), f.replace(/^ge/, '').replace(/(t|en)$/, '')];
        for (var i = 0; i < tries.length; i++) {
          var k = tries[i];
          if (dict[k]) return dict[k];
          var hit = Object.keys(dict).filter(function (d) { return d.length > 3 && (d.indexOf(k) === 0 || k.indexOf(d) === 0) && Math.abs(d.length - k.length) <= 3; })[0];
          if (hit && k.length > 3) return dict[hit];
        }
        return null;
      }
      function pop(span, word) {
        var old = document.querySelector('.popover'); if (old) old.remove();
        Array.prototype.forEach.call(reader.querySelectorAll('.w.on'), function (s) { s.classList.remove('on'); });
        span.classList.add('on');
        var w = lookup(word);
        var box = h('div.popover', { role: 'dialog' },
          h('div.row.nowrap', h('b.grow', w && w.id ? DR.wordLabel(w) : word), DR.speakBtn(w && w.id ? (w.type === 'N' ? w.art + ' ' + w.de : w.de) : word),
            h('button.btn.ghost.small.icon-only', { type: 'button', 'aria-label': t('close'), onclick: function () { box.remove(); span.classList.remove('on'); } }, DR.icon('x'))),
          h('div', w ? w.ru : h('span.muted', t('no_translation'))),
          w && w.id ? h('div.small.muted', DR.wordSub(w)) : null,
          w && w.id ? h('button.btn.small', { type: 'button', style: { marginTop: '10px' }, onclick: function () { DR.srs.add(w.id); DR.ui.toast(t('added')); box.remove(); } }, DR.icon('plus'), t('add_card')) : null);
        document.body.appendChild(box);
      }
      DR.ui.backbar([h('a.btn', { href: '#/lesen/' + u.id + '/' + x.id + '/fragen' }, DR.icon('list-checks'), t('questions') + ' (' + x.questions.length + ')')]);
    });
  });
  R.add('/lesen/:unit/:id/fragen', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var x = find(u, 'texts', p.id);
      if (!x) { R.go('#/lesen', true); return; }
      var details = h('details.card', h('summary', h('b', x.title)), h('div.reader', { style: { marginTop: '10px' } }, x.text));
      var wrap = h('div'); el.appendChild(details); el.appendChild(wrap);
      DR.ex.run(wrap, { title: x.title, items: x.questions, key: 't:' + x.id, skill: 'Lesen', color: DR.section('lesen').c });
    });
  });

  /* ---------- Schreiben ---------- */
  R.add('/schreiben', function (el) { overview(el, 'schreiben', 'writing', 'w:', '#/schreiben/', function (x) { return x.kind; }); });
  R.add('/schreiben/:unit/:id', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var x = find(u, 'writing', p.id);
      if (!x) { R.go('#/schreiben', true); return; }
      var key = 'dr.draft.' + x.id, draft = '';
      try { draft = localStorage.getItem(key) || ''; } catch (e) { /* privat */ }
      el.appendChild(h('div', DR.ui.hero('memo', x.exam, x.kind)));
      el.appendChild(h('div.card', h('h3', t('task')), DR.ui.rich(x.task), h('details', h('summary.small.muted', 'RU'), DR.ui.rich(x.task_ru)),
        h('ul', (x.points || []).map(function (pt) { return h('li', pt); })),
        h('p.small.muted', (x.words || []).join('–') + ' ' + t('words_count'))));
      el.appendChild(h('div.card', h('h3', t('structure')), h('ol', (x.structure || []).map(function (s) { return h('li', s); }))));
      el.appendChild(h('div.card', h('h3', t('redemittel')), (x.redemittel || []).map(function (r) { return h('div.term', h('b', r.de), h('span.small', r.ru)); })));
      var ta = h('textarea.inp', { value: draft, placeholder: t('your_text') + ' …', spellcheck: false, 'aria-label': t('your_text') });
      var cnt = h('span.chip', '0 ' + t('words_count'));
      function count() {
        var n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
        cnt.textContent = n + ' ' + t('words_count');
        var lo = (x.words || [0, 9999])[0], hi = (x.words || [0, 9999])[1];
        cnt.style.color = n >= lo && n <= hi * 1.15 ? 'var(--ok)' : '';
        try { localStorage.setItem(key, ta.value); } catch (e) { /* privat */ }
      }
      ta.addEventListener('input', count);
      el.appendChild(h('div.card', h('div.row', h('h3.grow', { style: { margin: 0 } }, t('your_text')), cnt), h('div', { style: { height: '10px' } }), ta));
      count();
      el.appendChild(h('div.card', h('h3', t('checklist')), (x.checklist || []).map(function (c, i) { return h('label.row.nowrap', { style: { padding: '6px 0' } }, h('input', { type: 'checkbox', id: 'ck' + i, style: { width: '22px', height: '22px' } }), h('span', c)); })));
      var model = h('div.card', h('h3', t('model')), h('div.reader', x.model));
      model.classList.add('hide');
      el.appendChild(h('button.btn.ghost.block', { type: 'button', style: { marginBottom: '14px' }, onclick: function () { model.classList.toggle('hide'); } }, DR.icon('eye'), t('show_model')));
      el.appendChild(model);
      DR.ui.backbar([
        h('button.btn.ghost', { type: 'button', onclick: function () {
          DR.copy(DR.aiPrompt(u, x, ta.value)).then(function () { DR.ui.toast(t('copied')); });
        } }, DR.icon('copy'), 'KI'),
        h('button.btn', { type: 'button', onclick: function () { DR.store.record('w:' + x.id, 1, 1, 'Schreiben', { words: ta.value.trim().split(/\s+/).length }); DR.ui.toast('✓ ' + t('done')); } }, DR.icon('check'), t('finish'))]);
    });
  });
  DR.aiPrompt = function (u, x, text) {
    return [
      'Du bist eine erfahrene Prüferin für Deutsch als Fremdsprache. Bitte bewerte den folgenden Text eines Lernenden.',
      '', 'Niveau: ' + u.level + ' (GER/CEFR)', 'Prüfungsformat: ' + x.exam, 'Textsorte: ' + x.kind, 'Wortzahl: ' + (x.words || []).join('–') + ' Wörter',
      '', 'Aufgabe:', String(x.task).trim(), '', 'Inhaltspunkte:', (x.points || []).map(function (p) { return '- ' + p; }).join('\n'),
      '', 'Bewertungskriterien: Erfüllung der Aufgabe (alle Inhaltspunkte), Kommunikative Gestaltung (Anrede, Gruß, Textsorte), Wortschatz, Grammatik und Rechtschreibung — passend zum Niveau ' + u.level + '.',
      '', 'Text des Lernenden:', '"""', (text || '').trim() || '(leer)', '"""', '',
      'Bitte antworte auf Russisch:', '1) Kurze Gesamteinschätzung und geschätzte Punktzahl nach den Kriterien.', '2) Liste der Fehler: Original → Korrektur → kurze Erklärung.', '3) Korrigierte Fassung des ganzen Textes.', '4) Zwei konkrete Tipps für das nächste Mal.'
    ].join('\n');
  };

  /* ---------- Dialoge ---------- */
  R.add('/dialoge', function (el) {
    overview(el, 'dialog', 'dialogues', 'd:', '#/dialoge/', function (x) { return x.title_ru; });
    var any = DR.readyUnits().some(function (u) { return (u.speaking || []).length; });
    if (any) el.appendChild(h('a.btn.ghost.block', { href: '#/sprechen' }, DR.icon('mic'), t('speak_cards')));
  });
  R.add('/dialoge/:unit/:id', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var d = find(u, 'dialogues', p.id);
      if (!d) { R.go('#/dialoge', true); return; }
      el.appendChild(h('div', DR.ui.hero('speech', u.level + ' · ' + (d.partner || ''), d.title, d.title_ru)));
      el.appendChild(h('div.card.small', h('b', t('situation') + ': '), d.situation_ru));
      var chat = h('div.chat'), opts = h('div.opts');
      el.appendChild(chat); el.appendChild(opts);
      var good = 0, bad = 0;
      function node(id) {
        var n = d.nodes[id];
        chat.appendChild(h('div.bubble', h('div', n.say, ' ', DR.speakBtn(n.say, { voice: d.voice })), n.ru ? h('div.ru', n.ru) : null));
        DR.speech.say(n.say, { voice: d.voice });
        opts.innerHTML = '';
        if (n.end) {
          opts.appendChild(h('div.feedback.ok', t('dialog_end') + ' · ' + good + ' ✓ / ' + bad + ' ✗'));
          DR.store.record('d:' + d.id, good, good + bad, 'Sprechen');
          DR.ui.backbar([h('button.btn.ghost', { type: 'button', onclick: function () { R.refresh(); } }, DR.icon('rotate-ccw'), t('restart'))]);
          return;
        }
        DR.shuffle(n.options).forEach(function (o) {
          opts.appendChild(h('button.opt', { type: 'button', onclick: function () {
            chat.appendChild(h('div.bubble.me', h('div', o.t), o.ru ? h('div.ru', o.ru) : null));
            if (o.ok === false) { bad++; chat.appendChild(h('div.bubble.fb', DR.icon('info'), ' ', o.fb)); } else good++;
            opts.innerHTML = '';
            setTimeout(function () { node(o.next); window.scrollTo({ top: document.body.scrollHeight, behavior: DR.reducedMotion() ? 'auto' : 'smooth' }); }, 450);
          } }, o.t));
        });
      }
      node(d.start);
    });
  });

  /* ---------- Sprechkarten ---------- */
  R.add('/sprechen', function (el) {
    el.appendChild(h('div', DR.ui.hero('speaker', t('s_dialog'), t('speak_cards'), 'Карточки для устной части экзамена — для урока и самостоятельной подготовки.')));
    var st = DR.store.get();
    DR.readyUnits().forEach(function (u) {
      if (!(u.speaking || []).length) return;
      el.appendChild(h('h2', u.city));
      var list = h('div.list');
      u.speaking.forEach(function (x) { list.appendChild(DR.ui.item({ href: '#/sprechen/' + u.id + '/' + x.id, emoji: 'speaker', c: DR.section('dialog').c, title: x.title, sub: x.title_ru, done: !!st.done['sp:' + x.id] })); });
      el.appendChild(list);
    });
  });
  R.add('/sprechen/:unit/:id', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var x = find(u, 'speaking', p.id);
      if (!x) { R.go('#/sprechen', true); return; }
      el.appendChild(h('div', DR.ui.hero('speaker', x.exam || u.level, x.task, x.task_ru)));
      if (x.prompts && x.prompts.length) el.appendChild(h('div.card', h('div.row', x.prompts.map(function (pr) { return h('span.chip', { style: { fontSize: '17px', padding: '10px 14px' } }, pr); }))));
      if (x.model) {
        var m = h('div.card.hide', h('h3', t('model')), h('div.reader', x.model), h('div', { style: { marginTop: '8px' } }, DR.speakBtn(x.model)));
        el.appendChild(h('button.btn.ghost.block', { type: 'button', style: { marginBottom: '14px' }, onclick: function () { m.classList.toggle('hide'); } }, DR.icon('eye'), t('show_model')));
        el.appendChild(m);
      }
      DR.ui.backbar([h('button.btn', { type: 'button', onclick: function () { DR.store.record('sp:' + x.id, 1, 1, 'Sprechen'); DR.ui.toast('✓'); } }, DR.icon('check'), t('done'))]);
    });
  });
})();
