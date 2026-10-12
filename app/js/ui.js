/* UI-Bausteine: Toast, Modal, Kachel, Listeneintrag, Abschnitte, Zurück-Leiste */
'use strict';
DR.ui = {
  toast: function (msg, ms) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var t = DR.h('div.toast', { role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2200);
  },
  modal: function (title, body, buttons) {
    return new Promise(function (res) {
      var bg = DR.h('div.modal-bg', { onclick: function (e) { if (e.target === bg) done(null); } });
      function done(v) { bg.remove(); res(v); }
      var btns = (buttons || [{ label: DR.t('ok'), value: true }]).map(function (b) {
        return DR.h('button.btn' + (b.cls ? '.' + b.cls : ''), { type: 'button', onclick: function () { done(b.value); } }, b.label);
      });
      bg.appendChild(DR.h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, DR.h('h2', title), body, DR.h('div.row', { style: { marginTop: '16px', justifyContent: 'flex-end' } }, btns)));
      document.body.appendChild(bg);
      var f = bg.querySelector('button:last-child'); if (f) f.focus();
    });
  },
  confirm: function (title, text) {
    return DR.ui.modal(title, DR.h('p', text), [{ label: DR.t('cancel'), value: false, cls: 'ghost' }, { label: DR.t('yes'), value: true, cls: 'bad' }]);
  },
  tile: function (sec, opts) {
    opts = opts || {};
    return DR.h('a.tile' + (opts.wide ? '.wide' : ''), { href: opts.href || sec.route, style: { '--c': sec.c }, 'data-sec': sec.id },
      DR.emoji(sec.emoji),
      DR.h('span', opts.label || DR.t('s_' + sec.id), opts.sub ? DR.h('small', opts.sub) : null),
      opts.badge ? DR.h('b.badge', String(opts.badge)) : null);
  },
  item: function (o) {
    var el = DR.h(o.href ? 'a.item' : 'button.item', { href: o.href, type: o.href ? null : 'button', onclick: o.onclick, style: o.c ? { '--c': o.c } : null },
      DR.h('span.ico', o.emoji ? DR.emoji(o.emoji) : DR.icon(o.icon || 'chevron-right')),
      DR.h('span.grow', DR.h('b', o.title, o.level ? [' ', DR.h('span.lvl', o.level)] : null), o.sub ? DR.h('small', o.sub) : null),
      DR.h('span.state' + (o.done ? '.done' : ''), o.done ? DR.icon('check') : (o.right || DR.icon('chevron-right'))));
    return el;
  },
  hero: function (emoji, kicker, title, lead) {
    return [DR.h('div.hero', emoji ? DR.emoji(emoji) : null, DR.h('div', kicker ? DR.h('div.kicker', kicker) : null, DR.h('h1', title))), lead ? DR.h('p.lead', lead) : null];
  },
  bar: function (p, c) { return DR.h('div.bar', { style: c ? { '--c': c } : null }, DR.h('i', { style: { width: DR.clamp(p, 0, 100) + '%' } })); },
  section: function (n, title, c, body) {
    return DR.h('div.card.gsec', { style: c ? { '--c': c } : null }, DR.h('h3', DR.h('span.num', String(n)), title), body);
  },
  /* Untere Leiste: „zurück“ + optionale Aktionsknöpfe */
  backbar: function (actions) {
    var bb = document.getElementById('backbar');
    var slot = bb.querySelector('.slot');
    slot.innerHTML = '';
    (actions || []).forEach(function (a) { slot.appendChild(a); });
    bb.classList.toggle('hide', DR.router.isHome() && !(actions && actions.length));
    bb.classList.toggle('compact', !!(actions && actions.length >= 2));
  },
  /* Text mit **fett** und Zeilenumbrüchen sicher darstellen */
  rich: function (text, tag) {
    var el = DR.h(tag || 'div.pre');
    el.innerHTML = DR.esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])_(.+?)_(?=[\s.,)!?]|$)/g, '$1<i>$2</i>');
    return el;
  },
  levelColor: function (lvl) { return { A1: '#2f9e6f', A2: '#2f7fd6', B1: '#c27c1a', B2: '#b43e8f' }[lvl] || '#777'; },
  empty: function (text, emoji) { return DR.h('div.empty-note', DR.emoji(emoji || 'hourglass'), text); }
};
