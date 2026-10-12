/* Hausaufgaben ohne Server: Lehrkraft baut eine Aufgabe → Link; Lernende erledigen sie → Ergebniscode;
   Lehrkraft fügt den Code ein → Auswertung mit Fehlern und schwachen Themen. */
'use strict';
(function () {
  var h = DR.h, t = DR.t, R = DR.router;
  var KIND = { g: 'Grammatik', t: 'Lesen', h: 'Hören', d: 'Dialog', w: 'Schreiben', sp: 'Sprechen', test: 'Mini-Test', vok: 'Wortschatz' };

  function enc(obj, prefix) { return prefix + DR.b64enc(JSON.stringify(obj)); }
  function dec(code, prefix) {
    code = String(code || '').trim();
    var i = code.indexOf(prefix);
    if (i < 0) throw new Error('prefix');
    return JSON.parse(DR.b64dec(code.slice(i + prefix.length).split(/[\s#&?]/)[0]));
  }
  function baseUrl() { return location.href.split('#')[0]; }

  /* Alle Aufgaben einer Einheit als wählbare Punkte */
  function itemsOf(u) {
    var out = [];
    (u.grammar || []).forEach(function (x) { out.push({ k: 'g:' + x.id, title: x.title, href: '#/grammatik/' + u.id + '/' + x.id + '/ueben' }); });
    (u.texts || []).forEach(function (x) { out.push({ k: 't:' + x.id, title: x.title, href: '#/lesen/' + u.id + '/' + x.id }); });
    (u.listening || []).forEach(function (x) { out.push({ k: 'h:' + x.id, title: x.title, href: '#/hoeren/' + u.id + '/' + x.id }); });
    (u.dialogues || []).forEach(function (x) { out.push({ k: 'd:' + x.id, title: x.title, href: '#/dialoge/' + u.id + '/' + x.id }); });
    (u.writing || []).forEach(function (x) { out.push({ k: 'w:' + x.id, title: x.kind + ': ' + String(x.title || '').split('\n')[0].slice(0, 50), href: '#/schreiben/' + u.id + '/' + x.id }); });
    (u.speaking || []).forEach(function (x) { out.push({ k: 'sp:' + x.id, title: x.title, href: '#/sprechen/' + u.id + '/' + x.id }); });
    out.push({ k: 'test:' + u.id, title: t('mini_test') + ' ' + u.city, href: '#/stadt/' + u.id + '/test' });
    out.push({ k: 'vok:' + u.id, title: t('mode_cards') + ' (' + u.city + ')', href: '#/wortschatz-karten/' + u.id });
    return out;
  }
  function allItems() { var m = {}; DR.readyUnits().forEach(function (u) { itemsOf(u).forEach(function (it) { it.u = u; m[it.k] = it; }); }); return m; }
  function kindOf(k) { return KIND[k.split(':')[0]] || k; }

  /* ---------- Übersicht ---------- */
  R.add('/hausaufgaben', function (el) {
    el.appendChild(h('div', DR.ui.hero('backpack', 'Für Lehrkräfte · для учителя', t('s_haus'))));
    var c = DR.section('haus').c;
    el.appendChild(h('div.list',
      DR.ui.item({ href: '#/hausaufgaben/neu', icon: 'plus', c: c, title: 'Neue Hausaufgabe', sub: 'Собрать задание и получить ссылку для ученика' }),
      DR.ui.item({ href: '#/hausaufgaben/auswerten', icon: 'clipboard-list', c: c, title: 'Ergebnis auswerten', sub: 'Вставить код результата от ученика' })));
    var mine = DR.store.get().hw || {};
    var ids = Object.keys(mine).filter(function (k) { return mine[k] && mine[k].task; });
    if (ids.length) {
      el.appendChild(h('h2', 'Meine Aufgaben / Мои задания (ученик)'));
      var l = h('div.list');
      ids.forEach(function (id) { var x = mine[id]; l.appendChild(DR.ui.item({ href: '#/hw/' + x.code, icon: 'list-checks', c: c, title: x.task.title || 'Hausaufgabe', sub: x.task.due ? 'bis ' + x.task.due : '' })); });
      el.appendChild(l);
    }
    el.appendChild(h('p.small.muted', 'Всё работает без сервера: задание передаётся ссылкой, результат — кодом. Ничего не хранится в интернете.'));
  });

  /* ---------- Baukasten ---------- */
  R.add('/hausaufgaben/neu', function (el) {
    el.appendChild(h('div', DR.ui.hero('backpack', t('s_haus'), 'Neue Hausaufgabe', 'Выберите город и упражнения. Ссылку отправьте ученику в мессенджер.')));
    return DR.loadAllUnits().then(function () {
      var ready = DR.readyUnits(), chosen = {};
      var title = h('input.inp', { type: 'text', placeholder: 'Titel, z. B. „Hamburg – Woche 1“', 'aria-label': 'Titel' });
      var due = h('input.inp', { type: 'date', 'aria-label': 'Abgabe bis', value: DR.today(new Date(Date.now() + 7 * DR.DAY)) });
      var note = h('textarea.inp', { placeholder: 'Kommentar für den Schüler (optional) / комментарий', style: { minHeight: '80px', fontFamily: 'inherit' } });
      el.appendChild(h('div.card.stack', h('b', 'Titel / Название'), title, h('b', 'Abgabe bis / Срок'), due, note));
      var box = h('div');
      ready.forEach(function (meta) {
        var items = itemsOf(meta);
        var card = h('div.card', h('h3', h('span.lvl', meta.level), ' ', meta.city, ' — ', meta.title));
        items.forEach(function (it) {
          var cb = h('input', { type: 'checkbox', style: { width: '22px', height: '22px', flex: 'none' }, onchange: function () { if (this.checked) chosen[it.k] = 1; else delete chosen[it.k]; upd(); } });
          card.appendChild(h('label.row.nowrap', { style: { padding: '6px 0' } }, cb, h('span.grow', h('span.small.muted', kindOf(it.k) + ' · '), it.title)));
        });
        box.appendChild(card);
      });
      el.appendChild(box);
      var out = h('div');
      el.appendChild(out);
      var make = h('button.btn', { type: 'button', disabled: true, onclick: function () {
        var keys = Object.keys(chosen);
        var task = { v: 1, id: Math.random().toString(36).slice(2, 9), title: title.value.trim(), due: due.value, note: note.value.trim(), items: keys, created: Date.now() };
        var link = baseUrl() + '#/hw/' + enc(task, 'H1.');
        out.innerHTML = '';
        out.appendChild(h('div.card.stack', h('h3', 'Link für den Schüler / ссылка для ученика'), h('code.blob', link),
          h('div.row', h('button.btn.small', { type: 'button', onclick: function () { DR.copy(link).then(function () { DR.ui.toast(t('copied')); }); } }, DR.icon('copy'), 'Link kopieren'),
            navigator.share ? h('button.btn.ghost.small', { type: 'button', onclick: function () { navigator.share({ title: 'Deutsch-Reise: Hausaufgabe', text: task.title || 'Hausaufgabe', url: link }).catch(function () {}); } }, DR.icon('share-2'), 'Teilen') : null)));
        out.scrollIntoView({ behavior: 'smooth' });
      } }, DR.icon('link'), 'Link erstellen');
      function upd() { var n = Object.keys(chosen).length; make.disabled = !n; make.lastChild.textContent = n ? 'Link erstellen (' + n + ')' : 'Link erstellen'; }
      DR.ui.backbar([make]);
    });
  });

  /* ---------- Ansicht für Lernende ---------- */
  R.add('/hw/:code', function (el, p) {
    var task;
    try { task = dec(p.code, 'H1.'); } catch (e) { el.appendChild(h('div.card', DR.ui.empty('Link ungültig / ссылка повреждена', 'cross'))); return; }
    return DR.loadAllUnits().then(function () {
      var all = allItems(), st = DR.store.get();
      DR.store.update(function (s) { s.hw[task.id] = s.hw[task.id] || {}; s.hw[task.id].task = task; s.hw[task.id].code = p.code; }, null, true);
      el.appendChild(h('div', DR.ui.hero('backpack', task.due ? 'Abgabe bis ' + task.due.split('-').reverse().join('.') : t('s_haus'), task.title || 'Hausaufgabe')));
      if (task.note) el.appendChild(h('div.card', DR.ui.rich(task.note)));
      var list = h('div.list'), done = 0;
      task.items.forEach(function (k) {
        var it = all[k]; if (!it) return;
        var d = resultOf(k, st, task);
        if (d) done++;
        list.appendChild(DR.ui.item({ href: it.href, icon: 'list-checks', c: DR.section('haus').c, title: it.title, sub: kindOf(k) + (d ? ' · ' + (d.max ? d.sc + '/' + d.max : '✓') : ''), done: !!d }));
      });
      el.appendChild(h('div.progress-top', h('span.small', done + ' / ' + task.items.length), DR.ui.bar(DR.pct(done, task.items.length), DR.section('haus').c)));
      el.appendChild(list);
      var name = h('input.inp', { type: 'text', placeholder: 'Dein Name / твоё имя', value: (st.hw[task.id] && st.hw[task.id].name) || '' });
      el.appendChild(h('div.card.stack', h('h3', 'Ergebnis an die Lehrkraft / отчёт учителю'), name,
        h('p.small.muted', 'Нажми кнопку — код и короткий отчёт скопируются. Вставь их в сообщение учителю.')));
      DR.ui.backbar([h('button.btn', { type: 'button', onclick: function () {
        DR.store.update(function (s) { s.hw[task.id].name = name.value.trim(); }, null, true);
        var res = { v: 1, id: task.id, title: task.title, name: name.value.trim(), t: Date.now(), r: {} };
        task.items.forEach(function (k) { var d = resultOf(k, DR.store.get(), task); if (d) res.r[k] = { sc: d.sc, max: d.max, m: (d.mist || []).slice(0, 8) }; });
        var code = enc(res, 'R1.');
        var text = report(task, res, all) + '\n\nCode: ' + code;
        DR.copy(text).then(function () { DR.ui.toast(t('copied')); });
      } }, DR.icon('copy'), 'Bericht kopieren')]);
    });
  });
  function resultOf(k, st, task) {
    if (k.indexOf('vok:') === 0) {
      var u = DR.units[k.slice(4)]; if (!u) return null;
      var n = u.vocab.filter(function (w) { var x = st.words[w.id]; return x && x.t >= task.created; }).length;
      return n ? { sc: n, max: u.vocab.length } : null;
    }
    var d = st.done[k];
    return d && d.t >= (task.created || 0) ? d : null;
  }
  function report(task, res, all) {
    var lines = ['Deutsch-Reise — ' + (task.title || 'Hausaufgabe') + (res.name ? ' — ' + res.name : '')];
    var done = 0;
    task.items.forEach(function (k) {
      var it = all[k], r = res.r[k];
      if (r) done++;
      lines.push((r ? '✅ ' : '⬜ ') + kindOf(k) + ': ' + (it ? it.title : k) + (r && r.max ? ' — ' + r.sc + '/' + r.max + ' (' + DR.pct(r.sc, r.max) + '%)' : ''));
    });
    lines.splice(1, 0, 'Erledigt / выполнено: ' + done + '/' + task.items.length);
    return lines.join('\n');
  }

  /* ---------- Auswertung für Lehrkräfte ---------- */
  R.add('/hausaufgaben/auswerten', function (el) {
    el.appendChild(h('div', DR.ui.hero('trophy', t('s_haus'), 'Ergebnis auswerten', 'Вставьте сообщение ученика целиком или только код R1.…')));
    var inp = h('textarea.inp', { placeholder: 'R1.…', style: { minHeight: '110px', fontFamily: 'monospace', fontSize: '13px' } });
    var out = h('div');
    el.appendChild(inp); el.appendChild(out);
    DR.ui.backbar([h('button.btn', { type: 'button', onclick: function () {
      out.innerHTML = '';
      var res;
      try { res = dec(inp.value, 'R1.'); } catch (e) { DR.ui.toast(t('import_bad')); return; }
      DR.loadAllUnits().then(function () {
        var all = allItems(), keys = Object.keys(res.r), weak = [];
        out.appendChild(h('div.card', h('h3', (res.title || 'Hausaufgabe') + (res.name ? ' — ' + res.name : '')), h('p.small.muted', new Date(res.t).toLocaleString('de-AT'))));
        var card = h('div.card');
        keys.forEach(function (k) {
          var r = res.r[k], it = all[k], p = r.max ? DR.pct(r.sc, r.max) : 100;
          if (r.max && p < 60 && k.indexOf('vok:') !== 0) weak.push(it ? it.title : k);
          card.appendChild(h('div.skill', h('div.row', h('span', kindOf(k) + ': ' + (it ? it.title : k)), h('span.small.muted', r.max ? r.sc + '/' + r.max : '✓')), r.max ? DR.ui.bar(p, p >= 80 ? 'var(--ok)' : p >= 60 ? 'var(--warn)' : 'var(--bad)') : null,
            (r.m || []).length ? h('details', h('summary.small', DR.t('mistakes') + ' (' + r.m.length + ')'), h('ul.small', r.m.map(function (m) { return h('li', m); }))) : null));
        });
        if (!keys.length) card.appendChild(h('p', 'Noch nichts erledigt / пока ничего не выполнено.'));
        out.appendChild(card);
        out.appendChild(h('div.card', h('h3', 'Schwache Themen / слабые темы'), weak.length ? h('ul', weak.map(function (w) { return h('li', w); })) : h('p', 'Keine — alles ab 60 %.')));
      });
    } }, DR.icon('clipboard-list'), 'Auswerten')]);
  });
})();
