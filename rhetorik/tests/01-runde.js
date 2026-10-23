// Browser-Test (Playwright). Start: rhetorik/tests/run-all.sh – Server auf Port 8766 (Repo-Wurzel) muss laufen.
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8766/rhetorik/';
const ok = (c, m) => console.log((c ? 'OK  ' : 'FEHLER ') + m);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  await ctx.addInitScript(() => {
    window.__chunks = [];
    class FakeSR {
      start() {
        const chunk = window.__chunks.shift();
        setTimeout(() => {
          if (chunk) this.onresult && this.onresult({ results: [Object.assign([{ transcript: chunk }], { isFinal: true })] });
          setTimeout(() => this.onend && this.onend(), 50);
        }, 80);
      }
      stop() { setTimeout(() => this.onend && this.onend(), 20); }
    }
    window.SpeechRecognition = FakeSR;
    // Sprachausgabe sofort „fertig“
    if (window.speechSynthesis) speechSynthesis.speak = u => setTimeout(() => u.onend && u.onend(), 30);
  });
  const sent = [];
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData());
    sent.push(body);
    const fb = { kern: 'Er übertreibt nicht absichtlich.', schritte: [{ name: 'Spiegeln', da: 'ja', zitat: 'du meinst' }, { name: 'Anerkennen', da: 'nein', zitat: '' }, { name: 'Deine Sicht', da: 'teils', zitat: 'immer falsch' }, { name: 'Angebot', da: 'nein', zitat: '' }], sprung: '', stark: 'Du spiegelst zuerst.', besser: [{ du: 'das ist immer falsch', besser: 'das sehe ich anders', warum: 'weniger angreifbar' }], fokus: 'Schlag am Ende einen nächsten Schritt vor.', inhalt: '', vergleich: sent.length > 1 ? 'Diesmal mit Angebot.' : '' };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(fb) }], stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 500 } }) });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.reload();
  ok(await p.locator('.plan-step').count() === 3, 'Heute: 3 Runden geplant');
  const firstCat = await p.locator('.plan-step b').first().textContent();
  ok(/Widerspruch|Frage ohne Antwort|Position/.test(firstCat), 'erste Runde aus dem Schwerpunkt: ' + firstCat);

  // Runde 1: zuerst Muster entdecken
  await p.goto(URL + '#round/w1');
  ok(await p.isVisible('#reveal'), 'neue Lage: erst Muster entdecken');
  ok(!(await p.isVisible('#sol')), 'Auflösung zuerst verdeckt');
  await p.click('#reveal');
  await p.click('#sol a');
  await p.waitForSelector('#go');
  ok((await p.textContent('.tool')).includes('Spiegeln'), 'Stufe 1: Werkzeug sichtbar');
  await p.evaluate(() => { window.__chunks = ['Ich verstehe, du meinst, er übertreibt.', 'Das ist aber immer falsch, sorry.']; });
  await p.click('#go');
  await p.waitForSelector('#ready');
  await p.click('#ready');
  await p.waitForSelector('#done');
  await p.waitForTimeout(700);
  ok((await p.textContent('#live')).includes('sorry'), 'Live-Text über mehrere Erkennungs-Sitzungen');
  await p.click('#done');
  await p.waitForSelector('#ana');
  ok(await p.locator('.said mark.m-abs').count() >= 1, 'absolute Aussage markiert');
  ok(await p.locator('.said mark.m-self').count() === 1, 'Entschuldigung markiert');
  ok(await p.locator('.said mark.m-good').count() >= 1, 'Spiegeln markiert');
  await p.waitForTimeout(500);
  ok(await p.locator('#audio audio').count() === 1, 'Aufnahme abspielbar');
  await p.click('#rate .chip[data-r="3"]');
  await p.click('#ask');
  await p.waitForSelector('.fb');
  ok((await p.textContent('.fb')).includes('Fokus'), 'Claude-Rückmeldung angezeigt');
  ok(sent[0].messages[0].content.includes('immer falsch'), 'Transkript an Claude geschickt');
  ok(sent[0].output_config.format.type === 'json_schema', 'JSON-Schema gesetzt');

  // Versuch 2 mit Fokus
  await p.click('#again');
  await p.waitForSelector('#go');
  ok((await p.textContent('.notice')).includes('nächsten Schritt'), 'Fokus aus Versuch 1 sichtbar');
  await p.evaluate(() => { window.__chunks = ['Du meinst, er drückt sich. Da gebe ich dir recht, das kommt vor. Mein Vorschlag: wir fragen ihn direkt.']; });
  await p.click('#go');
  await p.waitForSelector('#ready'); await p.click('#ready');
  await p.waitForSelector('#done'); await p.waitForTimeout(400); await p.click('#done');
  await p.waitForSelector('table.cmp');
  ok(await p.locator('table.cmp tr').count() === 3, 'Vergleichstabelle für 2 Versuche');
  await p.click('#rate .chip[data-r="4"]');
  await p.click('#ask'); await p.waitForSelector('.fb');
  ok(sent[1].messages[0].content.includes('Früherer Versuch'), 'zweite Rückmeldung kennt Versuch 1');
  ok((await p.textContent('.fb')).includes('Im Vergleich'), 'Vergleich angezeigt');
  await p.screenshot({ path: (process.env.S || '/tmp') + '/rh-result.png', fullPage: true });

  // Verlauf
  await p.goto(URL + '#history');
  ok(await p.locator('.list li').count() === 1, 'Verlauf: 1 Runde');
  await p.click('.list li a');
  await p.waitForTimeout(400);
  ok(await p.locator('.fb').count() === 2, 'Verlauf-Detail zeigt beide Rückmeldungen');

  // Zweite Runde derselben Lage: kein Muster mehr
  await p.goto(URL + '#round/w2');
  ok(await p.isVisible('#go'), 'Muster nur beim ersten Mal');

  // Eigene Situation
  await p.goto(URL + '#practice');
  await p.fill('#c-say', 'Das haben wir schon immer so gemacht.');
  await p.fill('#c-task', 'Du willst etwas ändern.');
  await p.click('#c-add');
  await p.waitForSelector('#go');
  ok((await p.textContent('.say')).includes('schon immer'), 'eigene Situation als Runde');

  // Stufe hoch anbieten + Vergleich nach 4 Wochen
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('rh.data'));
    const old = Date.now() - 30 * 86400000;
    for (let i = 0; i < 3; i++) s.rounds.push({ id: 'x' + i, ts: Date.now() - i * 1000, task: 'q1', cat: 'wissen', level: 1, tries: [{ text: 'a', sec: 30, rating: 5 }] });
    s.seen.wissen = true; s.rounds.push({ id: 'old', ts: old, task: 'p3', cat: 'position', level: 1, tries: [{ text: 'b', sec: 40, rating: 2 }] });
    localStorage.setItem('rh.data', JSON.stringify(s));
  });
  await p.goto(URL + '#home'); await p.reload();
  ok(await p.locator('[data-up="wissen"]').count() === 1, 'Stufe 2 wird angeboten');
  ok((await p.textContent('#view')).includes('Vergleich'), 'Vergleich nach 4 Wochen vorgeschlagen');
  await p.click('[data-up="wissen"]');
  await p.goto(URL + '#round/q2');
  ok((await p.textContent('.tool')).includes('→') && !(await p.textContent('.tool')).includes('Kurz und ruhig'), 'Stufe 2: Werkzeug nur als Stichworte');
  await p.screenshot({ path: (process.env.S || '/tmp') + '/rh-prep.png', fullPage: true });
  await p.goto(URL + '#home');
  await p.screenshot({ path: (process.env.S || '/tmp') + '/rh-home.png', fullPage: true });
  ok(errs.length === 0, 'keine JS-Fehler ' + JSON.stringify(errs));
  await b.close();
})();
