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
    const lines = reqBody.messages[0].content.split('\n').map(l => { const [i, ...t] = l.split(': '); return { i: Number(i), de: 'DE: ' + t.join(': '), words: t.join(': ').split(' ').map(w => ({ t: w, de: 'x-' + w })), note: Number(i) === 1 ? 'Redewendung: heißt eigentlich …' : '' }; });
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
  // Wort-Karteikarten: 1. nicht gewusst, Rest gewusst
  await p.click('a[href$="~cards"]');
  await p.click('#cd-reveal'); await p.click('#cd-no');
  while (await p.$('#cd-reveal')) { await p.click('#cd-reveal'); await p.click('#cd-yes'); }
  console.log('word cards done:', (await p.textContent('.card.flash')).replace(/\s+/g, ' ').trim(), '| words in SRS:', await p.evaluate(() => state.words.filter(w => state.srs[w.id]).length));
  // Satz-Karteikarten: 1. nicht verstanden → heute fällig in Satz-Abfrage
  await p.goto(URL + '#texts/' + await p.evaluate(() => state.texts[0].id) + '~sents');
  await p.click('#cd-reveal'); await p.click('#cd-no');
  while (await p.$('#cd-reveal')) { await p.click('#cd-reveal'); await p.click('#cd-yes'); }
  console.log('sent cards done:', (await p.textContent('#view')).replace(/\s+/g, ' ').trim().slice(0, 160));
  st = await p.evaluate(() => { const ids = allSentences().map(s => s.id); return { due: ids.filter(id => state.srs[id] && state.srs[id].due <= today()).length, scards: Object.keys(state.texts[0].scards || {}).length }; });
  console.log('srs:', JSON.stringify(st));
  await p.goto(URL + '#texts/' + await p.evaluate(() => state.texts[0].id));
  console.log('after:', (await p.textContent('#tx-learn')).replace(/\s+/g, ' ').trim().slice(0, 140));
  await p.screenshot({ path: process.env.S + '/text-lernen.png', fullPage: true });
  // Gegenrichtung Deutsch → Zielsprache
  await p.click('#tx-golearn');
  await p.click('[data-dir="1"]');
  console.log('rev card:', (await p.textContent('#tx-learn')).replace(/\s+/g, ' ').trim().slice(0, 120), '| setting:', await p.evaluate(() => settings.cardRev));
  await p.click('a[href$="~cards"]');
  const front = (await p.textContent('.card.flash')).replace(/\s+/g, ' ').trim();
  await p.click('#cd-tip');
  console.log('rev word front:', front.slice(0, 80), '| tip:', (await p.textContent('#cd-gap')).trim().slice(0, 60));
  await p.click('#cd-reveal'); await p.click('#cd-yes');
  await p.goto(URL + '#texts/' + await p.evaluate(() => state.texts[0].id) + '~sents');
  console.log('rev sent front:', (await p.textContent('.card.flash')).replace(/\s+/g, ' ').trim().slice(0, 80));
  await p.click('#cd-tip');
  console.log('rev sent tip:', (await p.textContent('#cd-gap')).replace(/\s+/g, ' ').trim().slice(0, 80));
  await p.screenshot({ path: process.env.S + '/text-rev.png', fullPage: true });
  await p.click('#cd-reveal'); await p.click('#cd-no');
  console.log('rev stores:', await p.evaluate(() => { const t = state.texts[0]; return JSON.stringify({ cardsR: Object.keys(t.cardsR || {}).length, scardsR: Object.keys(t.scardsR || {}).length, scards: Object.keys(t.scards || {}).length }); }));
  await p.goto(URL + '#review');
  console.log('review first:', (await p.textContent('#view')).replace(/\s+/g, ' ').trim().slice(0, 120));
  console.log('ERRORS:', errs);
  await b.close();
})();
