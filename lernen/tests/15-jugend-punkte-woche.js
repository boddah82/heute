// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Jugend-Modus, Punkte/Abzeichen, Serie mit Jokern, Wochenrückblick.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let sys = '';
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData()); sys = body.system;
    const data = { reply: 'Ciao! Come va a scuola?', translation: 'Hallo! Wie läuft es in der Schule?', correction: { needed: false, corrected: '', explanation: '' }, new_words: [], suggestion: { answer: 'Bene, grazie.', words: [] } };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } }) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  // Jugend-Modus einschalten
  await p.goto(URL + '#settings'); await p.check('#p-teen'); await p.waitForTimeout(200);
  const isl = await p.evaluate(() => ({ it: state.islands.filter(i => i.id.startsWith('teen-')).map(i => i.title), en: loadState('en').islands.filter(i => i.id.startsWith('teen-')).length }));
  console.log('Jugend-Inseln it:', JSON.stringify(isl.it), '| en:', isl.en);
  await p.uncheck('#p-teen'); await p.check('#p-teen'); await p.waitForTimeout(100);
  console.log('kein Doppeln:', await p.evaluate(() => state.islands.filter(i => i.id.startsWith('teen-')).length));
  console.log('Baukasten ohne sposato/vino:', await p.evaluate(() => !builderData().adjectives.some(a => a.id === 'sposato') && !builderData().likes.some(a => a.id === 'vino')));
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.goto(URL + '#talk'); await p.reload(); await p.waitForTimeout(200);
  console.log('Themen:', JSON.stringify(await p.$$eval('.chips[data-name="scen"] .chip', x => x.map(e => e.textContent))));
  await p.click('.chips[data-name="scen"] .chip[data-i="3"]'); await p.waitForSelector('.bubble');
  console.log('Jugend-Regeln im Prompt:', sys.includes('The learner is a teenager'), '| Thema Schule:', sys.includes('Talk about school'));
  // Punkte: 3 neue Wörter lernen
  const xp0 = await p.evaluate(() => totalXP());
  await p.goto(URL + '#vocab/new'); for (let i = 0; i < 10; i++) await p.click('#learned');
  await p.waitForTimeout(3200); await p.goto(URL + '#home'); await p.waitForTimeout(500);
  console.log('Punkte vorher/nachher:', xp0, '→', await p.evaluate(() => totalXP()), '| Abzeichen:', JSON.stringify(await p.evaluate(() => Object.keys(state.badges || {}))));
  // Serie mit Jokern: 5 Tage geschafft, dazwischen 1 Tag Lücke
  const st = await p.evaluate(() => {
    const t = today(); const g = goalMin() * 60;
    [1, 2, 4, 5, 6].forEach(k => { state.log[t - k] = { sec: { vocab: g }, newWords: 3, newSent: 0, reviews: 10, wok: 8, wfail: 2 }; });
    persist(); return streakInfo();
  });
  console.log('Serie mit Lücke (Joker):', JSON.stringify(st));
  await p.goto(URL + '#awards'); await p.waitForTimeout(200);
  console.log('Awards:', (await p.textContent('.card')).replace(/\s+/g, ' ').slice(0, 90));
  await p.screenshot({ path: process.env.S + '/awards.png', fullPage: true });
  await p.goto(URL + '#week'); await p.waitForTimeout(200);
  console.log('Woche:', (await p.textContent('table.wk')).replace(/\s+/g, ' ').slice(0, 140));
  await p.screenshot({ path: process.env.S + '/week.png', fullPage: true });
  await p.goto(URL + '#home'); await p.waitForTimeout(200);
  await p.screenshot({ path: process.env.S + '/home-xp.png' });
  console.log('ERRORS:', errs);
  await b.close();
})();
