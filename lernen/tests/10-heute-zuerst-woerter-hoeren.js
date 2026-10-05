// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  const plan = async label => { await p.goto(URL + '#home'); await p.reload(); await p.waitForTimeout(200); console.log(label, '→', (await p.textContent('.plan')).replace(/\s+/g, ' ').trim()); };
  // Szenario 1: ganz neu
  await plan('neu');
  // Szenario 2: 120 Wörter fällig, Sätze vor 5 Tagen, 3 Tage Pause
  await p.evaluate(() => {
    const t = today();
    starterWords('it').slice(0, 120).forEach((w, i) => { state.srs[w.id] = { iv: 3, ef: 2.5 - (i % 5) * 0.2, reps: 2, lapses: i % 7, due: t - 1, ts: Date.now() - i * 1000 }; });
    state.log[t - 4] = { sec: { vocab: 900, review: 300 }, newWords: 0, newSent: 0, reviews: 0 };
    state.log[t - 5] = { sec: { vocab: 900, shadow: 400 }, newWords: 0, newSent: 0, reviews: 0 };
    persist();
  });
  await plan('pause+rückstand');
  await p.screenshot({ path: process.env.S + '/plan.png' });
  // Szenario 3: Sätze heute gemacht, nur 10 fällig
  await p.evaluate(() => {
    const t = today(); let n = 0;
    Object.keys(state.srs).forEach(id => { if (n++ >= 10) state.srs[id].due = t + 5; });
    dayLog().sec.review = 400; dayLog().sec.shadow = 400; persist();
  });
  await plan('normal');
  // Abfrage-Deckel
  await p.evaluate(() => { const t = today(); Object.keys(state.srs).forEach(id => { state.srs[id].due = t - 1; }); persist(); });
  await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(200);
  console.log('recall queue:', await p.textContent('#pane .row span'));
  // Wörter hören
  await p.goto(URL + '#listen/words'); await p.waitForTimeout(200);
  console.log('words list items:', await p.$$eval('#lw-list li', x => x.length), '| first hidden target:', await p.textContent('#lw-list li .t'));
  await p.click('.chips[data-name="lw-mode"] .chip[data-i="1"]');
  console.log('repeat mode shows target:', await p.textContent('#lw-list li .t'));
  await p.click('#lw-play'); await p.waitForTimeout(500);
  console.log('playing:', await p.textContent('#lw-play'), '| now item:', !!(await p.$('#lw-list li.now')));
  await p.click('#lw-play');
  await p.screenshot({ path: process.env.S + '/listenwords.png' });
  console.log('ERRORS:', errs);
  await b.close();
})();
