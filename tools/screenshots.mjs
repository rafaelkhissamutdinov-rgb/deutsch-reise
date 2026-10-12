// Screenshots aller Hauptbildschirme (390 px, hell/dunkel) → Ordner aus argv[2]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
const require = createRequire('/opt/node22/lib/node_modules/');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }
const out = process.argv[2] || 'screens';
const shots = (process.argv[3] || '').split(',').filter(Boolean);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srv = spawn('python3', ['-m', 'http.server', '8766', '-d', path.join(ROOT, 'app')], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const b = await chromium.launch();
const list = shots.length ? shots : ['home:/', 'karte:/karte', 'stadt:/stadt/a1-hamburg', 'grammatik:/grammatik/a1-hamburg/hh-g-pronomen-sein-haben', 'ueben:/grammatik/a1-hamburg/hh-g-fragen/ueben', 'karten:/wortschatz-karten/a1-hamburg', 'lesen:/lesen/a1-hamburg/hh-t-mail', 'dialog:/dialoge/a1-berlin/be-d-besichtigung', 'hoeren:/hoeren/a1-leipzig/le-h-weg', 'schreiben:/schreiben/a1-leipzig/le-s-absage', 'pass:/pass', 'einstellungen:/einstellungen'];
for (const dark of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:8766/');
  await pg.evaluate((theme) => { if (theme) DR.store.setting('theme', theme); }, process.env.THEME || '');
  for (const s of list) {
    const [name, route] = s.split(':');
    if (dark && !['home', 'stadt', 'ueben', 'pass'].includes(name)) continue;
    await pg.goto('http://127.0.0.1:8766/#' + route);
    await pg.waitForSelector('#view .screen');
    await pg.waitForTimeout(name === 'home' ? 1600 : 700);
    if (name === 'lesen') { await pg.locator('.reader .w').nth(6).click(); await pg.waitForTimeout(300); }
    if (name === 'karten') { await pg.locator('.flash').click(); await pg.waitForTimeout(700); }
    if (name === 'dialog') { for (let i = 0; i < 2; i++) { await pg.locator('.opt').first().click(); await pg.waitForTimeout(800); } }
    if (name === 'ueben') { const o = pg.locator('.opt'); if (await o.count()) { await o.first().click(); await pg.waitForTimeout(300); } }
    await pg.screenshot({ path: `${out}/${name}${dark ? '-dark' : ''}.png` });
  }
  await ctx.close();
}
await b.close(); srv.kill();
console.log('ok');
