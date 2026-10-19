// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__chunks = [['ciao'], ['ciao']]; window.__sessions = 0;
    class FakeSR { start() { const c = window.__chunks[window.__sessions++]; setTimeout(() => { if (c) this.onresult({ results: c.map(t => Object.assign([{ transcript: t }], { isFinal: true })), resultIndex: 0 }); setTimeout(() => this.onend(), 50); }, 80); } stop() { setTimeout(() => this.onend(), 20); } abort() { this.stop(); } }
    window.SpeechRecognition = FakeSR;
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // Wörter
  await p.goto(URL + '#vocab/new'); await p.click('#learned');
  await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(300);
  await p.click('#reveal');
  console.log('answer shown:', await p.isVisible('#answer'), '| cover button:', await p.isVisible('#cover'));
  await p.click('#cover');
  console.log('after cover – answer hidden:', await p.isHidden('#answer'), '| rate hidden:', await p.isHidden('.rate'), '| reveal back:', await p.isVisible('#reveal'));
  await p.keyboard.press('2');                 // Bewerten darf zugedeckt nicht gehen
  console.log('no rating while covered:', await p.isVisible('#reveal'));
  await p.keyboard.press(' ');
  console.log('space reveals again:', await p.isVisible('#answer'));
  await p.click('.rate .good'); await p.waitForTimeout(200);
  console.log('rated after second reveal:', (await p.textContent('#view, body')).includes('Fertig') || await p.isVisible('#reveal'));
  // Sätze: Sprechen nach Zudecken, Vergleich neu
  await p.goto(URL + '#review'); await p.waitForTimeout(300);
  await p.click('#reveal'); await p.click('#cover');
  console.log('cmp cleared:', (await p.innerHTML('#cmp')) === '');
  if (await p.$('#say')) { await p.click('#say'); await p.waitForTimeout(300); await p.click('#say'); await p.waitForTimeout(400); console.log('said again → compare shown:', (await p.textContent('#cmp')).includes('Gesagt')); }
  await p.screenshot({ path: process.env.S + '/zudecken.png', fullPage: true });
  console.log('ERRORS:', errs);
  await b.close();
})();
