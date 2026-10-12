/* Lebendiger Hintergrund: weiche Farbflecken + Partikel auf Canvas, Parallaxe per Finger und Neigung,
   schwebende 3D-Emojis in drei Tiefenebenen */
'use strict';
DR.bg = (function () {
  var cv, ctx, W = 0, H = 0, dpr = 1, th = null, dark = false, parts = [], blobs = [], raf = 0, t0 = 0;
  var px = 0, py = 0, tx = 0, ty = 0; // Parallaxe (−1…1)
  var floatEl;

  function init() {
    cv = document.getElementById('bg'); floatEl = document.getElementById('floaters');
    if (!cv) return;
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { tx = (e.clientX / W) * 2 - 1; ty = (e.clientY / H) * 2 - 1; }, { passive: true });
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null) return;
      tx = DR.clamp(e.gamma / 30, -1, 1); ty = DR.clamp((e.beta - 40) / 30, -1, 1);
    }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    // Tippen auf ein Emoji (liegt hinter dem Inhalt): Treffer per Koordinaten prüfen
    document.addEventListener('pointerdown', function (e) {
      if (!floatEl || floatEl.classList.contains('hidden') || e.target.closest('button, a, input, textarea, select, .item, .tile, .card')) return;
      Array.prototype.forEach.call(floatEl.querySelectorAll('.fl'), function (f) {
        var r = f.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { f.classList.remove('jump'); void f.offsetWidth; f.classList.add('jump'); }
      });
    });
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw(performance.now());
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function seed() {
    if (!th) return;
    var p = dark ? th.dark : th.light;
    blobs = p.blobs.concat(p.blobs).map(function (c, i) {
      return { c: c, x: rnd(0, W), y: rnd(0, H), r: rnd(Math.min(W, H) * 0.35, Math.max(W, H) * 0.55), sx: rnd(-0.02, 0.02), sy: rnd(-0.02, 0.02), ph: rnd(0, 6.28), depth: 0.3 + (i % 3) * 0.25 };
    });
    var n = th.particles === 'rain' ? 70 : th.particles === 'stars' ? 90 : th.particles === 'confetti' ? 55 : 40;
    if (W < 500) n = Math.round(n * 0.7);
    parts = [];
    for (var i = 0; i < n; i++) parts.push(newPart(true));
  }
  function newPart(anywhere) {
    var k = th.particles, d = Math.random();
    var o = { x: rnd(0, W), y: anywhere ? rnd(0, H) : -20, d: d, ph: rnd(0, 6.28), r: 1 + d * 3 };
    if (k === 'steam') { o.y = anywhere ? rnd(0, H) : H + 20; o.vy = -(0.2 + d * 0.5); o.vx = 0; o.r = 6 + d * 18; }
    else if (k === 'rain') { o.vy = 6 + d * 8; o.vx = -1.2; o.r = 8 + d * 14; }
    else if (k === 'snow') { o.vy = 0.3 + d * 0.9; o.vx = 0; o.r = 1.5 + d * 3; }
    else if (k === 'leaves') { o.vy = 0.4 + d * 0.8; o.vx = 0.3; o.r = 4 + d * 6; o.rot = rnd(0, 6.28); }
    else if (k === 'confetti') { o.vy = 0.6 + d * 1.2; o.vx = 0; o.r = 3 + d * 4; o.rot = rnd(0, 6.28); o.col = Math.floor(rnd(0, 5)); }
    else if (k === 'clouds') { o.vy = 0; o.vx = 0.15 + d * 0.35; o.r = 10 + d * 26; o.y = rnd(0, H); o.x = anywhere ? rnd(0, W) : -60; }
    else { o.vy = 0; o.vx = 0; o.tw = rnd(0.5, 2); } // stars
    return o;
  }
  var CONF = ['#ff5ea8', '#ffd23f', '#4cc9f0', '#7bd389', '#b28dff'];
  function draw(now) {
    if (!ctx || !th) return;
    var p = dark ? th.dark : th.light, t = (now - t0) / 1000;
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, p.bg); g.addColorStop(1, p.bg2);
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    blobs.forEach(function (b) {
      var x = b.x + Math.sin(t * 0.13 + b.ph) * 60 - px * 40 * b.depth, y = b.y + Math.cos(t * 0.11 + b.ph) * 50 - py * 40 * b.depth;
      var rg = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      rg.addColorStop(0, b.c); rg.addColorStop(1, b.c + '00');
      ctx.globalAlpha = dark ? 0.55 : 0.6; ctx.fillStyle = rg;
      ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
    });
    var k = th.particles;
    parts.forEach(function (o, i) {
      var ox = -px * 25 * (0.3 + o.d), oy = -py * 25 * (0.3 + o.d);
      var x = o.x + ox, y = o.y + oy;
      if (k === 'steam') { ctx.globalAlpha = 0.10 + 0.08 * o.d; ctx.fillStyle = dark ? '#fff' : '#fffaf2'; circle(x + Math.sin(t + o.ph) * 10, y, o.r); }
      else if (k === 'rain') { ctx.globalAlpha = 0.18 + 0.2 * o.d; ctx.strokeStyle = dark ? '#9fb4e0' : '#6b7fa8'; ctx.lineWidth = 1 + o.d; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + o.r); ctx.stroke(); }
      else if (k === 'snow') { ctx.globalAlpha = 0.5 + 0.4 * o.d; ctx.fillStyle = '#fff'; circle(x + Math.sin(t * 0.8 + o.ph) * 8, y, o.r); }
      else if (k === 'leaves') { ctx.globalAlpha = 0.35 + 0.3 * o.d; ctx.fillStyle = i % 3 ? '#c9832b' : '#8aa83a'; ctx.save(); ctx.translate(x + Math.sin(t + o.ph) * 20, y); ctx.rotate(o.rot + t * 0.6); ctx.beginPath(); ctx.ellipse(0, 0, o.r, o.r * 0.45, 0, 0, 6.28); ctx.fill(); ctx.restore(); }
      else if (k === 'confetti') { ctx.globalAlpha = 0.55 + 0.3 * o.d; ctx.fillStyle = CONF[o.col]; ctx.save(); ctx.translate(x + Math.sin(t * 1.3 + o.ph) * 14, y); ctx.rotate(o.rot + t * 2 * (o.d + 0.3)); ctx.fillRect(-o.r, -o.r * 0.4, o.r * 2, o.r * 0.8); ctx.restore(); }
      else if (k === 'clouds') { ctx.globalAlpha = dark ? 0.08 : 0.35; ctx.fillStyle = '#fff'; circle(x, y, o.r); circle(x + o.r * 0.8, y + 4, o.r * 0.7); circle(x - o.r * 0.8, y + 6, o.r * 0.6); }
      else { ctx.globalAlpha = (dark ? 0.5 : 0.35) * (0.5 + 0.5 * Math.sin(t * o.tw + o.ph)); ctx.fillStyle = dark ? '#fff' : '#7a6fc0'; circle(x, y, o.r * 0.6); }
      if (raf) {
        o.x += o.vx; o.y += o.vy;
        if (o.y > H + 30 || o.x > W + 80 || o.y < -40) Object.assign(o, newPart(false));
      }
    });
    ctx.globalAlpha = 1;
    // schwebende Emojis leicht mitbewegen
    if (floatEl) floatEl.style.transform = 'translate3d(' + (-px * 10) + 'px,' + (-py * 10) + 'px,0)';
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); }
  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
  function start() { if (!raf && !DR.reducedMotion() && th) { t0 = t0 || performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  function floaters(show) {
    if (!floatEl || !th) return;
    floatEl.classList.toggle('hidden', !show);
    if (!show || floatEl.dataset.theme === th.id) return;
    floatEl.dataset.theme = th.id;
    floatEl.innerHTML = '';
    var keys = th.emoji, n = W < 500 ? 7 : 10;
    // Plätze am Rand, damit der Inhalt frei bleibt
    for (var i = 0; i < n; i++) {
      var layer = i % 3, key = keys[i % keys.length];
      var side = i % 2 ? 'left' : 'right';
      var el = DR.h('div.fl.l' + layer, {
        style: { top: (8 + (i * 83) % 84) + '%', '--d': (i * 0.12) + 's', '--t': (6 + layer * 2 + (i % 3)) + 's' },
        onclick: function () { var e = this; e.classList.remove('jump'); void e.offsetWidth; e.classList.add('jump'); }
      }, DR.h('div.wob', DR.emoji(key)));
      el.style[side] = (-10 + (i * 37) % 22) + 'px';
      floatEl.appendChild(el);
    }
  }
  return {
    init: init,
    setTheme: function (t, d) {
      var changed = th !== t || dark !== d; th = t; dark = d;
      if (changed) { seed(); if (floatEl) floatEl.dataset.theme = ''; }
      if (DR.reducedMotion()) { stop(); draw(performance.now()); } else start();
    },
    floaters: floaters,
    dim: function (on) { if (floatEl) floatEl.classList.toggle('dim', on); }
  };
})();
