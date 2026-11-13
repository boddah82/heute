// Browser-Test (Playwright): klemmender Satz – nach 2× „Nochmal“ erst seine Wörter, beim nächsten Mal in Teile.
// Dazu im Auto-Modus: dieselbe Hilfe per Sprache und „später“.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
const revealIf = async p => { if (await p.isVisible('#reveal')) await p.click('#reveal'); };
const fail = m => { console.log('FEHLER:', m); process.exitCode = 1; };
const SENT = { id: 's:1', t: 'Ieri ho comprato una macchina rossa molto bella.', d: 'Gestern habe ich ein sehr schönes rotes Auto gekauft.' };
const PARTS = { parts: [{ start: 0, de: 'Gestern habe ich gekauft' }, { start: 3, de: 'ein rotes Auto' }, { start: 6, de: 'sehr schön' }] };

async function setup(b, speech) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let calls = 0;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    calls++;
    const body = JSON.parse(req.postData());
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(PARTS) }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 100 } }) });
  });
  if (speech) await ctx.addInitScript(script => {
    window.__said = [];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'it', lang: 'it-IT' }, { name: 'de', lang: 'de-DE' }], cancel() {},
      speak(u) { __said.push(u.lang + ': ' + u.text); setTimeout(() => u.onend && u.onend(), 10); } } });
    window.__script = script;
    window.SpeechRecognition = window.webkitSpeechRecognition = function () {
      const r = this;
      r.start = () => setTimeout(() => {
        const q = __script[r.lang] || [];
        const v = q.length ? q.shift() : '';
        if (v) r.onresult && r.onresult({ results: [[{ transcript: v }]] });
        setTimeout(() => r.onend && r.onend(), 200);
      }, 20);
      r.stop = r.abort = () => {};
    };
  }, speech);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(sent => {
    localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' }));
    state.words = [{ id: 'u:m', t: 'macchina', d: 'Auto', ts: 1 }, { id: 'u:r', t: 'rossa', d: 'rot', ts: 1 }];
    state.islands = [{ id: 'i1', title: 'Test', ts: Date.now(), sentences: [Object.assign({ ts: Date.now() }, sent)] }];
    state.srs = { 's:1': { iv: 3, ef: 2.5, reps: 2, lapses: 1, due: today(), ts: Date.now() } }; // einmal schon vergessen
    persist();
  }, SENT);
  await p.reload();
  return { p, errs, ctx, calls: () => calls };
}

(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

  // 1) Normale Satz-Abfrage: 2. „Nochmal“ → Wörter vorher; kein automatisches Teilen
  {
    const { p, errs, calls } = await setup(b);
    await p.goto(URL + '#review');
    await p.waitForSelector('.flash .native');
    const front = async () => (await p.textContent('.flash .native')).trim();
    if (await front() !== SENT.d) fail('Erste Karte ist nicht der Satz: ' + await front());
    await revealIf(p);
    await p.click('.rate .btn.again');
    await p.waitForTimeout(300);
    const helpDe = await p.evaluate(() => helpWords(findSentence('s:1')).map(id => splitMeaning(wordById(id).d, id).de));
    const f1 = await front();
    console.log('nach 2× Nochmal:', f1, '| Hilfswörter:', JSON.stringify(helpDe));
    if (!helpDe.includes(f1)) fail('Nach 2× Nochmal kommt kein Wort aus dem Satz');
    if (!helpDe.some(x => /Auto/.test(x)) || !helpDe.includes('rot')) fail('Wörter fehlen in der Hilfe');
    if (new Set(helpDe.map(x => x.replace(/^(der|die|das) /, ''))).size !== helpDe.length) fail('Wort doppelt in der Hilfe');
    const c1 = await p.evaluate(() => state.srs['s:1']);
    if (c1.helpL !== 2) fail('Hilfe-Stand falsch: ' + JSON.stringify(c1));
    // Wort bewerten → als normale Wortkarte geplant
    await revealIf(p);
    await p.click('.rate .btn.easy');
    const w = await p.evaluate(() => Object.keys(state.srs).filter(isWordId));
    if (!w.length) fail('Eingeschobenes Wort nicht gespeichert');
    // Wieder zweimal vergessen → erneut Wörter (sofern noch unsicher), nie ein Claude-Aufruf (kein automatisches Teilen)
    const again = await p.evaluate(() => { state.srs['s:1'].lapses = 4; return sentenceHelp('s:1'); });
    if (again && again.kind !== 'words') fail('Unerwartete Hilfe: ' + JSON.stringify(again));
    const c2 = await p.evaluate(() => state.srs['s:1']);
    if (c2.helpL !== 4) fail('Hilfe-Stand nach 2. Runde falsch: ' + JSON.stringify(c2));
    if (await p.evaluate(() => (findSentence('s:1').parts || []).length)) fail('Satz wurde automatisch geteilt');
    console.log('2. Runde:', JSON.stringify(again), '| Claude-Aufrufe:', calls());
    if (calls()) fail('Claude wurde aufgerufen – Zusatzkosten');
    errs.forEach(fail);
    await p.context().close();
  }

  // 2) Auto-Modus: 2. „Nochmal“ → Ansage + Wörter vorher
  {
    const { p, errs } = await setup(b, { 'it-IT': ['ieri ho comprato'], 'de-DE': ['nochmal'] });
    await p.goto(URL + '#drive');
    await p.click('#dv-start');
    await p.waitForFunction(() => __said.some(x => x.includes('Der Satz klemmt')), null, { timeout: 20000 }).catch(() => {});
    await p.waitForFunction(() => __said.includes('de-DE: Auto') || __said.includes('de-DE: rot'), null, { timeout: 20000 }).catch(() => {});
    const said = await p.evaluate(() => __said);
    const k = said.findIndex(x => x.includes('Der Satz klemmt'));
    console.log('Auto:', said[k], '→', said[k + 1]);
    if (k < 0) fail('Auto-Modus sagt die Hilfe nicht an');
    else if (!/^de-DE: /.test(said[k + 1]) || said[k + 1] === 'de-DE: ' + SENT.d) fail('Danach kommt kein Wort: ' + said[k + 1]);
    await p.click('#dv-end');
    errs.forEach(fail);
    await p.context().close();
  }

  // 3) Auto-Modus: „später“ stellt 3 Tage zurück
  {
    const { p, errs } = await setup(b, { 'it-IT': ['ieri'], 'de-DE': ['später bitte'] });
    await p.goto(URL + '#drive');
    await p.click('#dv-start');
    await p.waitForFunction(() => /Fertig|Beendet/.test((document.querySelector('#dv-phase') || {}).textContent || ''), null, { timeout: 30000 });
    const r = await p.evaluate(() => ({ due: state.srs['s:1'].due - today(), later: findSentence('s:1').later - today(), said: __said.includes('de-DE: Kommt in drei Tagen wieder.'), txt: document.querySelector('#dv-text').textContent }));
    console.log('Später:', JSON.stringify(r));
    if (r.due !== 3 || r.later !== 3 || !r.said) fail('„später“ falsch: ' + JSON.stringify(r));
    errs.forEach(fail);
    await p.context().close();
  }

  await b.close();
  console.log(process.exitCode ? 'Satz-Hilfe: FEHLER' : 'Satz-Hilfe: ok');
})();
