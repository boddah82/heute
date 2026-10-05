// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/', IMG = require('path').join(__dirname, '..', 'icons', 'icon-512.png');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__langs = []; window.__chunks = [['Ein Hund'], ['der Tschau ruft']]; window.__sessions = 0;
    class FakeSR { start() { window.__langs.push(this.lang); const c = window.__chunks[window.__sessions++]; setTimeout(() => { if (c) this.onresult({ results: c.map(t => Object.assign([{ transcript: t }], { isFinal: true })), resultIndex: 0 }); setTimeout(() => this.onend(), 50); }, 80); } stop() { setTimeout(() => this.onend(), 20); } abort() { this.stop(); } }
    window.SpeechRecognition = FakeSR;
  });
  const bodies = [];
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData()); bodies.push(body);
    const payload = { reply: "Guarda fuori: trova qualcosa di verde e descrivilo.", translation: 'Schau raus …', correction: { needed: false, corrected: '', explanation: '' }, new_words: [], suggestion: { answer: "L'erba è verde.", words: [{ t: "L'erba", de: 'Das-Gras' }, { t: 'è', de: 'ist' }, { t: 'verde.', de: 'grün.' }] } };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(payload) }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  // Foto + Einsprechen beim neuen Wort
  await p.goto(URL + '#vocab/new');
  const wordId = await p.evaluate(() => allWords().filter(w => !state.srs[w.id])[0].id);
  await p.setInputFiles('[data-photo-in]', IMG);
  await p.waitForSelector('.flash img.photo:not([hidden])');
  await p.click('#note-mic'); await p.waitForTimeout(500); await p.click('#note-mic'); await p.waitForTimeout(300);
  console.log('note:', await p.inputValue('#note'), '| dictation lang:', await p.evaluate(() => window.__langs[0]));
  await p.screenshot({ path: process.env.S + '/photo-new.png', fullPage: true });
  await p.click('#learned');
  // Abfrage zeigt Foto
  await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(400);
  console.log('recall photo visible:', await p.isVisible('.flash img.photo'), '| note saved:', await p.evaluate(id => state.notes[id], wordId));
  await p.screenshot({ path: process.env.S + '/photo-recall.png', fullPage: true });
  // Insel-Satz mit Foto
  await p.goto(URL + '#islands/st-it-0');
  await p.setInputFiles('[data-photo-in]', IMG);
  await p.waitForTimeout(400);
  console.log('island photo visible:', await p.isVisible('.list img.photo'));
  // Beschreiben mit Foto
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#talk'); await p.reload();
  await p.click('.chips[data-name="scen"] .chip[data-i="0"]');
  await p.waitForSelector('.bubble');
  console.log('scenario in prompt:', /Description practice/.test(bodies[0].system));
  await p.setInputFiles('#t-photo', IMG); await p.waitForTimeout(300);
  await p.fill('#t-text', "L'erba è verde."); await p.click('#t-send');
  await p.waitForTimeout(600);
  const last = bodies[bodies.length - 1].messages.slice(-1)[0];
  console.log('sent blocks:', last.content.map(c => c.type).join(','), '| img bytes:', last.content[0].source.data.length, '| bubble img:', await p.isVisible('.bubble.me img.photo'));
  await p.screenshot({ path: process.env.S + '/describe.png', fullPage: true });
  console.log('ERRORS:', errs);
  await b.close();
})();
