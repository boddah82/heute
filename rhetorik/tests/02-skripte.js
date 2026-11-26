// Browser-Test (Playwright): Skripte aus dem Sheet üben. Apps Script und Claude werden nachgebaut (keine Kosten).
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8766/rhetorik/';
const SHEET = 'https://script.google.com/macros/s/TEST/exec';
const ok = (c, m) => console.log((c ? 'OK  ' : 'FEHLER ') + m);
const SKRIPTE = [
  { code: 'S001', datum: '24.09.2026', titel: 'Der biomechanische Denkfehler', thema: 'Biomechanik', hook: 'Dein Körper ist kein Auto.', sprechtext: 'Dein Körper ist kein Auto.\n\n[BILD: Auto] Viele mit schlechter Haltung haben keine Schmerzen.\n\nSchreib es mir in die Kommentare.', status: 'veröffentlicht', format: '' },
  { code: 'S050', datum: '25.11.2026', titel: 'Hexenschuss: raus aus dem Bett', thema: 'Hexenschuss', hook: 'Das Bett ist die schlechteste Antwort.', sprechtext: 'Das Bett ist die schlechteste Antwort.\n\nBleib in Bewegung, so gut es geht.\n\nSpeicher dir das Video.', status: 'bereit zum Aufnehmen', format: '' },
];
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone', 'clipboard-read', 'clipboard-write'] });
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
  });
  let sheetCalls = 0, lastKey = '';
  await ctx.route(SHEET + '**', route => {
    sheetCalls++;
    lastKey = new globalThis.URL(route.request().url()).searchParams.get('key');
    const body = lastKey === 'geheim' ? { ok: true, skripte: SKRIPTE } : { ok: false, error: 'Schlüssel falsch oder fehlt' };
    route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  });
  const sent = [];
  await ctx.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(req.postData());
    sent.push(body);
    const sys = typeof body.system === 'string' ? body.system : JSON.stringify(body.system);
    const out = sys.includes('bereitest')
      ? { kern: 'Bewegung statt Bett beim Hexenschuss.', stichpunkte: ['Bett schlechteste Antwort', 'In Bewegung bleiben', 'Video speichern'], geruest: ['Hook: Bett ist falsch', 'Schritt: bewegen', 'Schluss: speichern'] }
      : { punkte: [{ punkt: 'Bett schlechteste Antwort', da: 'ja' }, { punkt: 'In Bewegung bleiben', da: 'teils' }, { punkt: 'Video speichern', da: 'nein' }], reihenfolge: '', genau: 'Du sagst „nie liegen“ – im Skript steht „so gut es geht“.', stark: 'Klarer Einstieg.', eigene: [{ zitat: 'Das Bett macht es meistens schlimmer', warum: 'klingt natürlich' }], besser: [], fokus: 'Sag am Ende, dass man das Video speichern soll.', vergleich: '' };
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: JSON.stringify(out) }], stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 300 } }) });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })));
  await p.reload();

  // Ohne Verbindung: Hinweis auf Startseite und im Skripte-Tab
  ok((await p.textContent('.sk-home')).includes('verbinden'), 'Startseite: Hinweis zum Verbinden');
  ok(await p.locator('.plan-step').count() === 3, 'Tagesplan bleibt (3 Runden)');
  await p.click('.tabs a[data-tab="skripte"]');
  ok(await p.locator('#view a[href="#settings"]').count() === 1, 'Skripte-Tab: Link zum Einrichten');

  // Einstellungen: Code kopieren, falscher Schlüssel, richtiger Schlüssel
  await p.goto(URL + '#settings');
  await p.click('#sk-set summary');
  await p.click('#sk-copy');
  await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok(clip.includes('function doGet') && clip.includes('schluesselErzeugen'), 'Apps-Script-Code kopiert');
  await p.fill('#sk-url', SHEET);
  await p.fill('#sk-key', 'falsch');
  await p.click('#sk-save');
  ok(await p.waitForFunction(() => [...document.querySelectorAll('.toast')].some(t => t.textContent.includes('Schlüssel falsch')), null, { timeout: 3000 }).then(() => true, () => false), 'falscher Schlüssel wird gemeldet');
  await p.fill('#sk-key', 'geheim');
  await p.click('#sk-save');
  await p.waitForFunction(() => document.body.textContent.includes('2 Skripte geladen'));
  ok(lastKey === 'geheim', 'Schlüssel wird mitgeschickt');

  // Liste: Unveröffentlichtes zuerst
  await p.goto(URL + '#skripte');
  const first = await p.locator('.list li .t').first().textContent();
  ok(first.includes('Hexenschuss'), 'Liste: noch nicht Veröffentlichtes oben');
  ok((await p.textContent('.list li .pill')).includes('bereit'), 'Status angezeigt');

  // Startseite: Karte „Als Nächstes aufnehmen“
  await p.goto(URL + '#home');
  ok((await p.textContent('.sk-home')).includes('Hexenschuss'), 'Startseite zeigt nächstes Skript');

  // Stufe 1: ganzer Text, Regieanweisung abgesetzt, keine Claude-Rückmeldung
  await p.goto(URL + '#skript/S001');
  ok((await p.textContent('.sk-text')).includes('kein Auto'), 'Stufe 1: ganzer Text sichtbar');
  ok(await p.locator('.sk-text .regie').count() === 1, 'Regieanweisung abgesetzt');
  await p.evaluate(() => { window.__chunks = ['Dein Körper ist kein Auto.']; });
  await p.click('#go');
  await p.waitForSelector('#done'); await p.waitForTimeout(300); await p.click('#done');
  await p.waitForSelector('#ana');
  ok(await p.locator('#ask').count() === 0, 'Stufe 1: keine Claude-Rückmeldung');
  ok(await p.locator('#next').count() === 1, 'Weiter zu Stufe 2 angeboten');

  // Stufe 2: Stichpunkte von Claude (einmal), Übung, Rückmeldung
  await p.goto(URL + '#skript/S050');
  await p.click('#stufen .chip[data-st="2"]');
  await p.waitForSelector('.tool ol li');
  ok((await p.textContent('.tool')).includes('In Bewegung bleiben'), 'Stufe 2: Stichpunkte von Claude');
  ok(sent.length === 1 && sent[0].messages[0].content.includes('so gut es geht'), 'Skript an Claude zur Vorbereitung');
  await p.click('#stufen .chip[data-st="3"]');
  await p.waitForSelector('.tool ol li');
  ok((await p.textContent('.tool')).includes('Hook: Bett ist falsch') && sent.length === 1, 'Stufe 3: Gerüst ohne neuen Abruf');
  await p.click('#stufen .chip[data-st="4"]');
  ok((await p.textContent('.tool')).includes('Bewegung statt Bett'), 'Stufe 4: nur Kernaussage');
  await p.click('#stufen .chip[data-st="2"]');
  await p.evaluate(() => { window.__chunks = ['Das Bett macht es meistens schlimmer.', 'Du darfst nie liegen.']; });
  await p.click('#go');
  await p.waitForSelector('#done'); await p.waitForTimeout(500); await p.click('#done');
  await p.waitForSelector('#ana');
  ok((await p.textContent('#ana')).includes('Ziel ~'), 'Zieldauer aus Skriptlänge');
  await p.click('#rate .chip[data-r="4"]');
  ok((await p.textContent('#rate-hint')).includes('Stufe 3'), 'gutes Gefühl → nächste Stufe vorgeschlagen');
  await p.click('#ask');
  await p.waitForSelector('.fb');
  const fbText = await p.textContent('.fb');
  ok(fbText.includes('Ist alles drin') && fbText.includes('Genauigkeit'), 'Rückmeldung: Abdeckung + Genauigkeit');
  ok(sent[1].messages[0].content.includes('Stichpunkte: Bett schlechteste Antwort') && sent[1].messages[0].content.includes('nie liegen'), 'Rückmeldung bekommt Skript, Stichpunkte, Transkript');
  await p.click('[data-keep="0"]');
  await p.screenshot({ path: (process.env.S || '/tmp') + '/rh-skript-fb.png', fullPage: true });

  // Nochmal: Fokus + gemerkte Formulierung sichtbar, Verlauf der Versuche
  await p.click('#again');
  await p.waitForSelector('#go');
  ok((await p.textContent('.notice')).includes('speichern'), 'Fokus für nächsten Versuch');
  ok((await p.textContent('.saved')).includes('meistens schlimmer'), 'gemerkte Formulierung sichtbar');
  ok((await p.textContent('details.card summary')).includes('(1)'), 'frühere Versuche aufgelistet');
  await p.screenshot({ path: (process.env.S || '/tmp') + '/rh-skript-prep.png', fullPage: true });

  // Nach Neuladen bleibt alles (offline aus dem Speicher)
  const before = sheetCalls;
  await p.goto(URL + '#skripte'); await p.reload();
  ok(await p.locator('.list li').count() === 2 && sheetCalls === before, 'Liste aus Speicher, kein unnötiger Abruf');
  ok(errs.length === 0, 'keine JS-Fehler ' + JSON.stringify(errs));
  await b.close();
})();
