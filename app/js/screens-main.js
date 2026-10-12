/* Bildschirme: Start, Karte, Stadt, Mini-Test, Reisepass */
'use strict';
(function () {
  var h = DR.h, t = DR.t, R = DR.router;

  function nextUnit() {
    var st = DR.store.get();
    var ready = DR.readyUnits();
    return ready.filter(function (u) { return !st.done['test:' + u.id]; })[0] || ready[ready.length - 1];
  }
  DR.nextUnit = nextUnit;

  /* ---------- Start ---------- */
  R.add('/', function (el) {
    var th = DR.theme.current(), hr = new Date().getHours();
    var greet = hr < 5 ? t('greet_n') : hr < 11 ? t('greet_m') : hr < 18 ? t('greet_d') : hr < 23 ? t('greet_e') : t('greet_n');
    var nu = nextUnit(), due = DR.srs.dueCount();
    el.appendChild(h('div', { style: { margin: '10px 0 16px' } },
      h('div.kicker', t('today_theme') + ': ' + th.name + (DR.lang() === 'ru' ? ' · ' + th.ru : '')),
      h('h1', greet)));
    var tiles = h('div.tiles');
    if (nu) {
      tiles.appendChild(DR.ui.tile(DR.section('reise'), { wide: true, href: '#/stadt/' + nu.id, label: t('continue_at') + ' ' + nu.city, sub: nu.level + ' · ' + nu.title }));
      tiles.lastChild.querySelector('img').src = 'assets/emoji/' + nu.emoji + '.webp';
    }
    DR.SECTIONS.forEach(function (s) {
      var badge = s.id === 'wort' && due ? due : null;
      tiles.appendChild(DR.ui.tile(s, { badge: badge }));
    });
    el.appendChild(tiles);
    if (DR.install.can()) {
      el.appendChild(h('button.btn.ghost.block', { type: 'button', style: { marginBottom: '16px' }, onclick: function () { DR.install.run(); } },
        DR.icon('download'), 'App installieren · установить на телефон'));
    }
    animateTiles(tiles);
  });
  function animateTiles(tiles) {
    if (DR.reducedMotion()) return;
    Array.prototype.forEach.call(tiles.children, function (c, i) {
      c.animate([{ transform: 'translateY(24px) scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 520, delay: 40 * i, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
    });
  }

  /* ---------- Karte ---------- */
  R.add('/karte', function (el) {
    var st = DR.store.get(), units = DR.INDEX.units;
    el.appendChild(h('div', DR.ui.hero('worldmap', 'Hamburg → Wien', t('s_reise'))));
    var NS = 'http://www.w3.org/2000/svg';
    function s(tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }
    var svg = s('svg', { viewBox: '0 0 360 520', role: 'img', 'aria-label': 'Reiseroute' });
    var main = units.filter(function (u) { return u.country !== 'CH'; });
    var d = main.map(function (u, i) { return (i ? 'L' : 'M') + u.x + ' ' + u.y; }).join(' ');
    [['DEUTSCHLAND', 160, 250], ['ÖSTERREICH', 205, 512], ['SCHWEIZ', 120, 488]].forEach(function (l) {
      var tx = s('text', { x: l[1], y: l[2], 'font-size': '11', 'font-weight': '800', 'letter-spacing': '3', fill: 'currentColor', opacity: '.35' }); tx.textContent = l[0]; svg.appendChild(tx);
    });
    svg.appendChild(s('path', { class: 'route', d: d }));
    var bonus = units.filter(function (u) { return u.country === 'CH'; });
    var wienZ = units.filter(function (u) { return u.id === 'b2-wien'; })[0];
    if (bonus.length && wienZ) svg.appendChild(s('path', { class: 'route', d: 'M' + wienZ.x + ' ' + wienZ.y + ' Q200 480 ' + bonus[0].x + ' ' + bonus[0].y + ' L' + bonus[1].x + ' ' + bonus[1].y, opacity: '.5' }));
    units.forEach(function (u) {
      var done = !!st.done['test:' + u.id];
      var g = s('g', { class: 'city-node' + (done ? ' done' : '') + (u.ready ? '' : ' soon'), transform: 'translate(' + u.x + ' ' + u.y + ')', tabindex: '0', role: 'link', 'aria-label': u.city });
      g.style.setProperty('--lc', DR.ui.levelColor(u.level));
      g.appendChild(s('circle', { class: 'bgc', r: '17' }));
      var img = s('image', { href: 'assets/emoji/' + u.emoji + '.webp', x: '-13', y: '-13', width: '26', height: '26' });
      g.appendChild(img);
      var sd = u.side || 'r';
      var label = s('text', { x: sd === 'l' ? '-22' : sd === 'r' ? '22' : '0', y: sd === 'b' ? '34' : sd === 't' ? '-24' : '5', 'text-anchor': sd === 'l' ? 'end' : sd === 'r' ? 'start' : 'middle' }); label.textContent = u.city;
      g.appendChild(label);
      g.addEventListener('click', function () { R.go('#/stadt/' + u.id); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter') R.go('#/stadt/' + u.id); });
      svg.appendChild(g);
    });
    el.appendChild(h('div.card.map-wrap', svg));
    var list = h('div.list');
    units.forEach(function (u) {
      list.appendChild(DR.ui.item({ href: '#/stadt/' + u.id, emoji: u.emoji, title: u.n + '. ' + u.city, level: u.level, c: DR.ui.levelColor(u.level),
        sub: (DR.lang() === 'ru' ? u.title_ru : u.title) + (u.ready ? '' : ' · ' + t('soon')), done: !!st.done['test:' + u.id] }));
    });
    el.appendChild(list);
  });

  /* ---------- Stadt ---------- */
  R.add('/stadt/:id', function (el, p) {
    var meta = DR.unitMeta(p.id);
    if (!meta) { R.go('#/karte', true); return; }
    el.appendChild(h('div', DR.ui.hero(meta.emoji, meta.level + ' · ' + meta.city, meta.title, DR.lang() === 'ru' || DR.lang() === 'de' ? meta.title_ru : '')));
    if (!meta.ready) { el.appendChild(h('div.card', DR.ui.empty(t('city_soon'), 'hourglass'))); return; }
    return DR.loadUnit(p.id).then(function (u) {
      var st = DR.store.get();
      if (meta.intro) el.appendChild(h('div.card', DR.ui.rich(meta.intro)));
      var learned = u.vocab.filter(function (w) { return st.words[w.id]; }).length;
      var list = h('div.list');
      var c = DR.section;
      list.appendChild(DR.ui.item({ href: '#/wortschatz/' + u.id, emoji: c('wort').emoji, c: c('wort').c, title: t('s_wort'), sub: learned + ' / ' + u.vocab.length + ' ' + t('vocab'), right: h('span', DR.pct(learned, u.vocab.length) + '%') }));
      (u.grammar || []).forEach(function (g) { list.appendChild(DR.ui.item({ href: '#/grammatik/' + u.id + '/' + g.id, emoji: c('gram').emoji, c: c('gram').c, title: g.title, sub: g.title_ru, done: !!st.done['g:' + g.id] })); });
      (u.dialogues || []).forEach(function (d) { list.appendChild(DR.ui.item({ href: '#/dialoge/' + u.id + '/' + d.id, emoji: c('dialog').emoji, c: c('dialog').c, title: d.title, sub: d.title_ru, done: !!st.done['d:' + d.id] })); });
      (u.texts || []).forEach(function (x) { list.appendChild(DR.ui.item({ href: '#/lesen/' + u.id + '/' + x.id, emoji: c('lesen').emoji, c: c('lesen').c, title: x.title, sub: t('s_lesen') + ' · ' + x.kind, done: !!st.done['t:' + x.id] })); });
      (u.listening || []).forEach(function (x) { list.appendChild(DR.ui.item({ href: '#/hoeren/' + u.id + '/' + x.id, emoji: c('hoeren').emoji, c: c('hoeren').c, title: x.title, sub: t('s_hoeren') + ' · ' + x.kind, done: !!st.done['h:' + x.id] })); });
      (u.writing || []).forEach(function (x) { list.appendChild(DR.ui.item({ href: '#/schreiben/' + u.id + '/' + x.id, emoji: c('schreiben').emoji, c: c('schreiben').c, title: x.kind + ': ' + firstLine(x.task), sub: x.exam, done: !!st.done['w:' + x.id] })); });
      (u.speaking || []).forEach(function (x) { list.appendChild(DR.ui.item({ href: '#/sprechen/' + u.id + '/' + x.id, emoji: 'speaker', c: c('dialog').c, title: x.task, sub: x.task_ru, done: !!st.done['sp:' + x.id] })); });
      el.appendChild(list);
      var tdone = st.done['test:' + u.id];
      el.appendChild(h('a.btn.block' + (tdone ? '.ghost' : ''), { href: '#/stadt/' + u.id + '/test' }, DR.icon('stamp'), t('mini_test') + (tdone ? ' · ' + DR.pct(tdone.best || tdone.sc, tdone.max) + '%' : '')));
    });
  });
  function firstLine(s) { s = String(s || '').split('\n')[0]; return s.length > 60 ? s.slice(0, 57) + '…' : s; }

  R.add('/stadt/:id/test', function (el, p) {
    return DR.loadUnit(p.id).then(function (u) {
      if (!u) { R.go('#/karte', true); return; }
      DR.ex.run(el, { title: t('mini_test') + ' · ' + u.city, items: u.test, key: 'test:' + u.id, skill: 'Grammatik', passAt: 60,
        onFinish: function (r) {
          if (r.pass) {
            DR.store.update(function (s) { DR.srs.stampReview(s, u.id); }, 'Stempel ' + u.id);
            DR.ui.toast(t('unit_done'));
            el.insertBefore(h('a.card.center', { href: '#/pass', style: { display: 'block', textDecoration: 'none', color: 'inherit' } }, stampEl(DR.unitMeta(u.id), 1, 0), h('p', h('b', t('unit_done')))), el.children[1]);
          }
        } });
    });
  });

  /* ---------- Reisepass ---------- */
  function stampEl(u, o, i) {
    return h('div.stamp' + (o == null ? '.empty' : ''), { style: { '--sc': DR.ui.levelColor(u.level), '--o': o == null ? 1 : (0.22 + 0.78 * o).toFixed(2), '--r': ((i * 37) % 22 - 11) + 'deg' }, title: u.city },
      DR.emoji(u.emoji), h('span', u.city), h('span', { style: { fontSize: '9px' } }, u.level));
  }
  R.add('/pass', function (el) {
    var st = DR.store.get();
    var stamps = h('div.pages');
    DR.INDEX.units.forEach(function (u, i) {
      var has = st.units[u.id];
      stamps.appendChild(stampEl(u, has ? DR.srs.stampMemory(u.id) : null, i));
    });
    el.appendChild(h('div.passport', h('h2', 'Reisepass · Паспорт'), h('div.small', { style: { opacity: .8 } }, t('stamps') + ': ' + Object.keys(st.units).length + ' / ' + DR.INDEX.units.length), stamps));
    var learned = Object.keys(st.words).length;
    el.appendChild(h('div.stats',
      h('div.card.stat', DR.emoji('fire'), h('b', DR.store.streak()), h('small', t('streak'))),
      h('div.card.stat', DR.emoji('brain'), h('b', DR.srs.longCount()), h('small', t('words_long'))),
      h('div.card.stat', DR.emoji('cards'), h('b', learned), h('small', t('vocab')))));
    var sk = h('div.card', h('h3', t('skills')));
    skillStats().forEach(function (s) {
      sk.appendChild(h('div.skill', h('div.row', h('span', s.name), h('span.muted.small', s.done + ' / ' + s.total + (s.acc != null ? ' · ' + s.acc + '% ✓' : ''))), DR.ui.bar(DR.pct(s.done, s.total), s.c)));
    });
    el.appendChild(sk);
    el.appendChild(h('p.small.muted', 'Штампы выцветают, если юнит давно не повторяли. Пройди мини-тест ещё раз — штамп снова станет ярким.'));
  });
  function skillStats() {
    var st = DR.store.get(), ready = DR.readyUnits();
    function count(key, pre) { var tot = 0, done = 0; ready.forEach(function (u) { (u[key] || []).forEach(function (x) { tot++; if (st.done[pre + x.id]) done++; }); }); return [done, tot]; }
    function acc(name) { var k = st.skills[name]; return k && k.n ? DR.pct(k.c, k.n) : null; }
    var words = 0, learned = 0;
    ready.forEach(function (u) { words += u.words || 0; });
    Object.keys(st.words).forEach(function () { learned++; });
    var r = [
      ['Lesen', count('texts', 't:'), 'lesen'], ['Hören', count('listening', 'h:'), 'hoeren'], ['Schreiben', count('writing', 'w:'), 'schreiben'],
      ['Sprechen', (function () { var a = count('dialogues', 'd:'), b = count('speaking', 'sp:'); return [a[0] + b[0], a[1] + b[1]]; })(), 'dialog'],
      ['Grammatik', count('grammar', 'g:'), 'gram'], ['Wortschatz', [Math.min(learned, words), words], 'wort']
    ];
    return r.map(function (x) { return { name: x[0], done: x[1][0], total: x[1][1], acc: acc(x[0]), c: DR.section(x[2]).c }; });
  }
  DR.skillStats = skillStats;
})();
