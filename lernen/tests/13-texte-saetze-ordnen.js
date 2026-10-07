// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Selbst ausgedachter Text mit Umbrüchen mitten im Satz (keine geschützten Texte verwenden).
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const calls = [];
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData()); calls.push(body);
    let data;
    if (body.output_config.format.schema.properties.starts) {
      // Wörter: 0:Domani 1:vado 2:al 3:mercato 4:con 5:mia 6:Sorella 7:e 8:poi 9:mangiamo 10:insieme
      // Absichtlich schlecht: „Sorella“ als eigenes Bruchstück – muss automatisch angehängt werden
      data = { starts: [0, 6, 7] };
    } else {
      data = { lines: body.messages[0].content.split('\n').map(l => ({ i: Number(l.split(': ')[0]), de: 'DE ' + l.split(': ')[0], words: [], note: '' })) };
    }
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 50, output_tokens: 20 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#texts'); await p.reload();
  await p.fill('#tx-title', 'Test');
  await p.fill('#tx-body', '[Strofa]\nDomani vado al mercato con mia\nSorella e poi\nmangiamo insieme');
  await p.click('#tx-save'); await p.waitForTimeout(1200);
  console.log('automatisch geordnet:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))), '| übersetzt:', await p.evaluate(() => state.texts[0].lines.every(l => l.de)));
  console.log('Wörter an Claude:', JSON.stringify(calls[0].messages[0].content), '| Label entfernt:', !calls[0].messages[0].content.includes('Strofa'));
  console.log('keine Teilen/Verbinden-Knöpfe:', !(await p.$('[data-ts]')) && !(await p.$('[data-tj]')));
  // Neu ordnen geht vom Original aus
  await p.click('#tx-reseg'); await p.waitForTimeout(1200);
  console.log('neu geordnet (vom Original):', JSON.stringify(calls[calls.length - 2].messages[0].content.split('\n').length), 'Zeilen an Claude | Ergebnis:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))));
  await p.click('#tx-orig'); await p.waitForTimeout(200);
  console.log('wiederhergestellt:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))));
  // Ohne Schlüssel: nur an Satzzeichen teilen
  await p.evaluate(() => localStorage.removeItem('sl.talkcfg'));
  await p.goto(URL + '#texts'); await p.reload();
  await p.fill('#tx-title', 'Ohne KI');
  await p.fill('#tx-body', 'Oggi piove e io resto\na casa. Domani\nesco con gli amici.');
  await p.click('#tx-save'); await p.waitForTimeout(300);
  console.log('ohne Schlüssel:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))));
  console.log('ERRORS:', errs);
  await b.close();
})();
