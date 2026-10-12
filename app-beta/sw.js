/* Service Worker: Kern im Cache, Bilder & Schriften cache-first, Rest network-first.
   VERSION und CORE werden von build.py bei jedem Build gesetzt. */
const VERSION = '2a52252832';
const CORE = ["./", "assets/emoji/LICENSE", "assets/emoji/airplane.webp", "assets/emoji/anchor.webp", "assets/emoji/apple.webp", "assets/emoji/backpack.webp", "assets/emoji/balloon.webp", "assets/emoji/bear.webp", "assets/emoji/beer.webp", "assets/emoji/bell.webp", "assets/emoji/bicycle.webp", "assets/emoji/book.webp", "assets/emoji/brain.webp", "assets/emoji/building.webp", "assets/emoji/cake.webp", "assets/emoji/candle.webp", "assets/emoji/car.webp", "assets/emoji/cards.webp", "assets/emoji/castle.webp", "assets/emoji/check.webp", "assets/emoji/cheese.webp", "assets/emoji/church.webp", "assets/emoji/clock.webp", "assets/emoji/coffee.webp", "assets/emoji/compass.webp", "assets/emoji/confetti.webp", "assets/emoji/croissant.webp", "assets/emoji/cross.webp", "assets/emoji/ferris.webp", "assets/emoji/fire.webp", "assets/emoji/frog.webp", "assets/emoji/gear.webp", "assets/emoji/graduation.webp", "assets/emoji/headphone.webp", "assets/emoji/hedgehog.webp", "assets/emoji/hourglass.webp", "assets/emoji/index.json", "assets/emoji/key.webp", "assets/emoji/leaf.webp", "assets/emoji/luggage.webp", "assets/emoji/memo.webp", "assets/emoji/milkyway.webp", "assets/emoji/moon.webp", "assets/emoji/mountain.webp", "assets/emoji/mushroom.webp", "assets/emoji/newspaper.webp", "assets/emoji/notes.webp", "assets/emoji/owl.webp", "assets/emoji/party.webp", "assets/emoji/passport.webp", "assets/emoji/pie.webp", "assets/emoji/pretzel.webp", "assets/emoji/puzzle.webp", "assets/emoji/rainbow.webp", "assets/emoji/raincloud.webp", "assets/emoji/score.webp", "assets/emoji/snail.webp", "assets/emoji/sparkles.webp", "assets/emoji/speaker.webp", "assets/emoji/speech.webp", "assets/emoji/star.webp", "assets/emoji/sunflower.webp", "assets/emoji/tent.webp", "assets/emoji/train.webp", "assets/emoji/tree.webp", "assets/emoji/trophy.webp", "assets/emoji/umbrella.webp", "assets/emoji/violin.webp", "assets/emoji/worldmap.webp", "css/app.css", "data/index.js", "data/unit-a1-berlin.js", "data/unit-a1-hamburg.js", "data/unit-a1-leipzig.js", "index.html", "js/app.js", "js/bg.js", "js/core.js", "js/exercises.js", "js/funcwords.js", "js/i18n.js", "js/icons.js", "js/router.js", "js/screens-hw.js", "js/screens-learn.js", "js/screens-main.js", "js/screens-meta.js", "js/screens-skills.js", "js/speech.js", "js/srs.js", "js/store.js", "js/theme.js", "js/ui.js", "manifest.webmanifest"];
const CACHE = 'dr-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('dr-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isStatic = /\.(webp|png|jpg|svg|woff2)$/.test(url.pathname);
  if (isStatic) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }
  e.respondWith(fetch(req).then((res) => {
    const copy = res.clone();
    if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
