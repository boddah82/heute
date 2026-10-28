'use strict';

// ---------- Grundlagen ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const CATS = window.RH.cats;
const DENK = [45, 20, 5]; // Denkzeit in Sekunden je Stufe (Stufe 3: Gegenüber nur hören, kein Spickzettel)
const COMPARE_DAYS = 28;

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { toast('Speichern fehlgeschlagen'); }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function day(ts = Date.now()) {
  const d = new Date(ts);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
function fmtDate(ts) { return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }); }
function fmtSec(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}
function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

const settings = Object.assign({ model: 'claude-opus-5-5', record: true, rate: 1 }, load('rh.settings', {}));
function saveSettings() { save('rh.settings', settings); }
let state = Object.assign({ rounds: [], seen: {}, level: {}, custom: [], plan: null }, load('rh.data', {}));
function persist() { save('rh.data', state); }
// API-Schlüssel teilt sich die App mit der Sprach-App (gleiche Adresse → gleicher Speicher)
const talkCfg = Object.assign({ key: '' }, load('sl.talkcfg', {}));
function saveTalkCfg() { save('sl.talkcfg', talkCfg); }

function allTasks() { return window.RH.tasks.concat(state.custom); }
function taskById(id) { return allTasks().find(t => t.id === id); }
function levelOf(cat) { return state.level[cat] || 1; }
function roundsOf(cat) { return state.rounds.filter(r => r.cat === cat); }
function lastRating(r) { const t = r.tries[r.tries.length - 1]; return t && t.rating; }

// ---------- Sprachausgabe ----------
let voices = [];
function loadVoices() { if (window.speechSynthesis) voices = speechSynthesis.getVoices(); }
loadVoices();
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = loadVoices;
function speakP(text) {
  return new Promise(res => {
    if (!window.speechSynthesis || !text) { res(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    const v = voices.find(x => x.lang && x.lang.toLowerCase().startsWith('de'));
    if (v) u.voice = v;
    u.rate = settings.rate || 1;
    let done = false;
    const end = () => { if (!done) { done = true; res(); } };
    u.onend = end; u.onerror = end;
    setTimeout(end, 2000 + text.length * 120); // falls onend nie kommt
    speechSynthesis.speak(u);
  });
}

// ---------- Spracherkennung (wie in der Sprach-App: Pausen erlaubt, Ende erst mit „Fertig“) ----------
const DICTATION_MAX_MS = 300000;
function dictation(onUpdate) {
  let done = [], parts = [];
  let stopped = false, cancelled = false, rec = null, resolveFn, rejectFn;
  const promise = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
  const text = (interim = '') => done.concat(parts, interim ? [interim] : []).join(' ').replace(/\s+/g, ' ').trim();
  const finish = () => resolveFn(cancelled ? '' : text());
  const start = () => {
    parts = [];
    rec = new SR();
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      const fin = [];
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (!t) continue;
        if (e.results[i].isFinal) {
          const last = fin[fin.length - 1];
          if (last && t.toLowerCase().startsWith(last.toLowerCase())) fin[fin.length - 1] = t; else fin.push(t);
        } else interim += (interim ? ' ' : '') + t;
      }
      parts = fin;
      onUpdate && onUpdate(text(interim));
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stopped = true; rejectFn(new Error('Mikrofon nicht erlaubt')); }
      else if (e.error === 'network') { stopped = true; rejectFn(new Error('Spracherkennung braucht Internet')); }
    };
    rec.onend = () => {
      done = done.concat(parts);
      parts = [];
      if (stopped) { finish(); return; }
      try { start(); } catch (err) { stopped = true; finish(); }
    };
    rec.start();
  };
  try { start(); } catch (err) { rejectFn(err); }
  const timer = setTimeout(() => ctl.stop(), DICTATION_MAX_MS);
  const ctl = {
    done: promise,
    stop() { if (stopped) return; stopped = true; clearTimeout(timer); try { rec.stop(); } catch (err) { finish(); } },
    cancel() { cancelled = true; this.stop(); },
  };
  return ctl;
}

// ---------- Aufnahmen (nur auf diesem Gerät, IndexedDB) ----------
const audioDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('rh-audio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('a');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction('a', mode);
      const req = fn(tx.objectStore('a'));
      tx.oncomplete = () => res(req ? req.result : undefined);
      tx.onerror = () => rej(tx.error);
    });
  };
  return {
    get: k => run('readonly', st => st.get(k)),
    put: (k, v) => run('readwrite', st => st.put(v, k)),
    del: k => run('readwrite', st => st.delete(k)),
  };
})();
async function startRecorder() {
  if (!settings.record || !navigator.mediaDevices || !window.MediaRecorder) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.start();
    return {
      stop: () => new Promise(res => {
        mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(chunks.length ? new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) : null); };
        try { mr.stop(); } catch (e) { res(null); }
      }),
    };
  } catch (e) { return null; }
}
async function audioPlayer(key, el) {
  try {
    const blob = await audioDB.get(key);
    if (!blob || !el) return;
    el.innerHTML = `<audio controls preload="metadata" src="${URL.createObjectURL(blob)}"></audio>`;
  } catch (e) { /* keine Aufnahme */ }
}

// ---------- Eigene Auswertung (kostenlos, ohne KI) ----------
// Markiert, nicht verboten: Absolutes kann richtig sein – es soll nur bewusst sein.
const MARKS = {
  abs: ['immer', 'nie', 'niemals', 'garantiert', 'definitiv', 'eindeutig', 'absolut', 'komplett', 'total', 'auf jeden fall', 'auf keinen fall', 'überhaupt nicht', 'gar nicht', 'gar nichts', 'sofort', 'muss', 'müssen', 'musst', 'ausschließlich', 'hundertprozentig', '100 prozent', 'ganz sicher', 'zweifellos', 'stimmt nicht', 'stimmt so nicht', 'ist falsch', 'unsinn', 'quatsch', 'alle', 'jeder', 'keiner', 'nichts'],
  self: ['sorry', 'tut mir leid', 'entschuldigung', 'müsste ich eigentlich wissen', 'sollte ich eigentlich wissen', 'müsste ich wissen', 'ich bin kein experte', 'ich bin ja nur', 'vielleicht ist das blöd', 'blöde frage', 'keine ahnung', 'weiß nicht ob das stimmt'],
  fill: ['äh', 'ähm', 'öhm', 'hm', 'halt', 'quasi', 'sozusagen', 'irgendwie', 'sag ich mal', 'im prinzip', 'gell'],
  good: ['meistens', 'in den meisten fällen', 'oft', 'häufig', 'nach meiner erfahrung', 'aus meiner sicht', 'meiner meinung nach', 'meines wissens', 'soweit ich weiß', 'bisher', 'in der regel', 'mein vorschlag', 'was spricht', 'wie seht ihr das', 'wie sehen sie das', 'du meinst', 'sie meinen', 'ihr meint', 'richtig verstanden', 'wenn ich dich richtig verstehe', 'wenn ich sie richtig verstehe', 'da gebe ich dir recht', 'da gebe ich ihnen recht', 'da hast du recht', 'da haben sie recht', 'ich kläre das', 'ich schaue', 'ich schau', 'ich melde mich'],
};
const MARK_INFO = { abs: 'absolut – stimmt das wirklich immer?', self: 'wertet dich ab', fill: 'Füllwort', good: 'Spielraum / Spiegeln' };
const STOP = new Set('aber also auch noch schon dann denn doch eben einfach nicht nichts einen einem einer eines diese dieser dieses wenn weil dass oder sondern sind sein seine ihre ihren wird werden wurde haben hatte habe kann können könnte sollte würde wollen mache machen macht gerade wirklich vielleicht immer etwas ganz genau dabei damit dafür darauf darüber eigentlich irgendwie natürlich jetzt hier heute wieder schon sehr mehr viel viele andere anderen unser unsere euch ihnen ihm ihr mich mir dich dir sich uns'.split(' '));
const L = 'A-Za-zÄÖÜäöüß';
const markRe = (() => {
  const all = [];
  for (const [cls, list] of Object.entries(MARKS)) for (const w of list) all.push([w, cls]);
  all.sort((a, b) => b[0].length - a[0].length);
  const map = new Map(all.map(([w, c]) => [w, c]));
  const re = new RegExp(`(?<![${L}])(${all.map(([w]) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|')})(?![${L}])`, 'gi');
  return { re, cls: w => map.get(w.toLowerCase().replace(/\s+/g, ' ')) };
})();
function analyze(text, sec) {
  const words = (text.match(new RegExp(`[${L}0-9'-]+`, 'g')) || []);
  const counts = { abs: 0, self: 0, fill: 0, good: 0 };
  for (const m of text.matchAll(markRe.re)) { const c = markRe.cls(m[1]); if (c) counts[c]++; }
  const freq = {};
  for (const w of words) {
    const k = w.toLowerCase();
    if (k.length >= 4 && !STOP.has(k) && !markRe.cls(k)) freq[k] = (freq[k] || 0) + 1;
  }
  const repeats = Object.entries(freq).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { words: words.length, wpm: sec >= 10 ? Math.round(words.length / (sec / 60)) : null, counts, repeats };
}
function highlight(text) {
  let out = '', last = 0;
  for (const m of text.matchAll(markRe.re)) {
    const c = markRe.cls(m[1]);
    if (!c) continue;
    out += esc(text.slice(last, m.index)) + `<mark class="m-${c}" title="${esc(MARK_INFO[c])}">${esc(m[1])}</mark>`;
    last = m.index + m[1].length;
  }
  return out + esc(text.slice(last));
}
function analysisHTML(tr, cat) {
  const a = analyze(tr.text, tr.sec);
  const target = CATS[cat].sec;
  return `
    <div class="stats">
      <div class="stat"><b>${fmtSec(tr.sec)}</b><span>Dauer (Ziel ~${fmtSec(target)})</span></div>
      <div class="stat"><b>${a.words}</b><span>Wörter</span></div>
      <div class="stat"><b>${a.wpm ?? '–'}</b><span>Wörter/Min.</span></div>
    </div>
    <p class="said">${highlight(tr.text) || '<span class="muted">(kein Text)</span>'}</p>
    <p class="small legend">
      <mark class="m-abs">absolut</mark> ${a.counts.abs} ·
      <mark class="m-self">wertet dich ab</mark> ${a.counts.self} ·
      <mark class="m-good">Spielraum/Spiegeln</mark> ${a.counts.good}
      ${a.counts.fill ? ` · <mark class="m-fill">Füllwort</mark> ${a.counts.fill}` : ''}
    </p>
    ${a.repeats.length ? `<p class="small">Oft benutzt: ${a.repeats.map(([w, n]) => `<b>${esc(w)}</b> (${n}×)`).join(', ')} – gibt es ein treffenderes Wort?</p>` : ''}
    <p class="muted small">Markiert heißt nicht falsch: Eine klare Position ist gut. Frag dich nur, ob „immer“ oder „muss“ wirklich stimmt. Füllwörter wie „äh“ lässt die Spracherkennung meist weg – die hörst du nur in der Aufnahme.</p>`;
}

// ---------- Claude ----------
const MODELS = {
  'claude-opus-5-5': { name: 'Claude Opus 5.5 (beste Qualität)', in: 4, out: 20, fallback: true, effort: true },
  'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5 (günstiger)', in: 2, out: 10, fallback: true, effort: true },
  'claude-haiku-4-5': { name: 'Claude Haiku 4.5 (am günstigsten)', in: 1, out: 5, fallback: false, effort: false },
};
let sdkModule = null;
async function claudeClient() {
  if (!sdkModule) sdkModule = await import('../lernen/vendor/anthropic-sdk.js');
  const Anthropic = sdkModule.default;
  return { Anthropic, client: new Anthropic({ apiKey: talkCfg.key, dangerouslyAllowBrowser: true, maxRetries: 2 }) };
}
function claudeError(e, Anthropic) {
  if (Anthropic && e instanceof Anthropic.AuthenticationError) return 'API-Schlüssel ungültig – unter ⚙️ prüfen.';
  if (Anthropic && e instanceof Anthropic.RateLimitError) return 'Zu viele Anfragen – kurz warten und nochmal versuchen.';
  if (Anthropic && e instanceof Anthropic.BadRequestError) return /credit/i.test(e.message) ? 'Guthaben aufgebraucht – auf console.anthropic.com aufladen.' : 'Anfrage abgelehnt: ' + e.message;
  if (Anthropic && e instanceof Anthropic.APIConnectionError) return 'Keine Verbindung – Rückmeldung braucht Internet.';
  if (Anthropic && e instanceof Anthropic.APIError) return 'Claude-Fehler ' + (e.status || '') + ': ' + e.message;
  return 'Fehler: ' + (e && e.message ? e.message : e);
}
function addUsage(model, usage) {
  const m = MODELS[model];
  const inTok = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) * 1.25 + (usage.cache_read_input_tokens || 0) * 0.1;
  const usd = (inTok * m.in + (usage.output_tokens || 0) * m.out) / 1e6;
  const month = new Date().toISOString().slice(0, 7);
  const u = load('sl.usage', {}); // gemeinsamer Zähler mit der Sprach-App (ein Schlüssel)
  u[month] = (u[month] || 0) + usd;
  save('sl.usage', u);
  return usd;
}
async function callClaude(system, messages, schema, maxTokens) {
  const { Anthropic, client } = await claudeClient();
  const model = MODELS[settings.model] ? settings.model : 'claude-opus-5-5';
  const m = MODELS[model];
  const params = {
    model, max_tokens: maxTokens, system, messages,
    cache_control: { type: 'ephemeral' },
    output_config: Object.assign({ format: { type: 'json_schema', schema } }, m.effort ? { effort: 'medium' } : {}),
  };
  let res;
  try {
    res = m.fallback
      ? await client.beta.messages.create(Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }))
      : await client.messages.create(params);
  } catch (e) { throw new Error(claudeError(e, Anthropic)); }
  const cost = addUsage(model, res.usage || {});
  if (res.stop_reason === 'refusal') throw new Error('Claude hat diese Anfrage abgelehnt.');
  if (res.stop_reason === 'max_tokens') throw new Error('Antwort abgeschnitten – bitte nochmal versuchen.');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try { return { data: JSON.parse(text), cost }; } catch (e) { throw new Error('Antwort nicht lesbar – bitte nochmal versuchen.'); }
}

const FB_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['kern', 'schritte', 'sprung', 'stark', 'besser', 'fokus', 'inhalt', 'vergleich'],
  properties: {
    kern: { type: 'string' },
    schritte: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'da', 'zitat'], properties: { name: { type: 'string' }, da: { type: 'string', enum: ['ja', 'teils', 'nein'] }, zitat: { type: 'string' } } } },
    sprung: { type: 'string' },
    stark: { type: 'string' },
    besser: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['du', 'besser', 'warum'], properties: { du: { type: 'string' }, besser: { type: 'string' }, warum: { type: 'string' } } } },
    fokus: { type: 'string' },
    inhalt: { type: 'string' },
    vergleich: { type: 'string' },
  },
};
const FB_SYSTEM = `Du bist ein erfahrener Rhetorik-Trainer. Du trainierst Ricky: Physiotherapeut in einer Suchtreha-Klinik für Männer, Mitglied der Mitarbeitervertretung (MAV), Sicherheitsbeauftragter, Fußballtrainer und Macher von Gesundheitsvideos (Schmerz, Training).

Seine Ziele: souveräner mit Widerspruch und spontanen Fragen umgehen, einen roten Faden halten, treffendere Worte finden, spontaner werden. Er sagt über sich selbst: Er kommt oft gleich mit absoluten Aussagen, die kaum Spielraum lassen; bei Widerspruch fühlt er sich schnell missverstanden; bei Fragen, die er nicht beantworten kann, hat er Angst, dass andere denken, er müsste es wissen.

Er hat eine Übungsaufgabe laut beantwortet. Das Transkript stammt aus der Spracherkennung: fehlende Satzzeichen, Großschreibung und offensichtlich falsch erkannte Wörter ignorieren. Füllwörter wie „äh“ fehlen meist im Transkript – dazu nichts sagen.

Wie du antwortest:
- Deutsch, Alltagssprache, kurz. Keine Fachwörter; wenn eins nötig ist, sofort in Klammern einfach erklären. Er tut sich mit Grammatikbegriffen schwer.
- Wie ein guter Trainer: ehrlich, nicht schmeicheln, nicht dramatisieren. Bewerte die Wirkung (Rhetorik), nicht sein Fachwissen.
- "kern": seine Kernaussage in einem Satz, möglichst in seinen Worten. Leer lassen, wenn keine klare Kernaussage erkennbar ist.
- "schritte": für jeden Schritt des vorgegebenen Werkzeugs: name (genau wie vorgegeben), da = ja/teils/nein, zitat = die Stelle aus dem Transkript (wörtlich, kurz) oder leer.
- "sprung": eine Stelle, an der ein Gedankensprung ohne Übergang ist oder er den Faden verliert – mit kurzem Zitat. Leer, wenn es keinen gibt.
- "stark": genau eine Sache, die wirklich gut war, konkret.
- "besser": höchstens 2 Stellen. "du" = wörtlich aus dem Transkript, "besser" = wie er es sagen könnte, "warum" = ein kurzer Satz. Vorschläge müssen Sprechsprache sein (so, wie man es laut sagt), in seiner Sache und seiner Art bleiben und dürfen nichts dazuerfinden (keine Zahlen, Studien oder Fakten, die er nicht genannt hat). Bevorzugt: angreifbare absolute Aussagen, Selbstabwertung, Entschuldigungen, vage oder oft wiederholte Wörter, die ein treffenderes Wort verdienen. Eine klare Position ist gut – nur angreifbares Absolutes bemängeln.
- "fokus": ein einziger, konkreter Auftrag für den nächsten Versuch (ein Satz).
- "inhalt": nur wenn eine fachliche Aussage klar falsch oder riskant ist, ein kurzer Hinweis; sonst leer.
- "vergleich": nur wenn ein früherer Versuch mitgeschickt wird: in 1–2 Sätzen, was besser oder schlechter geworden ist, gemessen am damaligen Fokus. Sonst leer.`;

async function getFeedback(round, ti) {
  const task = taskById(round.task) || { ctx: '', say: '', task: '' };
  const cat = CATS[round.cat];
  const tr = round.tries[ti];
  const prev = ti > 0 ? round.tries[ti - 1] : null;
  const msg = `Lage: ${task.ctx}
${task.say ? `Das Gegenüber sagt: „${task.say}“\n` : ''}Aufgabe: ${task.task}
Werkzeug „${cat.tool}“, Schritte: ${cat.steps.map(([n, d]) => `${n} (${d})`).join(' | ')}
Zieldauer: etwa ${cat.sec} Sekunden. Gesprochen: ${Math.round(tr.sec)} Sekunden.
${prev ? `\nFrüherer Versuch: „${prev.text}“${prev.fb && prev.fb.fokus ? `\nFokus damals: ${prev.fb.fokus}` : ''}\n` : ''}
Transkript dieses Versuchs: „${tr.text}“`;
  return callClaude(FB_SYSTEM, [{ role: 'user', content: msg }], FB_SCHEMA, 4000);
}
function feedbackHTML(fb, cat) {
  if (!fb) return '';
  const mark = { ja: '✓', teils: '◐', nein: '✗' };
  return `<div class="card fb stack">
    <h3>🧠 Rückmeldung</h3>
    ${fb.vergleich ? `<p><b>Im Vergleich:</b> ${esc(fb.vergleich)}</p>` : ''}
    <p><b>Kernaussage:</b> ${fb.kern ? esc(fb.kern) : '<span class="warn-t">keine klare Kernaussage erkennbar</span>'}</p>
    <div><b>${esc(CATS[cat].tool)}</b>
      <ul class="steps">${fb.schritte.map(s => `<li class="st-${esc(s.da)}"><span>${mark[s.da] || '·'}</span> <b>${esc(s.name)}</b>${s.zitat ? ` – „${esc(s.zitat)}“` : ''}</li>`).join('')}</ul></div>
    ${fb.sprung ? `<p><b>Roter Faden:</b> ${esc(fb.sprung)}</p>` : ''}
    <p><b>Stark:</b> ${esc(fb.stark)}</p>
    ${fb.besser.length ? `<div><b>Besser sagen</b>${fb.besser.map(b => `<div class="better"><div class="du">„${esc(b.du)}“</div><div class="neu">→ „${esc(b.besser)}“</div><div class="small muted">${esc(b.warum)}</div></div>`).join('')}</div>` : ''}
    ${fb.inhalt ? `<p class="notice warn">Inhalt: ${esc(fb.inhalt)}</p>` : ''}
    <p class="focus"><b>Fokus für den nächsten Versuch:</b> ${esc(fb.fokus)}</p>
  </div>`;
}

// ---------- Planung ----------
// Heute: 3 Runden ≈ 10–15 Min. Zwei aus dem Schwerpunkt, eine aus den übrigen Lagen;
// jeweils die Lage, die am längsten nicht dran war, darin die am wenigsten geübte Aufgabe.
function lastTs(cat) { const r = roundsOf(cat); return r.length ? Math.max(...r.map(x => x.ts)) : 0; }
function nextTask(cat, exclude = []) {
  const list = allTasks().filter(t => t.cat === cat && !exclude.includes(t.id));
  const stat = id => { const r = state.rounds.filter(x => x.task === id); return [r.length, r.length ? Math.max(...r.map(x => x.ts)) : 0]; };
  return list.sort((a, b) => { const [na, ta] = stat(a.id), [nb, tb] = stat(b.id); return na - nb || ta - tb; })[0];
}
function todayPlan() {
  const d = day();
  if (state.plan && state.plan.day === d && state.plan.ids.every(taskById)) return state.plan.ids;
  const focus = window.RH.focus.slice().sort((a, b) => lastTs(a) - lastTs(b));
  const rest = Object.keys(CATS).filter(c => !window.RH.focus.includes(c)).sort((a, b) => lastTs(a) - lastTs(b));
  const ids = [focus[0], focus[1], rest[0]].map(c => nextTask(c)).filter(Boolean).map(t => t.id);
  state.plan = { day: d, ids };
  persist();
  return ids;
}
function compareSuggestion() {
  const old = Date.now() - COMPARE_DAYS * 86400000;
  const byTask = {};
  for (const r of state.rounds) if (!byTask[r.task] || r.ts > byTask[r.task].ts) byTask[r.task] = r;
  return Object.values(byTask).filter(r => r.ts < old && taskById(r.task)).sort((a, b) => a.ts - b.ts)[0];
}
// Stufe hoch anbieten: letzte 3 Runden auf dieser Stufe alle mit Gefühl ≥ 4
function readyForNext(cat) {
  const lvl = levelOf(cat);
  if (lvl >= DENK.length) return false;
  const r = roundsOf(cat).filter(x => x.level === lvl).slice(-3);
  return r.length === 3 && r.every(x => (lastRating(x) || 0) >= 4);
}

// ---------- Ansichten ----------
const views = {};
let cleanup = null;

views.home = function (root) {
  const ids = todayPlan();
  const d = day();
  const doneToday = state.rounds.filter(r => day(r.ts) === d);
  const week = state.rounds.filter(r => r.ts > Date.now() - 7 * 86400000).length;
  const cmp = compareSuggestion();
  const ups = Object.keys(CATS).filter(readyForNext);
  root.innerHTML = `
    <h1>Heute</h1>
    <div class="card plan">
      <div class="row between"><b>3 Runden · ca. 10–15 Min.</b><span class="small muted">${doneToday.length} heute geübt</span></div>
      ${ids.map((id, i) => {
        const t = taskById(id), c = CATS[t.cat];
        const done = doneToday.some(r => r.task === id);
        return `<a class="plan-step" href="#round/${id}"><span class="num ${done ? 'done' : ''}">${done ? '✓' : i + 1}</span>
          <span class="grow"><b>${c.icon} ${esc(c.label)}</b> <span class="small muted">Stufe ${levelOf(t.cat)}</span><br><span class="small">${esc(t.say || t.task)}</span></span></a>`;
      }).join('')}
    </div>
    ${ups.map(c => `<div class="card row between"><span>${CATS[c].icon} <b>${esc(CATS[c].label)}</b>: die letzten 3 Runden fühlten sich souverän an. Bereit für Stufe ${levelOf(c) + 1}?</span><button class="btn small primary" data-up="${c}">Ja</button></div>`).join('')}
    ${cmp ? `<div class="card"><b>📈 Vergleich</b><p class="small">Am ${fmtDate(cmp.ts)} hast du diese Aufgabe geübt: „${esc((taskById(cmp.task).say || taskById(cmp.task).task))}“. Mach sie nochmal und hör dir danach beide Aufnahmen an.</p><a class="btn small" href="#round/${cmp.task}">Nochmal machen</a> <a class="small" href="#history/${cmp.id}">damals ansehen</a></div>` : ''}
    <div class="stats">
      <div class="stat"><b>${week}</b><span>Runden in 7 Tagen</span></div>
      <div class="stat"><b>${state.rounds.length}</b><span>Runden gesamt</span></div>
      <div class="stat"><b>${feelTrend()}</b><span>Gefühl (Ø letzte 5)</span></div>
    </div>
    <p class="muted small" style="margin-top:14px">So läuft eine Runde: Lage lesen → Gegenüber hört du vorgelesen → kurz nachdenken → laut antworten → Auswertung → zweiter Versuch mit einem Fokus. Gelernt wird beim zweiten Versuch.</p>
    ${!SR ? '<div class="notice warn">Dieser Browser hat keine Spracherkennung. Zum Sprechen Chrome (Android/Chromebook) nutzen – sonst kannst du tippen.</div>' : ''}`;
  $$('[data-up]', root).forEach(b => b.onclick = () => { state.level[b.dataset.up] = levelOf(b.dataset.up) + 1; persist(); toast('Stufe ' + levelOf(b.dataset.up)); route(); });
};
function feelTrend(cat) {
  const r = (cat ? roundsOf(cat) : state.rounds).map(lastRating).filter(Boolean).slice(-5);
  return r.length ? (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1).replace('.', ',') : '–';
}

views.practice = function (root) {
  root.innerHTML = `
    <h1>Üben</h1>
    <p class="muted small">Stufe 1: ${DENK[0]} s Denkzeit, Gegenüber und Werkzeug sichtbar · Stufe 2: ${DENK[1]} s, Werkzeug nur als Stichworte · Stufe 3: ${DENK[2]} s, Gegenüber nur hören, kein Spickzettel.</p>
    ${Object.entries(CATS).map(([key, c]) => {
      const n = roundsOf(key).length;
      const tasks = allTasks().filter(t => t.cat === key);
      return `<div class="card">
        <div class="row between"><b>${c.icon} ${esc(c.label)}</b>${window.RH.focus.includes(key) ? '<span class="pill">Schwerpunkt</span>' : ''}</div>
        <p class="small muted">${esc(c.tool)} · ${n} Runden · Gefühl Ø ${feelTrend(key)}</p>
        <div class="row"><span class="small">Stufe</span>${DENK.map((_, i) => `<button class="chip ${levelOf(key) === i + 1 ? 'on' : ''}" data-lvl="${key}|${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="row" style="margin-top:8px"><a class="btn primary small" href="#round/${nextTask(key).id}">▶ Aufgabe</a><a class="btn small" href="#pattern/${key}">🔍 Muster</a></div>
        <details><summary class="small">Alle Aufgaben (${tasks.length})</summary><ul class="list">${tasks.map(t => `<li><a href="#round/${t.id}" class="grow">${esc(t.say ? '„' + t.say + '“' : t.task)}</a>${t.id.startsWith('c:') ? `<button class="btn small danger" data-del="${t.id}">✕</button>` : ''}</li>`).join('')}</ul></details>
      </div>`;
    }).join('')}
    <div class="card stack">
      <b>➕ Eigene Situation</b>
      <p class="small muted">Eine Lage, die dir wirklich passiert ist – ohne echte Namen und ohne Vertrauliches (der Text geht bei der Rückmeldung an Claude).</p>
      <select id="c-cat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c.icon} ${esc(c.label)}</option>`).join('')}</select>
      <input id="c-ctx" placeholder="Lage, z. B. „Teambesprechung. Ein Kollege sagt:“">
      <input id="c-say" placeholder="Was sagt das Gegenüber? (optional)">
      <input id="c-task" placeholder="Deine Aufgabe, z. B. „Du siehst das anders.“">
      <button class="btn" id="c-add">Hinzufügen</button>
    </div>`;
  $$('[data-lvl]', root).forEach(b => b.onclick = () => { const [k, l] = b.dataset.lvl.split('|'); state.level[k] = +l; persist(); route(); });
  $$('[data-del]', root).forEach(b => b.onclick = () => { state.custom = state.custom.filter(t => t.id !== b.dataset.del); persist(); route(); });
  $('#c-add', root).onclick = () => {
    const t = { id: 'c:' + uid(), cat: $('#c-cat', root).value, ctx: $('#c-ctx', root).value.trim(), say: $('#c-say', root).value.trim(), task: $('#c-task', root).value.trim() };
    if (!t.task && !t.say) { toast('Bitte mindestens Aufgabe oder Satz des Gegenübers'); return; }
    if (!t.task) t.task = 'Antworte.';
    state.custom.push(t); persist();
    location.hash = '#round/' + t.id;
  };
};

// Muster entdecken: erst zwei Antworten hören, selbst den Unterschied finden, dann Auflösung
function patternHTML(cat, nextHref) {
  const c = CATS[cat], ex = c.example;
  return `
    <h1>${c.icon} ${esc(c.label)}: Muster entdecken</h1>
    <div class="card"><p class="small muted">${esc(ex.ctx)}</p>${ex.say ? `<p class="say">„${esc(ex.say)}“</p>` : ''}</div>
    <div class="card"><div class="row between"><b>Antwort A</b><button class="btn small" data-play="a">🔊</button></div><p>${esc(ex.a)}</p></div>
    <div class="card"><div class="row between"><b>Antwort B</b><button class="btn small" data-play="b">🔊</button></div><p id="b-text">${esc(ex.b.map(x => x[0]).join(' '))}</p></div>
    <div class="notice"><b>Was macht B anders als A?</b> Überleg kurz – oder sag es laut –, bevor du aufdeckst.</div>
    <button class="btn primary" id="reveal">Auflösung zeigen</button>
    <div id="sol" hidden>
      <div class="card"><b>B, Schritt für Schritt</b><ul class="steps">${ex.b.map(([s, i]) => `<li><span class="tag">${esc(c.steps[i][0])}</span> ${esc(s)}</li>`).join('')}</ul></div>
      <div class="card"><p>${esc(ex.insight)}</p>${ex.extra ? `<p class="small">${esc(ex.extra)}</p>` : ''}</div>
      <div class="card"><b>Werkzeug: ${esc(c.tool)}</b><ol>${c.steps.map(([n, d]) => `<li><b>${esc(n)}</b> – ${esc(d)}</li>`).join('')}</ol></div>
      <a class="btn primary" href="${nextHref}">Jetzt du →</a>
    </div>`;
}
function bindPattern(root, cat) {
  const ex = CATS[cat].example;
  $$('[data-play]', root).forEach(b => b.onclick = () => speakP(b.dataset.play === 'a' ? ex.a : ex.b.map(x => x[0]).join(' ')));
  $('#reveal', root).onclick = () => { $('#sol', root).hidden = false; $('#reveal', root).hidden = true; state.seen[cat] = true; persist(); };
}
views.pattern = function (root, cat) {
  if (!CATS[cat]) { location.hash = '#practice'; return; }
  root.innerHTML = patternHTML(cat, '#round/' + nextTask(cat).id);
  bindPattern(root, cat);
};

function toolHTML(cat, lvl) {
  const c = CATS[cat];
  if (lvl >= 3) return `<details class="small"><summary>Spickzettel (nur im Notfall)</summary>${c.steps.map(([n]) => esc(n)).join(' → ')}</details>`;
  if (lvl === 2) return `<p class="tool small"><b>${esc(c.tool)}:</b> ${c.steps.map(([n]) => esc(n)).join(' → ')}</p>`;
  return `<div class="tool small"><b>${esc(c.tool)}</b><ol>${c.steps.map(([n, d]) => `<li><b>${esc(n)}</b> – ${esc(d)}</li>`).join('')}</ol></div>`;
}

views.round = function (root, arg) {
  const [taskId, resumeId] = (arg || '').split('~');
  const task = taskById(taskId);
  if (!task) { location.hash = '#home'; return; }
  const cat = task.cat;
  if (!state.seen[cat] && !resumeId) {
    root.innerHTML = patternHTML(cat, '#round/' + taskId + '~new');
    bindPattern(root, cat);
    $('#sol a', root).onclick = e => { e.preventDefault(); state.seen[cat] = true; persist(); views.round(root, taskId + '~new'); };
    return;
  }
  let round = resumeId && resumeId !== 'new' ? state.rounds.find(r => r.id === resumeId) : null;
  const lvl = round ? round.level : levelOf(cat);
  const c = CATS[cat];

  const prep = () => {
    const prev = round && round.tries[round.tries.length - 1];
    const focus = prev && prev.fb && prev.fb.fokus;
    root.innerHTML = `
      <div class="row between"><h1>${c.icon} ${esc(c.label)}</h1><span class="pill">Stufe ${lvl}${round ? ` · Versuch ${round.tries.length + 1}` : ''}</span></div>
      <div class="card">
        <p class="small muted">${esc(task.ctx)}</p>
        ${task.say ? (lvl >= 3 && !round ? `<p class="say muted">Hör genau hin …</p>` : `<p class="say">„${esc(task.say)}“</p>`) : ''}
        <p><b>Aufgabe:</b> ${esc(task.task)} <span class="small muted">(etwa ${c.sec} s)</span></p>
      </div>
      ${focus ? `<div class="notice"><b>Dein Fokus:</b> ${esc(focus)}</div>` : ''}
      ${toolHTML(cat, lvl)}
      <div id="stage" class="stage">
        <button class="btn primary big" id="go">${task.say ? '▶ Gegenüber anhören & los' : '▶ Los'}</button>
      </div>`;
    $('#go', root).onclick = () => countdown();
  };

  const countdown = async () => {
    const stage = $('#stage', root);
    stage.innerHTML = `<p class="muted">${task.say ? '🔊 …' : ''}</p>`;
    if (task.say) await speakP(task.say);
    if (!document.body.contains(stage)) return;
    let left = round ? Math.min(DENK[lvl - 1], 10) : DENK[lvl - 1];
    stage.innerHTML = `<div class="count" id="cnt">${left}</div><p class="muted small">Denkzeit – was ist deine Kernaussage?</p>
      <div class="row center">${task.say ? '<button class="btn small" id="again">🔊 Nochmal hören</button>' : ''}<button class="btn primary" id="ready">Ich bin bereit</button></div>`;
    let stopped = false;
    const timer = setInterval(() => { left--; if ($('#cnt', root)) $('#cnt', root).textContent = Math.max(0, left); if (left <= 0) go(); }, 1000);
    const go = () => { if (stopped) return; stopped = true; clearInterval(timer); speak(); };
    cleanup = () => { stopped = true; clearInterval(timer); };
    if ($('#again', root)) $('#again', root).onclick = () => speakP(task.say);
    $('#ready', root).onclick = go;
  };

  const speak = async () => {
    if (window.speechSynthesis) speechSynthesis.cancel();
    const stage = $('#stage', root);
    stage.innerHTML = `<div class="count rec-dot" id="clock">0:00</div>
      <div class="bar"><div id="bar"></div></div>
      <p id="live" class="live muted">${SR ? 'Sprich – Pausen zum Nachdenken sind erlaubt.' : ''}</p>
      ${SR ? '' : '<textarea id="typed" rows="5" placeholder="Keine Spracherkennung: Sprich laut (wird aufgenommen) und tippe danach kurz, was du gesagt hast."></textarea>'}
      <div class="row center"><button class="btn primary big rec" id="done">✓ Fertig</button><button class="btn small" id="cancel">Abbrechen</button></div>`;
    const t0 = Date.now();
    const rec = await startRecorder();
    const dict = SR ? dictation(t => { const el = $('#live', root); if (el) { el.textContent = t; el.classList.remove('muted'); } }) : null;
    const tick = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      if ($('#clock', root)) $('#clock', root).textContent = fmtSec(s);
      if ($('#bar', root)) { $('#bar', root).style.width = Math.min(100, s / c.sec * 100) + '%'; $('#bar', root).classList.toggle('over', s > c.sec * 1.3); }
    }, 250);
    let finished = false;
    cleanup = () => { if (finished) return; finished = true; clearInterval(tick); if (dict) dict.cancel(); if (rec) rec.stop(); };
    $('#cancel', root).onclick = () => { cleanup(); prep(); };
    $('#done', root).onclick = async () => {
      if (finished) return;
      finished = true;
      clearInterval(tick);
      const sec = (Date.now() - t0) / 1000;
      $('#done', root).disabled = true;
      let text = '';
      if (dict) { dict.stop(); try { text = await dict.done; } catch (e) { toast(e.message); } }
      else text = ($('#typed', root).value || '').trim();
      const blob = rec ? await rec.stop() : null;
      if (!round) {
        round = { id: uid(), ts: Date.now(), task: task.id, cat, level: lvl, tries: [] };
        state.rounds.push(round);
      }
      const ti = round.tries.length;
      round.tries.push({ text, sec, rating: 0, fb: null, audio: !!blob, ts: Date.now() });
      persist();
      if (blob) { try { await audioDB.put(round.id + '|' + ti, blob); } catch (e) { round.tries[ti].audio = false; persist(); } }
      result(ti);
    };
  };

  const result = ti => {
    const tr = round.tries[ti];
    root.innerHTML = `
      <div class="row between"><h1>${c.icon} Versuch ${ti + 1}</h1><span class="pill">Stufe ${lvl}</span></div>
      <div class="card stack" id="ana">${analysisHTML(tr, cat)}</div>
      <details class="small"><summary>✎ Erkennungsfehler korrigieren</summary><textarea id="fix" rows="4">${esc(tr.text)}</textarea><button class="btn small" id="fix-save">Übernehmen</button></details>
      <div id="audio"></div>
      ${ti > 0 ? compareHTML(round) : ''}
      <div class="card">
        <b>Wie souverän hat es sich angefühlt?</b>
        <div class="chips" id="rate">${[1, 2, 3, 4, 5].map(n => `<button class="chip ${tr.rating === n ? 'on' : ''}" data-r="${n}">${n}</button>`).join('')}</div>
        <p class="small muted">1 = sehr unsicher · 5 = ganz souverän. Nur für dich – zeigt, ob die Stufe passt.</p>
      </div>
      <div id="fb">${feedbackHTML(tr.fb, cat)}</div>
      <div class="stack">
        ${tr.fb ? '' : (talkCfg.key ? `<button class="btn" id="ask">🧠 Rückmeldung von Claude <span class="small muted">(ca. 2–5 Cent, Schätzung)</span></button>` : `<a class="btn" href="#settings">🧠 Rückmeldung von Claude einrichten</a>`)}
        <button class="btn primary" id="again">🔁 Nochmal – Versuch ${ti + 2}</button>
        <a class="btn" href="#home">✓ Fertig für diese Aufgabe</a>
      </div>`;
    if (tr.audio) audioPlayer(round.id + '|' + ti, $('#audio', root));
    $$('#rate .chip', root).forEach(b => b.onclick = () => { tr.rating = +b.dataset.r; persist(); $$('#rate .chip', root).forEach(x => x.classList.toggle('on', x === b)); });
    $('#fix-save', root).onclick = () => { tr.text = $('#fix', root).value.trim(); persist(); result(ti); };
    $('#again', root).onclick = () => prep();
    const ask = $('#ask', root);
    if (ask) ask.onclick = async () => {
      if (!tr.text) { toast('Kein Text zum Auswerten'); return; }
      ask.disabled = true; ask.textContent = '🧠 Claude hört sich das an …';
      try {
        const { data, cost } = await getFeedback(round, ti);
        tr.fb = data; tr.cost = cost; persist();
        result(ti);
      } catch (e) { toast(e.message); ask.disabled = false; ask.textContent = '🧠 Nochmal versuchen'; }
    };
  };

  if (round && round.tries.length) result(round.tries.length - 1); else prep();
};
function compareHTML(round) {
  const rows = round.tries.map((t, i) => { const a = analyze(t.text, t.sec); return [i + 1, fmtSec(t.sec), a.counts.abs, a.counts.self, a.counts.good, t.rating || '–']; });
  return `<div class="card"><b>Versuche im Vergleich</b>
    <table class="cmp"><tr><th>#</th><th>Dauer</th><th>absolut</th><th>abwertend</th><th>Spielraum</th><th>Gefühl</th></tr>
    ${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table></div>`;
}

views.history = function (root, id) {
  if (id) return historyDetail(root, id);
  const list = state.rounds.slice().sort((a, b) => b.ts - a.ts);
  root.innerHTML = `<h1>Verlauf</h1>
    ${list.length ? `<ul class="list card">${list.map(r => {
      const t = taskById(r.task), c = CATS[r.cat];
      return `<li><a class="grow" href="#history/${r.id}"><span class="t">${c.icon} ${esc(c.label)}</span> <span class="small muted">${fmtDate(r.ts)} · Stufe ${r.level} · ${r.tries.length} Versuch${r.tries.length > 1 ? 'e' : ''}${lastRating(r) ? ' · Gefühl ' + lastRating(r) : ''}</span><div class="d">${esc(t ? (t.say || t.task) : '(Aufgabe gelöscht)')}</div></a></li>`;
    }).join('')}</ul>` : '<p class="muted">Noch keine Runden.</p>'}`;
};
function historyDetail(root, id) {
  const r = state.rounds.find(x => x.id === id);
  if (!r) { location.hash = '#history'; return; }
  const t = taskById(r.task);
  root.innerHTML = `<h1>${CATS[r.cat].icon} ${fmtDate(r.ts)}</h1>
    <div class="card"><p class="small muted">${esc(t ? t.ctx : '')}</p>${t && t.say ? `<p class="say">„${esc(t.say)}“</p>` : ''}<p>${esc(t ? t.task : '')}</p></div>
    ${r.tries.length > 1 ? compareHTML(r) : ''}
    ${r.tries.map((tr, i) => `<div class="card stack"><b>Versuch ${i + 1}</b>${analysisHTML(tr, r.cat)}<div id="au-${i}"></div></div>${feedbackHTML(tr.fb, r.cat)}`).join('')}
    <div class="row">${t ? `<a class="btn primary" href="#round/${t.id}">Diese Aufgabe nochmal</a>` : ''}<button class="btn danger" id="del">Löschen</button></div>`;
  r.tries.forEach((tr, i) => { if (tr.audio) audioPlayer(r.id + '|' + i, $('#au-' + i, root)); });
  $('#del', root).onclick = async () => {
    if (!confirm('Diese Runde mit Aufnahmen löschen?')) return;
    for (let i = 0; i < r.tries.length; i++) { try { await audioDB.del(r.id + '|' + i); } catch (e) { /* egal */ } }
    state.rounds = state.rounds.filter(x => x !== r); persist();
    location.hash = '#history';
  };
}

views.settings = function (root) {
  const month = new Date().toISOString().slice(0, 7);
  const spent = load('sl.usage', {})[month] || 0;
  root.innerHTML = `<h1>Einstellungen</h1>
    <div class="card stack">
      <b>🧠 Claude-Rückmeldung</b>
      <p class="small">Derselbe API-Schlüssel wie in der Sprach-App. Ist er dort schon eingetragen, steht er hier automatisch.</p>
      <input type="password" id="k" placeholder="sk-ant-…" value="${esc(talkCfg.key)}" autocomplete="off">
      <select id="m">${Object.entries(MODELS).map(([id, m]) => `<option value="${id}" ${settings.model === id ? 'selected' : ''}>${m.name}</option>`).join('')}</select>
      <button class="btn primary" id="save">Speichern</button>
      <p class="muted small">Eine Rückmeldung kostet mit Opus 5.5 grob 2–5 Cent (Schätzung, nicht gemessen). Diesen Monat geschätzt verbraucht (beide Apps, dieses Gerät): <b>$${spent.toFixed(2)}</b>.</p>
      <p class="muted small">Was du sprichst, geht bei der Rückmeldung als Text an Anthropic. Keine echten Namen, keine Patientendaten, nichts Vertrauliches aus MAV oder Klinik.</p>
    </div>
    <div class="card stack">
      <label class="inline"><input type="checkbox" id="rec" ${settings.record ? 'checked' : ''}> Aufnahme mitschneiden (nur auf diesem Gerät)</label>
      <p class="muted small">Zum Nachhören und für den Vergleich nach 4 Wochen. Falls die Spracherkennung damit auf deinem Handy nicht mehr geht: ausschalten (nicht auf echten Geräten getestet).</p>
      <label>Sprechtempo Gegenüber: <select id="rate">${[0.8, 0.9, 1, 1.1, 1.2].map(r => `<option ${settings.rate === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
    </div>
    <div class="card stack">
      <b>Sicherung</b>
      <div class="row"><button class="btn" id="exp">⬇ Sichern</button><label class="btn">⬆ Laden<input type="file" id="imp" accept=".json" hidden></label></div>
      <p class="muted small">Ohne Aufnahmen. Kein Sync zwischen Geräten (noch nicht gebaut).</p>
    </div>
    <p class="small"><a href="../lernen/">→ Sprachtraining</a></p>`;
  $('#m', root).onchange = e => { settings.model = e.target.value; saveSettings(); };
  $('#save', root).onclick = () => { talkCfg.key = $('#k', root).value.trim(); saveTalkCfg(); toast(talkCfg.key ? 'Gespeichert' : 'Kein Schlüssel'); };
  $('#rec', root).onchange = e => { settings.record = e.target.checked; saveSettings(); };
  $('#rate', root).onchange = e => { settings.rate = +e.target.value; saveSettings(); };
  $('#exp', root).onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: 'application/json' }));
    a.download = 'rhetorik-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  };
  $('#imp', root).onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.rounds)) throw new Error();
      if (!confirm('Aktuellen Stand durch die Sicherung ersetzen?')) return;
      state = Object.assign({ rounds: [], seen: {}, level: {}, custom: [], plan: null }, data);
      persist(); toast('Geladen'); route();
    } catch (err) { toast('Datei nicht lesbar'); }
  };
};

// ---------- Router ----------
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  const [name, ...rest] = location.hash.slice(1).split('/');
  const view = views[name] ? name : 'home';
  const tab = view === 'round' || view === 'pattern' ? 'practice' : view;
  $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  views[view]($('#view'), rest.join('/'));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
