// Browser-Test (Playwright): Einstellungen per QR-Code/Link aufs Handy übertragen. Sheet wird nachgebaut.
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8766/rhetorik/';
const SHEET = 'https://script.google.com/macros/s/TEST/exec';
const ok = (c, m) => console.log((c ? 'OK  ' : 'FEHLER ') + m);
(async () => {
  const b = await chromium.launch();
  const mk = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route(SHEET + '**', route => {
      const key = new globalThis.URL(route.request().url()).searchParams.get('key');
      const body = key === 'geh/eim+ä' ? { ok: true, skripte: [{ code: 'U001', titel: 'Neu', sprechtext: 'Text', status: 'bereit zum Aufnehmen' }] } : { ok: false, error: 'Schlüssel falsch oder fehlt' };
      route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    });
    return ctx;
  };
  // Gerät 1 (Chromebook): eingerichtet
  const c1 = await mk(); const p1 = await c1.newPage();
  const errs = []; p1.on('pageerror', e => errs.push(e.message));
  await p1.goto(URL);
  await p1.evaluate(s => { localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-ant-abc' })); localStorage.setItem('rh.settings', JSON.stringify({ skUrl: s, skKey: 'geh/eim+ä' })); }, SHEET);
  await p1.goto(URL + '#settings'); await p1.reload();
  ok(await p1.locator('#xfer-show').count() === 1, 'Einstellungen: Knopf „QR-Code zeigen“');
  await p1.click('#xfer-show');
  await p1.waitForSelector('#xfer-qr .qr img, #xfer-qr .qr canvas', { timeout: 5000 });
  ok(true, 'QR-Code wird gezeigt');
  await p1.click('#xfer-copy');
  const link = await p1.evaluate(() => navigator.clipboard.readText());
  ok(link.includes('#setup/') && !link.includes('sk-ant'), 'Link enthält Daten, Schlüssel nicht im Klartext');
  // Gerät 2 (Handy): leer
  const c2 = await mk(); const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.goto(link);
  await p2.waitForFunction(() => location.hash === '#skripte', null, { timeout: 5000 });
  ok(!(await p2.evaluate(() => location.href)).includes('setup'), 'Schlüssel sofort aus der Adresszeile entfernt');
  const st = await p2.evaluate(() => [JSON.parse(localStorage.getItem('rh.settings')), JSON.parse(localStorage.getItem('sl.talkcfg'))]);
  ok(st[0].skUrl === SHEET && st[0].skKey === 'geh/eim+ä', 'Handy: Skripte-Verbindung übernommen');
  ok(st[1].key === 'sk-ant-abc', 'Handy: Claude-Schlüssel übernommen');
  ok((await p2.textContent('#view')).includes('Neu'), 'Handy: Skripte sofort geladen');
  await p2.goBack(); await p2.waitForTimeout(300);
  ok(!p2.url().includes('setup'), 'Zurück: kein Link mit Schlüssel im Verlauf');
  // Kaputter Link
  const c3 = await mk(); const p3 = await c3.newPage(); p3.on('pageerror', e => errs.push(e.message));
  await p3.goto(URL + '#setup/%%%kaputt');
  await p3.waitForTimeout(500);
  ok((await p3.textContent('body')).includes('nochmal scannen'), 'Kaputter Link: Hinweis statt Absturz');
  ok(errs.length === 0, 'Keine JS-Fehler ' + errs.join(' | '));
  await b.close();
})();
