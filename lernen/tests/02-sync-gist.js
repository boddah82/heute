// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const S = process.env.S, URL = 'http://localhost:8765/';
const gist = { id: null, content: null, desc: null };
async function mock(ctx) {
  await ctx.route('https://api.github.com/**', async route => {
    const req = route.request(), u = new globalThis.URL(req.url()), m = req.method();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, accept', 'access-control-allow-methods': 'GET, POST, PATCH' };
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const f0 = route.fulfill.bind(route); route.fulfill = o => f0(Object.assign({ headers: H }, o));
    if (req.headers()['authorization'] !== 'Bearer testtoken') return route.fulfill({ status: 401, body: '{}' });
    const g = () => ({ id: gist.id, description: gist.desc, files: { 'sprachtraining.json': { content: gist.content, truncated: false } } });
    if (u.pathname === '/gists' && m === 'GET') return route.fulfill({ json: gist.id ? [g()] : [] });
    if (u.pathname === '/gists' && m === 'POST') { const b = JSON.parse(req.postData()); gist.id = 'g1'; gist.desc = b.description; gist.content = b.files['sprachtraining.json'].content; return route.fulfill({ json: g() }); }
    if (u.pathname === '/gists/g1' && m === 'GET') return route.fulfill({ json: g() });
    if (u.pathname === '/gists/g1' && m === 'PATCH') { gist.content = JSON.parse(req.postData()).files['sprachtraining.json'].content; return route.fulfill({ json: g() }); }
    route.fulfill({ status: 404, body: '{}' });
  });
}
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const dev = async name => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await mock(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
    p.on('dialog', d => d.accept());
    await p.goto(URL);
    return p;
  };
  const A = await dev('A');
  // Wörter lernen
  await A.goto(URL + '#vocab/new');
  for (let i = 0; i < 3; i++) await A.click('#learned');
  // Korrektur
  A.removeAllListeners('dialog');
  let n = 0; A.on('dialog', d => d.accept(n++ === 0 ? 'ciao!' : 'hallo (korrigiert)'));
  await A.click('#fix');
  await A.waitForTimeout(200);
  A.removeAllListeners('dialog'); A.on('dialog', d => d.accept());
  console.log('corrected card:', (await A.textContent('.flash .target')), '|', await A.textContent('.flash .native'));
  // Baukasten
  for (const m of ['modal', 'be', 'like', 'dialog', 'drill']) {
    await A.goto(URL + '#builder/' + m); await A.waitForTimeout(150);
    if (m === 'modal') {
      await A.click('.chips[data-name="m"] .chip[data-i="4"]');
      await A.click('.chips[data-name="v"] .chip[data-i="2"]');
      await A.click('.chips[data-name="time"] .chip[data-i="5"]');
      console.log('modal cerco:', await A.textContent('.flash .sentence'), '|', await A.textContent('.flash .native'));
      await A.click('.chips[data-name="m"] .chip[data-i="0"]');
      await A.check('#b-neg');
      console.log('modal neg:', await A.textContent('.flash .sentence'), '|', await A.textContent('.flash .native'));
      await A.click('#b-add');
      await A.click('details summary');
      await A.fill('#bv-t', 'telefonare alla mamma'); await A.fill('#bv-d', 'Mama anrufen'); await A.fill('#bv-z', 'Mama anzurufen');
      await A.click('#bv-add');
      console.log('custom verb:', await A.textContent('.flash .sentence'), '|', await A.textContent('.flash .native'));
    }
    if (m === 'be') {
      await A.click('.chips[data-name="g"] .chip[data-i="1"]');
      await A.click('.chips[data-name="a"] .chip[data-i="0"]');
      await A.click('.chips[data-name="bl"] .chip[data-i="2"]');
      console.log('be:', await A.textContent('.flash .sentence'), '|', await A.textContent('.flash .native'));
      await A.click('.chips[data-name="a"] .chip[data-i="2"]');
      await A.click('.chips[data-name="bl"] .chip[data-i="1"]');
      console.log('be:', await A.textContent('.flash .sentence'), '|', await A.textContent('.flash .native'));
    }
    if (m === 'like') {
      await A.click('.chips[data-name="l"] .chip[data-i="8"]');
      await A.click('.chips[data-name="ll"] .chip[data-i="2"]');
      console.log('like:', await A.textContent('.flash .sentence'), '|', await A.textContent('.flash .native'));
      await A.click('.chips[data-name="l"] .chip[data-i="15"]');
      await A.click('.chips[data-name="ll"] .chip[data-i="1"]');
      console.log('like:', await A.textContent('.flash .sentence'), '|', await A.textContent('.flash .native'));
    }
    if (m === 'dialog') {
      await A.fill('#p-name', 'Marco'); await A.press('#p-name', 'Tab');
      await A.waitForTimeout(100);
      await A.fill('#p-city', 'Monaco di Baviera'); await A.press('#p-city', 'Tab');
      await A.waitForTimeout(100);
      await A.click('#d-all');
    }
    if (m === 'drill') { for (let i = 0; i < 3; i++) { await A.click('#reveal'); console.log('drill:', await A.textContent('#answer .sentence'), '|', await A.textContent('.flash .native')); await A.click('#next'); } }
    await A.screenshot({ path: `${S}/b-${m}.png`, fullPage: true });
  }
  // Sync A
  await A.goto(URL + '#settings');
  await A.fill('#y-token', 'testtoken'); await A.click('#y-connect'); await A.waitForTimeout(800);
  console.log('A syncCfg:', await A.evaluate(() => localStorage.getItem('sl.sync')));
  console.log('A sync status:', (await A.textContent('.card:nth-of-type(3)')).replace(/\s+/g, ' ').slice(0, 120));
  await A.screenshot({ path: `${S}/settings2.png`, fullPage: true });
  // Gerät B
  const B = await dev('B');
  await B.goto(URL + '#vocab/new');
  for (let i = 0; i < 4; i++) await B.click('#known');
  await B.goto(URL + '#settings');
  await B.fill('#y-token', 'testtoken'); await B.click('#y-connect'); await B.waitForTimeout(800);
  const bData = await B.evaluate(() => JSON.parse(localStorage.getItem('sl.data.it')));
  const bk = bData.islands.find(i => i.id === 'bk-it');
  console.log('B srs:', Object.keys(bData.srs).length, 'islands:', bData.islands.length, 'bk sentences:', bk && bk.sentences.length, 'override:', JSON.stringify(bData.overrides), 'profile:', await B.evaluate(() => settings.profile.name));
  // Löschen auf B -> A
  const delId = bk.sentences[0].id;
  await B.goto(URL + '#islands/bk-it'); await B.click(`[data-del="${delId}"]`);
  await B.goto(URL + '#settings'); await B.click('#y-now'); await B.waitForTimeout(800);
  await A.goto(URL + '#settings'); await A.click('#y-now'); await A.waitForTimeout(800);
  const aData = await A.evaluate(() => JSON.parse(localStorage.getItem('sl.data.it')));
  console.log('A srs after:', Object.keys(aData.srs).length, 'bk sentences:', aData.islands.find(i => i.id === 'bk-it').sentences.length, 'deleted gone:', !aData.islands.find(i => i.id === 'bk-it').sentences.some(s => s.id === delId));
  // Reset auf A, dann Sync auf B -> B muss leer werden
  await A.goto(URL + '#settings'); await A.click('#o-reset'); await A.waitForTimeout(800);
  await B.goto(URL + '#settings'); await B.click('#y-now'); await B.waitForTimeout(800);
  const bAfter = await B.evaluate(() => JSON.parse(localStorage.getItem('sl.data.it')));
  console.log('B after reset on A: srs', Object.keys(bAfter.srs).length, 'islands', bAfter.islands.map(i => i.id).join(','));
  // Migration v1-Zustand
  const C = await dev('C');
  await C.evaluate(() => {
    const st = window.STARTER.it.islands;
    const s = { words: [], srs: {}, notes: {}, log: {}, islands: st.map((isl, i) => ({ id: 'rand' + i, title: isl.title, sentences: isl.sentences.trim().split('\n').map((l, j) => ({ id: 's:r' + i + '-' + j, t: l.split('|')[0], d: l.split('|')[1] })) })) };
    s.srs['s:r0-0'] = { iv: 3, ef: 2.5, reps: 2, lapses: 0, due: 1 };
    localStorage.setItem('sl.data.it', JSON.stringify(s));
  });
  await C.reload(); await C.goto(URL + '#home'); await C.waitForTimeout(200);
  const cData = await C.evaluate(() => { const s = JSON.parse(localStorage.getItem('sl.data.it')); return s; });
  console.log('migrated ids:', cData.islands.map(i => i.id).join(','), 'srs:', Object.keys(cData.srs).join(','));
  await C.screenshot({ path: `${S}/home3.png`, fullPage: true });
  console.log('words total it:', await C.evaluate(() => starterWords('it').length), 'en:', await C.evaluate(() => starterWords('en').length));
  console.log('ERRORS:', errs);
  await b.close();
})();
