// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/', IMG = require('path').join(__dirname, '..', 'icons', 'icon-512.png');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__langs = []; window.__chunks = [['Ciao klingt wie'], ['Tschau beim Abschied']]; window.__sessions = 0;
    class FakeSR { start() { window.__langs.push(this.lang); const c = window.__chunks[window.__sessions++]; setTimeout(() => { if (c) this.onresult({ results: c.map(t => Object.assign([{ transcript: t }], { isFinal: true })), resultIndex: 0 }); setTimeout(() => this.onend(), 50); }, 80); } stop() { setTimeout(() => this.onend(), 20); } abort() { this.stop(); } }
    window.SpeechRecognition = FakeSR;
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '#vocab/new');
  const id = await p.evaluate(() => allWords().filter(w => !state.srs[w.id])[0].id);
  await p.click('#learned');                  // ohne Eselsbrücke gelernt
  await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(300);
  console.log('memo hidden before reveal:', await p.isHidden('#memo'));
  await p.click('#reveal');
  console.log('summary:', (await p.textContent('#memo summary')).trim());
  await p.click('#memo summary');
  await p.click('#memo-mic'); await p.waitForTimeout(500); await p.click('#memo-mic'); await p.waitForTimeout(300);
  await p.setInputFiles('#memo [data-photo-in]', IMG); await p.waitForTimeout(400);
  console.log('note saved:', await p.evaluate(i => state.notes[i], id), '| lang:', await p.evaluate(() => window.__langs[0]), '| front photo:', await p.isVisible('.flash img.photo'), '| one image only:', await p.$$eval('img.photo:not([hidden])', x => x.length));
  await p.screenshot({ path: process.env.S + '/memo.png', fullPage: true });
  await p.click('.rate .again');               // Karte kommt wieder
  await p.waitForTimeout(200);
  console.log('hint button now present:', !!(await p.$('#hint')), '| summary now:', (await p.textContent('#memo summary')).trim());
  // Sätze
  await p.goto(URL + '#review'); await p.click('#reveal');
  console.log('sentence memo present:', !!(await p.$('#memo')));
  console.log('ERRORS:', errs);
  await b.close();
})();
