/* Hash-Router mit Browser-Verlauf (Zurück-Taste am Handy funktioniert) */
'use strict';
DR.router = (function () {
  var routes = [], depth = 0, current = '';
  function add(pattern, handler) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ re: re, keys: keys, handler: handler });
  }
  function path() { return (location.hash || '#/').slice(1) || '/'; }
  function render() {
    var p = path();
    if (p === current && document.querySelector('#view .screen')) return;
    current = p;
    DR.speech && DR.speech.stop();
    var pop = document.querySelector('.popover'); if (pop) pop.remove();
    var view = document.getElementById('view');
    for (var i = 0; i < routes.length; i++) {
      var m = p.match(routes[i].re);
      if (m) {
        var params = {};
        routes[i].keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        var screen = DR.h('div.screen');
        view.innerHTML = ''; view.appendChild(screen);
        DR.ui.backbar([]);
        DR.bg.floaters(p === '/');
        DR.bg.dim(p !== '/');
        window.scrollTo(0, 0);
        try {
          var r = routes[i].handler(screen, params);
          if (r && r.catch) r.catch(fail);
        } catch (e) { fail(e); }
        screen.setAttribute('tabindex', '-1');
        return;
      }
    }
    go('#/');
    function fail(e) {
      console.error(e);
      view.innerHTML = '';
      view.appendChild(DR.h('div.screen', DR.h('div.card', DR.h('h2', 'Fehler / Ошибка'), DR.h('p', String(e && e.message || e)))));
    }
  }
  function go(hash, replace) {
    if (replace) { location.replace(hash); return; }
    depth++;
    location.hash = hash;
  }
  window.addEventListener('hashchange', render);
  return {
    add: add, render: render, go: go, path: path,
    isHome: function () { return path() === '/'; },
    back: function () {
      if (depth > 0 && history.length > 1) { depth--; history.back(); }
      else {
        // Direkt geöffnete Seite: eine Ebene nach oben
        var p = path().split('/').filter(Boolean);
        p.pop();
        location.replace('#/' + p.join('/'));
      }
    },
    /* Bildschirm neu zeichnen (z. B. nach Einstellungen) */
    refresh: function () { current = ''; render(); }
  };
})();
// Links innerhalb der App zählen für „zurück“
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="#/"]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  if (a.getAttribute('href') !== location.hash) DR.router.go(a.getAttribute('href'));
});
