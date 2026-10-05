// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
const URL = 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  // Simulierte Sprachausgabe: onstart nach 50 ms, Wortgrenzen alle 150 ms, Ende danach
  await ctx.addInitScript(() => {
    window.__spoken = [];
    const synth = {
      speaking: false, cur: null, timers: [],
      getVoices: () => [], cancel() { this.timers.forEach(clearTimeout); this.timers = []; if (this.cur) { const u = this.cur; this.cur = null; u.onerror && u.onerror({}); } },
      speak(u) {
        this.cur = u; window.__spoken.push(u.text);
        const words = [...u.text.matchAll(/\S+/g)];
        this.timers.push(setTimeout(() => u.onstart && u.onstart(), 50));
        words.forEach((m, i) => this.timers.push(setTimeout(() => u.onboundary && u.onboundary({ name: 'word', charIndex: m.index }), 60 + i * 150)));
        this.timers.push(setTimeout(() => { if (this.cur === u) { this.cur = null; u.onend && u.onend(); } }, 80 + words.length * 150));
      },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '#shadow'); await p.waitForTimeout(150);
  console.log('during count-in:', await p.textContent('.cue-label'), '| class:', await p.getAttribute('#s-cue', 'class'));
  await p.waitForTimeout(1300);
  console.log('speaking:', await p.textContent('.cue-label'), '| class:', await p.getAttribute('#s-cue', 'class'), '| highlighted:', await p.$$eval('#s-sent .w.on', x => x.map(e => e.textContent).join(',')));
  await p.screenshot({ path: process.env.S + '/cue-speak.png' });
  await p.waitForTimeout(700);
  console.log('after speech:', await p.textContent('.cue-label'), '| class:', await p.getAttribute('#s-cue', 'class'));
  await p.screenshot({ path: process.env.S + '/cue-you.png' });
  await p.waitForTimeout(2200);
  console.log('reset:', await p.textContent('.cue-label'));
  // 3× und Weiter während des Laufs
  await p.click('#s-loop'); await p.waitForTimeout(300);
  await p.click('#s-next'); await p.waitForTimeout(300);
  console.log('after next:', await p.textContent('.cue-label'), '| sentence:', await p.textContent('#s-sent'));
  await p.waitForTimeout(1500);
  console.log('new sentence speaking:', await p.textContent('.cue-label'), '| spoken:', JSON.stringify(await p.evaluate(() => window.__spoken.slice(-1))));
  console.log('ERRORS:', errs);
  await b.close();
})();
