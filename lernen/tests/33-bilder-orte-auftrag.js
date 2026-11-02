// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Emoji auf Wortkarten, Foto-Tipp bei Problemwörtern, Orte-Karte mit „📍 Ich bin hier“, Tagesauftrag.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
const shot = name => require('path').join(process.env.S, name);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  // Emoji-Zuordnung über die deutsche Bedeutung
  console.log('emoji:', JSON.stringify(await p.evaluate(() => [wordEmoji('w:il pane'), wordEmoji('w:la stazione'), wordEmoji('w:allora'), wordEmoji('r:w:il pane')])), '| expected: ["🍞","🚉","👉","🍞"]');
  // Auch Gefühle/Abstraktes, aber nur Konkretes zählt für die Wörter-Jagd
  console.log('abstract:', JSON.stringify(await p.evaluate(() => [wordEmoji('w:la paura'), isConcrete(wordById('w:la paura')), isConcrete(wordById('w:il pane'))])), '| expected: ["😨",false,true]');
  // Wort-Abfrage: Brot fällig, 3× vergessen → Emoji vorne, Foto-Tipp nach dem Aufdecken
  await p.evaluate(() => {
    const t = today();
    state.srs = {};
    state.srs['w:il pane'] = { iv: 0, ef: 1.9, reps: 4, lapses: 3, due: t, ts: 1 };
    persist();
  });
  await p.goto(URL + '#vocab/recall'); await p.reload(); await p.waitForTimeout(400);
  const front = await p.$('.flash .emoji-big');
  console.log('front emoji:', front ? await front.textContent() : null);
  await p.click('#reveal'); await p.waitForTimeout(300);
  console.log('photo tip:', await p.isVisible('#photo-tip'));
  await p.click('#photo-go'); await p.waitForTimeout(200);
  console.log('memo opened:', await p.$eval('#memo', d => d.open));
  // Emoji abschaltbar
  await p.evaluate(() => { settings.emoji = false; saveSettings(); });
  console.log('emoji off:', JSON.stringify(await p.evaluate(() => wordEmoji('w:il pane'))));
  await p.evaluate(() => { settings.emoji = true; saveSettings(); });
  // Orte-Karte
  await p.evaluate(() => {
    const t = today(), isl = state.islands[1];
    isl.where = 'Bar an der Ecke';
    isl.sentences.slice(0, 3).forEach((s, i) => { state.srs[s.id] = i === 0 ? { iv: 8, ef: 2.5, reps: 3, lapses: 0, due: t + 5, ts: 1, ok: 2 } : { iv: 1, ef: 2.3, reps: 1, lapses: 0, due: t + 1, ts: 1, ok: 1 }; });
    persist();
  });
  await p.goto(URL + '#islands'); await p.waitForTimeout(300);
  console.log('tiles:', await p.$$eval('.place', x => x.length), '| icons:', JSON.stringify(await p.$$eval('.place-icon', x => x.map(e => e.textContent))));
  console.log('tile 2:', (await p.$$eval('.place', x => x[1].textContent.replace(/\s+/g, ' ').trim())));
  await p.screenshot({ path: shot('orte.png'), fullPage: true });
  const islId = await p.evaluate(() => state.islands[1].id);
  await p.goto(URL + '#here/' + islId); await p.waitForTimeout(300);
  console.log('here:', await p.textContent('h1'), '| items:', await p.$$eval('.here-item', x => x.length));
  await p.click('.here-item'); await p.waitForTimeout(100);
  console.log('revealed:', await p.isVisible('.here-item .sentence'));
  await p.screenshot({ path: shot('hier.png'), fullPage: true });
  await p.click('#here-done'); await p.waitForTimeout(300);
  console.log('after done hash:', await p.evaluate(() => location.hash), '| log.here:', await p.evaluate(() => dayLog().here));
  // Insel-Detail: Ort + Bild
  await p.goto(URL + '#islands/' + islId); await p.waitForTimeout(200);
  console.log('detail where:', await p.inputValue('#i-where'), '| icon:', await p.textContent('#i-icon'));
  // Tagesauftrag: Arten durchschalten, abhaken
  await p.evaluate(() => {
    const t = today(), l = dayLog(); delete l.missionK; delete l.missionDone;
    ['w:il pane', 'w:la stazione', 'w:il caffè', 'w:la casa', 'w:il treno', 'w:la birra'].forEach(id => { if (wordById(id)) state.srs[id] = Object.assign({ iv: 5, ef: 2.5, reps: 3, lapses: 0, due: t + 3, ts: 1 }, id === 'w:il pane' ? { lapses: 3 } : {}); });
    state.islands[0].sentences.slice(0, 3).forEach(s => { state.srs[s.id] = { iv: 8, ef: 2.5, reps: 3, lapses: 0, due: t + 5, ts: 1, ok: 2 }; });
    persist();
  });
  await p.goto(URL + '#home'); await p.reload(); await p.waitForTimeout(400);
  const kinds = new Set();
  for (let k = 0; k < 6; k++) {
    kinds.add(await p.evaluate(() => todayMission().k));
    if (await p.$('#ms-next')) { await p.click('#ms-next'); await p.waitForTimeout(100); }
  }
  console.log('mission kinds seen:', JSON.stringify([...kinds].sort()), '| expected: ["here","photo","self","spot"] | card:', await p.isVisible('#mission'));
  for (const k of ['spot', 'self']) {
    await p.evaluate(k => { dayLog().missionK = MISSIONS.indexOf(k) + 1; persist(); }, k);
    await p.goto(URL + '#home'); await p.reload(); await p.waitForTimeout(300);
    console.log('mission', k + ':', (await p.textContent('#mission')).replace(/\s+/g, ' ').trim().slice(0, 140));
    await p.$eval('#mission', e => e.scrollIntoView()); await p.screenshot({ path: shot('auftrag-' + k + '.png') });
  }
  // auf „self“ oder „photo“ springen und abhaken
  await p.evaluate(() => { const l = dayLog(); l.missionK = MISSIONS.indexOf('photo') + 1; persist(); });
  await p.goto(URL + '#home'); await p.reload(); await p.waitForTimeout(400);
  console.log('photo mission:', (await p.textContent('#mission')).includes('Foto-Jagd'), '| has photo button:', !!(await p.$('#mission [data-photo-in]')));
  await p.screenshot({ path: shot('auftrag.png'), fullPage: false });
  await p.click('#ms-done'); await p.waitForTimeout(200);
  console.log('done card:', (await p.textContent('.mission.done')).trim().slice(0, 30), '| log:', await p.evaluate(() => dayLog().missionDone));
  await p.goto(URL + '#week'); await p.waitForTimeout(200);
  console.log('week row:', (await p.textContent('.wk')).includes('Tagesaufträge'));
  console.log('ERRORS:', errs);
  await b.close();
})();
