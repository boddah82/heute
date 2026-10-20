// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let reqBody = null;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData());
    const reply = data => route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 300 } }) });
    // Satzordnung: jede Zeile ist ein ganzer Satz (je 6 Wörter)
    if (body.output_config.format.schema.properties.starts) return reply({ starts: [0, 6, 12] });
    reqBody = body;
    const lines = reqBody.messages[0].content.split('\n').map(l => { const [i, ...t] = l.split(': '); return { i: Number(i), de: 'DE: ' + t.join(': '), words: t.join(': ').split(' ').map(w => ({ t: w, de: 'x-' + w, ctx: w === 'cammino' ? 'gehen zu Fuß – nicht der Weg' : '', base: w === 'cammino' ? 'camminare' : '' })), note: Number(i) === 1 ? 'Redewendung: heißt eigentlich …' : '' }; });
    reply({ lines });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#texts'); await p.reload();
  await p.fill('#tx-title', 'Testtext');
  await p.fill('#tx-body', 'La sera cammino vicino al mare\nIn bocca al lupo per domani\n\nIl vento porta via le nuvole');
  await p.click('#tx-save');
  // Ordnen + Übersetzen laufen automatisch
  await p.waitForSelector('.tx-de .d', { state: 'attached' });
  console.log('lines:', await p.$$eval('#tx-list li', x => x.length), '| tab:', await p.$eval('.tabs a.on', a => a.dataset.tab));
  console.log('request lines:', JSON.stringify(reqBody.messages[0].content), '| effort:', reqBody.output_config.effort);
  // Lern-Karte unter dem Text
  console.log('learn card:', (await p.textContent('#tx-learn')).replace(/\s+/g, ' ').trim().slice(0, 140));
  // Neue Insel mit Texttitel wählen, alle Sätze übernehmen
  await p.selectOption('#tx-isl', 'new');
  await p.click('#tx-all');
  let st = await p.evaluate(() => { const tx = state.texts[0]; const isl = state.islands.find(i => i.id === tx.island); return { title: isl.title, n: isl.sentences.length, gloss: !!isl.sentences[0].gloss, btn: document.querySelector('#tx-all').textContent }; });
  console.log('island:', JSON.stringify(st));
  const tid = await p.evaluate(() => state.texts[0].id);
  // Runde rated wie die normale Abfrage: erste Karte „Nochmal“ (kommt in der Runde wieder), Rest „Gut“
  const round = async () => {
    let n = 0, first = true;
    while (await p.$('#reveal') || await p.$('#bite-more')) {
      if (await p.$('#bite-more')) { await p.click('#bite-more'); continue; }
      await p.click('#reveal');
      await p.click(first ? '.rate [data-r="0"]' : '.rate [data-r="2"]');
      first = false; n++;
    }
    return n;
  };
  // Wörter-Runde: höchstens 10 neue
  console.log('ctx in Zeile:', (await p.textContent('#tx-list')).includes('gehen zu Fuß'));
  await p.click('a[href$="~cards"]');
  console.log('word front:', (await p.textContent('.card.flash')).replace(/\s+/g, ' ').trim().slice(0, 40), '| buttons:', await p.$$eval('.rate .btn', x => x.map(b => b.textContent).join('/')));
  // Karte mit Zusammenhang: „cammino“ ist die 2. Karte („La“ ist ein kleines Wort und kommt nicht)
  await p.click('#reveal'); await p.click('.rate [data-r="0"]');
  await p.click('#cx-b');
  console.log('ctx front:', (await p.textContent('#cx-f')).trim(), '| native:', (await p.textContent('.flash .native')).trim());
  await p.click('#reveal');
  console.log('ctx back:', (await p.textContent('#answer')).replace(/\s+/g, ' ').trim().slice(0, 160));
  console.log('Vorderseite nur Wort:', !(await p.textContent('.flash .native')).includes('Grundform'), '| Warum so hinten:', await p.textContent('#answer .why'));
  await p.screenshot({ path: process.env.S + '/text-ctx.png', fullPage: true });
  await p.click('.rate [data-r="2"]');
  console.log('word d:', await p.evaluate(() => (state.words.find(w => w.t === 'cammino') || {}).d));
  console.log('round1 grades:', await round(), '| srs words:', await p.evaluate(() => state.words.filter(w => state.srs[w.id]).length), '| newWords today:', await p.evaluate(() => dayLog().newWords));
  console.log('done:', (await p.textContent('#pane')).replace(/\s+/g, ' ').trim().slice(0, 160));
  await p.click('#tr-more');
  console.log('round2 grades:', await round(), '| srs words:', await p.evaluate(() => state.words.filter(w => state.srs[w.id]).length), '| more btn:', !!(await p.$('#tr-more')));
  // Gleich nochmal: nur fällige (die „Nochmal“-Karten sind nach der Runde mit „Gut“ morgen dran) → leer
  await p.goto(URL + '#texts/' + tid); await p.click('a[href$="~cards"]');
  console.log('round3:', (await p.textContent('#pane')).replace(/\s+/g, ' ').trim().slice(0, 90));
  // Sätze-Runde
  await p.goto(URL + '#texts/' + tid + '~sents');
  console.log('sent front:', (await p.textContent('.card.flash')).replace(/\s+/g, ' ').trim().slice(0, 50));
  console.log('sent grades:', await round(), '| sentences in srs:', await p.evaluate(() => allSentences().filter(s => state.srs[s.id]).length));
  await p.goto(URL + '#texts/' + tid);
  console.log('after:', (await p.textContent('#tx-learn')).replace(/\s+/g, ' ').trim().slice(0, 400));
  await p.screenshot({ path: process.env.S + '/text-lernen.png', fullPage: true });
  // Gegenrichtung Zielsprache → Deutsch (r:<Wort-ID>)
  await p.click('#tx-golearn');
  await p.click('[data-dir="1"]');
  await p.click('a[href$="~cards"]');
  console.log('rev front:', (await p.textContent('.card.flash')).replace(/\s+/g, ' ').trim().slice(0, 40), '| typing field:', !!(await p.$('#typed')));
  await p.screenshot({ path: process.env.S + '/text-rev.png', fullPage: true });
  console.log('rev grades:', await round(), '| r: cards:', await p.evaluate(() => Object.keys(state.srs).filter(k => k.startsWith('r:')).length));
  await p.goto(URL + '#review');
  console.log('review first:', (await p.textContent('#view')).replace(/\s+/g, ' ').trim().slice(0, 120));
  console.log('ERRORS:', errs);
  await b.close();
})();
