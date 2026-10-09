// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Grammatik-Lektionen (Claude nachgebaut), Wochen-Check, Wortpakete.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let req = null;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const r = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    req = JSON.parse(r.postData());
    const ch = n => ({ kind: 'choice', q: `___ libro ${n}`, options: ['il', 'la', 'lo'], answer: 0, solution: `il libro ${n}`, explain: 'libro ist männlich → il.' });
    const tr = n => ({ kind: 'translate', q: `das Buch ${n}`, options: [], answer: 0, solution: `il libro ${n}`, explain: 'männlich → il.' });
    const data = {
      intro: 'Artikel zeigen das Geschlecht.', rule: 'Männlich: **il**, weiblich: **la**.', compare: 'Wie der/die.',
      forms: [{ t: 'il libro', de: 'das Buch' }, { t: 'la casa', de: 'das Haus' }],
      examples: [{ t: 'Il libro è nuovo.', de: 'Das Buch ist neu.' }, { t: 'La casa è grande.', de: 'Das Haus ist groß.' }],
      pitfall: 'Deutsches Geschlecht nicht übertragen.',
      exercises: [ch(1), ch(2), ch(3), ch(4), ch(5), tr(1), tr(2), tr(3)],
    };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: req.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 1500, output_tokens: 2500 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => {
    localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' }));
    const t = today();
    starterWords('it').slice(0, 40).forEach((w, i) => { state.srs[w.id] = { iv: 5, ef: 2.5, reps: 2, lapses: 0, due: t + 3, ts: Date.now() - i * 1000 }; });
    allSentences().slice(0, 6).forEach(s => { state.srs[s.id] = { iv: 2, ef: 2.5, reps: 1, lapses: 0, due: t + 2, ts: Date.now() }; });
    persist();
  });
  // --- Grammatik
  await p.goto(URL + '#grammar'); await p.reload(); await p.waitForTimeout(200);
  console.log('Lektionen:', await p.$$eval('a.card.step[href^="#grammar/"]', x => x.length), '| nächste:', (await p.textContent('.pill')).trim());
  await p.click('a.card.step[href="#grammar/it-art"]'); await p.waitForTimeout(100);
  await p.click('#gr-make'); await p.waitForSelector('#gr-ex');
  const sys = req.system;
  console.log('Prompt: Thema', sys.includes('Artikel & Geschlecht'), '| eine Regel', /only this one rule/.test(sys), '| Deutsch-Vergleich', /differs from or resembles German/.test(sys), '| Niveau', /Learner level: A\d/.test(sys));
  console.log('Regel fett:', await p.$eval('.card.stack', e => e.innerHTML.includes('<b>il</b>')), '| Tabelle:', await p.$$eval('table.wk tr', x => x.length), '| Beispiele:', await p.$$eval('[data-gp]', x => x.length));
  await p.click('[data-ga="0"]');
  console.log('Beispiel in Insel Grammatik:', await p.evaluate(() => state.islands.find(i => i.id === 'gram-it').sentences.length));
  await p.click('#gr-ex');
  // 4 richtig, 1 falsch, Übersetzungen 2 richtig 1 falsch → 6/8
  for (let i = 0; i < 5; i++) { await p.click(`#gr-opts [data-o="${i === 2 ? 1 : 0}"]`); await p.click('#gr-next'); }
  for (let i = 0; i < 3; i++) { await p.fill('#gr-typed', 'il libro'); await p.click('#gr-reveal'); await p.click(i === 1 ? '#gr-no' : '#gr-yes'); }
  console.log('Ergebnis:', (await p.textContent('.flash')).replace(/\s+/g, ' ').trim(), '| Fehler gelistet:', await p.$$eval('.card .list li', x => x.length));
  const gs = await p.evaluate(() => state.grammar['it-art']);
  console.log('geschafft:', gs.done, '| best:', gs.best, '| nächste Lektion verlinkt:', !!(await p.$('a[href="#grammar/it-plural"]')));
  await p.screenshot({ path: process.env.S + '/grammar.png', fullPage: true });
  // --- Wortpakete
  await p.goto(URL + '#vocab/new'); await p.waitForTimeout(200);
  const opts = await p.$$eval('#pack option', x => x.map(o => o.textContent));
  console.log('Pakete:', opts.length - 1, '| Arbeit da:', opts.some(o => o.includes('Arbeit')), '| Schule nicht:', !opts.some(o => o.includes('Schule')));
  await p.selectOption('#pack', 'food'); await p.waitForTimeout(200);
  console.log('erstes Paketwort:', await p.textContent('.flash .target'), '=', await p.textContent('.flash .native'));
  const dup = await p.evaluate(() => allWords().filter(w => /^(il )?tavolo$/.test(w.t)).length);
  console.log('kein Doppel (tavolo):', dup === 1);
  await p.click('#learned'); await p.waitForTimeout(100);
  console.log('zweites:', await p.textContent('.flash .target'), '| Auswahl bleibt:', await p.$eval('#pack', e => e.value));
  await p.evaluate(() => { settings.teen = true; saveSettings(); });
  await p.reload(); await p.waitForTimeout(200);
  const teen = await p.$$eval('#pack option', x => x.map(o => o.textContent));
  console.log('Jugend: Schule da:', teen.some(o => o.includes('Schule')), '| Arbeit weg:', !teen.some(o => o.includes('Arbeit')));
  const wine = await p.evaluate(() => packEntries(packList().find(x => x.k === 'food')).some(e => e[0].includes('vino')));
  console.log('Jugend: kein Wein im Paket:', !wine);
  await p.evaluate(() => { settings.teen = false; saveSettings(); });
  // --- Wochen-Check
  await p.goto(URL + '#week'); await p.waitForTimeout(200);
  console.log('Rückblick:', (await p.textContent('#view')).includes('Das kannst du jetzt'));
  await p.goto(URL + '#week/test'); await p.waitForTimeout(200);
  let n = 0, cats = new Set();
  while (await p.$('#wt-opts') && n < 30) {
    cats.add((await p.textContent('.row.between span')).trim());
    await p.click('#wt-opts [data-o="0"]'); await p.click('#wt-next'); n++;
  }
  console.log('Fragen:', n, '| Kategorien:', [...cats].join(', '));
  console.log('Ergebnis:', (await p.textContent('.flash')).replace(/\s+/g, ' ').trim());
  const wt = await p.evaluate(() => state.weekTests[weekStart(today())]);
  console.log('gespeichert:', typeof wt.last === 'number', JSON.stringify(wt.cats));
  await p.goto(URL + '#week'); await p.waitForTimeout(200);
  console.log('Rückblick zeigt Ergebnis:', (await p.textContent('#view')).includes(wt.last + ' %'));
  // Sync-Zusammenführung
  const m = await p.evaluate(() => { const a = emptyState(), c = emptyState(); a.grammar = { x: { ts: 1, done: false } }; c.grammar = { x: { ts: 2, done: true } }; c.weekTests = { 5: { ts: 1, last: 50 } }; const r = mergeState(a, c); return [r.grammar.x.done, r.weekTests[5].last]; });
  console.log('Sync:', JSON.stringify(m));
  console.log('ERRORS:', errs);
  await b.close();
})();
