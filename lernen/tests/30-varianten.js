// Browser-Test (Playwright): Muster-Drill – Varianten zu einem Satz erstellen und laut durchgehen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const revealIf = async p => { if (await p.isVisible('#reveal')) await p.click('#reveal'); }; // neue Karten sind schon aufgedeckt (Einführung)
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
    const data = { variants: [
      { t: 'Lavoro a Berlino.', de: 'Ich arbeite in Berlin.', kind: 'word' },
      { t: 'abito a berlino', de: 'doppelt', kind: 'word' },
      { t: 'Lei abita a Berlino.', de: 'Sie wohnt in Berlin.', kind: 'person' },
      { t: 'Non abito a Berlino.', de: 'Ich wohne nicht in Berlin.', kind: 'neg' },
      { t: 'Abiti a Berlino?', de: 'Wohnst du in Berlin?', kind: 'question' },
      { t: 'Abito a Berlino.', de: 'doppelt (Original)', kind: 'word' },
    ] };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: reqBody.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 100 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.reload();
  await p.evaluate(() => {
    state.islands = [{ id: 'i1', title: 'Test', ts: Date.now(), sentences: [{ id: 's:abito', t: 'Abito a Berlino.', d: 'Ich wohne in Berlin.', ts: Date.now() }] }];
    state.srs['s:abito'] = { iv: 1, ef: 2.0, due: today(), lapses: 1, reps: 1 };
    persist();
  });
  // Auswahl: schwieriger Satz steht in der Liste
  await p.goto(URL + '#builder/var'); await p.reload();
  console.log('list:', (await p.textContent('#pane .list')).trim().replace(/\s+/g, ' '));
  // Inseln und Shadowing verlinken den Drill
  await p.goto(URL + '#islands/i1');
  console.log('island link:', !!(await p.$('a[href="#builder/var~s%3Aabito"]')));
  await p.goto(URL + '#shadow');
  console.log('shadow link:', !!(await p.$('a[href="#builder/var~s%3Aabito"]')));
  await p.click('a[href="#builder/var~s%3Aabito"]');
  await p.click('#v-make');
  await p.waitForSelector('#reveal');
  console.log('request:', JSON.stringify(reqBody.messages[0].content));
  console.log('saved:', await p.evaluate(() => findSentence('s:abito').vars.map(v => v.k + ':' + v.t).join(' | ')));
  const seen = [];
  for (let k = 0; k < 4; k++) {
    seen.push((await p.textContent('.row.between span')).trim() + ' → ' + (await p.textContent('.flash .native')).trim());
    await revealIf(p);
    if (k === 0) { console.log('marked:', await p.innerHTML('#answer .sentence')); await p.click('#add'); }
    await p.click('#next');
  }
  console.log(seen.join('\n'));
  console.log('end:', (await p.textContent('#pane .card b')).trim(), '| drill today:', await p.evaluate(() => dayLog().drill));
  console.log('island now:', await p.evaluate(() => state.islands[0].sentences.map(s => s.t).join(' | ')));
  await p.click('#v-again');
  console.log('again shows:', !!(await p.$('#reveal')));
  // Zweiter Besuch kostet nichts
  await p.goto(URL + '#builder/var~s%3Aabito');
  console.log('no new call:', calls === 1, '| starts drill:', !!(await p.$('#reveal')));
  console.log('errors:', errs.length ? errs : 'keine');
  await b.close();
})();
