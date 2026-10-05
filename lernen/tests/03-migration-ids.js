// Browser-Test (Playwright). Start: lernen/tests/run-all.sh – Server auf Port 8765 muss laufen.
process.env.S = process.env.S || require('os').tmpdir();
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/');
  const r = await p.evaluate(() => {
    const st = window.STARTER.it.islands;
    const s = { words: [], srs: {}, notes: {}, log: {}, islands: st.map((isl, i) => ({ id: 'rand' + i, title: isl.title, sentences: isl.sentences.trim().split('\n').map((l, j) => ({ id: 's:r' + i + '-' + j, t: l.split('|')[0], d: l.split('|')[1] })) })) };
    s.srs['s:r0-0'] = { iv: 3, ef: 2.5, reps: 2, lapses: 0, due: 1 };
    localStorage.setItem('sl.data.test', JSON.stringify(s));
    window.STARTER.test = window.STARTER.it;
    const m = loadState('test');
    return { ids: m.islands.map(i => i.id), firstSentence: m.islands[0].sentences[0].id, srs: Object.keys(m.srs) };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
