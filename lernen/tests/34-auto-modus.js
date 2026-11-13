// Browser-Test (Playwright): Auto-Modus #drive mit nachgebauter Sprachausgabe/-erkennung.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const fail = m => { console.log('FEHLER:', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  // hear: true = zusätzlich eine fällige „Verstehen“-Karte (r:) für „il cane“
  const seedState = (t, hear) => ({
    words: [{ id: 'u:1', t: 'la mela', d: 'der Apfel', ts: 1 }, { id: 'u:2', t: 'il cane', d: 'der Hund', ts: 1 }],
    islands: [{ id: 'i1', title: 'T', ts: 1, sentences: [{ id: 's:1', t: 'Ho 40 anni.', d: 'Ich bin vierzig.', ts: 1 }] }],
    // Abstand < 3 Tage, sonst kämen sie zusätzlich als neue „Verstehen“-Karten dazu
    srs: Object.assign({ 'u:1': { iv: 2, ef: 2.5, reps: 2, lapses: 0, due: t - 2 }, 's:1': { iv: 2, ef: 2.5, reps: 2, lapses: 0, due: t - 1 }, 'u:2': { iv: 2, ef: 2.5, reps: 2, lapses: 0, due: t + 3 } },
      hear ? { 'r:u:2': { iv: 4, ef: 2.5, reps: 2, lapses: 0, due: t - 1 } } : {}),
    log: {},
  });
  const page = async (script, hear) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(({ script, seed, hear }) => {
      window.__said = [];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [{ name: 'it', lang: 'it-IT' }, { name: 'de', lang: 'de-DE' }], cancel() {},
        speak(u) { __said.push(u.lang + ': ' + u.text); setTimeout(() => u.onend && u.onend(), 10); } } });
      window.__script = script;
      window.SpeechRecognition = window.webkitSpeechRecognition = function () {
        const r = this;
        r.start = () => setTimeout(() => {
          // „rate“: eigene Liste für die Bewertungs-Phase, unabhängig von den Wartezeiten
          const rating = __script.rate && (document.querySelector('#dv-phase') || {}).textContent === 'Richtig oder falsch?';
          const q = (rating ? __script.rate : __script[r.lang]) || [];
          const v = q.length ? q.shift() : ''; // '' = Stille
          if (v) r.onresult && r.onresult({ results: [[{ transcript: v }]] });
          setTimeout(() => r.onend && r.onend(), 200);
        }, 20);
        r.stop = r.abort = () => {};
      };
      const t = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
      if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('sl.data.it', JSON.stringify(eval('(' + seed + ')')(t, hear))); }
    }, { script, seed: seedState.toString(), hear: !!hear });
    await p.goto('http://localhost:8765/#home');
    await p.waitForTimeout(300);
    return { p, errs };
  };
  const finish = p => p.waitForFunction(() => /Fertig|Beendet/.test((document.querySelector('#dv-phase') || {}).textContent || ''), null, { timeout: 90000 });
  const srs = p => p.evaluate(() => JSON.parse(localStorage.getItem('sl.data.it')).srs);

  // 1) Wort gewusst, Satz vergessen → kommt nach Lernschritt wieder, dann gewusst
  {
    const { p, errs } = await page({ 'it-IT': ['la mela', 'ho quaranta anni', 'ho quaranta anni'], 'de-DE': ['gewusst', 'nicht gewusst', 'ja'] });
    const card = await p.textContent('a[href="#drive"] .meta');
    if (!/2 Karten/.test(card)) fail('Startseite: ' + card);
    await p.goto('http://localhost:8765/#drive');
    await p.click('#dv-start');
    await finish(p);
    const said = await p.evaluate(() => __said);
    const s = await srs(p);
    console.log('Ende:', await p.textContent('#dv-phase'), '|', await p.textContent('#dv-text'));
    if (!said.includes('de-DE: der Apfel') || !said.includes('it-IT: la mela')) fail('Wort nicht vorgelesen');
    if (!said.includes('it-IT: Ho quaranta anni.')) fail('Zahl nicht ausgeschrieben: ' + said.join(' / '));
    if (said.filter(x => x === 'de-DE: Ich bin vierzig.').length !== 2) fail('Vergessener Satz nicht wiederholt');
    if (!(s['u:1'].iv >= 3)) fail('Wort nicht hochgestuft: ' + JSON.stringify(s['u:1']));
    if (s['s:1'].lapses !== 1 || s['s:1'].iv < 1) fail('Satz falsch geplant: ' + JSON.stringify(s['s:1']));
    if (s['u:2'].due === undefined || s['u:2'].reps !== 2) fail('Nicht fällige Karte verändert');
    errs.forEach(fail);
    await p.close();
  }
  // 2) Stille → ohne Bewertung weiter, bleibt fällig
  {
    const { p, errs } = await page({ 'it-IT': [], 'de-DE': [] });
    await p.goto('http://localhost:8765/#drive');
    const before = await srs(p);
    await p.click('#dv-start');
    await finish(p);
    const after = await srs(p);
    if (JSON.stringify(before['u:1']) !== JSON.stringify(after['u:1'])) fail('Ohne Bewertung trotzdem geplant');
    console.log('Stille:', await p.textContent('#dv-text'));
    errs.forEach(fail);
    await p.close();
  }
  // 3) „Stopp“ während der Antwort, auch wenn danach Geräusch erkannt wird
  {
    const { p, errs } = await page({ 'it-IT': ['Stopp.', 'radio', 'radio'], 'de-DE': [] });
    await p.goto('http://localhost:8765/#drive');
    await p.click('#dv-start');
    await finish(p);
    const ph = await p.textContent('#dv-phase');
    if (ph !== 'Beendet') fail('Stopp nicht erkannt: ' + ph);
    console.log('Stopp:', ph);
    errs.forEach(fail);
    await p.close();
  }
  // 4) „Verstehen“-Karte: Zielsprache vorlesen → deutsche Antwort (auch „Pause“ ist kein Befehl) → Deutsch vorlesen
  {
    const { p, errs } = await page({ 'it-IT': ['la mela', 'ho quaranta anni'], 'de-DE': ['Pause'], rate: ['gewusst', 'gewusst', 'gewusst'] }, true);
    await p.goto('http://localhost:8765/#drive');
    const head = await p.textContent('#dv-stats');
    if (!/1 Wörter · 1 Sätze · 1 verstehen/.test(head)) fail('Zählung: ' + head);
    await p.click('#dv-start');
    await finish(p);
    const said = await p.evaluate(() => __said);
    const ph = await p.textContent('#dv-phase');
    if (process.env.DEBUG) console.log(said.join('\n'));
    const iq = said.indexOf('it-IT: il cane'), ia = said.indexOf('de-DE: der Hund');
    if (iq < 0 || ia < iq) fail('Verstehen-Reihenfolge falsch: ' + said.join(' / '));
    if (ph !== 'Fertig') fail('„Pause“ als Antwort hat angehalten: ' + ph);
    const s = await srs(p);
    if (!(s['r:u:2'].iv > 4)) fail('Verstehen-Karte nicht geplant: ' + JSON.stringify(s['r:u:2']));
    console.log('Verstehen:', ph, '|', await p.textContent('#dv-text'));
    errs.forEach(fail);
    await p.close();
  }
  // 5) „richtig“/„falsch“, ähnlich Klingendes („wichtig“), nicht Verstandenes kommt am Ende nochmal – ohne gesprochene Nachfrage
  {
    const { p, errs } = await page({ 'it-IT': ['la mela', 'ho quaranta anni', 'la mela', 'ho quaranta anni'], rate: ['quatsch', 'falsch', 'wichtig', 'richtig'] });
    await p.goto('http://localhost:8765/#drive');
    await p.click('#dv-start');
    await finish(p);
    const said = await p.evaluate(() => __said);
    const s = await srs(p);
    const end = await p.textContent('#dv-text');
    if (said.some(x => /Gewusst oder nochmal|Ohne Bewertung|: Gut\.|Kommt nochmal/.test(x))) fail('Noch gesprochene Rückmeldung: ' + said.join(' / '));
    if (said.filter(x => x === 'de-DE: der Apfel').length !== 2) fail('Nicht verstandene Karte kam nicht nochmal');
    if (!(s['u:1'].iv >= 3)) fail('„wichtig“ nicht als richtig gewertet: ' + JSON.stringify(s['u:1']));
    if (s['s:1'].lapses !== 1) fail('„falsch“ nicht gewertet: ' + JSON.stringify(s['s:1']));
    if (/ohne Bewertung/.test(end)) fail('Unerwartet ohne Bewertung: ' + end);
    console.log('Richtig/falsch:', end);
    errs.forEach(fail);
    await p.close();
  }
  await b.close();
  console.log(process.exitCode ? 'Auto-Modus: FEHLER' : 'Auto-Modus: ok');
})();
