// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Prüfen-Knopf für Wörter und Sätze (Claude-Antwort nachgebaut).
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let wrongSentence = true;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const r = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(r.postData());
    const props = body.output_config.format.schema.properties;
    let data;
    if (props.other) data = { ok: false, problems: 'Unvollständig.', t: 'sei', de: 'sechs', other: 'du bist (von essere)' };
    else if (wrongSentence) data = { ok: false, problems: 'Falsche Form.', target: 'Sei mai stato in Germania?', de: 'Warst du schon mal in Deutschland?', words: [{ t: 'Sei', de: 'bist-du' }, { t: 'mai', de: 'jemals' }, { t: 'stato', de: 'gewesen' }, { t: 'in', de: 'in' }, { t: 'Germania?', de: 'Deutschland' }] };
    else data = { ok: true, problems: '', target: 'x', de: 'x', words: [{ t: 'Sei', de: 'bist-du' }] };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 200, output_tokens: 100 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => {
    localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' }));
    const isl = { id: 'tst', title: 'Test', ts: Date.now(), sentences: [{ id: 's:t1', t: 'Sei mai stata in Germania?', d: 'Warst du schon mal in Deutschland?', ts: Date.now() }] };
    state.islands = [isl];
    const t = today();
    state.srs['s:t1'] = { iv: 1, ef: 2.5, reps: 1, lapses: 0, due: t, ts: Date.now() };
    persist();
  });
  // Satz prüfen
  await p.goto(URL + '#review'); await p.reload(); await p.waitForTimeout(200);
  await p.click('#reveal');
  console.log('Hinweis Wortliste:', (await p.textContent('#wordhelp')).includes('im Satz kann ein Wort'));
  await p.click('#chk'); await p.waitForSelector('#chk-out .notice');
  console.log('Satz-Prüfung:', (await p.textContent('#chk-out')).replace(/\s+/g, ' ').trim().slice(0, 140));
  await p.click('#chk-take');
  const s1 = await p.evaluate(() => findSentence('s:t1'));
  console.log('übernommen:', s1.t, '| Glosse:', s1.gloss.map(w => w.t + '=' + w.de).join(' '), '| Anzeige:', await p.textContent('.sentence'));
  await p.click('.rate .again');
  await p.click('#reveal');
  console.log('nächstes Mal geprüfte Wort-für-Wort-Hilfe:', (await p.textContent('#wordhelp')).replace(/\s+/g, ' ').trim());
  // Wort prüfen (neue Wörter)
  await p.goto(URL + '#vocab/new'); await p.waitForTimeout(200);
  const before = await p.textContent('.flash .target');
  await p.click('#chk'); await p.waitForSelector('#chk-out .notice');
  console.log('Wort-Prüfung (' + before + '):', (await p.textContent('#chk-out')).replace(/\s+/g, ' ').trim());
  await p.click('#chk-take');
  console.log('Wort übernommen:', await p.textContent('.flash .target'), '=', await p.textContent('.flash .native'));
  // ohne Schlüssel kein Knopf
  await p.evaluate(() => localStorage.removeItem('sl.talkcfg')); await p.reload(); await p.waitForTimeout(200);
  console.log('ohne Schlüssel kein Prüfen:', !(await p.$('#chk')));
  console.log('ERRORS:', errs);
  await b.close();
})();
