/* Start der App */
'use strict';
/* Installation als App (PWA): Android/Chrome/Edge per Systemdialog, iPhone per Anleitung */
DR.install = {
  evt: null,
  standalone: function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; },
  ios: function () { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  can: function () { return !this.standalone() && (!!this.evt || this.ios()); },
  run: function () {
    if (this.evt) {
      var e = this.evt; this.evt = null;
      e.prompt();
      return e.userChoice.then(function () { DR.router.refresh(); });
    }
    var h = DR.h;
    return DR.ui.modal('App installieren', h('div.small',
      h('p', 'iPhone / iPad (Safari):'),
      h('ol', h('li', 'Нажмите кнопку «Поделиться» (квадрат со стрелкой вверх).'), h('li', 'Выберите «На экран Домой» (Zum Home-Bildschirm).'), h('li', 'Нажмите «Добавить».')),
      h('p', 'Android (Chrome): меню ⋮ → «Установить приложение» / «Добавить на главный экран».'),
      h('p.muted', 'После установки приложение открывается с иконки, без адресной строки, и работает офлайн.')));
  }
};
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); DR.install.evt = e; if (DR.router.isHome()) DR.router.refresh(); });
window.addEventListener('appinstalled', function () { DR.install.evt = null; DR.ui.toast('✓ Deutsch-Reise installiert'); });

DR.app = {
  header: function () {
    var s = document.getElementById('streak');
    s.innerHTML = '';
    s.appendChild(DR.emoji('fire'));
    s.appendChild(document.createTextNode(String(DR.store.streak())));
    s.title = DR.t('streak');
    var l = document.getElementById('langbtn');
    l.textContent = DR.lang().toUpperCase();
    document.documentElement.lang = DR.lang() === 'ru' ? 'ru' : DR.lang() === 'en' ? 'en' : 'de';
    var bb = document.querySelector('#backbtn span');
    if (bb) bb.textContent = DR.t('back');
  }
};
(function () {
  DR.bg.init();
  DR.theme.apply();
  DR.app.header();
  DR.store.onChange(function () { DR.app.header(); });
  document.getElementById('backbtn').addEventListener('click', function () { DR.router.back(); });
  document.getElementById('langbtn').addEventListener('click', function () {
    var order = ['de', 'ru', 'en'], cur = DR.lang();
    DR.store.setting('lang', order[(order.indexOf(cur) + 1) % order.length]);
    DR.app.header(); DR.router.refresh();
  });
  // Thema wechselt um Mitternacht automatisch
  setInterval(function () { DR.theme.apply(); }, 60000);
  DR.router.render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW', e); });
  }
})();
