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
      // Wörter: 0:Domani 1:vado 2:al 3:mercato 4:con 5:mia 6:sorella 7:e 8:poi 9:mangiamo 10:insieme
      data = { starts: [0, 7] };
    } else {
      const lines = body.messages[0].content.split('\n').map(l => { const [i, ...t] = l.split(': '); return { i: Number(i), de: 'DE ' + i, words: [], note: '' }; });
      data = { lines };
    }
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 50, output_tokens: 20 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.type() === 'prompt' ? d.accept('Domani vado al mercato | con mia sorella') : d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#texts'); await p.reload();
  await p.fill('#tx-title', 'Test');
  await p.fill('#tx-body', '[Strofa]\nDomani vado al mercato con mia\nSorella e poi\nmangiamo insieme');
  await p.click('#tx-save'); await p.waitForTimeout(200);
  console.log('vorher:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))));
  await p.click('#tx-seg'); await p.waitForTimeout(800);
  console.log('Wörter an Claude:', JSON.stringify(calls[0].messages[0].content), '| Label entfernt:', !calls[0].messages[0].content.includes('Strofa'));
  console.log('nachher:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))), '| übersetzt:', await p.evaluate(() => state.texts[0].lines.every(l => l.de)));
  await p.click('[data-ts="0"]'); await p.waitForTimeout(200);
  console.log('nach Teilen:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))));
  await p.click('[data-tj="1"]'); await p.waitForTimeout(200);
  console.log('nach Verbinden:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))));
  await p.click('#tx-orig'); await p.waitForTimeout(200);
  console.log('wiederhergestellt:', JSON.stringify(await p.$$eval('#tx-list .t', x => x.map(e => e.textContent))));
  console.log('ERRORS:', errs);
  await b.close();
})();
