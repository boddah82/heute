// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__chunks = [['Vorrei'], ['un cappuccino']]; window.__sessions = 0;
    class FakeSR { start() { const c = window.__chunks[window.__sessions++]; setTimeout(() => { if (c) this.onresult({ results: c.map(t => Object.assign([{ transcript: t }], { isFinal: true })), resultIndex: 0 }); setTimeout(() => this.onend(), 50); }, 100); } stop() { setTimeout(() => this.onend(), 20); } abort() { this.stop(); } }
    window.SpeechRecognition = FakeSR;
  });
  let sys = '';
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData()); sys = body.system;
    const payload = { reply: 'Buongiorno! Cosa desidera?', translation: 'Guten Tag! Was wünschen Sie?', correction: { needed: false, corrected: '', explanation: '' }, new_words: [], suggestion: { answer: "Vorrei un cappuccino e un cornetto, per favore.", words: [{t:'Vorrei',de:'ich-hätte-gern'},{t:'un',de:'einen'},{t:'cappuccino',de:'Cappuccino'},{t:'e',de:'und'},{t:'un',de:'ein'},{t:'cornetto,',de:'Hörnchen,'},{t:'per',de:'für'},{t:'favore.',de:'Gefallen.'}] } };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(payload) }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#talk'); await p.reload();
  await p.click('.chips[data-name="scen"] .chip[data-i="2"]');
  await p.waitForSelector('#t-help');
  console.log('box hidden initially:', await p.isHidden('#t-hintbox'), '| schema field in prompt:', sys.includes('"suggestion"'));
  await p.click('#t-mic'); await p.waitForTimeout(300);   // Diktat läuft
  for (let i = 1; i <= 4; i++) {
    await p.click('#t-help');
    console.log('step', i, ':', (await p.textContent('#t-hintbox')).replace(/\s+/g, ' ').trim());
    await p.locator('#t-hintbox').screenshot({ path: process.env.S + '/hintstep' + i + '.png' });
  }
  console.log('help button gone:', !(await p.$('#t-help')), '| dictation still running:', await p.textContent('#t-mic'), '| live text kept:', await p.inputValue('#t-text'));
  await p.screenshot({ path: process.env.S + '/hint.png', fullPage: true });
  console.log('ERRORS:', errs);
  await b.close();
})();
