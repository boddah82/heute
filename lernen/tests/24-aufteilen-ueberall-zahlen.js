// Browser-Test (Playwright): ✂️ in Sprachinsel-Liste, Shadowing und Lese-Sätze-Runde; Zahlen-Karten ausgeschrieben.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData());
    const data = { parts: [{ start: 0, de: 'Teil A' }, { start: 4, de: 'Teil B' }] };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.reload();
  const long = n => ({ id: 's:l' + n, t: `Uno due tre quattro cinque sei sette otto ${n}`, d: 'Lang ' + n, ts: Date.now() });
  await p.evaluate(([a, c]) => {
    state.islands = [{ id: 'i1', title: 'Test', ts: Date.now(), sentences: [a, c, { id: 's:k', t: 'Ciao a tutti', d: 'Hallo', ts: Date.now() }] }];
    state.words.push({ id: 'u:n40', t: '40', d: '40', ts: Date.now() });
    state.books = [{ id: 'b1', title: 'Libro', theme: 'x', len: 150, ts: Date.now(), chapters: [{ n: 1, title: 'Uno', summary: '', questions: [], lookups: [], ts: Date.now(), sentences: [{ t: 'Il gatto dorme sul divano tutto il giorno.', de: 'Die Katze schläft den ganzen Tag auf dem Sofa.', words: [] }, { t: 'Piove.', de: 'Es regnet.', words: [] }] }] }];
    persist();
  }, [long(1), long(2)]);
  // Sprachinsel-Liste
  await p.goto(URL + '#islands/i1'); await p.reload();
  console.log('island split buttons:', await p.$$eval('[data-split]', x => x.length));
  await p.click('[data-split="s:l1"]');
  await p.waitForFunction(() => !document.querySelector('[data-split="s:l1"]'));
  console.log('island list:', JSON.stringify(await p.$$eval('.list .t', x => x.map(e => e.textContent))));
  // Shadowing
  await p.evaluate(() => localStorage.setItem('sl.shadow.' + settings.lang, JSON.stringify({ island: 'i1', idx: 3 })));
  await p.goto(URL + '#shadow'); await p.reload();
  console.log('shadow sentence:', await p.textContent('#s-sent'), '| split:', !!(await p.$('#s-split')));
  await p.click('#s-split');
  await p.waitForFunction(() => !document.querySelector('#s-split'));
  console.log('shadow after split:', await p.textContent('#s-sent'));
  // Lesegeschichte: Sätze-Runde
  await p.goto(URL + '#read/b1~1'); await p.reload();
  console.log('read sents card:', !!(await p.$('#rd-sents')));
  await p.click('#rd-sents a');
  await p.waitForSelector('#reveal');
  await p.click('#reveal');
  console.log('read round front:', (await p.textContent('.flash .native')).trim(), '| split:', !!(await p.$('#split')));
  console.log('read island:', await p.evaluate(() => (state.islands.find(i => i.id === 'read-b1') || {}).title));
  // Zahlen-Karte
  const card = await p.evaluate(() => { const it = numberCard({ t: '40', d: '40' }); const de = numberCard({ t: '40', d: 'vierzig' }); return [it, de, numberCard({ t: 'casa', d: 'Haus' })]; });
  console.log('number cards:', JSON.stringify(card));
  console.log('numText:', JSON.stringify(await p.evaluate(() => ['Ho 40 anni.', 'Alle 8:30 arrivano 23 persone', 'Costa 3,5 euro', 'Il 19.10. è lunedì', 'Ho 1 fratello e 2 sorelle', 'Nel 1984', 'Siamo in 100%'].map(numText))));
  console.log('compare digits:', await p.evaluate(() => compareWords('Ho 40 anni', 'ho quaranta anni').score));
  console.log('errors:', errs.length ? errs : 'keine');
  await b.close();
})();
