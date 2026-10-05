// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const S = process.env.S, URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const reqs = [];
  let fail401 = false;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData());
    reqs.push({ url: req.url(), headers: req.headers(), body });
    if (fail401) return route.fulfill({ status: 401, headers: H, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
    const fb = !!body.output_config.format.schema.properties.summary;
    const payload = fb
      ? { summary: 'Gut gemacht!', mistakes: [{ wrong: 'io sono andato', right: 'sono andato', explanation: 'Pronomen weglassen.' }], sentences: [{ t: 'Mi piace il mare.', d: 'Ich mag das Meer.' }] }
      : { reply: 'Ciao! Come stai oggi?', translation: 'Hallo! Wie geht es dir heute?', correction: reqs.length > 1 ? { needed: true, corrected: 'Sto bene, grazie.', explanation: 'So sagt man es natürlicher.' } : { needed: false, corrected: '', explanation: '' }, new_words: [{ t: 'oggi', d: 'heute' }, { t: 'la giornata', d: 'der Tag' }] };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text: JSON.stringify(payload) }], stop_reason: 'end_turn', stop_details: null, usage: { input_tokens: 2000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }) });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto(URL);
  // Einstufungstest: Stufe 1+2 alles gewusst, Stufe 3 nichts
  await p.goto(URL + '#level/test');
  for (let band = 0; band < 3; band++) for (let q = 0; q < 6; q++) {
    if (band < 2) { await p.click('#reveal'); await p.click('#yes'); } else await p.click('#skip');
  }
  console.log('result:', (await p.textContent('.card')).replace(/\s+/g, ' ').slice(0, 160));
  await p.screenshot({ path: S + '/level-result.png', fullPage: true });
  await p.click('#apply');
  await p.waitForTimeout(200);
  console.log('level page:', (await p.textContent('.card')).replace(/\s+/g, ' ').slice(0, 120));
  await p.screenshot({ path: S + '/level.png', fullPage: true });
  // Gespräch
  await p.goto(URL + '#talk');
  await p.fill('#k', 'sk-ant-test'); await p.click('#save'); await p.waitForTimeout(200);
  await p.click('.chips[data-name="scen"] .chip[data-i="2"]');
  await p.waitForSelector('.bubble');
  await p.fill('#t-text', 'sto bene grazie'); await p.click('#t-send');
  await p.waitForSelector('.fix');
  await p.click('#t-easy');
  await p.fill('#t-text', 'vorrei un caffè'); await p.click('#t-send');
  await p.waitForTimeout(500);
  await p.click('[data-tr="2"]');
  await p.click('[data-word="2-0"]');
  await p.screenshot({ path: S + '/talk.png', fullPage: true });
  const r0 = reqs[0], r2 = reqs[2];
  console.log('req model:', r0.body.model, 'betas hdr:', r0.headers['anthropic-beta'], 'fallbacks:', r0.body.fallbacks, 'effort:', r0.body.output_config.effort, 'cache:', JSON.stringify(r0.body.cache_control), 'browser hdr:', r0.headers['anthropic-dangerous-direct-browser-access'], 'key:', r0.headers['x-api-key']);
  console.log('msgs in req3:', r2.body.messages.length, 'roles:', r2.body.messages.map(m => m.role).join(','), 'note:', JSON.stringify(r2.body.messages[4].content).slice(0, 120), 'assistant content kept thinking:', r2.body.messages[1].content[0].type);
  console.log('system has known words:', /Words the learner already knows \((\d+)\)/.exec(r0.body.system)[1], 'level:', /Estimated level: (\w+)/.exec(r0.body.system)[1]);
  // Auswertung
  await p.click('#t-end'); await p.waitForSelector('#keep');
  await p.click('#keep');
  await p.screenshot({ path: S + '/feedback.png', fullPage: true });
  const st = await p.evaluate(() => ({ isl: state.islands.find(i => i.id === 'talk-it').sentences.length, words: state.words.map(w => w.t), usage: JSON.parse(localStorage.getItem('sl.usage')), talk: localStorage.getItem('sl.talk.it') }));
  console.log('after feedback:', JSON.stringify(st));
  // Fehlerfall 401
  fail401 = true;
  await p.goto(URL + '#talk'); await p.click('.chips[data-name="scen"] .chip[data-i="0"]');
  await p.waitForTimeout(1500);
  console.log('all toasts:', await p.$$eval('.toast', t => t.map(x => x.textContent)));
  console.log('toast:', await p.textContent('.toast').catch(() => 'none'), '| screen:', (await p.textContent('h1')));
  // Home
  await p.goto(URL + '#home'); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/home4.png', fullPage: true });
  console.log('ERRORS:', errs);
  await b.close();
})();
