/* Bildschirme: Wortschatz (Karteikarten, Eingabe, Artikel-Sprint, Liste) und Grammatik */
'use strict';
(function () {
  var h = DR.h, t = DR.t, R = DR.router;

  /* ---------- Wortschatz ---------- */
  function wordLabel(w) {
    if (w.type === 'N') return h('span', h('span.art-' + w.art, w.art), ' ', w.de);
    return h('span', w.de);
  }
  function wordSub(w) {
    if (w.type === 'N') return w.pl === 'Sg.' ? 'nur Singular' : w.pl === 'Pl.' ? 'nur Plural' : 'Pl.: die ' + w.pl;
    if (w.type === 'V') return [w.p3, w.prat, w.perf].join(' · ') + (w.rek ? ' · ' + w.rek : '');
    return w.pos || '';
  }
  function speakText(w) { return w.type === 'N' ? w.art + ' ' + w.de : w.de; }
  DR.wordLabel = wordLabel; DR.wordSub = wordSub;

  function unitChips(active, base) {
    var c = h('div.chips');
    c.appendChild(h('a.chip' + (!active ? '.on' : ''), { href: base }, t('all_units')));
    DR.readyUnits().forEach(function (u) { c.appendChild(h('a.chip' + (active === u.id ? '.on' : ''), { href: base + '/' + u.id }, u.city)); });
    return c;
  }
  function wordsFor(unitId) {
    return (unitId ? DR.loadUnit(unitId).then(function (u) { return u ? [u] : []; }) : DR.loadAllUnits()).then(function (us) {
      return [].concat.apply([], us.filter(Boolean).map(function (u) { return u.vocab; }));
    });
  }
  DR.allWords = function () { return wordsFor(null); };

  function wortHome(el, p) {
    var sec = DR.section('wort');
    el.appendChild(h('div', DR.ui.hero(sec.emoji, p.unit ? DR.unitMeta(p.unit).city : t('all_units'), t('s_wort'))));
    el.appendChild(unitChips(p.unit, '#/wortschatz'));
    return wordsFor(p.unit).then(function (words) {
      var ids = words.map(function (w) { return w.id; });
      var due = DR.srs.due(ids).length, fresh = DR.srs.fresh(ids).length, st = DR.store.get().words;
      var long = ids.filter(function (id) { return st[id] && st[id].s >= DR.srs.LONG; }).length;
      el.appendChild(h('div.stats',
        h('div.card.stat', DR.emoji('bell'), h('b', due), h('small', t('due'))),
        h('div.card.stat', DR.emoji('sparkles'), h('b', fresh), h('small', t('learn_new'))),
        h('div.card.stat', DR.emoji('brain'), h('b', long), h('small', 'Langzeit'))));
      var q = p.unit ? '/' + p.unit : '';
      var tiles = h('div.tiles', { style: { gridTemplateColumns: '1fr 1fr' } },
        DR.ui.tile({ id: 'w1', emoji: 'cards', c: sec.c }, { href: '#/wortschatz-karten' + q, label: t('mode_cards'), badge: due || null }),
        DR.ui.tile({ id: 'w2', emoji: 'key', c: '#3c7fb8' }, { href: '#/wortschatz-eingabe' + q, label: t('mode_type') }),
        DR.ui.tile({ id: 'w3', emoji: 'hourglass', c: '#c83a6a' }, { href: '#/wortschatz-sprint' + q, label: t('mode_sprint') }),
        DR.ui.tile({ id: 'w4', emoji: 'book', c: '#5d6878' }, { href: '#/wortschatz-liste' + q, label: t('mode_list') }));
      el.appendChild(tiles);
    });
  }
  R.add('/wortschatz', wortHome);
  R.add('/wortschatz/:unit', wortHome);

  /* Sitzungsauswahl: erst Fälliges, dann neue Wörter (max. 10 neue) */
  function sessionWords(words, n) {
    var ids = words.map(function (w) { return w.id; }), by = {};
    words.forEach(function (w) { by[w.id] = w; });
    var due = DR.srs.due(ids), fresh = DR.srs.fresh(ids);
    var pick = due.slice(0, n);
    if (pick.length < n) pick = pick.concat(fresh.slice(0, Math.min(10, n - pick.length)));
    if (!pick.length) pick = DR.shuffle(ids).slice(0, n);
    return pick.map(function (id) { return by[id]; });
  }

  function cards(el, p) {
    return wordsFor(p.unit).then(function (words) {
      var list = DR.shuffle(sessionWords(words, 15)), i = 0, right = 0;
      var top = h('div.progress-top', h('span.small.muted'), DR.ui.bar(0, DR.section('wort').c));
      var stage = h('div');
      el.appendChild(h('div.kicker', t('mode_cards'))); el.appendChild(top); el.appendChild(stage);
      function show() {
        if (i >= list.length) return end();
        var w = list[i], mem = DR.srs.memory(DR.store.get().words[w.id]);
        top.firstChild.textContent = (i + 1) + ' / ' + list.length;
        top.lastChild.firstChild.style.width = DR.pct(i, list.length) + '%';
        stage.innerHTML = '';
        var help = DR.helpLang();
        var card = h('div.flash', h('div.inner',
          h('div.face', h('div.kicker', h('span.mem', { style: { '--c': mem > 0.8 ? 'var(--ok)' : mem > 0.4 ? 'var(--warn)' : 'var(--bad)' } }), DR.store.get().words[w.id] ? Math.round(mem * 100) + '%' : t('learn_new')),
            h('div.word', w.ru), h('div.sub', w.type === 'N' ? 'der / die / das?' : w.type === 'V' ? 'Verb' : w.pos), h('div.sub.small', t('show'))),
          h('div.face.back', h('div.word', wordLabel(w)), h('div.sub', wordSub(w)), w.at ? h('div.sub.small', '🇦🇹 ' + w.at) : null,
            h('div.ex', w.ex), h('div.sub.small', w.ex_ru), h('div', { style: { marginTop: '10px' } }, DR.speakBtn(speakText(w))))));
        card.addEventListener('click', function (e) { if (!e.target.closest('button')) flip(); });
        stage.appendChild(card);
        var flipped = false;
        function flip() {
          if (flipped) return; flipped = true; card.classList.add('flip');
          DR.speech.say(speakText(w));
          DR.ui.backbar([
            h('button.btn.bad', { type: 'button', onclick: function () { DR.srs.review(w.id, false); list.push(w); i++; show(); } }, DR.icon('x'), t('dont_know')),
            h('button.btn.ok', { type: 'button', onclick: function () { DR.srs.review(w.id, true); right++; i++; show(); } }, DR.icon('check'), t('know'))]);
        }
        DR.ui.backbar([h('button.btn', { type: 'button', onclick: flip }, DR.icon('eye'), t('show'))]);
        if (help === 'en') { /* Übersetzungen sind auf Russisch */ }
      }
      function end() {
        stage.innerHTML = '';
        top.lastChild.firstChild.style.width = '100%';
        stage.appendChild(h('div.card.center', DR.emoji('trophy'), h('h2', t('finish')), h('p', right + ' ✓'), h('a.btn', { href: location.hash, onclick: function (e) { e.preventDefault(); R.refresh(); } }, t('again'))));
        stage.querySelector('img').style.width = '90px';
        DR.ui.backbar([]);
      }
      if (!list.length) { stage.appendChild(DR.ui.empty(t('nothing_due'))); return; }
      show();
    });
  }
  R.add('/wortschatz-karten', cards);
  R.add('/wortschatz-karten/:unit', cards);

  function typeMode(el, p) {
    return wordsFor(p.unit).then(function (words) {
      var list = DR.shuffle(sessionWords(words, 12)).map(function (w) {
        var ans = w.type === 'N' ? [w.art + ' ' + w.de] : [w.de];
        return { type: 'gap', q: w.ru + ': ___', answer: ans, why: w.ex + ' — ' + w.ex_ru, _w: w, ru: w.type === 'N' ? 'mit Artikel / с артиклем' : (w.type === 'V' ? 'Infinitiv' : w.pos) };
      });
      DR.ex.run(el, { title: t('mode_type'), items: list, skill: null, color: DR.section('wort').c,
        onAnswer: function (it, res) { DR.srs.review(it._w.id, res !== 'bad'); } });
    });
  }
  R.add('/wortschatz-eingabe', typeMode);
  R.add('/wortschatz-eingabe/:unit', typeMode);

  function sprint(el, p) {
    return wordsFor(p.unit).then(function (words) {
      var nouns = DR.shuffle(words.filter(function (w) { return w.type === 'N' && w.pl !== 'Pl.'; }));
      var time = 60, score = 0, wrong = [], idx = 0, timer = null, running = false;
      var info = h('div.row', h('span.chip', DR.icon('timer'), h('b.t', '60')), h('span.grow'), h('span.chip', DR.icon('star'), h('b.s', '0')));
      var word = h('div.sprint-word', '');
      var btns = h('div.art-btns', ['der', 'die', 'das'].map(function (a) {
        return h('button.btn.' + a, { type: 'button', onclick: function () { answer(a); } }, a);
      }));
      el.appendChild(h('div.kicker', t('mode_sprint')));
      el.appendChild(h('div.card', info, word, btns));
      var res = h('div'); el.appendChild(res);
      if (!nouns.length) { word.textContent = '—'; return; }
      function show() { var w = nouns[idx % nouns.length]; word.textContent = w.de; word.dataset.id = w.id; }
      function answer(a) {
        if (!running) { start(); return; }
        var w = nouns[idx % nouns.length];
        var ok = a === w.art;
        if (ok) score++; else wrong.push(w);
        DR.srs.review(w.id, ok);
        word.style.color = ok ? 'var(--ok)' : 'var(--bad)';
        setTimeout(function () { word.style.color = ''; }, 180);
        info.querySelector('.s').textContent = score;
        idx++; show();
      }
      function start() {
        running = true; show(); res.innerHTML = '';
        timer = setInterval(function () {
          time--; info.querySelector('.t').textContent = time;
          if (time <= 0) stop();
        }, 1000);
      }
      function stop() {
        clearInterval(timer); running = false;
        word.textContent = score + ' ✓';
        DR.store.record('sprint', score, score + wrong.length, null);
        res.appendChild(h('div.card', h('h3', t('mistakes')), wrong.length ? wrong.map(function (w) { return h('div.vocab-row', h('span.de', wordLabel(w)), h('span.ru', w.ru)); }) : h('p', t('no_mistakes'))));
        time = 60;
        DR.ui.backbar([h('button.btn', { type: 'button', onclick: function () { score = 0; wrong = []; info.querySelector('.s').textContent = 0; start(); } }, t('again'))]);
      }
      word.textContent = 'der · die · das';
      DR.ui.backbar([h('button.btn', { type: 'button', onclick: start }, DR.icon('zap'), t('start'))]);
      window.addEventListener('hashchange', function once() { clearInterval(timer); window.removeEventListener('hashchange', once); });
    });
  }
  R.add('/wortschatz-sprint', sprint);
  R.add('/wortschatz-sprint/:unit', sprint);

  function liste(el, p) {
    el.appendChild(h('div.kicker', t('mode_list')));
    el.appendChild(unitChips(p.unit, '#/wortschatz-liste'));
    var search = h('input.inp', { type: 'search', placeholder: 'Suche / поиск …', 'aria-label': 'Suche' });
    el.appendChild(search);
    var box = h('div.card', { style: { marginTop: '12px' } });
    el.appendChild(box);
    return wordsFor(p.unit).then(function (words) {
      var st = DR.store.get().words;
      function draw() {
        var q = DR.fold(search.value);
        box.innerHTML = '';
        var group = null, n = 0;
        words.forEach(function (w) {
          if (q && DR.fold(w.de + ' ' + w.ru).indexOf(q) < 0) return;
          if (n > 400) return;
          if (w.group !== group) { group = w.group; box.appendChild(h('h3', group || '—')); }
          var m = st[w.id] ? DR.srs.memory(st[w.id]) : null;
          box.appendChild(h('div.vocab-row',
            h('span.mem', { style: { '--c': m == null ? 'var(--line)' : m > 0.8 ? 'var(--ok)' : m > 0.4 ? 'var(--warn)' : 'var(--bad)' }, title: m == null ? 'neu' : Math.round(m * 100) + '%' }),
            h('span.de', wordLabel(w), h('div.small.muted', wordSub(w) + (w.at ? ' · AT: ' + w.at : ''))),
            h('span.ru', w.ru), DR.speakBtn(speakText(w))));
          n++;
        });
        if (!n) box.appendChild(h('p.muted', '—'));
      }
      search.addEventListener('input', draw);
      draw();
    });
  }
  R.add('/wortschatz-liste', liste);
  R.add('/wortschatz-liste/:unit', liste);

  /* ---------- Grammatik ---------- */
  R.add('/grammatik', function (el) {
    var sec = DR.section('gram'), st = DR.store.get();
    el.appendChild(h('div', DR.ui.hero(sec.emoji, 'A1 → B2', t('s_gram'))));
    ['A1', 'A2', 'B1', 'B2'].forEach(function (lvl) {
      var us = DR.INDEX.units.filter(function (u) { return u.level === lvl; });
      el.appendChild(h('h2', h('span.lvl', { style: { background: DR.ui.levelColor(lvl), color: '#fff' } }, lvl), ' ', lvl === 'A1' ? 'Grundlagen' : lvl === 'A2' ? 'Alltag' : lvl === 'B1' ? 'Selbstständig' : 'Fortgeschritten'));
      var list = h('div.list'), any = false;
      us.forEach(function (u) {
        (u.grammar || []).forEach(function (g) {
          any = true;
          list.appendChild(DR.ui.item({ href: '#/grammatik/' + u.id + '/' + g.id, emoji: sec.emoji, c: sec.c, title: g.title, sub: g.title_ru + ' · ' + u.city, done: !!st.done['g:' + g.id] }));
        });
      });
      if (!any) list.appendChild(h('p.muted.small', t('city_soon')));
      el.appendChild(list);
    });
  });
  R.add('/grammatik/:unit/:gid', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var g = (u && u.grammar || []).filter(function (x) { return x.id === p.gid; })[0];
      if (!g) { R.go('#/grammatik', true); return; }
      var c = DR.section('gram').c;
      el.appendChild(h('div', DR.ui.hero('puzzle', u.level + ' · ' + u.city, g.title, g.title_ru)));
      el.appendChild(DR.ui.section(1, t('g_terms'), c, h('div', (g.terms || []).map(function (x) { return h('div.term', h('b', x.t), h('span', x.ru)); }))));
      el.appendChild(DR.ui.section(2, t('g_meaning'), c, DR.ui.rich(g.meaning)));
      el.appendChild(DR.ui.section(3, t('g_example'), c, h('div', (g.steps || []).map(function (s, i) { return h('div.step', h('div.de', (i + 1) + '. ' + s.de, ' ', DR.speakBtn(s.de)), h('div.small', s.ru)); }))));
      el.appendChild(DR.ui.section(4, t('g_table'), c, h('div.table-wrap', h('table.forms', g.table.head && g.table.head.length ? h('thead', h('tr', g.table.head.map(function (x) { return h('th', x); }))) : null,
        h('tbody', g.table.rows.map(function (r) { return h('tr', r.map(function (x) { return h('td', x); })); }))))));
      el.appendChild(DR.ui.section(5, t('g_exam'), c, h('div', DR.ui.rich(g.exam), g.traps && g.traps.length ? [h('h3', t('g_traps')), h('ul', g.traps.map(function (x) { return h('li', DR.ui.rich(x, 'span')); }))] : null)));
      DR.ui.backbar([h('a.btn', { href: '#/grammatik/' + u.id + '/' + g.id + '/ueben' }, DR.icon('puzzle'), t('start_ex') + ' (' + g.exercises.length + ')')]);
    });
  });
  R.add('/grammatik/:unit/:gid/ueben', function (el, p) {
    return DR.loadUnit(p.unit).then(function (u) {
      var g = (u && u.grammar || []).filter(function (x) { return x.id === p.gid; })[0];
      if (!g) { R.go('#/grammatik', true); return; }
      DR.ex.run(el, { title: g.title, items: g.exercises, key: 'g:' + g.id, skill: 'Grammatik', color: DR.section('gram').c });
    });
  });
})();
