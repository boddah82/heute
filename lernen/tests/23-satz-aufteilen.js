// Browser-Test (Playwright): langen Satz auf der Karte in Teile zerlegen (✂️ Aufteilen).
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
    reqBody = JSON.parse(req.postData());
    const data = { parts: [{ start: 0, de: 'Die Leute schauten auf die Handys' }, { start: 5, de: 'seufzten und schoben die Taschen hin und her' }, { start: 10, de: 'jede Minute, die länger dauerte als gedacht' }] };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: reqBody.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 100 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.reload();
  await p.evaluate(() => {
    state.islands = [{ id: 'i1', title: 'Test', ts: Date.now(), sentences: [
      { id: 's:lang', t: 'La gente controllava i telefoni, sospirava e spostava le borse ogni minuto che si allungava più del previsto.', d: 'Die Leute schauten auf ihre Handys, seufzten und schoben jede Minute die Taschen hin und her, die länger dauerte als gedacht.', ts: Date.now() },
      { id: 's:kurz', t: 'Ciao a tutti', d: 'Hallo zusammen', ts: Date.now() }] }];
    persist();
  });
  await p.goto(URL + '#review'); await p.reload();
  const front = async () => (await p.textContent('.flash .native')).trim();
  console.log('front 1:', await front());
  await p.click('#reveal');
  console.log('split button:', !!(await p.$('#split')));
  await p.click('#split');
  await p.waitForFunction(() => !document.querySelector('#split') && document.querySelector('.flash .native'));
  console.log('request words:', JSON.stringify(reqBody.messages[0].content.split('\n')[0].slice(0, 40)));
  const st = await p.evaluate(() => { const isl = state.islands[0]; const s = isl.sentences.find(x => x.id === 's:lang'); return { parts: s.parts.map(id => isl.sentences.find(x => x.id === id).t), partOf: isl.sentences.filter(x => x.partOf === 's:lang').length }; });
  console.log('parts:', JSON.stringify(st));
  // Reihenfolge: drei Teile, dann der ganze Satz
  const order = [];
  for (let k = 0; k < 4; k++) {
    order.push(await front());
    await p.click('#reveal');
    if (k === 0) console.log('split on part:', !!(await p.$('#split')));
    await p.click('.rate .btn.good');
  }
  console.log('order:', JSON.stringify(order));
  // Kurzer Satz: kein Knopf
  await p.click('#reveal');
  console.log('short sentence', await front(), '| split button:', !!(await p.$('#split')));
  // Nächster Tag: fälliger ganzer Satz bringt seine fälligen Teile mit
  const q = await p.evaluate(() => { Object.values(state.srs).forEach(c => { c.due = today(); }); return withParts(['s:lang']).map(id => findSentence(id).t.split(' ')[0]); });
  console.log('withParts:', JSON.stringify(q));
  console.log('errors:', errs.length ? errs : 'keine');
  await b.close();
})();
