// Regressionstests (Playwright + node:test): alle Bildschirme, Übungen, Offline, Kontrast, Daten.
// Aufruf: node --test tests/   (startet selbst einen statischen Server auf app-beta/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const APP = path.join(ROOT, process.env.APP_DIR || 'app-beta');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
let server, base, browser;

before(async () => {
  server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(APP, p);
    try {
      await stat(f);
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(await readFile(f));
    } catch { res.writeHead(404); res.end('404'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
  const exe = existsSync('/opt/pw-browsers/chromium') ? undefined : undefined;
  browser = await chromium.launch(exe ? { executablePath: exe } : {});
});
after(async () => { await browser?.close(); server?.close(); });

async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: opts.dark ? 'dark' : 'light', reducedMotion: 'reduce', serviceWorkers: opts.sw ? 'allow' : 'block' });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e)));
  pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|speech/i.test(m.text())) errors.push(m.text()); });
  return { ctx, pg, errors };
}
async function go(pg, hash) {
  await pg.goto(base + '#' + hash);
  await pg.waitForSelector('#view .screen');
  await pg.waitForTimeout(250);
}

test('Daten: build.py --check ist grün', () => {
  const out = execFileSync('python3', [path.join(ROOT, 'build.py'), '--check'].concat(process.env.DR_EXCLUDE ? ['--exclude', process.env.DR_EXCLUDE] : []), { encoding: 'utf8' });
  assert.match(out, /alles gültig/);
});

test('Alle Bildschirme laden ohne Fehler und ohne horizontales Scrollen (390 px, hell + dunkel)', async () => {
  for (const dark of [false, true]) {
    const { ctx, pg, errors } = await page({ dark });
    await pg.goto(base);
    await pg.waitForSelector('.tiles');
    const index = await pg.evaluate(() => DR.INDEX.units);
    const routes = ['/', '/karte', '/wortschatz', '/wortschatz-karten', '/wortschatz-eingabe', '/wortschatz-sprint', '/wortschatz-liste', '/grammatik', '/hoeren', '/lesen', '/schreiben', '/dialoge', '/sprechen', '/pruefung', '/pruefung/info', '/hausaufgaben', '/hausaufgaben/neu', '/hausaufgaben/auswerten', '/pass', '/einstellungen', '/quellen'];
    for (const x of await pg.evaluate(() => DR.INDEX.tests || [])) {
      routes.push('/pruefung/test/' + x.id);
      for (const p of x.parts) routes.push(`/pruefung/test/${x.id}/${p.id}`);
    }
    for (const u of index) {
      routes.push('/stadt/' + u.id);
      if (!u.ready) continue;
      routes.push('/stadt/' + u.id + '/test', '/wortschatz/' + u.id);
      for (const g of u.grammar) routes.push(`/grammatik/${u.id}/${g.id}`, `/grammatik/${u.id}/${g.id}/ueben`);
      for (const x of u.texts) routes.push(`/lesen/${u.id}/${x.id}`, `/lesen/${u.id}/${x.id}/fragen`);
      for (const x of u.listening) routes.push(`/hoeren/${u.id}/${x.id}`, `/hoeren/${u.id}/${x.id}/fragen`, `/hoeren/${u.id}/${x.id}/diktat`, `/hoeren/${u.id}/${x.id}/shadowing`);
      for (const x of u.dialogues) routes.push(`/dialoge/${u.id}/${x.id}`);
      for (const x of u.writing) routes.push(`/schreiben/${u.id}/${x.id}`);
      for (const x of u.speaking) routes.push(`/sprechen/${u.id}/${x.id}`);
    }
    for (const r of routes) {
      await go(pg, r);
      const text = await pg.locator('#view').innerText();
      assert.ok(!/Fehler \/ Ошибка/.test(text), `Fehlerseite bei ${r}: ${text.slice(0, 200)}`);
      const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(sw <= 390, `horizontales Scrollen bei ${r} (${dark ? 'dunkel' : 'hell'}): ${sw}px`);
    }
    assert.deepEqual(errors, [], 'Konsolenfehler: ' + errors.join('\n'));
    await ctx.close();
  }
});

test('Übungen: choice, gap, order, table werden geprüft und gespeichert', async () => {
  const { ctx, pg, errors } = await page();
  await pg.goto(base);
  await pg.waitForSelector('.tiles');
  const r = await pg.evaluate(() => {
    const it = [
      { type: 'gap', answer: ['Haus'] }, { type: 'order', answer: 'Ich wohne in Wien.', also: ['In Wien wohne ich.'] },
      { type: 'table', rows: [['ich', '?bin'], ['du', '?bist']] }, { type: 'choice', answer: 'b', options: ['a', 'b'] }];
    return [
      DR.check.gap(it[0], ' Haus '), DR.check.gap(it[0], 'haus'), DR.check.gap(it[0], 'Hund'),
      DR.check.order(it[1], 'in Wien wohne ich.'), DR.check.order(it[1], 'Ich in Wien wohne.'),
      DR.check.table(it[2], ['bin', 'bist']), DR.check.table(it[2], ['bin', 'bis']), DR.check.choice(it[3], 'b')];
  });
  assert.deepEqual(r, ['ok', 'almost', 'bad', 'ok', 'bad', 'ok', 'bad', 'ok']);
  // echte Übungsreihe durchklicken
  const u = await pg.evaluate(() => DR.readyUnits()[0]);
  await go(pg, `/grammatik/${u.id}/${u.grammar[0].id}/ueben`);
  const n = await pg.evaluate((id) => DR.units[id].grammar[0].exercises.length, u.id);
  for (let i = 0; i < n; i++) {
    const opt = pg.locator('.opt').first();
    if (await opt.count()) await opt.click();
    else {
      const inp = pg.locator('.ex .inp');
      for (let k = 0; k < await inp.count(); k++) await inp.nth(k).fill('x');
      const tok = pg.locator('.order-pool .tok');
      while (await tok.count()) await tok.first().click();
      await pg.locator('#backbar .slot .btn').click();
    }
    await pg.locator('#backbar .slot .btn').click();
  }
  await pg.waitForSelector('.result-big');
  const done = await pg.evaluate((g) => DR.store.get().done['g:' + g], u.grammar[0].id);
  assert.ok(done && done.max === n, 'Ergebnis gespeichert');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Fortschritt: Export/Import, Rückgängig, Zurücksetzen', async () => {
  const { ctx, pg } = await page();
  await pg.goto(base);
  await pg.waitForSelector('.tiles');
  const r = await pg.evaluate(() => {
    DR.srs.review('test-wort', true);
    const code = DR.store.exportCode();
    DR.store.reset();
    const afterReset = Object.keys(DR.store.get().words).length;
    DR.store.undo();
    const afterUndo = Object.keys(DR.store.get().words).length;
    DR.store.reset();
    DR.store.importCode(code);
    const afterImport = Object.keys(DR.store.get().words).length;
    let bad = false; try { DR.store.importCode('Müll'); } catch { bad = true; }
    return { afterReset, afterUndo, afterImport, bad, prefix: code.slice(0, 4) };
  });
  assert.deepEqual(r, { afterReset: 0, afterUndo: 1, afterImport: 1, bad: true, prefix: 'DR1.' });
  await ctx.close();
});

test('Hausaufgaben: Link → Erledigen → Ergebniscode → Auswertung', async () => {
  const { ctx, pg, errors } = await page();
  await pg.goto(base);
  await pg.waitForSelector('.tiles');
  await go(pg, '/hausaufgaben/neu');
  await pg.waitForSelector('label input[type=checkbox]');
  await pg.locator('label input[type=checkbox]').nth(0).check();
  await pg.locator('label input[type=checkbox]').nth(1).check();
  await pg.locator('#backbar .slot .btn').click();
  const link = await pg.locator('code.blob').innerText();
  assert.match(link, /#\/hw\/H1\./);
  await pg.goto(link);
  await pg.waitForSelector('.progress-top');
  const k = await pg.evaluate(() => { const id = Object.keys(DR.store.get().hw)[0]; return DR.store.get().hw[id].task.items[0]; });
  await pg.evaluate((key) => DR.store.record(key, 7, 10, 'Grammatik', { mist: ['Ich ___ → bin'] }), k);
  await pg.reload();
  await pg.waitForSelector('.progress-top');
  assert.match(await pg.locator('.progress-top').innerText(), /1 \/ 2/);
  await pg.evaluate(() => { window.__copied = null; DR.copy = (x) => { window.__copied = x; return Promise.resolve(true); }; });
  await pg.locator('#backbar .slot .btn').click();
  const text = await pg.evaluate(() => window.__copied);
  assert.match(text, /7\/10 \(70%\)/);
  const code = text.match(/R1\.[\w-]+/)[0];
  await go(pg, '/hausaufgaben/auswerten');
  await pg.fill('textarea', text);
  await pg.locator('#backbar .slot .btn').click();
  await pg.waitForSelector('.skill');
  assert.match(await pg.locator('#view').innerText(), /Ich ___ → bin|Fehler|Ошибки/);
  assert.ok(code.length > 10);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('SRS: Erinnerung fällt mit der Zeit, Stabilität wächst bei richtiger Antwort', async () => {
  const { ctx, pg } = await page();
  await pg.goto(base);
  await pg.waitForSelector('.tiles');
  const r = await pg.evaluate(() => {
    const now = Date.now();
    const w = { s: 2, t: now - 2 * DR.DAY };
    return { m: DR.srs.memory(w, now), up: DR.srs.next(w, true, now), down: DR.srs.next(w, false, now) };
  });
  assert.ok(Math.abs(r.m - Math.exp(-1)) < 1e-6);
  assert.ok(r.up > 2 && r.down < 2);
  await ctx.close();
});

test('Kontrast: Hauptknopf ≠ „richtig“-Grün und Texte lesbar in allen Themen', async () => {
  const { ctx, pg } = await page();
  await pg.goto(base);
  await pg.waitForSelector('.tiles');
  const res = await pg.evaluate(() => {
    function lum(hx) { const c = DR.color.hex(hx).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
    function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
    function lab(hx) {
      let [r, g, b] = DR.color.hex(hx).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
      const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
    }
    function dE(a, b) { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
    const out = [];
    for (const th of DR.THEMES) for (const mode of ['light', 'dark']) {
      const p = th[mode], f = DR.FEEDBACK[mode];
      out.push({ th: th.id, mode, dE: dE(p.primary, f.ok), btn: cr(p.primary, p.onPrimary), text: Math.min(cr(p.text, p.bg), cr(p.text, p.bg2)), muted: Math.min(cr(p.muted, p.bg), cr(p.muted, p.bg2)), ok: cr(f.ok, f.onOk), bad: cr(f.bad, f.onBad) });
    }
    return out;
  });
  for (const r of res) {
    assert.ok(r.dE >= 35, `${r.th}/${r.mode}: Hauptknopf zu nah am Grün (ΔE ${r.dE.toFixed(1)})`);
    assert.ok(r.btn >= 4.5, `${r.th}/${r.mode}: Knopftext Kontrast ${r.btn.toFixed(2)}`);
    assert.ok(r.text >= 7, `${r.th}/${r.mode}: Text Kontrast ${r.text.toFixed(2)}`);
    assert.ok(r.muted >= 4.5, `${r.th}/${r.mode}: Nebentext Kontrast ${r.muted.toFixed(2)}`);
    assert.ok(r.ok >= 4.5 && r.bad >= 4.5, `${r.th}/${r.mode}: Feedback-Kontrast`);
  }
  await ctx.close();
});

test('Offline: nach dem ersten Besuch funktioniert die App ohne Netz', async () => {
  const { ctx, pg, errors } = await page({ sw: true });
  await pg.goto(base);
  await pg.waitForSelector('.tiles');
  await pg.evaluate(() => navigator.serviceWorker.ready);
  await pg.reload();
  await pg.waitForFunction(() => navigator.serviceWorker.controller);
  const u = await pg.evaluate(() => DR.readyUnits()[0].id);
  await go(pg, '/stadt/' + u); // Einheit einmal online laden
  await ctx.setOffline(true);
  await pg.reload();
  await pg.waitForSelector('#view .item');
  await go(pg, '/stadt/' + u);
  await go(pg, '/karte');
  const t = await pg.locator('#view').innerText();
  assert.ok(t.length > 50);
  assert.deepEqual(errors.filter((e) => !/net::|Failed to fetch/.test(e)), []);
  await ctx.close();
});

test('Zurück-Taste des Browsers führt zum vorherigen Bildschirm', async () => {
  const { ctx, pg } = await page();
  await pg.goto(base);
  await pg.waitForSelector('.tiles');
  await pg.click('a.tile[data-sec="gram"]');
  await pg.waitForSelector('h1');
  await pg.click('.item >> nth=0');
  await pg.waitForSelector('.gsec');
  await pg.goBack();
  await pg.waitForTimeout(200);
  assert.equal(await pg.evaluate(() => location.hash), '#/grammatik');
  await pg.click('#backbtn');
  await pg.waitForSelector('.tiles');
  await ctx.close();
});
