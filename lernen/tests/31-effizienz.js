// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Effizienz: 70/30 gemischte Wort-Häppchen mit „Neu“-Einführung, Später-Knopf, geteilte Sätze erst als Teile, kurze neue Sätze zuerst, Hochrechnung ohne Tempo.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const revealIf = async p => { if (await p.isVisible('#reveal')) await p.click('#reveal'); }; // neue Karten sind schon aufgedeckt (Einführung)
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  // 40 fällige Wörter, keine neuen bisher; Tagesziel 30 neue
  await p.evaluate(() => {
    settings.autoTempo = false; settings.newWords = 30; saveSettings();
    const t = today();
    allWords().slice(0, 40).forEach(w => { state.srs[w.id] = { iv: 3, ef: 2.5, reps: 2, lapses: 0, due: t, ts: Date.now() }; });
    persist();
  });
  await p.goto(URL + '#home'); await p.reload(); await p.waitForTimeout(300);
  console.log('Heute zuerst:', (await p.textContent('.plan')).replace(/\s+/g, ' ').trim().slice(0, 200));
  await p.goto(URL + '#vocab/recall'); await p.waitForTimeout(300);
  const kinds = [];
  let intro = '';
  for (let k = 0; k < 15; k++) {
    const isNew = !!(await p.$('#post:not([hidden]) .notice'));
    if (isNew && !intro) intro = (await p.textContent('#post .notice')).trim();
    kinds.push(isNew ? 'N' : 'a');
    if (!isNew) await revealIf(p);
    await p.click('.rate [data-r="2"]');
  }
  console.log('Häppchen 1:', kinds.join(''), '| neu-Anteil:', Math.round(kinds.filter(x => x === 'N').length / 15 * 100) + ' %');
  console.log('Einführung:', intro);
  console.log('Pause:', (await p.$$eval('#pane .card.flash p.small', x => x.map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '))).slice(0, 300));
  // Später-Knopf bei einer fälligen Karte
  await p.click('#bite-more');
  const front = (await p.textContent('.flash .native')).trim();
  await p.click('#later');
  console.log('Später:', front, '→', await p.evaluate(f => { const w = allWords().find(x => x.d === f || x.d.startsWith(f)); const c = w && state.srs[w.id]; return c ? c.due - today() + ' Tage, iv ' + c.iv : 'neu – heute nicht mehr'; }, front));
  // Sätze: langer geteilter Satz → erst Teile, ganzer Satz erst, wenn Teile gelernt
  await p.evaluate(() => {
    state.islands.push({ id: 'iT', title: 'T', ts: Date.now(), sentences: [
      { id: 's:p1', t: 'Ieri sono andato al mercato', d: 'Gestern bin ich zum Markt gegangen', partOf: 's:big', ts: Date.now() },
      { id: 's:p2', t: 'e ho comprato tre chili di mele rosse', d: 'und habe drei Kilo rote Äpfel gekauft', partOf: 's:big', ts: Date.now() },
      { id: 's:big', t: 'Ieri sono andato al mercato e ho comprato tre chili di mele rosse', d: 'Gestern bin ich zum Markt gegangen und habe drei Kilo rote Äpfel gekauft', parts: ['s:p1', 's:p2'], ts: Date.now() },
      { id: 's:long', t: 'Quando arriverai alla stazione centrale dovrai prendere il primo treno veloce per Milano', d: 'Langer Satz', ts: Date.now() },
      { id: 's:short', t: 'Ho fame', d: 'Ich habe Hunger', ts: Date.now() },
    ] });
    state.islands.forEach(i => { if (i.id !== 'iT') i.sentences.forEach(s => { state.srs[s.id] = { iv: 30, ef: 2.5, reps: 5, lapses: 0, due: today() + 30, ts: Date.now() }; }); });
    persist();
  });
  await p.goto(URL + '#review'); await p.waitForTimeout(300);
  const order = [];
  for (let k = 0; k < 12 && await p.$('.rate'); k++) {
    order.push(await p.evaluate(() => { const t = document.querySelector('#answer .sentence').textContent; return allSentences().find(s => numText(s.t) === t || s.t === t).id; }));
    if (!(await p.$('#post:not([hidden])'))) await revealIf(p);
    await p.click('.rate [data-r="2"]');
    if (await p.$('#bite-more')) await p.click('#bite-more');
  }
  console.log('Satz-Reihenfolge:', order.join(' '));
  console.log('ganzer Satz dabei:', order.includes('s:big'), '| Teile gelernt:', await p.evaluate(() => ['s:p1', 's:p2'].map(id => (state.srs[id] || {}).iv).join('/')));
  await p.evaluate(() => { ['s:p1', 's:p2'].forEach(id => { state.srs[id].iv = 1; }); });
  console.log('danach im Stapel:', await p.evaluate(() => withParts(['s:big']).join(' ')));
  console.log('ERRORS:', errs);
  await b.close();
})();
