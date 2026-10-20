// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Wiederholung: Lernschritte in der Runde, Vorschau unter den Knöpfen, Streuung, Verspätung, Tageslimit in Text-Runden.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  // Abstände ohne Streuung
  const iv = await p.evaluate(() => {
    const t = today(), seq = [];
    let c;
    for (let k = 0; k < 5; k++) { c = nextCard(c, 2, c ? c.due : t); seq.push(c.iv); }
    const late = nextCard({ iv: 10, ef: 2.5, reps: 3, lapses: 0, due: t - 10 }, 2, t).iv;
    const onTime = nextCard({ iv: 10, ef: 2.5, reps: 3, lapses: 0, due: t }, 2, t).iv;
    const fz = new Set(Array.from({ length: 40 }, () => nextCard({ iv: 20, ef: 2.5, reps: 4, lapses: 0, due: t }, 2, t, true).iv));
    return { seq, late, onTime, fuzzMin: Math.min(...fz), fuzzMax: Math.max(...fz) };
  });
  console.log('Gut-Folge:', iv.seq.join('→'), '| 10 T zu spät:', iv.late, 'statt', iv.onTime, '| Streuung 50:', iv.fuzzMin + '–' + iv.fuzzMax);
  // Neue Wörter in der Abfrage: 3 Wörter „gelernt“ (heute fällig, iv 0) → müssen je zweimal gewusst werden
  await p.evaluate(() => {
    const ws = allWords().slice(0, 3);
    ws.forEach(w => { state.srs[w.id] = { iv: 0, ef: 2.5, reps: 0, lapses: 0, due: today(), ts: Date.now() }; });
    persist();
  });
  await p.goto(URL + '#vocab/recall'); await p.reload(); await p.waitForTimeout(300);
  const seen = [];
  let labels = '';
  for (let k = 0; k < 12 && await p.$('#reveal'); k++) {
    const front = (await p.textContent('.flash .native')).trim();
    await p.click('#reveal');
    if (!labels) labels = await p.$$eval('.rate .btn', x => x.map(e => e.textContent).join(' | '));
    seen.push(front);
    await p.click('.rate [data-r="2"]');
  }
  console.log('Vorschau neu:', labels);
  console.log('Reihenfolge:', seen.length, 'Abfragen →', seen.join(' · '));
  console.log('danach:', await p.evaluate(() => allWords().slice(0, 3).map(w => state.srs[w.id].iv + '/' + (state.srs[w.id].due - today())).join(' ')));
  // Wiederholung einer reifen Karte: Vorschau, Nochmal → kommt in der Runde wieder, dann Gut → 1 Tag
  await p.evaluate(() => {
    const w = allWords()[5];
    state.srs[w.id] = { iv: 8, ef: 2.5, reps: 3, lapses: 0, due: today(), ts: Date.now() };
    persist();
  });
  await p.goto(URL + '#home'); await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(300);
  await p.click('#reveal');
  console.log('Vorschau reif:', await p.$$eval('.rate .btn', x => x.map(e => e.textContent).join(' | ')));
  await p.click('.rate [data-r="0"]');
  console.log('nach Nochmal wieder da:', !!(await p.$('#reveal')));
  await p.click('#reveal'); await p.click('.rate [data-r="2"]');
  console.log('vergessen→Gut:', await p.evaluate(() => { const c = state.srs[allWords()[5].id]; return c.iv + ' T, lapses ' + c.lapses; }));
  await p.screenshot({ path: process.env.S + '/wiederholung.png' });
  // Tageslimit in Text-Runden
  await p.evaluate(() => {
    settings.autoTempo = false; settings.newWords = 12; saveSettings();
    dayLog().newWords = 10;
    state.texts = [{ id: 'txA', title: 'T', ts: Date.now(), lines: [{ id: 'l1', t: 'Gatto cane sole luna mare', de: 'Katze Hund Sonne Mond Meer', words: ['Gatto', 'cane', 'sole', 'luna', 'mare'].map(t => ({ t, de: 'de-' + t, ctx: '', base: '' })), note: '' }] }];
    persist();
  });
  await p.goto(URL + '#texts/txA~cards'); await p.waitForTimeout(300);
  console.log('Text-Runde bei 2 freien:', (await p.textContent('#pane .row.between span')).trim());
  let n = 0;
  while (await p.$('#reveal') && n < 20) { await p.click('#reveal'); await p.click('.rate [data-r="3"]'); n++; }
  console.log('Ende:', (await p.textContent('#pane')).replace(/\s+/g, ' ').trim().slice(0, 200));
  console.log('Extra-Knopf:', !!(await p.$('#tr-extra')));
  console.log('ERRORS:', errs);
  await b.close();
})();
