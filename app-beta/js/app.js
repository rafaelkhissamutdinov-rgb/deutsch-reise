/* Start der App */
'use strict';
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
