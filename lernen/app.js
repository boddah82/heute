'use strict';

// ---------- Konstanten ----------
const LANGS = {
  it: { name: 'Italienisch', flag: '🇮🇹' },
  en: { name: 'Englisch', flag: '🇬🇧' },
};
const STEPS = [
  { key: 'vocab', title: 'Vokabeln mit Eselsbrücken', goal: 15 },
  { key: 'review', title: 'Sätze wiederholen', goal: 5 },
  { key: 'listen', title: 'Hören', goal: 5 },
  { key: 'shadow', title: 'Shadowing', goal: 10 },
  { key: 'islands', title: 'Sprachinseln erstellen', goal: 5 },
];
const DAILY_GOAL_MIN = 30;
const IDLE_MS = 120000; // ohne Eingabe wird nach 2 Minuten keine Zeit mehr gezählt
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Speicher ----------
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { toast('Speichern fehlgeschlagen'); }
}

const settings = Object.assign(
  { lang: 'it', newWords: 30, newSentences: 10, rate: 0.9, enVariant: 'en-GB', voices: {} },
  load('sl.settings', {})
);
function saveSettings() { save('sl.settings', settings); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function today() {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
function splitPair(line) {
  for (const sep of ['|', '\t', ';']) {
    const i = line.indexOf(sep);
    if (i > 0) return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }
  return null;
}
function parseLines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(splitPair).filter(p => p && p[0] && p[1]);
}

const starterCache = {};
function starterWords(lang) {
  if (!starterCache[lang]) {
    starterCache[lang] = parseLines(window.STARTER[lang].words).map(([t, d]) => ({ id: 'w:' + t, t, d }));
  }
  return starterCache[lang];
}

function stateKey(lang) { return 'sl.data.' + lang; }
function loadState(lang) {
  let s = load(stateKey(lang), null);
  if (!s) {
    s = { words: [], islands: [], srs: {}, notes: {}, log: {} };
    s.islands = window.STARTER[lang].islands.map(isl => ({
      id: uid(),
      title: isl.title,
      sentences: parseLines(isl.sentences).map(([t, d]) => ({ id: 's:' + uid(), t, d })),
    }));
    save(stateKey(lang), s);
  }
  return s;
}
let state = loadState(settings.lang);
function persist() { save(stateKey(settings.lang), state); }

function dayLog() {
  const k = today();
  if (!state.log[k]) state.log[k] = { sec: {}, newWords: 0, newSent: 0, reviews: 0, extraNew: 0 };
  return state.log[k];
}
function minutesToday(step) {
  const l = state.log[today()];
  if (!l) return 0;
  const sec = step ? (l.sec[step] || 0) : Object.values(l.sec).reduce((a, b) => a + b, 0);
  return Math.floor(sec / 60);
}
function streak() {
  const minsOf = day => {
    const l = state.log[day];
    return l ? Object.values(l.sec).reduce((a, b) => a + b, 0) / 60 : 0;
  };
  let d = today();
  if (minsOf(d) < DAILY_GOAL_MIN) d--; // heute zählt erst, wenn das Ziel erreicht ist
  let n = 0;
  while (minsOf(d) >= DAILY_GOAL_MIN) { n++; d--; }
  return n;
}

// ---------- Inhalte ----------
function allWords() { return starterWords(settings.lang).concat(state.words); }
function wordById(id) { return allWords().find(w => w.id === id); }
function allSentences() {
  const out = [];
  state.islands.forEach(isl => isl.sentences.forEach(s => out.push(Object.assign({ island: isl.id }, s))));
  return out;
}
function isWordId(id) { return id.startsWith('w:') || id.startsWith('u:'); }
function dueIds(filter) {
  const t = today();
  return Object.keys(state.srs)
    .filter(id => filter(id) && state.srs[id].due <= t)
    .sort((a, b) => state.srs[a].due - state.srs[b].due);
}

// Einfache Wiederholungsplanung nach SM-2 (Intervalle in Tagen).
function grade(id, r) {
  const t = today();
  const isNew = !state.srs[id];
  const c = state.srs[id] || { iv: 0, ef: 2.5, reps: 0, lapses: 0, due: t };
  if (r === 0) {
    c.iv = 0; c.ef = Math.max(1.3, c.ef - 0.2); c.lapses++; c.due = t;
  } else {
    if (r === 1) { c.iv = Math.max(1, Math.round(c.iv * 1.2)); c.ef = Math.max(1.3, c.ef - 0.15); }
    else if (r === 2) { c.iv = c.iv < 1 ? 1 : c.iv < 3 ? 3 : Math.round(c.iv * c.ef); }
    else { c.iv = c.iv < 1 ? 3 : Math.round(Math.max(c.iv, 3) * c.ef * 1.3); c.ef += 0.15; }
    c.reps++; c.due = t + c.iv;
  }
  state.srs[id] = c;
  const l = dayLog();
  l.reviews++;
  if (isNew && id.startsWith('s:')) l.newSent++;
  persist();
}

// ---------- Zeitmessung ----------
let activeStep = null;
let lastInput = Date.now();
let listening = false;
['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true }));
let tick = 0;
setInterval(() => {
  if (!activeStep) return;
  const busy = listening || (!document.hidden && Date.now() - lastInput < IDLE_MS);
  if (!busy) return;
  const l = dayLog();
  l.sec[activeStep] = (l.sec[activeStep] || 0) + 1;
  if (++tick % 10 === 0) persist();
}, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

// ---------- Sprachausgabe ----------
let voices = [];
function refreshVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
if (window.speechSynthesis) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = () => { refreshVoices(); if (location.hash.startsWith('#settings') || location.hash === '#home' || !location.hash) route(); };
}
function langCode(lang = settings.lang) { return lang === 'it' ? 'it-IT' : settings.enVariant; }
function voicesFor(prefix) { return voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(prefix)); }
function pickVoice(lang) {
  const chosen = voices.find(v => v.name === settings.voices[lang]);
  if (chosen) return chosen;
  const code = langCode(lang).toLowerCase();
  return voices.find(v => v.lang.toLowerCase().replace('_', '-') === code) || voicesFor(lang)[0] || null;
}
let currentUtterance = null; // Referenz halten, sonst feuert onend in Chrome manchmal nicht
function speak(text, opts = {}) {
  if (!window.speechSynthesis) { opts.onend && opts.onend(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, '').trim());
  if (opts.lang === 'de') {
    u.lang = 'de-DE';
    const v = voicesFor('de')[0];
    if (v) u.voice = v;
  } else {
    u.lang = langCode();
    const v = pickVoice(settings.lang);
    if (v) u.voice = v;
  }
  u.rate = opts.rate || settings.rate;
  let finished = false;
  const done = () => { if (!finished) { finished = true; opts.onend && opts.onend(); } };
  u.onend = done;
  u.onerror = done;
  currentUtterance = u;
  speechSynthesis.speak(u);
  // Fallback, falls der Browser onend nicht meldet
  setTimeout(done, 4000 + text.length * 150 / u.rate);
}
function speakP(text, opts = {}) { return new Promise(res => speak(text, Object.assign({}, opts, { onend: res }))); }
function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

// ---------- Spracherkennung & Vergleich ----------
function recognize() {
  return new Promise((resolve, reject) => {
    const r = new SR();
    r.lang = langCode();
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = e => resolve(e.results[0][0].transcript);
    r.onerror = e => reject(e.error);
    r.onend = () => resolve('');
    r.start();
  });
}
function normWords(s) {
  return s.toLowerCase().replace(/[’`]/g, "'").replace(/[.,!?;:¿¡"«»()…—–-]/g, ' ').split(/\s+/).filter(Boolean);
}
// Wortweiser Abgleich über die längste gemeinsame Teilfolge
function compareWords(target, attempt) {
  const T = target.split(/\s+/).filter(Boolean);
  const Tn = T.map(w => normWords(w).join(' '));
  const A = normWords(attempt);
  const dp = Array.from({ length: T.length + 1 }, () => new Array(A.length + 1).fill(0));
  for (let i = T.length - 1; i >= 0; i--) {
    for (let j = A.length - 1; j >= 0; j--) {
      dp[i][j] = Tn[i] === A[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const hit = new Array(T.length).fill(false);
  let i = 0, j = 0;
  while (i < T.length && j < A.length) {
    if (Tn[i] === A[j]) { hit[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const counted = Tn.filter(Boolean).length || 1;
  const score = Math.round(100 * hit.filter(Boolean).length / counted);
  const html = T.map((w, k) => `<span class="${hit[k] ? 'word-ok' : 'word-miss'}">${esc(w)}</span>`).join(' ');
  return { html, score };
}

// ---------- UI-Helfer ----------
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function voiceNotice() {
  if (!window.speechSynthesis) return `<div class="notice warn">Dieser Browser unterstützt keine Sprachausgabe.</div>`;
  if (voices.length && !voicesFor(settings.lang).length) {
    return `<div class="notice warn">Auf diesem Gerät ist keine ${LANGS[settings.lang].name.toLowerCase()}e Stimme installiert.
      Android: Einstellungen → Text-in-Sprache-Ausgabe. iPhone: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen.</div>`;
  }
  return '';
}
function islandSelect(id, selected, withAll) {
  return `<select id="${id}">
    ${withAll ? `<option value="all">Alle Inseln</option>` : ''}
    ${state.islands.map(i => `<option value="${i.id}" ${i.id === selected ? 'selected' : ''}>${esc(i.title)} (${i.sentences.length})</option>`).join('')}
  </select>`;
}
let keyHandler = null;
document.addEventListener('keydown', e => { if (keyHandler) keyHandler(e); });

// ---------- Abfrage (Active Recall) ----------
// Zeigt die deutsche Seite, der Nutzer produziert die Antwort (sprechen/tippen/denken), deckt auf und bewertet.
function recallSession(root, ids, cfg) {
  const queue = ids.slice();
  let done = 0;
  function show() {
    keyHandler = null;
    if (!queue.length) {
      root.innerHTML = `<div class="card flash"><div class="target">🎉</div>
        <p>${done ? `Fertig – ${done} Abfragen.` : cfg.emptyText}</p></div>${cfg.doneExtra || ''}`;
      cfg.onDone && cfg.onDone(root);
      return;
    }
    const id = queue[0];
    const it = cfg.get(id);
    if (!it) { queue.shift(); show(); return; }
    root.innerHTML = `
      <div class="row between muted small"><span>${queue.length} übrig</span>${it.isNew ? '<span class="pill">neu</span>' : ''}</div>
      <div class="card flash">
        <div class="native">${esc(it.d)}</div>
        ${it.note ? `<button class="btn small" id="hint" style="margin-top:8px">💡 Eselsbrücke</button><div class="hint" id="hint-t" hidden>${esc(it.note)}</div>` : ''}
        <div id="answer" hidden><div class="${cfg.big}">${esc(it.t)}</div><div id="cmp" class="small"></div></div>
      </div>
      ${cfg.typing ? `<input type="text" id="typed" placeholder="Antwort tippen (optional)" autocomplete="off" autocapitalize="off" spellcheck="false">` : ''}
      <div class="row" id="pre" style="margin-top:8px">
        ${SR ? '<button class="btn" id="say">🎙 Sprechen</button>' : ''}
        <button class="btn primary grow" id="reveal">Aufdecken</button>
      </div>
      <div id="post" hidden class="stack">
        <button class="btn" id="replay" style="width:100%">🔊 Nochmal hören</button>
        <div class="rate">
          <button class="btn again" data-r="0">Nochmal</button>
          <button class="btn hard" data-r="1">Schwer</button>
          <button class="btn good" data-r="2">Gut</button>
          <button class="btn easy" data-r="3">Leicht</button>
        </div>
        <p class="muted small">Laut nachsprechen, dann ehrlich bewerten. Tasten 1–4 gehen auch.</p>
      </div>`;
    let said = '';
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      $('#answer', root).hidden = false;
      $('#pre', root).hidden = true;
      $('#post', root).hidden = false;
      const typed = cfg.typing ? $('#typed', root).value.trim() : '';
      const attempt = said || typed;
      if (attempt) {
        const c = compareWords(it.t, attempt);
        $('#cmp', root).innerHTML = `<p>${said ? 'Gesagt' : 'Getippt'}: „${esc(attempt)}“</p><p>${c.html} <b>${c.score}%</b></p>`;
      }
      speak(it.t);
    };
    const rate = r => {
      grade(id, r);
      done++;
      queue.shift();
      if (r === 0) queue.push(id);
      show();
    };
    $('#reveal', root).onclick = reveal;
    $('#replay', root).onclick = () => speak(it.t);
    $$('.rate .btn', root).forEach(b => { b.onclick = () => rate(Number(b.dataset.r)); });
    if ($('#hint', root)) $('#hint', root).onclick = () => { $('#hint-t', root).hidden = false; };
    if ($('#say', root)) {
      $('#say', root).onclick = async () => {
        const b = $('#say', root);
        b.textContent = '… hört zu';
        b.disabled = true;
        try { said = await recognize(); } catch (e) { toast('Spracherkennung: ' + e); }
        if (!said) { b.textContent = '🎙 Sprechen'; b.disabled = false; toast('Nichts erkannt'); return; }
        reveal();
      };
    }
    if (cfg.typing) {
      $('#typed', root).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); reveal(); } });
    }
    keyHandler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
      else if (revealed && ['1', '2', '3', '4'].includes(e.key)) rate(Number(e.key) - 1);
    };
  }
  show();
}

// ---------- Ansichten ----------
const views = {};

views.home = function (root) {
  const l = dayLog();
  const total = minutesToday();
  const learnedWords = Object.keys(state.srs).filter(isWordId).length;
  const sentencesInTraining = Object.keys(state.srs).filter(id => id.startsWith('s:')).length;
  const dueW = dueIds(isWordId).length;
  const dueS = dueIds(id => id.startsWith('s:')).length;
  const sentCount = allSentences().length;
  const info = {
    vocab: `${l.newWords}/${settings.newWords} neu · ${dueW} fällig`,
    review: `${dueS} fällig · bis zu ${Math.max(0, settings.newSentences - l.newSent)} neue`,
    listen: 'so viel wie möglich',
    shadow: '5–15 Minuten',
    islands: `${state.islands.length} Inseln · ${sentCount} Sätze`,
  };
  root.innerHTML = `
    <h1>${LANGS[settings.lang].flag} Heute</h1>
    ${voiceNotice()}
    <div class="card">
      <div class="row between"><b>${total} / ${DAILY_GOAL_MIN} Minuten</b><span class="muted small">🔥 ${streak()} Tage in Folge</span></div>
      <div class="progress" style="margin-top:8px"><div style="width:${Math.min(100, total / DAILY_GOAL_MIN * 100)}%"></div></div>
    </div>
    <div class="stats">
      <div class="stat"><b>${learnedWords}</b><span>Wörter im Training</span></div>
      <div class="stat"><b>${sentencesInTraining}</b><span>Sätze im Training</span></div>
      <div class="stat"><b>${l.reviews}</b><span>Abfragen heute</span></div>
    </div>
    <h2>Tagesablauf (~30 Min.)</h2>
    ${STEPS.map((s, i) => {
      const m = minutesToday(s.key);
      return `<a class="card step ${m >= s.goal ? 'done' : ''}" href="#${s.key}">
        <div class="num">${m >= s.goal ? '✓' : i + 1}</div>
        <div class="grow"><div><b>${s.title}</b></div><div class="meta">${m}/${s.goal} Min. · ${info[s.key]}</div></div>
        <div>›</div></a>`;
    }).join('')}
    <div class="card">
      <div class="row between"><b>Jahresziel: 10.000 Wörter</b><span class="muted small">${learnedWords} / 10.000</span></div>
      <div class="progress" style="margin-top:8px"><div style="width:${Math.min(100, learnedWords / 100)}%"></div></div>
      <p class="muted small">Mitgeliefert sind ${starterWords(settings.lang).length} Grundwörter. Für mehr: eigene Listen unter „Wörter → Eigene“ importieren.</p>
    </div>
    <div class="row"><a class="btn grow" href="#settings">⚙️ Einstellungen & Backup</a><a class="btn grow" href="#method">📖 Methode</a></div>`;
};

views.method = function (root) {
  root.innerHTML = `
    <h1>Die Methode</h1>
    <div class="card stack">
      <p><b>1. Vokabeln zuerst.</b> 30+ neue Wörter pro Tag. Zu jedem Wort ein eigenes, möglichst absurdes Bild ausdenken, das Klang und Bedeutung verbindet, und als Eselsbrücke notieren.</p>
      <p><b>2. Active Recall.</b> Du siehst Deutsch und produzierst die Fremdsprache selbst – laut, getippt oder im Kopf. Erst dann aufdecken. Die Anstrengung beim Erinnern ist der Lerneffekt.</p>
      <p><b>3. Hören.</b> Die eigenen Sprachinseln in Schleife hören, dazu echte Inhalte (Podcasts, Serien) – Zeit dafür unter „Hören“ eintragen.</p>
      <p><b>4. Shadowing.</b> Satz anhören und sofort laut nachsprechen, Rhythmus und Betonung kopieren. Aufnehmen und mit dem Original vergleichen.</p>
      <p><b>5. Sprachinseln.</b> 10–20 Sätze pro Thema, die du wirklich sagen wirst: wer du bist, was du machst, was du magst. Keine Grammatikübungen – Grammatik kommt über korrekte Sätze.</p>
    </div>
    <p class="muted small">Wichtig: Die Aussprache kommt aus der Sprachausgabe deines Geräts (keine Muttersprachler-Aufnahmen). Selbst übersetzte Sätze vor dem Lernen prüfen lassen – Fehler lernt man sonst mit.</p>`;
};

views.vocab = function (root, arg) {
  const mode = arg || 'new';
  root.innerHTML = `
    <h1>🧠 Wörter</h1>
    ${voiceNotice()}
    <div class="seg">
      <button data-m="new" class="${mode === 'new' ? 'on' : ''}">Neu</button>
      <button data-m="recall" class="${mode === 'recall' ? 'on' : ''}">Abfragen (${dueIds(isWordId).length})</button>
      <button data-m="own" class="${mode === 'own' ? 'on' : ''}">Eigene</button>
    </div>
    <div id="pane"></div>`;
  $$('.seg button', root).forEach(b => { b.onclick = () => { location.hash = '#vocab/' + b.dataset.m; }; });
  const pane = $('#pane', root);
  if (mode === 'recall') {
    recallSession(pane, dueIds(isWordId), {
      big: 'target',
      emptyText: 'Keine Wörter fällig.',
      get: id => { const w = wordById(id); return w && { t: w.t, d: w.d, note: state.notes[id] }; },
    });
  } else if (mode === 'own') {
    vocabOwn(pane);
  } else {
    vocabNew(pane);
  }
};

function vocabNew(pane) {
  const l = dayLog();
  const limit = settings.newWords + (l.extraNew || 0);
  const recallTab = $('.seg [data-m="recall"]');
  if (recallTab) recallTab.textContent = `Abfragen (${dueIds(isWordId).length})`;
  const pool = allWords().filter(w => !state.srs[w.id]);
  if (!pool.length) {
    pane.innerHTML = `<div class="card">Alle Wörter sind im Training. Importiere weitere unter „Eigene“.</div>`;
    return;
  }
  if (l.newWords >= limit) {
    pane.innerHTML = `<div class="card flash"><div class="target">✅</div><p>Tagesziel erreicht: ${l.newWords} neue Wörter.</p>
      <div class="row" style="justify-content:center"><a class="btn primary" href="#vocab/recall">Jetzt abfragen</a><button class="btn" id="more">+10 weitere</button></div></div>`;
    $('#more', pane).onclick = () => { l.extraNew = (l.extraNew || 0) + 10; persist(); vocabNew(pane); };
    return;
  }
  const w = pool[0];
  const nudge = l.newWords > 0 && l.newWords % 10 === 0;
  pane.innerHTML = `
    <div class="row between muted small"><span>Heute ${l.newWords}/${limit}</span><span>${pool.length} noch nicht gelernt</span></div>
    <div class="progress" style="margin:6px 0 12px"><div style="width:${l.newWords / limit * 100}%"></div></div>
    ${nudge ? `<div class="notice">${l.newWords} neue Wörter – kurz <a href="#vocab/recall">abfragen</a>, bevor es weitergeht?</div>` : ''}
    <div class="card flash">
      <div class="target">${esc(w.t)}</div>
      <div class="native">${esc(w.d)}</div>
      <button class="btn small" id="play" style="margin-top:10px">🔊 Anhören</button>
    </div>
    <label for="note">Eselsbrücke: Welches Bild verbindet Klang und Bedeutung?</label>
    <textarea id="note" placeholder="z. B. ein absurdes Bild, das du dir vorstellst">${esc(state.notes[w.id] || '')}</textarea>
    <div class="row" style="margin-top:10px">
      <button class="btn" id="known">Kenne ich schon</button>
      <button class="btn primary grow" id="learned">Gelernt ✓</button>
    </div>
    <p class="muted small">Wort 2–3× laut nachsprechen. Gelernte Wörter kommen heute noch in die Abfrage.</p>`;
  const saveNote = () => {
    const v = $('#note', pane).value.trim();
    if (v) state.notes[w.id] = v; else delete state.notes[w.id];
  };
  speak(w.t);
  $('#play', pane).onclick = () => speak(w.t);
  $('#known', pane).onclick = () => {
    saveNote();
    const t = today();
    state.srs[w.id] = { iv: 21, ef: 2.5, reps: 1, lapses: 0, due: t + 21 };
    persist();
    vocabNew(pane);
  };
  $('#learned', pane).onclick = () => {
    saveNote();
    state.srs[w.id] = { iv: 0, ef: 2.5, reps: 0, lapses: 0, due: today() };
    l.newWords++;
    persist();
    vocabNew(pane);
  };
}

function vocabOwn(pane) {
  const code = settings.lang === 'it' ? 'Italienisch' : 'Englisch';
  pane.innerHTML = `
    <div class="card">
      <b>Wort hinzufügen</b>
      <label for="w-t">${code}</label><input type="text" id="w-t" autocapitalize="off">
      <label for="w-d">Deutsch</label><input type="text" id="w-d">
      <button class="btn primary" id="w-add" style="margin-top:10px">Hinzufügen</button>
    </div>
    <div class="card">
      <b>Liste importieren</b>
      <p class="muted small">Eine Zeile pro Wort: <code>${code} | Deutsch</code> (auch <code>;</code> oder Tab als Trenner). Z. B. aus einer Häufigkeitsliste oder Tabelle kopieren.</p>
      <textarea id="w-bulk" placeholder="${settings.lang === 'it' ? 'la forchetta | die Gabel' : 'the fork | die Gabel'}"></textarea>
      <button class="btn" id="w-import" style="margin-top:8px">Importieren</button>
    </div>
    <h2>Eigene Wörter (${state.words.length})</h2>
    <ul class="list card" id="w-list">
      ${state.words.length ? state.words.slice().reverse().map(w => `
        <li><div class="grow"><div class="t">${esc(w.t)}</div><div class="d">${esc(w.d)}</div></div>
        <button class="btn small danger" data-del="${esc(w.id)}">✕</button></li>`).join('') : '<li class="muted">Noch keine.</li>'}
    </ul>`;
  const exists = t => allWords().some(w => w.t.toLowerCase() === t.toLowerCase());
  $('#w-add', pane).onclick = () => {
    const t = $('#w-t', pane).value.trim(), d = $('#w-d', pane).value.trim();
    if (!t || !d) { toast('Beide Felder ausfüllen'); return; }
    if (exists(t)) { toast('Gibt es schon'); return; }
    state.words.push({ id: 'u:' + uid(), t, d });
    persist();
    vocabOwn(pane);
  };
  $('#w-import', pane).onclick = () => {
    const pairs = parseLines($('#w-bulk', pane).value);
    let n = 0;
    pairs.forEach(([t, d]) => { if (!exists(t)) { state.words.push({ id: 'u:' + uid(), t, d }); n++; } });
    persist();
    toast(`${n} Wörter importiert` + (pairs.length - n ? `, ${pairs.length - n} übersprungen` : ''));
    vocabOwn(pane);
  };
  $$('[data-del]', pane).forEach(b => {
    b.onclick = () => {
      const id = b.dataset.del;
      state.words = state.words.filter(w => w.id !== id);
      delete state.srs[id];
      delete state.notes[id];
      persist();
      vocabOwn(pane);
    };
  });
}

views.review = function (root) {
  const l = dayLog();
  const sentences = allSentences();
  const byId = Object.fromEntries(sentences.map(s => [s.id, s]));
  const due = dueIds(id => id.startsWith('s:') && byId[id]);
  const newOnes = sentences.filter(s => !state.srs[s.id]).slice(0, Math.max(0, settings.newSentences - l.newSent)).map(s => s.id);
  root.innerHTML = `
    <h1>🔁 Sätze wiederholen</h1>
    ${voiceNotice()}
    <p class="muted small">Deutschen Satz sehen → selbst auf ${LANGS[settings.lang].name} sagen → aufdecken → laut nachsprechen.</p>
    <div id="pane"></div>`;
  recallSession($('#pane', root), due.concat(newOnes), {
    big: 'sentence',
    typing: true,
    emptyText: 'Nichts fällig. Neue Sätze kommen aus deinen Sprachinseln.',
    doneExtra: `<a class="btn big" href="#shadow">Weiter zum Shadowing</a>`,
    get: id => { const s = byId[id]; return s && { t: s.t, d: s.d, isNew: !state.srs[id] }; },
  });
};

let listenToken = null;
function stopAudio() {
  if (listenToken) listenToken.stop = true;
  listenToken = null;
  listening = false;
  if (window.speechSynthesis) speechSynthesis.cancel();
}

views.listen = function (root) {
  const opts = Object.assign({ island: 'all', de: false, repeat: 2, pause: 2, loop: false }, load('sl.listen', {}));
  root.innerHTML = `
    <h1>🎧 Hören</h1>
    ${voiceNotice()}
    <div class="card">
      <label for="l-isl">Sprachinsel</label>${islandSelect('l-isl', opts.island, true)}
      <div class="row" style="margin-top:6px">
        <div class="grow"><label for="l-rep">Wiederholungen</label><select id="l-rep">${[1, 2, 3].map(n => `<option ${n === opts.repeat ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="grow"><label for="l-pause">Pause (Sek.)</label><select id="l-pause">${[1, 2, 3, 5].map(n => `<option ${n === opts.pause ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <label class="inline"><input type="checkbox" id="l-de" ${opts.de ? 'checked' : ''}> Deutsch vorher sprechen</label>
      <label class="inline"><input type="checkbox" id="l-loop" ${opts.loop ? 'checked' : ''}> Endlosschleife</label>
      <button class="btn primary big" id="l-play" style="margin-top:12px">▶ Abspielen</button>
      <p class="muted small">Bildschirm anlassen – manche Handys stoppen die Sprachausgabe sonst.</p>
    </div>
    <ul class="list card" id="l-list"></ul>
    <div class="card">
      <b>Echte Inhalte gehört?</b>
      <p class="muted small">Podcast, Serie, Radio auf ${LANGS[settings.lang].name}: Zeit hier eintragen.</p>
      <div class="row">${[5, 10, 15, 30].map(m => `<button class="btn" data-add="${m}">+${m} Min.</button>`).join('')}</div>
    </div>`;
  const items = () => {
    const v = $('#l-isl', root).value;
    return v === 'all' ? allSentences() : (state.islands.find(i => i.id === v) || { sentences: [] }).sentences;
  };
  const renderList = (now = -1) => {
    $('#l-list', root).innerHTML = items().map((s, i) => `<li class="${i === now ? 'now' : ''}"><div><div class="t">${esc(s.t)}</div><div class="d">${esc(s.d)}</div></div></li>`).join('') || '<li class="muted">Keine Sätze.</li>';
  };
  const readOpts = () => {
    opts.island = $('#l-isl', root).value;
    opts.repeat = Number($('#l-rep', root).value);
    opts.pause = Number($('#l-pause', root).value);
    opts.de = $('#l-de', root).checked;
    opts.loop = $('#l-loop', root).checked;
    save('sl.listen', opts);
  };
  $$('select, input', root).forEach(el => { el.onchange = () => { readOpts(); renderList(); }; });
  renderList();
  const btn = $('#l-play', root);
  btn.onclick = async () => {
    if (listenToken) { stopAudio(); btn.textContent = '▶ Abspielen'; renderList(); return; }
    readOpts();
    const list = items();
    if (!list.length) return;
    const token = { stop: false };
    listenToken = token;
    listening = true;
    btn.textContent = '■ Stopp';
    do {
      for (let i = 0; i < list.length && !token.stop; i++) {
        renderList(i);
        const li = $('#l-list .now', root);
        if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (opts.de) { await speakP(list[i].d, { lang: 'de' }); if (token.stop) break; await wait(opts.pause * 1000); }
        for (let r = 0; r < opts.repeat && !token.stop; r++) {
          await speakP(list[i].t);
          if (!token.stop) await wait(opts.pause * 1000);
        }
      }
    } while (opts.loop && !token.stop);
    if (listenToken === token) { listenToken = null; listening = false; btn.textContent = '▶ Abspielen'; renderList(); }
  };
  $$('[data-add]', root).forEach(b => {
    b.onclick = () => {
      const l = dayLog();
      l.sec.listen = (l.sec.listen || 0) + Number(b.dataset.add) * 60;
      persist();
      toast(`+${b.dataset.add} Min. Hören eingetragen`);
    };
  });
};

let recorder = null;
views.shadow = function (root) {
  const saved = load('sl.shadow.' + settings.lang, {});
  let islandId = state.islands.some(i => i.id === saved.island) ? saved.island : (state.islands[0] && state.islands[0].id);
  let idx = saved.idx || 0;
  let ownUrl = null;
  root.innerHTML = `
    <h1>🗣️ Shadowing</h1>
    ${voiceNotice()}
    <p class="muted small">Anhören → sofort laut mitsprechen. Rhythmus, Betonung und Melodie kopieren, nicht nur die Wörter.</p>
    ${state.islands.length ? islandSelect('s-isl', islandId, false) : ''}
    <div id="s-pane" style="margin-top:12px"></div>`;
  const pane = $('#s-pane', root);
  if (!state.islands.length) { pane.innerHTML = '<div class="card">Erst eine Sprachinsel anlegen.</div>'; return; }
  $('#s-isl', root).onchange = e => { islandId = e.target.value; idx = 0; render(); };
  function render() {
    const isl = state.islands.find(i => i.id === islandId);
    const list = isl ? isl.sentences : [];
    if (!list.length) { pane.innerHTML = '<div class="card">Diese Insel hat noch keine Sätze.</div>'; return; }
    if (idx >= list.length) idx = 0;
    save('sl.shadow.' + settings.lang, { island: islandId, idx });
    const s = list[idx];
    if (ownUrl) { URL.revokeObjectURL(ownUrl); ownUrl = null; }
    pane.innerHTML = `
      <div class="row between muted small"><span>Satz ${idx + 1}/${list.length}</span></div>
      <div class="card flash">
        <div class="sentence">${esc(s.t)}</div>
        <div class="native">${esc(s.d)}</div>
        <div id="s-cmp" class="small" style="margin-top:8px"></div>
      </div>
      <div class="row">
        <button class="btn grow" id="s-play">▶ Anhören</button>
        <button class="btn grow" id="s-slow">🐢 Langsam</button>
        <button class="btn grow" id="s-loop">🔁 3×</button>
      </div>
      <div class="row" style="margin-top:8px">
        ${window.MediaRecorder ? '<button class="btn grow" id="s-rec">🎙 Aufnehmen</button>' : ''}
        ${SR ? '<button class="btn grow" id="s-check">✅ Aussprache prüfen</button>' : ''}
      </div>
      <div id="s-own" style="margin-top:8px"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn grow" id="s-prev">‹ Zurück</button>
        <button class="btn primary grow" id="s-next">Weiter ›</button>
      </div>
      <p class="muted small">„Aussprache prüfen“ nutzt die Spracherkennung des Browsers – ein grober Hinweis, kein Urteil über den Akzent.</p>`;
    speak(s.t);
    $('#s-play', pane).onclick = () => speak(s.t);
    $('#s-slow', pane).onclick = () => speak(s.t, { rate: 0.6 });
    $('#s-loop', pane).onclick = async () => {
      for (let i = 0; i < 3; i++) { await speakP(s.t); await wait(Math.max(1500, s.t.length * 80)); }
    };
    $('#s-prev', pane).onclick = () => { idx = (idx - 1 + list.length) % list.length; render(); };
    $('#s-next', pane).onclick = () => { idx = (idx + 1) % list.length; render(); };
    if ($('#s-check', pane)) {
      $('#s-check', pane).onclick = async () => {
        const b = $('#s-check', pane);
        b.textContent = '… sprich jetzt';
        b.disabled = true;
        let said = '';
        try { said = await recognize(); } catch (e) { toast('Spracherkennung: ' + e); }
        b.textContent = '✅ Aussprache prüfen';
        b.disabled = false;
        if (!said) { toast('Nichts erkannt'); return; }
        const c = compareWords(s.t, said);
        $('#s-cmp', pane).innerHTML = `<p>Erkannt: „${esc(said)}“</p><p>${c.html} <b>${c.score}%</b></p>`;
      };
    }
    if ($('#s-rec', pane)) {
      $('#s-rec', pane).onclick = async () => {
        const b = $('#s-rec', pane);
        if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
        let stream;
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Kein Mikrofonzugriff'); return; }
        const chunks = [];
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          b.textContent = '🎙 Aufnehmen';
          b.classList.remove('rec');
          if (ownUrl) URL.revokeObjectURL(ownUrl);
          ownUrl = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
          $('#s-own', pane).innerHTML = `<div class="card"><b>Deine Aufnahme</b><audio controls src="${ownUrl}" style="width:100%;margin-top:6px"></audio>
            <button class="btn" id="s-cmpplay" style="width:100%;margin-top:6px">Original → Aufnahme vergleichen</button></div>`;
          $('#s-cmpplay', pane).onclick = async () => { await speakP(s.t); await wait(400); $('#s-own audio', pane).play(); };
        };
        recorder.start();
        b.textContent = '■ Stopp';
        b.classList.add('rec');
      };
    }
  }
  render();
};

views.islands = function (root, id) {
  const isl = id && state.islands.find(i => i.id === id);
  if (isl) { islandDetail(root, isl); return; }
  root.innerHTML = `
    <h1>🏝️ Sprachinseln</h1>
    <p class="muted small">10–20 Sätze pro Thema, die du im echten Leben sagen wirst. Die mitgelieferten Inseln sind Vorlagen – Namen, Orte und Details an dich anpassen.</p>
    ${state.islands.map(i => `
      <a class="card step" href="#islands/${i.id}">
        <div class="num">${i.sentences.length}</div>
        <div class="grow"><b>${esc(i.title)}</b><div class="meta">${i.sentences.length} Sätze</div></div><div>›</div>
      </a>`).join('')}
    <div class="card">
      <b>Neue Insel</b>
      <p class="muted small">Ideen: Arbeit, Hobbys, Familie, Wohnung, Wochenende, Arztbesuch, Einkaufen, Meinungen.</p>
      <div class="row"><input type="text" id="i-title" class="grow" placeholder="Thema"><button class="btn primary" id="i-add">Anlegen</button></div>
    </div>`;
  $('#i-add', root).onclick = () => {
    const title = $('#i-title', root).value.trim();
    if (!title) return;
    const n = { id: uid(), title, sentences: [] };
    state.islands.push(n);
    persist();
    location.hash = '#islands/' + n.id;
  };
};

function islandDetail(root, isl) {
  const code = LANGS[settings.lang].name;
  root.innerHTML = `
    <a href="#islands" class="small">‹ Alle Inseln</a>
    <input type="text" id="i-name" value="${esc(isl.title)}" style="font-size:20px;font-weight:700;margin:8px 0 12px">
    <div class="card">
      <b>Satz hinzufügen</b>
      <label for="s-d">Deutsch – was willst du sagen?</label><input type="text" id="s-d">
      <label for="s-t">${code}</label><input type="text" id="s-t" autocapitalize="sentences">
      <p class="muted small">Übersetzung selbst schreiben oder aus DeepL/Google kopieren – bei Unsicherheit von einer Muttersprachlerin prüfen lassen.</p>
      <button class="btn primary" id="s-add">Hinzufügen</button>
    </div>
    <ul class="list card">
      ${isl.sentences.map(s => `
        <li><button class="btn small" data-play="${s.id}">🔊</button>
          <div class="grow"><div class="t">${esc(s.t)}</div><div class="d">${esc(s.d)}</div></div>
          <button class="btn small" data-edit="${s.id}">✎</button>
          <button class="btn small danger" data-del="${s.id}">✕</button></li>`).join('') || '<li class="muted">Noch keine Sätze.</li>'}
    </ul>
    <details class="card">
      <summary><b>Mehrere Sätze einfügen</b></summary>
      <p class="muted small">Eine Zeile pro Satz: <code>${code} | Deutsch</code></p>
      <textarea id="s-bulk"></textarea>
      <button class="btn" id="s-import" style="margin-top:8px">Einfügen</button>
    </details>
    <button class="btn danger" id="i-del" style="width:100%">Insel löschen</button>`;
  const find = id => isl.sentences.find(s => s.id === id);
  $('#i-name', root).onchange = e => { isl.title = e.target.value.trim() || isl.title; persist(); };
  $('#s-add', root).onclick = () => {
    const d = $('#s-d', root).value.trim(), t = $('#s-t', root).value.trim();
    if (!d || !t) { toast('Beide Felder ausfüllen'); return; }
    isl.sentences.push({ id: 's:' + uid(), t, d });
    persist();
    islandDetail(root, isl);
    $('#s-d', root).focus();
  };
  $('#s-import', root).onclick = () => {
    const pairs = parseLines($('#s-bulk', root).value);
    pairs.forEach(([t, d]) => isl.sentences.push({ id: 's:' + uid(), t, d }));
    persist();
    toast(`${pairs.length} Sätze eingefügt`);
    islandDetail(root, isl);
  };
  $$('[data-play]', root).forEach(b => { b.onclick = () => speak(find(b.dataset.play).t); });
  $$('[data-edit]', root).forEach(b => {
    b.onclick = () => {
      const s = find(b.dataset.edit);
      const t = prompt(code + ':', s.t);
      if (t === null) return;
      const d = prompt('Deutsch:', s.d);
      if (d === null) return;
      if (t.trim()) s.t = t.trim();
      if (d.trim()) s.d = d.trim();
      persist();
      islandDetail(root, isl);
    };
  });
  $$('[data-del]', root).forEach(b => {
    b.onclick = () => {
      isl.sentences = isl.sentences.filter(s => s.id !== b.dataset.del);
      delete state.srs[b.dataset.del];
      persist();
      islandDetail(root, isl);
    };
  });
  $('#i-del', root).onclick = () => {
    if (!confirm(`Insel „${isl.title}“ mit ${isl.sentences.length} Sätzen löschen?`)) return;
    isl.sentences.forEach(s => delete state.srs[s.id]);
    state.islands = state.islands.filter(i => i !== isl);
    persist();
    location.hash = '#islands';
  };
}

views.settings = function (root) {
  const voiceOpts = lang => {
    const list = voicesFor(lang);
    if (!list.length) return '<option value="">(keine Stimme gefunden)</option>';
    return `<option value="">Automatisch</option>` + list.map(v => `<option ${settings.voices[lang] === v.name ? 'selected' : ''} value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  };
  root.innerHTML = `
    <h1>⚙️ Einstellungen</h1>
    <div class="card">
      <label for="o-new">Neue Wörter pro Tag</label><input type="number" id="o-new" min="5" max="200" value="${settings.newWords}">
      <label for="o-sent">Neue Sätze pro Tag (Wiederholung)</label><input type="number" id="o-sent" min="0" max="100" value="${settings.newSentences}">
      <label for="o-rate">Sprechtempo: <span id="o-rate-v">${settings.rate}</span></label><input type="range" id="o-rate" min="0.5" max="1.2" step="0.05" value="${settings.rate}" style="width:100%">
      <label for="o-var">Englisch-Variante</label>
      <select id="o-var"><option value="en-GB" ${settings.enVariant === 'en-GB' ? 'selected' : ''}>Britisch (en-GB)</option><option value="en-US" ${settings.enVariant === 'en-US' ? 'selected' : ''}>Amerikanisch (en-US)</option></select>
      <label for="o-vit">Stimme Italienisch</label><select id="o-vit">${voiceOpts('it')}</select>
      <label for="o-ven">Stimme Englisch</label><select id="o-ven">${voiceOpts('en')}</select>
      <button class="btn" id="o-test" style="margin-top:10px">🔊 Stimme testen</button>
    </div>
    <div class="card">
      <b>Backup</b>
      <p class="muted small">Alle Daten liegen nur in diesem Browser. Browserdaten löschen = Fortschritt weg. Regelmäßig exportieren; zum Übertragen aufs Handy dort importieren.</p>
      <div class="row"><button class="btn grow" id="o-export">⬇ Exportieren</button><label class="btn grow" style="margin:0;color:var(--text);font-size:16px">⬆ Importieren<input type="file" id="o-import" accept=".json,application/json" hidden></label></div>
    </div>
    <div class="card">
      <b>Zurücksetzen</b>
      <p class="muted small">Löscht Fortschritt, eigene Wörter und Inseln für ${LANGS[settings.lang].name}.</p>
      <button class="btn danger" id="o-reset">${LANGS[settings.lang].name} zurücksetzen</button>
    </div>`;
  const num = (el, min, max, fallback) => { const v = parseInt(el.value, 10); return isNaN(v) ? fallback : Math.min(max, Math.max(min, v)); };
  $('#o-new', root).onchange = e => { settings.newWords = num(e.target, 5, 200, 30); saveSettings(); };
  $('#o-sent', root).onchange = e => { settings.newSentences = num(e.target, 0, 100, 10); saveSettings(); };
  $('#o-rate', root).oninput = e => { settings.rate = Number(e.target.value); $('#o-rate-v', root).textContent = settings.rate; saveSettings(); };
  $('#o-var', root).onchange = e => { settings.enVariant = e.target.value; saveSettings(); };
  $('#o-vit', root).onchange = e => { settings.voices.it = e.target.value; saveSettings(); };
  $('#o-ven', root).onchange = e => { settings.voices.en = e.target.value; saveSettings(); };
  $('#o-test', root).onclick = () => speak(settings.lang === 'it' ? 'Ciao! Come stai oggi?' : 'Hello! How are you today?');
  $('#o-export', root).onclick = () => {
    persist();
    const data = { app: 'sprachtraining', version: 1, exported: new Date().toISOString(), settings, data: {} };
    Object.keys(LANGS).forEach(l => { data.data[l] = load(stateKey(l), null); });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = `sprachtraining-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#o-import', root).onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'sprachtraining') throw new Error('falsches Format');
      if (!confirm('Aktuelle Daten durch das Backup ersetzen?')) return;
      Object.keys(LANGS).forEach(l => { if (data.data[l]) save(stateKey(l), data.data[l]); });
      Object.assign(settings, data.settings);
      saveSettings();
      state = loadState(settings.lang);
      toast('Backup importiert');
      renderLangSwitch();
      route();
    } catch (err) { toast('Import fehlgeschlagen: ' + err.message); }
  };
  $('#o-reset', root).onclick = () => {
    if (!confirm(`Wirklich alle ${LANGS[settings.lang].name}-Daten löschen?`)) return;
    localStorage.removeItem(stateKey(settings.lang));
    state = loadState(settings.lang);
    toast('Zurückgesetzt');
    location.hash = '#home';
  };
};

// ---------- Router ----------
function renderLangSwitch() {
  $$('#lang-switch button').forEach(b => b.classList.toggle('on', b.dataset.lang === settings.lang));
}
function route() {
  stopAudio();
  if (recorder && recorder.state === 'recording') recorder.stop();
  keyHandler = null;
  persist();
  const [name, arg] = location.hash.slice(1).split('/');
  const view = views[name] ? name : 'home';
  activeStep = STEPS.some(s => s.key === view) ? view : null;
  $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === view));
  const root = $('#view');
  views[view](root, arg);
  window.scrollTo(0, 0);
}
$$('#lang-switch button').forEach(b => {
  b.onclick = () => {
    if (b.dataset.lang === settings.lang) return;
    persist();
    settings.lang = b.dataset.lang;
    saveSettings();
    state = loadState(settings.lang);
    renderLangSwitch();
    // Insel-IDs gehören zur Sprache – Detailansicht verlassen
    if (location.hash.startsWith('#islands/')) location.hash = '#islands'; else route();
  };
});
window.addEventListener('hashchange', route);
renderLangSwitch();
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
