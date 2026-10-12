/* Bildschirme: Einstellungen, Quellen & Impressum, Prüfung (Info), Hausaufgaben (Platzhalter) */
'use strict';
(function () {
  var h = DR.h, t = DR.t, R = DR.router;

  function seg(options, value, onpick) {
    var s = h('div.seg', { role: 'group' });
    options.forEach(function (o) {
      s.appendChild(h('button' + (o[0] === value ? '.on' : ''), { type: 'button', 'aria-pressed': o[0] === value ? 'true' : 'false', onclick: function () { onpick(o[0]); } }, o[1]));
    });
    return s;
  }

  R.add('/einstellungen', function (el) {
    var st = DR.store.get().settings;
    el.appendChild(h('div', DR.ui.hero('gear', '', t('s_settings'))));
    function set(k, v) { DR.store.setting(k, v); DR.theme.apply(); DR.app.header(); R.refresh(); }
    el.appendChild(h('div.card', h('h3', t('language')), seg([['de', 'Deutsch'], ['ru', 'Русский'], ['en', 'English']], st.lang, function (v) { set('lang', v); }),
      h('h3', t('mode')), seg([['auto', t('auto')], ['light', t('light')], ['dark', t('dark')]], st.mode, function (v) { set('mode', v); }),
      h('h3', t('motion')), seg([['auto', t('auto')], ['on', t('on')], ['off', t('off')]], st.motion, function (v) { set('motion', v); })));
    var sw = h('div.swatches');
    sw.appendChild(h('button.swatch' + (st.theme === 'auto' ? '.on' : ''), { type: 'button', onclick: function () { set('theme', 'auto'); } }, DR.emoji('sparkles'), t('auto')));
    DR.THEMES.forEach(function (th) {
      sw.appendChild(h('button.swatch' + (st.theme === th.id ? '.on' : ''), { type: 'button', onclick: function () { set('theme', th.id); } }, DR.emoji(th.emoji[0]), th.name));
    });
    el.appendChild(h('div.card', h('h3', t('theme')), h('p.small.muted', 'Без выбора тема меняется по дню недели.'), sw));
    var voices = DR.speech.voices();
    el.appendChild(h('div.card', h('h3', t('voice')),
      seg([['de-DE', '🇩🇪 de-DE'], ['de-AT', '🇦🇹 de-AT']], st.voice, function (v) { set('voice', v); }),
      h('p.small.muted', { style: { marginTop: '8px' } }, voices.length ? voices.map(function (v) { return v.name + ' (' + v.lang + ')'; }).join(', ') : t('no_voice')),
      h('button.btn.ghost.small', { type: 'button', onclick: function () { DR.speech.say('Grüß Gott! Herzlich willkommen auf der Deutsch-Reise.'); } }, DR.icon('volume-2'), t('test_voice'))));

    var code = h('code.blob.hide');
    var imp = h('textarea.inp', { placeholder: 'DR1.…', style: { minHeight: '90px', fontFamily: 'monospace', fontSize: '13px' }, 'aria-label': t('import') });
    var undo = DR.store.undoInfo();
    el.appendChild(h('div.card.stack', h('h3', 'Fortschritt / Прогресс'),
      h('p.small.muted', 'Прогресс хранится только в этом браузере. Код ниже переносит его на другое устройство или в другой браузер.'),
      h('button.btn.ghost.block', { type: 'button', onclick: function () {
        var c = DR.store.exportCode(); code.textContent = c; code.classList.remove('hide');
        DR.copy(c).then(function () { DR.ui.toast(t('copied')); });
      } }, DR.icon('download'), t('export')), code,
      imp,
      h('button.btn.ghost.block', { type: 'button', onclick: function () {
        try { DR.store.importCode(imp.value); DR.ui.toast(t('import_ok')); DR.theme.apply(); R.refresh(); } catch (e) { DR.ui.toast(t('import_bad')); }
      } }, DR.icon('upload'), t('import')),
      h('button.btn.ghost.block', { type: 'button', disabled: !undo, onclick: function () {
        var u = DR.store.undo(); DR.ui.toast(u ? t('undone') + (u.label ? ': ' + u.label : '') : t('nothing_undo')); DR.theme.apply(); R.refresh();
      } }, DR.icon('undo-2'), t('undo') + (undo && undo.label ? ' (' + undo.label + ')' : '')),
      h('button.btn.bad.block', { type: 'button', onclick: function () {
        DR.ui.confirm(t('reset'), t('reset_q')).then(function (ok) { if (ok) { DR.store.reset(); DR.ui.toast(t('done')); R.refresh(); } });
      } }, DR.icon('trash-2'), t('reset'))));
    el.appendChild(h('p.small.muted.center', 'Build ' + (DR.INDEX.build || '') + ' · ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? t('offline_ready') : 'online')));
  });

  R.add('/quellen', function (el) {
    el.appendChild(h('div', DR.ui.hero('newspaper', '', 'Impressum & Quellen')));
    el.appendChild(h('div.card.prose',
      h('h3', 'Inhalte'),
      h('p', 'Alle Texte, Dialoge, Übungen und Modelltests sind eigens für Deutsch-Reise geschrieben. Es wurden keine Lehrbuchtexte und keine offiziellen Modellsätze übernommen; Prüfungsformate (Goethe-Institut, ÖSD, ÖIF) dienten nur als Orientierung für Aufbau und Themen.'),
      h('h3', 'Wortschatz'),
      h('ul',
        h('li', 'Abgleich von Artikel, Plural und Verbformen mit ', h('a', { href: 'https://de.wiktionary.org/', target: '_blank', rel: 'noopener' }, 'Wiktionary'), ' (CC BY-SA 4.0).'),
        h('li', 'Themen- und Niveauzuordnung orientiert an öffentlich zugänglichen GER/CEFR-Themenlisten für A1–B2.'),
        h('li', 'Beispielsätze: eigene Sätze. Werden Sätze aus ', h('a', { href: 'https://tatoeba.org/', target: '_blank', rel: 'noopener' }, 'Tatoeba'), ' (CC BY 2.0 FR) übernommen, wird der Autor beim Satz genannt.')),
      h('h3', 'Grafik, Schrift, Technik'),
      h('ul',
        h('li', h('a', { href: 'https://github.com/microsoft/fluentui-emoji', target: '_blank', rel: 'noopener' }, 'Microsoft Fluent Emoji 3D'), ' — MIT License (Lizenztext in assets/emoji/LICENSE).'),
        h('li', h('a', { href: 'https://lucide.dev', target: '_blank', rel: 'noopener' }, 'Lucide Icons'), ' — ISC License.'),
        h('li', 'Schriften Nunito und Literata — SIL Open Font License 1.1 (über Fontsource).'),
        h('li', 'Sprachausgabe: Web Speech API des jeweiligen Geräts.')),
      h('h3', 'Datenschutz'),
      h('p', 'Die App speichert den Lernfortschritt nur lokal im Browser (localStorage). Es gibt keinen Server, kein Tracking, keine Cookies.')));
  });

  R.add('/pruefung', function (el) {
    el.appendChild(h('div', DR.ui.hero('graduation', 'Goethe · ÖSD · ÖIF', t('s_pruef'))));
    el.appendChild(h('div.card', DR.ui.empty(t('pruef_soon'), 'hourglass')));
    el.appendChild(h('div.list', DR.ui.item({ href: '#/pruefung/info', emoji: 'book', c: DR.section('pruef').c, title: 'Wie ist die Prüfung aufgebaut?', sub: 'Как устроен экзамен' })));
    el.appendChild(h('h2', t('mini_test')));
    var list = h('div.list'), st = DR.store.get();
    DR.readyUnits().forEach(function (u) { list.appendChild(DR.ui.item({ href: '#/stadt/' + u.id + '/test', emoji: u.emoji, c: DR.ui.levelColor(u.level), title: u.city, level: u.level, sub: u.title, done: !!st.done['test:' + u.id] })); });
    el.appendChild(list);
  });
  R.add('/pruefung/info', function (el) {
    el.appendChild(h('div', DR.ui.hero('graduation', 'Как устроен экзамен', 'Prüfungsaufbau')));
    el.appendChild(h('div.card.prose',
      h('p', 'Краткий обзор форматов. Время и баллы меняются — перед записью на экзамен сверяйтесь с официальными сайтами: ', h('a', { href: 'https://www.goethe.de/de/spr/prf.html', target: '_blank', rel: 'noopener' }, 'goethe.de'), ', ', h('a', { href: 'https://www.osd.at', target: '_blank', rel: 'noopener' }, 'osd.at'), ', ', h('a', { href: 'https://www.integrationsfonds.at', target: '_blank', rel: 'noopener' }, 'integrationsfonds.at'), '.'),
      h('h3', 'Общая схема (Goethe и ÖSD, A1–B2)'),
      h('ul', h('li', 'Четыре части: Lesen, Hören, Schreiben, Sprechen. Sprechen обычно сдаётся в паре или в группе.'),
        h('li', 'Каждая часть состоит из нескольких «Teile» с разными типами заданий: richtig/falsch, a/b/c, сопоставление, письмо по пунктам.'),
        h('li', 'В Schreiben оценивают: выполнены ли все пункты задания, соответствует ли текст жанру (обращение, прощание), словарь и грамматику на уровне.')),
      h('h3', 'ÖIF-Integrationsprüfung'),
      h('ul', h('li', 'Экзамен для Integrationsvereinbarung в Австрии (уровни A2 и B1).'), h('li', 'Кроме языковых частей включает часть «Werte- und Orientierungswissen» (ценности и устройство жизни в Австрии).')),
      h('p.small.muted', 'Подробная таблица частей, времени и баллов по каждому экзамену появится вместе с пробными тестами — после сверки с официальными описаниями.')));
  });

  R.add('/hausaufgaben', function (el) {
    el.appendChild(h('div', DR.ui.hero('backpack', 'Für Lehrkräfte', t('s_haus'))));
    el.appendChild(h('div.card', DR.ui.empty(t('haus_soon'), 'hourglass')));
  });
})();
