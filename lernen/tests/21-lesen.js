// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Lesegeschichten: Kapitel (Claude nachgebaut), Wort antippen, Fragen, nächstes Kapitel mit nachgeschlagenen Wörtern.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const reqs = [];
  await ctx.route('https://api.anthropic.com/**', async route => {
    const r = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const req = JSON.parse(r.postData()); reqs.push(req);
    const n = reqs.length;
    const data = {
      book: 'La squadra del paese', title: n === 1 ? 'Il primo allenamento' : 'La partita',
      sentences: [
        { t: 'Marco gioca a calcio.', de: 'Marco spielt Fußball.', para: true, words: [{ t: 'Marco', de: 'Marco' }, { t: 'gioca', de: 'spielt' }, { t: 'a', de: 'zu' }, { t: 'calcio.', de: 'Fußball' }] },
        { t: 'La squadra è piccola.', de: 'Die Mannschaft ist klein.', para: false, words: [{ t: 'La', de: 'die' }, { t: 'squadra', de: 'Mannschaft' }, { t: 'è', de: 'ist' }, { t: 'piccola.', de: 'klein' }] },
        { t: 'Domani c\'è una partita.', de: 'Morgen gibt es ein Spiel.', para: true, words: [{ t: 'Domani', de: 'morgen' }, { t: 'c\'è', de: 'gibt-es' }, { t: 'una', de: 'ein' }, { t: 'partita.', de: 'Spiel' }] },
      ],
      summary: 'Marco spielt in einer kleinen Mannschaft. Morgen ist ein Spiel.',
      questions: [
        { q: 'Was spielt Marco?', options: ['Fußball', 'Tennis', 'Gitarre'], answer: 0, explain: 'Satz 1: gioca a calcio.' },
        { q: 'Wie ist die Mannschaft?', options: ['groß', 'klein', 'alt'], answer: 1, explain: 'La squadra è piccola.' },
        { q: 'Wann ist das Spiel?', options: ['heute', 'gestern', 'morgen'], answer: 2, explain: 'Domani = morgen.' },
      ],
    };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: req.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 3000, output_tokens: 4000 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#home'); await p.reload(); await p.waitForTimeout(200);
  console.log('Startseite-Karte:', (await p.textContent('a.card.step[href="#read"]')).replace(/\s+/g, ' ').trim());
  await p.goto(URL + '#read'); await p.waitForTimeout(200);
  console.log('Themen:', await p.$$eval('.chips[data-name="rd-theme"] .chip', x => x.map(e => e.textContent).join(', ')));
  await p.click('#rd-go');
  await p.waitForURL(/#read\/b.*~1/); await p.waitForTimeout(200);
  const sys1 = reqs[0].system;
  console.log('Prompt: Thema Fußball', /football/.test(sys1), '| 95 %', /95 %/.test(sys1), '| Kapitel 1', /Write chapter 1/.test(sys1), '| ~300 Wörter', /about 300 words/.test(sys1));
  console.log('Titel:', await p.textContent('h1'), '| Absätze:', await p.$$eval('#rd-text p', x => x.length), '| Wörter antippbar:', await p.$$eval('.rw', x => x.length));
  await p.click('.rw[data-w="1-1"]');
  console.log('Popup:', (await p.textContent('#rd-pop')).replace(/\s+/g, ' ').trim());
  await p.click('#rd-pop [data-add]');
  console.log('in Wortliste:', await p.evaluate(() => state.words.some(w => w.t === 'squadra' && w.d === 'Mannschaft')));
  await p.click('.rw[data-w="2-3"]');
  const book = await p.evaluate(() => state.books[0]);
  console.log('nachgeschlagen:', JSON.stringify(book.chapters[0].lookups));
  await p.click('#rd-play'); await p.waitForTimeout(300);
  console.log('Vorlesen markiert:', !!(await p.$('.rs.now')));
  await p.click('#rd-play');
  await p.click('#rd-qstart');
  for (const a of [0, 0, 2]) { await p.click(`#rd-quiz [data-o="${a}"]`); await p.click('#rd-quiz [data-next]'); }
  console.log('Fragen:', (await p.textContent('#rd-quiz')).replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: process.env.S + '/lesen.png', fullPage: true });
  await p.click('#rd-next');
  await p.waitForURL(/~2$/); await p.waitForTimeout(200);
  const sys2 = reqs[1].system;
  console.log('Kapitel 2: Zusammenfassung mit', sys2.includes('Marco spielt in einer kleinen Mannschaft'), '| nachgeschlagene Wörter mit', /reuse them naturally.*squadra.*partita/.test(sys2), '| Titel bleibt', sys2.includes('"La squadra del paese"'));
  await p.goto(URL + '#read/' + book.id); await p.waitForTimeout(200);
  console.log('Buch:', (await p.textContent('#view')).replace(/\s+/g, ' ').trim().slice(0, 140));
  const m = await p.evaluate(() => { const a = emptyState(), c = emptyState(); c.books = [{ id: 'x', ts: 2, chapters: [] }]; return mergeState(a, c).books.length; });
  console.log('Sync Bücher:', m);
  console.log('ERRORS:', errs);
  await b.close();
})();
