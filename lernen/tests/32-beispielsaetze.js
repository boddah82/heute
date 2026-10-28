// Browser-Test (Playwright): neue Wörter mit Beispielsatz (eigener Satz oder von Claude), Satz auch in der Abfrage.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let reqBody = null, calls = 0;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    reqBody = JSON.parse(req.postData()); calls++;
    const lines = reqBody.messages[0].content.split('\n');
    const items = lines.map((l, i) => ({ i, t: `Frase ${i} con ${l.split(': ')[1].split(' = ')[0]} oggi.`, de: `Satz ${i} heute.`, w: l.split(': ')[1].split(' = ')[0] }));
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: reqBody.model, content: [{ type: 'text', text: JSON.stringify({ items }) }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 100 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  // Ohne Schlüssel: erstes Wort „ciao“ hat einen eigenen Satz? Vorlagen-Inseln prüfen
  await p.goto(URL + '#vocab/new'); await p.reload();
  console.log('word 1:', (await p.textContent('.flash .target')).trim(), '| ex:', (await p.textContent('#ex')).trim().replace(/\s+/g, ' ').slice(0, 120));
  // Wort ohne eigenen Satz und ohne Schlüssel
  await p.evaluate(() => { state.islands = []; persist(); });
  await p.reload();
  console.log('no key:', (await p.textContent('#ex')).trim().slice(0, 60));
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.reload();
  await p.click('#ex-get');
  await p.waitForSelector('#ex .sentence');
  console.log('request lines:', reqBody.messages[0].content.split('\n').length, '| first:', reqBody.messages[0].content.split('\n')[0]);
  console.log('shown:', await p.innerHTML('#ex .sentence'), '|', (await p.textContent('#ex .small.muted')).trim());
  await p.click('#ex-add');
  console.log('island:', await p.evaluate(() => state.islands.map(i => i.title + ':' + i.sentences.length).join(',')));
  // Nächstes Wort hat schon einen Satz – kein neuer Aufruf
  await p.click('#learned');
  console.log('word 2 own sentence?', (await p.textContent('#ex .pill')).trim(), '| calls:', calls);
  // Automatik
  await p.evaluate(() => { const w = allWords().filter(w => !state.srs[w.id]); w.forEach(x => delete state.examples[x.id]); persist(); });
  await p.reload();
  await p.check('#ex-auto');
  await p.waitForSelector('#ex .sentence');
  console.log('auto setting:', await p.evaluate(() => settings.autoExamples), '| calls:', calls);
  // Abfrage: Satz zeigen vorne Deutsch, hinten markiert
  await p.goto(URL + '#vocab/recall'); await p.reload();
  await p.click('#cx-b');
  console.log('front ctx:', (await p.textContent('#cx-f')).trim());
  await p.click('#reveal');
  console.log('back:', (await p.innerHTML('#answer > div:last-child')).replace(/\s+/g, ' ').slice(0, 160));
  // Sync-Zusammenführung
  console.log('merge:', await p.evaluate(() => Object.keys(mergeState({ examples: { a: { t: 'x', ts: 1 } } }, { examples: { a: { t: 'y', ts: 2 }, b: { t: 'z', ts: 1 } } }).examples).join(',') + ' ' + mergeState({ examples: { a: { t: 'x', ts: 1 } } }, { examples: { a: { t: 'y', ts: 2 } } }).examples.a.t));
  console.log('errors:', errs.length ? errs : 'keine');
  await b.close();
})();
