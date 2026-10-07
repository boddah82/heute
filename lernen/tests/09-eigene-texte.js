// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let reqBody = null;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData());
    const reply = data => route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 300 } }) });
    // Satzordnung: jede Zeile ist ein ganzer Satz (je 6 Wörter)
    if (body.output_config.format.schema.properties.starts) return reply({ starts: [0, 6, 12] });
    reqBody = body;
    const lines = reqBody.messages[0].content.split('\n').map(l => { const [i, ...t] = l.split(': '); return { i: Number(i), de: 'DE: ' + t.join(': '), words: t.join(': ').split(' ').map(w => ({ t: w, de: 'x-' + w })), note: Number(i) === 1 ? 'Redewendung: heißt eigentlich …' : '' }; });
    reply({ lines });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#texts'); await p.reload();
  await p.fill('#tx-title', 'Testtext');
  await p.fill('#tx-body', 'La sera cammino vicino al mare\nIn bocca al lupo per domani\n\nIl vento porta via le nuvole');
  await p.click('#tx-save');
  // Ordnen + Übersetzen laufen automatisch
  await p.waitForSelector('.tx-de .d', { state: 'attached' });
  console.log('lines:', await p.$$eval('#tx-list li', x => x.length), '| tab:', await p.$eval('.tabs a.on', a => a.dataset.tab));
  console.log('request lines:', JSON.stringify(reqBody.messages[0].content), '| effort:', reqBody.output_config.effort);
  await p.click('[data-td="1"]');
  console.log('line 2 expanded:', (await p.textContent('li[data-i="1"] .tx-de')).replace(/\s+/g, ' ').trim().slice(0, 120));
  await p.click('[data-ta="1"]');
  await p.click('li[data-i="1"] details summary'); await p.click('[data-tw="1-1"]');
  const st = await p.evaluate(() => ({ isl: state.islands.find(i => i.id === 'txt-it').sentences.map(s => s.t + ' | ' + s.d), word: state.words.map(w => w.t + ' | ' + w.d) }));
  console.log('island:', JSON.stringify(st.isl), '| word:', JSON.stringify(st.word));
  await p.check('#tx-show');
  await p.screenshot({ path: process.env.S + '/texts.png', fullPage: true });
  await p.goto(URL + '#texts');
  console.log('list:', (await p.textContent('.card.step')).replace(/\s+/g, ' ').trim());
  console.log('ERRORS:', errs);
  await b.close();
})();
