// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Eltern-Sperre: KI-Gespräche aus, Jugend-Modus fest, Aufheben nur mit PIN.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => { localStorage.setItem('sl.talkcfg', JSON.stringify({ key: 'sk-test' })); });
  await p.goto(URL + '#settings'); await p.reload(); await p.waitForTimeout(200);
  await p.fill('#lk-pin', '1234'); await p.fill('#lk-pin2', '9999'); await p.click('#lk-on');
  console.log('PINs ungleich → nicht gesperrt:', !(await p.evaluate(() => talkLocked())));
  await p.fill('#lk-pin', '1234'); await p.fill('#lk-pin2', '1234'); await p.click('#lk-on'); await p.waitForTimeout(200);
  console.log('gesperrt:', await p.evaluate(() => talkLocked()), '| Jugend-Modus an + fest:', await p.$eval('#p-teen', e => e.checked && e.disabled), '| PIN nicht im Klartext:', !JSON.stringify(await p.evaluate(() => settings.lock)).includes('1234'));
  console.log('Reden-Tab versteckt:', await p.$eval('.tabs a[data-tab="talk"]', e => e.hidden));
  await p.goto(URL + '#talk'); await p.waitForTimeout(200);
  console.log('#talk:', (await p.textContent('#view')).replace(/\s+/g, ' ').trim().slice(0, 60));
  await p.goto(URL + '#talk/setup'); await p.waitForTimeout(200);
  console.log('Schlüssel-Einrichtung erreichbar:', !!(await p.$('#k')));
  await p.goto(URL + '#home'); await p.waitForTimeout(200);
  console.log('Startseite ohne Gespräch-Karte:', !(await p.$('a.card.step[href="#talk"]')), '| Plan ohne Gespräch:', !(await p.textContent('#view')).includes('Gespräch führen'));
  await p.goto(URL + '#listen/stories'); await p.waitForTimeout(200);
  console.log('Hör-Dialoge weiter da:', !!(await p.$('#st-go')));
  await p.reload(); await p.waitForTimeout(200);
  console.log('nach Neuladen noch gesperrt:', await p.evaluate(() => talkLocked()));
  await p.screenshot({ path: process.env.S + '/locked.png' });
  await p.goto(URL + '#settings'); await p.waitForTimeout(200);
  await p.fill('#lk-pin', '0000'); await p.click('#lk-off'); await p.waitForTimeout(200);
  console.log('falsche PIN → bleibt gesperrt:', await p.evaluate(() => talkLocked()));
  await p.fill('#lk-pin', '1234'); await p.click('#lk-off'); await p.waitForTimeout(200);
  console.log('richtige PIN → frei:', !(await p.evaluate(() => talkLocked())), '| Tab wieder da:', !(await p.$eval('.tabs a[data-tab="talk"]', e => e.hidden)), '| Jugend-Modus änderbar:', !(await p.$eval('#p-teen', e => e.disabled)));
  console.log('ERRORS:', errs);
  await b.close();
})();
