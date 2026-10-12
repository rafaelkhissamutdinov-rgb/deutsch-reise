/* Übungs-Engine: choice, tf, gap, order, table — Prüfung, Darstellung, Übungsreihe mit Auswertung */
'use strict';
DR.check = {
  clean: function (s) { return DR.norm(s).replace(/[.!?…]+$/, '').trim(); },
  /* 'ok' | 'almost' | 'bad' */
  gap: function (item, val) {
    var v = DR.check.clean(val), ans = [].concat(item.answer);
    if (!v) return 'bad';
    for (var i = 0; i < ans.length; i++) if (DR.check.clean(ans[i]) === v) return 'ok';
    for (i = 0; i < ans.length; i++) if (DR.check.clean(ans[i]).toLowerCase() === v.toLowerCase()) return 'almost';
    return 'bad';
  },
  choice: function (item, val) { return DR.norm(val) === DR.norm(item.answer) ? 'ok' : 'bad'; },
  tf: function (item, val) { return val === item.answer ? 'ok' : 'bad'; },
  order: function (item, sentence) {
    var f = function (s) { return DR.check.clean(s).toLowerCase().replace(/\s*,\s*/g, ', '); };
    var v = f(sentence);
    return [item.answer].concat(item.also || []).some(function (a) { return f(a) === v; }) ? 'ok' : 'bad';
  },
  tableCells: function (item, vals) {
    var res = [], k = 0;
    item.rows.forEach(function (r) { r.forEach(function (c) { if (String(c).charAt(0) === '?') { res.push(DR.check.gap({ answer: c.slice(1).split('/').length > 1 && c.indexOf(' / ') < 0 ? [c.slice(1)].concat(c.slice(1).split('/')) : [c.slice(1)] }, vals[k] || '')); k++; } }); });
    return res;
  },
  table: function (item, vals) {
    var r = DR.check.tableCells(item, vals);
    return r.every(function (x) { return x === 'ok'; }) ? 'ok' : r.every(function (x) { return x !== 'bad'; }) ? 'almost' : 'bad';
  }
};
DR.ex = {
  tokens: function (item) {
    if (item.tokens && item.tokens.length) return item.tokens.slice();
    return DR.check.clean(item.answer).split(' ');
  },
  punct: function (item) { var m = String(item.answer).match(/[.!?]$/); return m ? m[0] : ''; },
  solution: function (item) {
    if (item.type === 'tf') return item.answer ? DR.t('true_') : DR.t('false_');
    if (item.type === 'table') return item.rows.map(function (r) { return r.map(function (c) { return String(c).replace(/^\?/, ''); }).join(' – '); }).join('; ');
    if (item.type === 'gap') return [].concat(item.answer)[0];
    return item.answer;
  },
  question: function (item) {
    if (item.type === 'order') return item.ru || DR.t('tap_words');
    if (item.type === 'table') return item.title || '';
    return item.q;
  },
  /* Eine Aufgabe darstellen. done(result, given) wird nach dem Prüfen aufgerufen. */
  render: function (item, done) {
    var box = DR.h('div.ex'), checked = false;
    function finish(res, given) { if (checked) return; checked = true; done(res, given); }
    var api = { el: box, needsCheck: false, check: function () {} };
    if (item.type === 'choice' || item.type === 'tf') {
      box.appendChild(qline(item.q));
      if (item.ru && item.type !== 'tf') box.appendChild(DR.h('p.ex-hint', item.ru));
      if (item.ru && item.type === 'tf') box.appendChild(DR.h('p.ex-hint', item.ru));
      var opts = item.type === 'tf' ? [true, false] : DR.shuffle(item.options);
      var wrap = DR.h('div.opts' + (item.type === 'tf' ? '.tf' : ''));
      opts.forEach(function (o) {
        var b = DR.h('button.opt', { type: 'button', onclick: function () {
          if (checked) return;
          var res = DR.check[item.type](item, o);
          b.classList.add(res === 'ok' ? 'right' : 'wrong');
          if (res !== 'ok') Array.prototype.forEach.call(wrap.children, function (c) { if (c._v === item.answer || DR.norm(c._v) === DR.norm(item.answer)) c.classList.add('right'); });
          Array.prototype.forEach.call(wrap.children, function (c) { c.disabled = true; });
          finish(res, item.type === 'tf' ? (o ? DR.t('true_') : DR.t('false_')) : o);
        } }, item.type === 'tf' ? (o ? DR.t('true_') : DR.t('false_')) : o);
        b._v = o; wrap.appendChild(b);
      });
      box.appendChild(wrap);
    } else if (item.type === 'gap') {
      box.appendChild(qline(item.q));
      if (item.ru) box.appendChild(DR.h('p.ex-hint', item.ru));
      var inp = DR.h('input.inp', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, placeholder: DR.t('type_here'), 'aria-label': DR.t('type_here'),
        onkeydown: function (e) { if (e.key === 'Enter') api.check(); } });
      box.appendChild(inp);
      api.needsCheck = true;
      api.check = function () {
        if (checked) return;
        var res = DR.check.gap(item, inp.value);
        inp.classList.add(res === 'bad' ? 'wrong' : 'right'); inp.disabled = true;
        finish(res, inp.value);
      };
      setTimeout(function () { if (!('ontouchstart' in window)) inp.focus(); }, 50);
    } else if (item.type === 'order') {
      box.appendChild(DR.h('p.ex-q', item.ru || ''));
      box.appendChild(DR.h('p.ex-hint', DR.t('tap_words')));
      var area = DR.h('div.order-area', { 'data-zone': 'area' }), pool = DR.h('div.order-pool', { 'data-zone': 'pool' });
      var toks = DR.ex.tokens(item), order = DR.shuffle(toks);
      if (order.join(' ') === toks.join(' ') && toks.length > 1) order.reverse();
      order.forEach(function (t) { pool.appendChild(token(t)); });
      box.appendChild(area); box.appendChild(pool);
      api.needsCheck = true;
      api.check = function () {
        if (checked) return;
        var s = Array.prototype.map.call(area.children, function (c) { return c.textContent; }).join(' ') + DR.ex.punct(item);
        var res = pool.children.length ? 'bad' : DR.check.order(item, s);
        area.style.borderColor = res === 'ok' ? 'var(--ok)' : 'var(--bad)';
        finish(res, s);
      };
    } else if (item.type === 'table') {
      if (item.title) box.appendChild(DR.h('p.ex-q', item.title));
      if (item.ru) box.appendChild(DR.h('p.ex-hint', item.ru));
      var inputs = [];
      var tbl = DR.h('table.forms', item.head ? DR.h('thead', DR.h('tr', item.head.map(function (x) { return DR.h('th', x); }))) : null,
        DR.h('tbody', item.rows.map(function (r) {
          return DR.h('tr', r.map(function (c) {
            if (String(c).charAt(0) === '?') {
              var i = DR.h('input.inp', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, 'aria-label': 'Form' });
              inputs.push(i); return DR.h('td', i);
            }
            return DR.h('td', c);
          }));
        })));
      box.appendChild(DR.h('div.table-wrap', tbl));
      api.needsCheck = true;
      api.check = function () {
        if (checked) return;
        var vals = inputs.map(function (i) { return i.value; });
        var cells = DR.check.tableCells(item, vals), k = 0;
        item.rows.forEach(function (r) { r.forEach(function (c) { if (String(c).charAt(0) === '?') { var i = inputs[k]; i.classList.add(cells[k] === 'bad' ? 'wrong' : 'right'); if (cells[k] === 'bad') i.value = i.value + ' → ' + c.slice(1); i.disabled = true; k++; } }); });
        finish(DR.check.table(item, vals), vals.join(', '));
      };
    } else {
      box.appendChild(DR.h('p', 'Unbekannter Typ: ' + item.type));
    }
    return api;

    function qline(q) {
      var el = DR.h('p.ex-q');
      String(q || '').split('___').forEach(function (part, i) { if (i) el.appendChild(DR.h('span.gap', ' ')); el.appendChild(document.createTextNode(part)); });
      return el;
    }
    function token(t) {
      var el = DR.h('span.tok', { role: 'button', tabindex: 0 }, t);
      var sx, sy, drag = false, ghost = null;
      el.addEventListener('pointerdown', function (e) {
        if (checked) return;
        sx = e.clientX; sy = e.clientY; drag = false;
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', function (e) {
        if (sx == null || checked) return;
        if (!drag && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
          drag = true; ghost = el.cloneNode(true); ghost.classList.add('dragging'); document.body.appendChild(ghost);
          el.classList.add('ghost-slot');
        }
        if (drag) { ghost.style.left = (e.clientX - 30) + 'px'; ghost.style.top = (e.clientY - 22) + 'px'; }
      });
      el.addEventListener('pointerup', function (e) {
        if (sx == null) return; sx = null;
        if (checked) return;
        if (!drag) { (el.parentNode === area ? pool : area).appendChild(el); return; }
        ghost.remove(); el.classList.remove('ghost-slot'); drag = false;
        var target = document.elementFromPoint(e.clientX, e.clientY);
        var zone = target && target.closest('[data-zone]');
        if (!zone) return;
        var dest = zone.dataset.zone === 'pool' ? pool : area;
        var before = null;
        Array.prototype.some.call(dest.children, function (c) {
          if (c === el) return false;
          var r = c.getBoundingClientRect();
          if (e.clientY < r.top - 4) { before = c; return true; }
          if (e.clientY <= r.bottom + 4 && e.clientX < r.left + r.width / 2) { before = c; return true; }
          return false;
        });
        dest.insertBefore(el, before);
      });
      el.addEventListener('pointercancel', function () { sx = null; if (ghost) ghost.remove(); el.classList.remove('ghost-slot'); drag = false; });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (el.parentNode === area ? pool : area).appendChild(el); } });
      return el;
    }
  },

  /* Übungsreihe: eine Aufgabe nach der anderen, am Ende Auswertung + Speichern */
  run: function (root, o) {
    var items = o.items || [], i = 0, score = 0, mistakes = [];
    root.innerHTML = '';
    var top = DR.h('div.progress-top', DR.h('span.small.muted', ''), DR.ui.bar(0, o.color));
    var stage = DR.h('div.card');
    var fb = DR.h('div');
    root.appendChild(DR.h('div.kicker', o.title || DR.t('exercises')));
    root.appendChild(top); root.appendChild(stage); root.appendChild(fb);
    var btn = DR.h('button.btn.block', { type: 'button' }, DR.t('check'));
    function show() {
      top.firstChild.textContent = (i + 1) + ' / ' + items.length;
      top.lastChild.firstChild.style.width = DR.pct(i, items.length) + '%';
      stage.innerHTML = ''; fb.innerHTML = '';
      var it = items[i];
      var api = DR.ex.render(it, function (res, given) {
        var pts = res === 'ok' || res === 'almost' ? 1 : 0;
        score += pts;
        if (res !== 'ok') mistakes.push({ q: DR.ex.question(it), given: given, sol: DR.ex.solution(it), res: res });
        var cls = res === 'ok' ? 'ok' : res === 'almost' ? 'almost' : 'bad';
        fb.appendChild(DR.h('div.feedback.' + cls, { role: 'status' },
          res === 'ok' ? DR.t('correct') : res === 'almost' ? DR.t('almost') : DR.t('wrong'),
          res !== 'ok' ? DR.h('div.why', DR.t('solution') + ': ', DR.h('b', DR.ex.solution(it))) : null,
          it.why ? DR.h('div.why', it.why) : null));
        btn.textContent = i + 1 < items.length ? DR.t('next') : DR.t('result');
        btn.className = 'btn block' + (res === 'bad' ? '' : ' ok');
        btn.onclick = function () { i++; if (i < items.length) show(); else end(); };
        btn.disabled = false;
        btn.focus();
        if (o.onAnswer) o.onAnswer(it, res);
      });
      stage.appendChild(api.el);
      btn.className = 'btn block'; btn.textContent = DR.t('check');
      btn.disabled = !api.needsCheck;
      btn.onclick = function () { api.check(); };
      DR.ui.backbar([btn]);
    }
    function end() {
      var max = items.length, p = DR.pct(score, max);
      if (o.key) DR.store.record(o.key, score, max, o.skill, { mist: mistakes.slice(0, 20).map(function (m) { return m.q + ' → ' + m.sol; }) });
      root.innerHTML = '';
      var pass = o.passAt == null || p >= o.passAt;
      root.appendChild(DR.h('div.card.center',
        DR.h('div.kicker', o.title || DR.t('result')),
        DR.emoji(p >= 80 ? 'trophy' : p >= 60 ? 'sparkles' : 'hourglass'),
        DR.h('div.result-big', p + ' %'),
        DR.h('p.muted', score + ' / ' + max + ' · ' + (o.passAt != null ? (pass ? DR.t('test_pass') : DR.t('test_fail')) : DR.t('result')))));
      root.querySelector('.card img').style.width = '96px';
      var m = DR.h('div.card', DR.h('h3', DR.t('mistakes')));
      if (!mistakes.length) m.appendChild(DR.h('p', DR.t('no_mistakes')));
      mistakes.forEach(function (x) {
        m.appendChild(DR.h('div.mistake', DR.h('div', x.q), DR.h('div.small.muted', DR.t('your_answer') + ': ' + (x.given || '—')), DR.h('div.a', x.sol)));
      });
      root.appendChild(m);
      if (o.onFinish) o.onFinish({ score: score, max: max, pct: p, pass: pass, mistakes: mistakes });
      DR.ui.backbar([DR.h('button.btn.ghost', { type: 'button', onclick: function () { DR.ex.run(root, Object.assign({}, o, { items: o.reshuffle ? DR.shuffle(items) : items })); } }, DR.icon('rotate-ccw'), DR.t('again'))]);
    }
    if (!items.length) { root.appendChild(DR.ui.empty('—')); return; }
    show();
  }
};
