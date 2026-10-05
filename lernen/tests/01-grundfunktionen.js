// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const S = process.env.S;
  await p.goto('http://localhost:8765/');
  await p.waitForTimeout(500);
  await p.screenshot({ path: S + '/home.png', fullPage: true });
  // Neue Wörter lernen
  await p.goto('http://localhost:8765/#vocab/new');
  await p.fill('#note', 'Ciao – Tschau winkt');
  await p.click('#learned');
  for (let i = 0; i < 4; i++) await p.click('#learned');
  await p.click('#known');
  await p.screenshot({ path: S + '/vocab-new.png', fullPage: true });
  // Abfrage
  await p.goto('http://localhost:8765/#vocab/recall');
  await p.waitForTimeout(200);
  console.log('recall header:', await p.textContent('.seg'));
  await p.click('#hint'); 
  await p.click('#reveal');
  await p.screenshot({ path: S + '/vocab-recall.png', fullPage: true });
  await p.click('.rate .good');
  await p.click('#reveal'); await p.click('.rate .again');
  console.log('remaining:', await p.textContent('#pane .row'));
  // Sätze
  await p.goto('http://localhost:8765/#review');
  await p.fill('#typed', 'Mi chiamo Marco');
  await p.press('#typed', 'Enter');
  await p.screenshot({ path: S + '/review.png', fullPage: true });
  await p.click('.rate .good');
  // Hören
  await p.goto('http://localhost:8765/#listen');
  await p.click('[data-add="5"]');
  await p.screenshot({ path: S + '/listen.png', fullPage: true });
  // Shadow
  await p.goto('http://localhost:8765/#shadow');
  await p.click('#s-next');
  await p.screenshot({ path: S + '/shadow.png', fullPage: true });
  // Inseln
  await p.goto('http://localhost:8765/#islands');
  await p.fill('#i-title', 'Arbeit');
  await p.click('#i-add');
  await p.waitForTimeout(200);
  await p.fill('#s-d', 'Ich arbeite als Ingenieur.');
  await p.fill('#s-t', 'Lavoro come ingegnere.');
  await p.click('#s-add');
  await p.click('details summary');
  await p.fill('#s-bulk', 'Ho molto lavoro.|Ich habe viel Arbeit.\nLavoro da casa; Ich arbeite von zu Hause.');
  await p.click('#s-import');
  await p.screenshot({ path: S + '/island.png', fullPage: true });
  // Eigene Wörter
  await p.goto('http://localhost:8765/#vocab/own');
  await p.fill('#w-bulk', 'la forchetta | die Gabel\nil coltello\tdas Messer\nciao|hallo');
  await p.click('#w-import');
  console.log('own words:', await p.$$eval('#w-list li', l => l.length));
  // Sprache wechseln
  await p.click('[data-lang="en"]');
  await p.goto('http://localhost:8765/#home');
  await p.screenshot({ path: S + '/home-en.png', fullPage: true });
  await p.goto('http://localhost:8765/#settings');
  await p.screenshot({ path: S + '/settings.png', fullPage: true });
  await p.click('[data-lang="it"]');
  await p.goto('http://localhost:8765/#home');
  await p.waitForTimeout(300);
  console.log('home it:', (await p.textContent('.stats')).replace(/\s+/g, ' '));
  await p.screenshot({ path: S + '/home2.png', fullPage: true });
  const data = await p.evaluate(() => JSON.parse(localStorage.getItem('sl.data.it')));
  console.log('log:', JSON.stringify(data.log), 'srs:', Object.keys(data.srs).length);
  console.log('ERRORS:', errs);
  await b.close();
})();
