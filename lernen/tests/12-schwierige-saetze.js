// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  // Ohne Abfragen: Hinweis
  await p.goto(URL + '#shadow'); await p.waitForTimeout(200);
  console.log('no ratings shadow select:', await p.$eval('#s-isl', s => s.value));
  await p.goto(URL + '#listen'); await p.waitForTimeout(200);
  console.log('no ratings listen:', (await p.textContent('#l-list')).trim().slice(0, 60));
  // Bewertungen simulieren: 4 Sätze, unterschiedlich gut
  await p.evaluate(() => {
    const t = today();
    const ss = allSentences();
    state.srs[ss[0].id] = { iv: 30, ef: 2.6, reps: 5, lapses: 0, due: t + 20, ts: 1 };   // sitzt sicher
    state.srs[ss[1].id] = { iv: 1, ef: 1.9, reps: 3, lapses: 2, due: t, ts: 1 };       // sehr schwach
    state.srs[ss[2].id] = { iv: 8, ef: 2.5, reps: 3, lapses: 0, due: t + 5, ts: 1 };    // ok → nicht dabei
    state.srs[ss[3].id] = { iv: 1, ef: 2.3, reps: 2, lapses: 0, due: t + 1, ts: 1 };    // etwas schwach
    state.srs[ss[4].id] = { iv: 3, ef: 2.3, reps: 2, lapses: 3, due: t + 1, ts: 1 };    // alt, ohne Gut-Serie, Abstand 3 → gilt als gekonnt
    persist();
  });
  await p.evaluate(() => localStorage.removeItem('sl.shadow.it'));
  await p.goto(URL + '#shadow'); await p.reload(); await p.waitForTimeout(300);
  console.log('shadow default:', await p.$eval('#s-isl', s => s.value), '| first:', await p.textContent('#s-sent'), '| info shown:', await p.isVisible('#s-weakinfo'), '| counter:', await p.textContent('#s-pane .row span'));
  await p.goto(URL + '#listen'); await p.waitForTimeout(200);
  // gemischt → als sortierte Menge vergleichen
  console.log('listen weak list ok:', JSON.stringify((await p.$$eval('#l-list .t', x => x.map(e => e.textContent))).sort()) === JSON.stringify(await p.evaluate(() => [allSentences()[1].t, allSentences()[3].t].sort())));
  // Gut-Serie: zweimal Gut am selben Tag reicht nicht, am nächsten Tag nochmal Gut → raus; Nochmal → wieder drin
  console.log('streak:', JSON.stringify(await p.evaluate(() => {
    const id = allSentences()[1].id, out = [];
    const inWeak = () => weakSentences().some(s => s.id === id);
    let c = state.srs[id];
    c = nextCard(c, 2, today(), false); c = nextCard(c, 2, today(), false); state.srs[id] = c; out.push(['2x Gut heute', c.ok, inWeak()]);
    c = nextCard(c, 2, today() + 1, false); state.srs[id] = c; out.push(['Gut morgen', c.ok, inWeak()]);
    c = nextCard(c, 1, today() + 5, false); state.srs[id] = c; out.push(['Schwer', c.ok, inWeak()]);
    const old = nextCard({ iv: 3, ef: 2.5, reps: 2, lapses: 0, due: today() }, 2, today(), false); out.push(['alt + Gut', old.ok]);
    return out;
  })), '| expected: [2x Gut heute,1,true],[Gut morgen,2,false],[Schwer,0,true],[alt + Gut,3]');
  // Gemischt: Reihenfolge ändert sich zwischen Öffnungen (bei 8 schwachen Sätzen)
  await p.evaluate(() => { const t = today(); allSentences().slice(0, 8).forEach((s, i) => { state.srs[s.id] = { iv: 0, ef: 2.0, reps: 1, lapses: 1, due: t, ts: 1, ok: 0 }; }); persist(); });
  const orders = new Set();
  for (let k = 0; k < 4; k++) { await p.goto(URL + '#listen'); await p.reload(); await p.waitForTimeout(200); orders.add(JSON.stringify(await p.$$eval('#l-list .t', x => x.map(e => e.textContent)))); }
  console.log('listen orders differ:', orders.size > 1, '| count:', JSON.parse([...orders][0]).length);
  await p.selectOption('#l-isl', 'st-it-0'); await p.waitForTimeout(100);
  console.log('island still selectable:', await p.$$eval('#l-list li', x => x.length));
  console.log('ERRORS:', errs);
  await b.close();
})();
