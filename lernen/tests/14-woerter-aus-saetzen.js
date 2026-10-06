// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Wörter aus schwierigen Sätzen werden bei neuen Vokabeln vorgezogen; Wort-Hilfe in der Satz-Abfrage.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  // Ohne Satzbewertungen: Reihenfolge nach Häufigkeit, aber Wörter aus den nächsten Sätzen leicht vorgezogen
  await p.goto(URL + '#vocab/new'); await p.waitForTimeout(200);
  console.log('ohne Bewertung, erstes Wort:', await p.textContent('.flash .target'));
  // Satz mit „bicchiere“ dreimal falsch gehabt
  await p.evaluate(() => {
    const s = allSentences().find(x => x.t.startsWith('Un bicchiere'));
    state.srs[s.id] = { iv: 0, ef: 1.7, reps: 5, lapses: 3, due: today(), ts: Date.now() };
    persist();
  });
  await p.goto(URL + '#home'); await p.goto(URL + '#vocab/new'); await p.waitForTimeout(200);
  const first = [];
  for (let i = 0; i < 4; i++) { first.push(await p.textContent('.flash .target')); if (i === 0) console.log('Hinweis:', (await p.textContent('.flash')).replace(/\s+/g, ' ').slice(0, 80)); await p.click('#learned'); await p.waitForTimeout(80); }
  console.log('mit schwachem Satz, erste Wörter:', JSON.stringify(first));
  // Wort-Hilfe in der Satz-Abfrage
  await p.goto(URL + '#review'); await p.waitForTimeout(200);
  for (let i = 0; i < 12; i++) {
    const de = await p.textContent('.flash .native');
    if (de.includes('Glas')) break;
    await p.click('#reveal'); await p.click('.rate .good'); await p.waitForTimeout(50);
  }
  await p.click('#reveal');
  console.log('Satz:', await p.textContent('#answer .sentence'), '| Wort-Hilfe:', (await p.textContent('#wordhelp')).replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: process.env.S + '/wordhelp.png' });
  console.log('ERRORS:', errs);
  await b.close();
})();
