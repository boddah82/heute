// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Motivation: Häppchen mit Zwischenstand, Tagesportion statt Stau-Zahl, Etappenziel mit Prognose, Meilenstein, eigenes Ziel.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  // 137 fällige Wörter (Rückstand), 380 sichere; Verlauf: vor 10 Tagen 300 sicher
  await p.evaluate(() => {
    const ws = allWords(), t = today();
    ws.slice(0, 137).forEach(w => { state.srs[w.id] = { iv: 5, ef: 2.5, reps: 3, lapses: 0, due: t - 2, ts: Date.now() }; });
    ws.slice(137, 517).forEach(w => { state.srs[w.id] = { iv: 10, ef: 2.5, reps: 4, lapses: 0, due: t + 5, ts: Date.now() }; });
    state.log[t - 10] = { sec: { vocab: 900 }, newWords: 20, newSent: 0, reviews: 60, extraNew: 0, secure: 300 };
    state.log[t - 1] = { sec: { vocab: 600 }, newWords: 15, newSent: 0, reviews: 40, extraNew: 0, secure: 495 };
    persist();
  });
  await p.goto(URL + '#home'); await p.reload(); await p.waitForTimeout(300);
  const home = (await p.textContent('#view')).replace(/\s+/g, ' ');
  console.log('Etappe:', home.match(/Nächstes Etappenziel.*?Lerntage/)[0]);
  console.log('Feier 500:', home.includes('500 sichere Wörter!'), '| 137 sichtbar:', home.includes('137'), '| 10.000:', home.includes('10.000'));
  console.log('Heute zuerst:', (await p.textContent('.plan')).replace(/\s+/g, ' ').trim().slice(0, 160));
  console.log('Balken:', await p.$$eval('.bars rect', x => x.length));
  await p.screenshot({ path: process.env.S + '/motivation-home.png', fullPage: true });
  // Häppchen: nach 15 Karten Pause mit Zwischenstand
  await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(200);
  console.log('Tab:', await p.textContent('.seg .on'), '| Kopf:', (await p.textContent('#pane .row.between')).trim());
  for (let k = 0; k < 15; k++) { await p.click('#reveal'); await p.click(k === 3 ? '.rate [data-r="0"]' : '.rate [data-r="2"]'); }
  console.log('Pause:', (await p.textContent('#pane')).replace(/\s+/g, ' ').trim().slice(0, 170));
  await p.screenshot({ path: process.env.S + '/motivation-bite.png' });
  await p.click('#bite-more');
  console.log('weiter:', (await p.textContent('#pane .row.between')).trim());
  // Tagesportion aufgebraucht → keine Stau-Zahl, freiwillig noch ein Häppchen
  await p.evaluate(() => { dayLog().wok = 50; persist(); });
  await p.goto(URL + '#home'); await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(200);
  console.log('Portion geschafft:', (await p.textContent('#pane')).replace(/\s+/g, ' ').trim().slice(0, 170));
  await p.click('#pane .btn');
  console.log('freiwillig:', (await p.textContent('#pane .row.between')).trim());
  // Eigenes Ziel
  await p.evaluate(() => { settings.goalWords = 10000; settings.goalDate = new Date((today() + 72) * 86400000).toISOString().slice(0, 10); saveSettings(); });
  await p.goto(URL + '#home'); await p.waitForTimeout(200);
  console.log('Ziel:', (await p.textContent('#view')).replace(/\s+/g, ' ').match(/🎯.*?pro Tag.*?\)\.( Das.*?realistischer\.)?/)[0]);
  console.log('ERRORS:', errs);
  await b.close();
})();
