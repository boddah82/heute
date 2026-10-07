// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Hör-Dialoge: Claude-Antwort nachgebaut, Stimmen/Tonhöhe pro Sprecher.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let req = null;
  await ctx.route('https://api.anthropic.com/**', async route => {
    const r = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    req = JSON.parse(r.postData());
    const data = {
      title: 'Al bar', speakers: [{ name: 'Giulia', gender: 'f' }, { name: 'Marco', gender: 'm' }],
      lines: [
        { sp: -1, t: 'È mattina.', de: 'Es ist Morgen.', words: [], note: '' },
        { sp: 0, t: 'Ciao Marco!', de: 'Hallo Marco!', words: [{ t: 'Ciao', de: 'hallo' }, { t: 'Marco!', de: 'Marco' }], note: '' },
        { sp: 1, t: 'Ciao! Un caffè?', de: 'Hallo! Einen Kaffee?', words: [], note: '' },
        { sp: 7, t: 'Volentieri.', de: 'Gern.', words: [], note: '' },
      ],
    };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: req.model, content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage: { input_tokens: 800, output_tokens: 1500 } }) });
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__spoken = [];
    speechSynthesis.speak = u => { window.__spoken.push({ t: u.text, pitch: u.pitch, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend(), 10); };
  });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.goto(URL + '#listen/stories'); await p.waitForTimeout(200);
  console.log('ohne Schlüssel:', (await p.textContent('#view .card')).includes('Claude-Schlüssel'));
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.reload(); await p.waitForTimeout(200);
  await p.screenshot({ path: process.env.S + '/stories.png', fullPage: true });
  await p.click('.chips[data-name="st-sit"] .chip[data-i="2"]');
  await p.selectOption('#st-sp', '3');
  await p.check('#st-nar');
  await p.click('#st-go');
  await p.waitForURL(/#texts\/tx/);
  await p.waitForTimeout(200);
  const sys = req.system;
  console.log('Prompt: Restaurant', /restaurant/.test(sys), '| 3 Personen', /exactly 3/.test(sys), '| Erzähler', /narrator lines/.test(sys), '| Niveau', /Learner level: A0/.test(sys));
  const st = await p.evaluate(() => { const tx = state.texts[state.texts.length - 1]; return { sp: tx.lines.map(l => l.sp), story: tx.story }; });
  console.log('Sprecher-Indizes (ungültige → Erzähler):', JSON.stringify(st.sp), '| Situation:', st.story.situation);
  console.log('Namen sichtbar:', (await p.$$eval('#tx-list li .muted.small', x => x.map(e => e.textContent))).join(','));
  console.log('übersetzt ohne Extra-Aufruf:', !(await p.$('#tx-tr')), '| kein Neu-Ordnen:', !(await p.$('#tx-reseg')));
  await p.check('#tx-hide');
  console.log('Text verborgen:', await p.$eval('#tx-list', e => e.classList.contains('tx-hidden')));
  await p.click('#tx-play'); await p.waitForTimeout(3500);
  const spoken = await p.evaluate(() => window.__spoken);
  console.log('Wiedergabe:', JSON.stringify(spoken.map(x => [x.t, x.pitch])));
  await p.goto(URL + '#listen/stories'); await p.waitForTimeout(200);
  console.log('Liste:', (await p.textContent('.card.step')).replace(/\s+/g, ' ').trim());
  await p.goto(URL + '#texts'); await p.waitForTimeout(200);
  console.log('auch unter Texte:', (await p.textContent('.card.step')).includes('🎭'));
  // Stimmen zuordnen: nachgebaute Gerätestimmen (Browser im Test hat keine)
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push(e.message));
  await p2.addInitScript(() => {
    window.__spoken = [];
    const fake = [{ name: 'Alice', lang: 'it-IT' }, { name: 'Luca', lang: 'it-IT' }, { name: 'Paola', lang: 'it-IT' }];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    speechSynthesis.getVoices = () => fake;
    speechSynthesis.speak = u => { window.__spoken.push({ t: u.text, pitch: u.pitch, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend(), 10); };
  });
  await p2.goto(URL + '#listen/stories'); await p2.waitForTimeout(200);
  console.log('Stimmen-Liste offen:', await p2.$eval('#st-voices', e => e.open), '| Einträge:', await p2.$$eval('#st-voices li', x => x.length));
  await p2.click('[data-vt="1"]');
  console.log('Probe mit Luca:', await p2.evaluate(() => window.__spoken.slice(-1)[0].voice));
  await p2.click('[data-vg="0"][data-g="f"]'); await p2.click('[data-vg="1"][data-g="m"]');
  console.log('gespeichert:', JSON.stringify(await p2.evaluate(() => settings.voiceGender)));
  const id = await p2.evaluate(() => state.texts[state.texts.length - 1].id);
  await p2.goto(URL + '#texts/' + id); await p2.waitForTimeout(200);
  await p2.click('#tx-play'); await p2.waitForTimeout(3000);
  console.log('Wiedergabe mit Zuordnung:', JSON.stringify((await p2.evaluate(() => window.__spoken)).filter(x => x.t !== 'Ciao, come stai? Io sto bene.').map(x => [x.t, x.voice, x.pitch])));
  // Endlosschleife
  await p2.evaluate(() => { window.__spoken = []; });
  await p2.check('#tx-loop');
  await p2.click('#tx-play'); await p2.waitForTimeout(6500);
  const n = await p2.evaluate(() => window.__spoken.filter(x => x.t === 'Ciao Marco!').length);
  await p2.click('#tx-play');
  console.log('Schleife: Zeile mehrfach gespielt:', n >= 2, '| gestoppt:', await p2.textContent('#tx-play'));
  console.log('ERRORS:', errs);
  await b.close();
})();
