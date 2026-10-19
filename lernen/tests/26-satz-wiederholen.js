// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
// Einzelnen Satz direkt beim Text 1×/3×/5×/∞ wiederholen, ohne ihn in die Lernsätze zu übernehmen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__spoken = [];
    speechSynthesis.speak = u => { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); };
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL + '#texts'); await p.reload();
  await p.fill('#tx-title', 'Wiederholen');
  await p.fill('#tx-body', 'Oggi fa bello. Andiamo al mare.');
  await p.click('#tx-save');
  await p.waitForSelector('#tx-rep');
  console.log('Auswahl:', await p.$$eval('#tx-rep option', x => x.map(o => o.textContent).join(' | ')), '| Standard:', await p.$eval('#tx-rep', s => s.value));
  await p.click('[data-tp="1"]');
  await p.waitForTimeout(200);
  console.log('läuft – markiert:', await p.$eval('#tx-list li[data-i="1"]', li => li.classList.contains('now')), '| Knopf:', await p.textContent('[data-tp="1"]'));
  await p.waitForFunction(() => document.querySelector('[data-tp="1"]').textContent === '🔊', null, { timeout: 15000 });
  console.log('3× gesprochen:', JSON.stringify(await p.evaluate(() => window.__spoken)));
  // ∞: läuft weiter, bis man nochmal tippt
  await p.selectOption('#tx-rep', '0');
  console.log('gespeichert:', await p.evaluate(() => settings.sentRep));
  await p.evaluate(() => { window.__spoken = []; });
  await p.click('[data-tp="0"]');
  await p.waitForTimeout(7500);
  const n = await p.evaluate(() => window.__spoken.length);
  await p.click('[data-tp="0"]');
  await p.waitForTimeout(3000);
  console.log('∞ mehr als 3:', n > 3, '| nach Stopp still:', (await p.evaluate(() => window.__spoken.length)) === n, '| Markierung weg:', !(await p.$('#tx-list li.now')));
  // Wechsel: Satz läuft, dann „Alles vorlesen“ übernimmt
  await p.selectOption('#tx-rep', '5');
  await p.click('[data-tp="0"]'); await p.waitForTimeout(100);
  await p.click('#tx-play'); await p.waitForTimeout(100);
  console.log('Alles vorlesen übernimmt:', await p.textContent('#tx-play'), '| Satz-Knopf zurück:', await p.textContent('[data-tp="0"]'));
  await p.click('#tx-play');
  console.log('nicht in Lernsätzen:', await p.evaluate(() => !state.islands.some(i => i.sentences.some(s => s.t === 'Andiamo al mare.'))));
  console.log('errors:', errs.length ? errs : 'keine');
  await b.close();
})();
