// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  // Simulierte Erkennung: jede Sitzung liefert ein Stück und endet dann von selbst (wie bei einer Pause).
  // Sitzung 2 liefert Android-typisch kumulative Endergebnisse.
  await ctx.addInitScript(() => {
    window.__chunks = [['Vorrei'], ['un caffè', 'un caffè e un cornetto'], ['per favore']];
    window.__sessions = 0;
    class FakeSR {
      start() {
        const n = window.__sessions++;
        const chunk = window.__chunks[n];
        setTimeout(() => {
          if (chunk) {
            const results = chunk.map(t => Object.assign([{ transcript: t }], { isFinal: true }));
            this.onresult && this.onresult({ results, resultIndex: 0 });
          } else this.onerror && this.onerror({ error: 'no-speech' });
          setTimeout(() => this.onend && this.onend(), 50);
        }, 100);
      }
      stop() { setTimeout(() => this.onend && this.onend(), 20); }
      abort() { this.stop(); }
    }
    window.SpeechRecognition = FakeSR;
  });
  const sent = [];
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData());
    sent.push(body.messages[body.messages.length - 1].content);
    const payload = { reply: 'Certo! Ecco il caffè.', translation: 'Klar!', correction: { needed: false, corrected: '', explanation: '' }, new_words: [] };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(payload) }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } }) });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => { localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })); });
  await p.goto(URL + '#talk'); await p.reload();
  await p.click('.chips[data-name="scen"] .chip[data-i="2"]');
  await p.waitForSelector('.bubble');
  const before = sent.length;
  await p.click('#t-mic');
  await p.waitForTimeout(1500); // mehrere „Pausen“ -> Erkennung startet neu
  console.log('sessions so far:', await p.evaluate(() => window.__sessions), '| sent while speaking:', sent.length - before, '| live text:', await p.inputValue('#t-text'), '| button:', await p.textContent('#t-mic'), '| hint visible:', await p.isVisible('#t-hint'));
  await p.click('#t-mic'); // Fertig
  await p.waitForTimeout(800);
  console.log('sent message:', JSON.stringify(sent[sent.length - 1]), '| button after:', await p.textContent('#t-mic'));
  // Abfrage-Ansicht: Sprechen -> Fertig
  await p.evaluate(() => { window.__sessions = 0; window.__chunks = [['Mi chiamo'], ['Luca']]; });
  await p.goto(URL + '#review');
  await p.click('#say'); await p.waitForTimeout(700);
  await p.click('#say'); await p.waitForTimeout(400);
  console.log('review said:', (await p.textContent('#cmp')).replace(/\s+/g, ' '));
  console.log('ERRORS:', errs);
  await b.close();
})();
