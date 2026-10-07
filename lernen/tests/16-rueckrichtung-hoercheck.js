// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Rückrichtung (Wort hören → Deutsch) und Satz-Hör-Check.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__spoken = [];
    const orig = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = u => { window.__spoken.push(u.text); return orig(u); };
  });
  await p.goto(URL);
  // 30 Wörter: 20 sitzen (iv ≥ 3), 10 frisch
  await p.evaluate(() => {
    const t = today();
    starterWords('it').slice(0, 30).forEach((w, i) => { state.srs[w.id] = { iv: i < 20 ? 5 : 0, ef: 2.5, reps: 2, lapses: 0, due: t + 3, ts: Date.now() }; });
    persist();
  });
  await p.goto(URL + '#vocab/hear'); await p.reload(); await p.waitForTimeout(200);
  console.log('Tab:', await p.textContent('.seg [data-m="hear"]'), '| Rest:', await p.textContent('#pane .row span'));
  const word = await p.textContent('#h-t');
  console.log('Wort verdeckt:', await p.$eval('#h-t', e => e.hidden), '| Deutsch verdeckt:', await p.$eval('#h-answer', e => e.hidden));
  await p.click('#h-reveal');
  console.log('aufgedeckt:', word, '=', await p.textContent('#h-answer .native'));
  await p.click('.rate .good');
  const st = await p.evaluate(() => ({ r: Object.keys(state.srs).filter(id => id.startsWith('r:')), newHear: dayLog().newHear, words: Object.keys(state.srs).filter(isWordId).length }));
  console.log('Rückrichtungs-Karten:', JSON.stringify(st.r), '| neu heute:', st.newHear, '| Wörter im Training unverändert:', st.words === 30);
  // Tageslimit 15 neue
  for (let i = 0; i < 14; i++) { await p.click('#h-reveal'); await p.click('.rate .good'); }
  console.log('nach 15:', (await p.textContent('#pane')).replace(/\s+/g, ' ').trim().slice(0, 60));
  await p.goto(URL + '#home'); await p.waitForTimeout(200);
  console.log('Heute:', (await p.textContent('.plan')).replace(/\s+/g, ' ').trim());
  // Hör-Abfrage Gegenrichtung
  await p.goto(URL + '#listen/words'); await p.waitForTimeout(200);
  await p.click('.chips[data-name="lw-mode"] .chip[data-i="1"]');
  console.log('reverse: Ziel sichtbar:', await p.textContent('#lw-list li .t'), '| Deutsch verdeckt:', await p.textContent('#lw-list li .d'));
  // Hör-Check
  await p.goto(URL + '#listen/check'); await p.waitForTimeout(200);
  await p.selectOption('#hc-count', '10');
  await p.click('#hc-start'); await p.waitForTimeout(100);
  console.log('Satz verdeckt:', await p.$eval('#hc-t', e => e.hidden), '| gesprochen:', await p.evaluate(() => window.__spoken.slice(-1)[0]) === await p.textContent('#hc-t'));
  await p.click('#hc-show');
  console.log('Text zeigen → Deutsch noch verdeckt:', await p.$eval('#hc-d', e => e.hidden));
  await p.click('#hc-reveal'); await p.click('#hc-no');
  for (let i = 1; i < 10; i++) { await p.click('#hc-reveal'); await p.click('#hc-yes'); }
  console.log('Ergebnis:', (await p.textContent('#hc-pane')).replace(/\s+/g, ' ').trim().slice(0, 120));
  await p.screenshot({ path: process.env.S + '/hoercheck.png', fullPage: true });
  await p.click('#hc-again');
  console.log('nochmal:', await p.textContent('#hc-pane .row span'));
  console.log('ERRORS:', errs);
  await b.close();
})();
