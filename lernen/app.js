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
const goalMin = () => settings.dailyGoal || 30; // Tagesziel in Minuten (einstellbar)
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
  { lang: 'it', newWords: 30, newSentences: 10, rate: 0.9, enVariant: 'en-GB', voices: {}, voiceGender: {}, autoTempo: true, talkModel: 'claude-opus-5-5', teen: false, dailyGoal: 30 },
  load('sl.settings', {})
);
settings.profile = Object.assign({ name: '', gender: 'm', origin: 'de', city: '', ts: 0 }, settings.profile);
function saveSettings() { save('sl.settings', settings); }
// Eltern-Sperre: KI-Gespräche aus, Jugend-Modus fest an; nur mit PIN aufzuheben (nur auf diesem Gerät, nicht im Sync)
function talkLocked() { return !!(settings.lock && settings.lock.pin); }
async function pinHash(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sl-lock|' + pin));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function applyLock() {
  const tab = document.querySelector('.tabs a[data-tab="talk"]');
  if (tab) tab.hidden = talkLocked();
  const bar = document.querySelector('.tabs');
  if (bar) bar.style.gridTemplateColumns = `repeat(${talkLocked() ? 6 : 7}, 1fr)`;
}

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
    const seen = new Set();
    starterCache[lang] = parseLines(window.STARTER[lang].words + '\n' + (window.STARTER[lang].more || ''))
      .map(([t, d]) => ({ id: 'w:' + t, t, d }))
      .filter(w => !seen.has(w.id) && seen.add(w.id));
  }
  return starterCache[lang];
}

// Vorlagen-Inseln bekommen feste IDs, damit sie sich zwischen Geräten nicht verdoppeln.
function starterIslands(lang) {
  return window.STARTER[lang].islands.map((isl, i) => ({
    id: `st-${lang}-${i}`,
    title: isl.title,
    ts: 0,
    sentences: parseLines(isl.sentences).map(([t, d], j) => ({ id: `s:st-${lang}-${i}-${j}`, t, d, ts: 0 })),
  }));
}
function stateKey(lang) { return 'sl.data.' + lang; }
function emptyState() {
  return { words: [], islands: [], srs: {}, notes: {}, noteTs: {}, overrides: {}, log: {}, deleted: {}, builderVerbs: [], resetAt: 0, level: null, talkAdjust: 0, texts: [], grammar: {}, weekTests: {} };
}
function loadState(lang) {
  let s = load(stateKey(lang), null);
  if (!s) {
    s = emptyState();
    s.islands = starterIslands(lang);
    save(stateKey(lang), s);
    return s;
  }
  s = Object.assign(emptyState(), s);
  // Alte Version: Vorlagen-Inseln hatten zufällige IDs -> auf feste IDs umstellen
  starterIslands(lang).forEach((st, i) => {
    const isl = s.islands[i];
    if (!isl || isl.id === st.id || isl.title !== st.title || s.islands.some(x => x.id === st.id)) return;
    isl.id = st.id;
    isl.sentences.forEach((sen, j) => {
      const ref = st.sentences[j];
      if (!ref || sen.t !== ref.t || sen.id === ref.id) return;
      if (s.srs[sen.id]) { s.srs[ref.id] = s.srs[sen.id]; delete s.srs[sen.id]; }
      sen.id = ref.id;
    });
  });
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
function dayMinutes(day) {
  const l = state.log[day];
  return l ? Object.values(l.sec || {}).reduce((a, b) => a + b, 0) / 60 : 0;
}
function weekStart(day) { return day - ((new Date(day * 86400000).getUTCDay() + 6) % 7); } // Montag
// Serie mit Jokern: bis zu 2 verpasste Tage pro Woche (Mo–So) halten die Serie, zählen aber nicht mit.
const JOKERS_PER_WEEK = 2;
function streakInfo() {
  let d = today();
  if (dayMinutes(d) < goalMin()) d--; // heute zählt erst, wenn das Ziel erreicht ist
  let n = 0;
  const used = {};
  for (let k = 0; k < 400; k++, d--) {
    if (dayMinutes(d) >= goalMin()) { n++; continue; }
    const w = weekStart(d);
    if (n > 0 && (used[w] || 0) < JOKERS_PER_WEEK) { used[w] = (used[w] || 0) + 1; continue; }
    break;
  }
  const thisWeek = weekStart(today());
  return { days: n, jokersLeft: JOKERS_PER_WEEK - (used[thisWeek] || 0) };
}
function streak() { return streakInfo().days; }

// ---------- Punkte, Ränge, Abzeichen ----------
// Punkte: fürs Abrufen, Sprechen und Üben (+1 je Lernminute, +20 für erreichtes Tagesziel)
function addXP(n) {
  const l = dayLog();
  l.xp = (l.xp || 0) + n;
  checkBadges();
}
function dayXP(day) {
  const l = state.log[day];
  if (!l) return 0;
  const mins = Math.floor(dayMinutes(day));
  return (l.xp || 0) + mins + (mins >= goalMin() ? 20 : 0);
}
function totalXP() { return Object.keys(state.log).reduce((a, d) => a + dayXP(Number(d)), 0); }
const RANKS = [
  { min: 0, name: '🌱 Neuling' }, { min: 200, name: '🧭 Entdecker' }, { min: 600, name: '📘 Lernende(r)' },
  { min: 1500, name: '🗣️ Sprecher(in)' }, { min: 3000, name: '🎭 Erzähler(in)' }, { min: 6000, name: '🏆 Profi' },
  { min: 10000, name: '👑 Meister(in)' },
];
function rankOf(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].min) i++;
  return { cur: RANKS[i], next: RANKS[i + 1] || null };
}
function sumLog(key) { return Object.values(state.log).reduce((a, l) => a + (l[key] || 0), 0); }
function sumSec(key) { return Object.values(state.log).reduce((a, l) => a + ((l.sec || {})[key] || 0), 0); }
const BADGES = [
  { id: 'w10', icon: '🌱', name: 'Erste Wörter', desc: '10 Wörter im Training', ok: () => Object.keys(state.srs).filter(isWordId).length >= 10 },
  { id: 'w100', icon: '📗', name: '100 Wörter', desc: '100 Wörter im Training', ok: () => Object.keys(state.srs).filter(isWordId).length >= 100 },
  { id: 'w500', icon: '📚', name: '500 Wörter', desc: '500 Wörter im Training', ok: () => Object.keys(state.srs).filter(isWordId).length >= 500 },
  { id: 'w1000', icon: '🏛️', name: '1000 Wörter', desc: '1000 Wörter im Training', ok: () => Object.keys(state.srs).filter(isWordId).length >= 1000 },
  { id: 's20', icon: '💬', name: '20 Sätze', desc: '20 Sätze im Training', ok: () => Object.keys(state.srs).filter(id => id.startsWith('s:')).length >= 20 },
  { id: 's100', icon: '🗨️', name: '100 Sätze', desc: '100 Sätze im Training', ok: () => Object.keys(state.srs).filter(id => id.startsWith('s:')).length >= 100 },
  { id: 'goal', icon: '🎯', name: 'Tagesziel', desc: 'Einmal das Tagesziel geschafft', ok: () => Object.keys(state.log).some(d => dayMinutes(Number(d)) >= goalMin()) },
  { id: 'streak7', icon: '🔥', name: '7 Tage', desc: '7 Tage Serie', ok: () => streakInfo().days >= 7 },
  { id: 'streak30', icon: '☄️', name: '30 Tage', desc: '30 Tage Serie', ok: () => streakInfo().days >= 30 },
  { id: 'talk1', icon: '🎙️', name: 'Erstes Gespräch', desc: 'Ein Gespräch mit Auswertung beendet', ok: () => sumLog('talks') >= 1 },
  { id: 'talk10', icon: '🤝', name: '10 Gespräche', desc: '10 Gespräche beendet', ok: () => sumLog('talks') >= 10 },
  { id: 'shadow60', icon: '🗣️', name: 'Schattenläufer', desc: '60 Minuten Shadowing', ok: () => sumSec('shadow') >= 3600 },
  { id: 'listen120', icon: '🎧', name: 'Gute Ohren', desc: '2 Stunden Hören', ok: () => sumSec('listen') >= 7200 },
  { id: 'drill50', icon: '🧱', name: 'Baumeister', desc: '50 Sätze im Drill gebildet', ok: () => sumLog('drill') >= 50 },
  { id: 'test', icon: '📈', name: 'Eingestuft', desc: 'Einstufungstest gemacht', ok: () => !!state.level },
  { id: 'text', icon: '📄', name: 'Textforscher', desc: 'Einen eigenen Text übersetzt', ok: () => (state.texts || []).some(t => t.lines.length && t.lines.every(l => l.de)) },
];
let badgeCheckAt = 0;
function checkBadges(force) {
  if (!force && Date.now() - badgeCheckAt < 3000) return; // nicht bei jedem Klick alles zählen
  badgeCheckAt = Date.now();
  state.badges = state.badges || {};
  const fresh = BADGES.filter(b => !state.badges[b.id] && b.ok());
  fresh.forEach(b => { state.badges[b.id] = Date.now(); });
  if (fresh.length) { persist(); toast(`🏅 Neues Abzeichen: ${fresh.map(b => b.icon + ' ' + b.name).join(', ')}`); }
}

// Wochenwerte (Mo–So) für Rückblick und Teilen
function weekStats(start) {
  const out = { minutes: 0, days: 0, xp: 0, newWords: 0, reviews: 0, wok: 0, wfail: 0, talks: 0, newSent: 0 };
  for (let d = start; d < start + 7 && d <= today(); d++) {
    const l = state.log[d];
    if (!l) continue;
    const m = dayMinutes(d);
    out.minutes += m;
    if (m >= 1) out.days++;
    out.xp += dayXP(d);
    ['newWords', 'reviews', 'wok', 'wfail', 'talks', 'newSent'].forEach(k => { out[k] += l[k] || 0; });
  }
  out.acc = out.wok + out.wfail ? Math.round(out.wok / (out.wok + out.wfail) * 100) : null;
  return out;
}
function fmtMin(m) { m = Math.round(m); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; }
function fmtDay(day) { return new Date(day * 86400000).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }

// Jugend-Modus: Vorlage-Inseln für Jugendliche in beiden Sprachen ergänzen (feste IDs → kein Doppeln im Sync)
function ensureTeenIslands() {
  let added = 0;
  Object.keys(LANGS).forEach(lang => {
    const st = lang === settings.lang ? state : loadState(lang);
    window.TEEN.islands[lang].forEach((isl, i) => {
      const id = `teen-${lang}-${i}`;
      if (st.islands.some(x => x.id === id) || (st.deleted && st.deleted[id])) return;
      st.islands.push({ id, title: isl.title, ts: Date.now(), sentences: parseLines(isl.sentences).map(([t, d], j) => ({ id: `s:teen-${lang}-${i}-${j}`, t, d, ts: Date.now() })) });
      added++;
    });
    if (lang === settings.lang) persist(); else save(stateKey(lang), st);
  });
  return added;
}

// ---------- Inhalte ----------
function allWords() {
  return starterWords(settings.lang).concat(state.words).map(w => {
    const o = state.overrides[w.id];
    return o ? Object.assign({}, w, { t: o.t || w.t, d: o.d || w.d, fixed: true }) : w;
  });
}
function markDeleted(id) { state.deleted[id] = Date.now(); }
function setNote(id, text) {
  if ((state.notes[id] || '') === text) return;
  if (text) state.notes[id] = text; else delete state.notes[id];
  state.noteTs[id] = Date.now();
}
// Übersetzung eines Worts korrigieren (auch mitgelieferte Wörter)
function correctWord(id, done) {
  const w = wordById(id);
  if (!w) return;
  const t = prompt(LANGS[settings.lang].name + ':', w.t);
  if (t === null) return;
  const d = prompt('Deutsch:', w.d);
  if (d === null) return;
  if (id.startsWith('u:')) {
    const own = state.words.find(x => x.id === id);
    own.t = t.trim() || own.t; own.d = d.trim() || own.d; own.ts = Date.now();
  } else {
    state.overrides[id] = { t: t.trim(), d: d.trim(), ts: Date.now() };
  }
  persist();
  toast('Korrigiert');
  done && done();
}
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

// ---------- Niveau ----------
const STAGES = [
  { id: 'A0', min: 0, text: 'Einstieg – erste Wörter und feste Sätze' },
  { id: 'A1', min: 100, text: 'Einfache Sätze über dich und den Alltag' },
  { id: 'A2', min: 500, text: 'Alltagsgespräche zu vertrauten Themen' },
  { id: 'B1', min: 1000, text: 'Du kommst in den meisten Alltagssituationen zurecht' },
  { id: 'B2', min: 2000, text: 'Fließende Gespräche zu vielen Themen' },
];
// „Sichere“ Wörter: mehrfach richtig abgerufen oder im Test als bekannt bestätigt
function secureWordCount() {
  return Object.entries(state.srs).filter(([id, c]) => isWordId(id) && c.iv >= 3).length;
}
function accuracy(days) {
  let ok = 0, fail = 0;
  for (let d = today() - days + 1; d <= today(); d++) {
    const l = state.log[d];
    if (l) { ok += l.wok || 0; fail += l.wfail || 0; }
  }
  return { ok, fail, total: ok + fail, rate: ok + fail ? ok / (ok + fail) : null };
}
function levelInfo() {
  const words = secureWordCount();
  let i = 0;
  while (i + 1 < STAGES.length && words >= STAGES[i + 1].min) i++;
  const next = STAGES[i + 1];
  return {
    stage: STAGES[i], idx: i, words, next,
    progress: next ? (words - STAGES[i].min) / (next.min - STAGES[i].min) : 1,
    acc: accuracy(7),
  };
}
// Neue Wörter pro Tag an die Trefferquote und den Rückstand anpassen
function newWordTempo() {
  const base = settings.newWords;
  if (!settings.autoTempo) return { n: base, reason: '' };
  const acc = accuracy(7);
  const backlog = dueIds(isWordId).length;
  let f = 1, reason = '';
  if (backlog > 150) { f = 0.5; reason = `${backlog} Wörter sind fällig – erst wiederholen`; }
  else if (acc.total >= 30 && acc.rate < 0.6) { f = 0.5; reason = `Trefferquote ${Math.round(acc.rate * 100)} % in 7 Tagen`; }
  else if (acc.total >= 30 && acc.rate < 0.75) { f = 0.75; reason = `Trefferquote ${Math.round(acc.rate * 100)} % in 7 Tagen`; }
  else if (acc.total >= 30 && acc.rate > 0.9 && backlog < 20) { f = 1.3; reason = `Trefferquote ${Math.round(acc.rate * 100)} % – du schaffst mehr`; }
  return { n: Math.max(5, Math.min(80, Math.round(base * f))), reason };
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
  c.ts = Date.now();
  state.srs[id] = c;
  const l = dayLog();
  l.reviews++;
  if (isWordId(id)) { if (r === 0) l.wfail = (l.wfail || 0) + 1; else l.wok = (l.wok || 0) + 1; }
  if (isNew && id.startsWith('s:')) l.newSent++;
  // Punkte fürs Abrufen – gleich für jede Bewertung, damit sich ehrliches „Nochmal“ nicht rächt
  addXP(isWordId(id) || id.startsWith('r:') ? 2 : 3);
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
  speechSynthesis.onvoiceschanged = () => { refreshVoices(); if (location.hash.startsWith('#settings') || location.hash === '#home' || location.hash === '#listen/stories' || !location.hash) route(); };
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
  // Klammerzusätze nicht vorlesen, „a / b“ als kurze Pause statt „Schrägstrich“
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, '').replace(/\s*\/\s*/g, ', ').trim());
  if (opts.lang === 'de') {
    u.lang = 'de-DE';
    const v = voicesFor('de')[0];
    if (v) u.voice = v;
  } else if (opts.voice) {
    u.voice = opts.voice;
    u.lang = opts.voice.lang;
  } else {
    u.lang = langCode();
    const v = pickVoice(settings.lang);
    if (v) u.voice = v;
  }
  u.rate = opts.rate || settings.rate;
  if (opts.pitch) u.pitch = opts.pitch;
  let finished = false;
  const done = () => { if (!finished) { finished = true; opts.onend && opts.onend(); } };
  u.onend = done;
  u.onerror = done;
  if (opts.onstart) u.onstart = opts.onstart;
  if (opts.onboundary) u.onboundary = opts.onboundary;
  currentUtterance = u;
  speechSynthesis.speak(u);
  // Fallback, falls der Browser onend nicht meldet
  setTimeout(done, 4000 + text.length * 150 / u.rate);
}
function speakP(text, opts = {}) { return new Promise(res => speak(text, Object.assign({}, opts, { onend: res }))); }
function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

// ---------- Spracherkennung & Vergleich ----------
// Diktat ohne automatisches Ende: Pausen zum Nachdenken sind erlaubt. Die Browser-Erkennung
// beendet sich bei Stille oft selbst – dann wird sie neu gestartet, bis der Nutzer „Fertig“ tippt.
const DICTATION_MAX_MS = 180000;
function dictation(onUpdate, lang) {
  let done = [];          // Text aus bereits beendeten Erkennungs-Sitzungen
  let parts = [];         // endgültige Teile der laufenden Sitzung
  let stopped = false, cancelled = false, rec = null, resolveFn, rejectFn;
  const promise = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
  const text = (interim = '') => done.concat(parts, interim ? [interim] : []).join(' ').replace(/\s+/g, ' ').trim();
  const finish = () => resolveFn(cancelled ? '' : text());
  const start = () => {
    parts = [];
    rec = new SR();
    rec.lang = lang || langCode();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      // Aus allen Ergebnissen neu aufbauen; manche Android-Versionen liefern kumulative Ergebnisse doppelt
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
      // no-speech / aborted: einfach weitermachen (onend startet neu)
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
    cancel() { cancelled = true; this.cancelledByUser = true; this.stop(); },
  };
  return ctl;
}
let activeDictation = null;
function cancelDictation() { if (activeDictation) { activeDictation.cancel(); activeDictation = null; } }
// Mikrofon-Knopf: 1. Tippen startet, 2. Tippen („✓ Fertig“) beendet und liefert den Text
function micToggle(btn, idleLabel, onText, onLive, lang) {
  btn.onclick = async () => {
    if (activeDictation && activeDictation.btn === btn) { activeDictation.stop(); return; }
    cancelDictation();
    if (window.speechSynthesis) speechSynthesis.cancel();
    const d = dictation(onLive, lang);
    d.btn = btn;
    activeDictation = d;
    btn.textContent = '✓ Fertig';
    btn.classList.add('rec');
    let text = '';
    try { text = await d.done; } catch (e) { toast(e.message); }
    if (activeDictation === d) activeDictation = null;
    btn.textContent = idleLabel;
    btn.classList.remove('rec');
    if (!text) { if (!d.cancelledByUser) toast('Nichts erkannt'); return; }
    onText(text);
  };
}
// ---------- Eigene Fotos (nur auf diesem Gerät, IndexedDB) ----------
const photoDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('sl-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('p');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction('p', mode);
      const req = fn(tx.objectStore('p'));
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
function photoKey(id) { return settings.lang + '|' + id; }
// Foto verkleinern (max. 720 px) und als JPEG-Daten-URL speichern
function resizeImage(file, max = 720) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * f);
      c.height = Math.round(img.height * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild nicht lesbar')); };
    img.src = url;
  });
}
// Platzhalter <img data-photo="id"> mit gespeicherten Fotos füllen
async function fillPhotos(root) {
  for (const img of $$('img[data-photo]', root)) {
    try {
      const src = await photoDB.get(photoKey(img.dataset.photo));
      if (src) { img.src = src; img.hidden = false; }
      const del = $(`[data-photo-del="${CSS.escape(img.dataset.photo)}"]`, root);
      if (del) del.hidden = !src;
    } catch (e) { /* IndexedDB nicht verfügbar – ohne Foto weiter */ }
  }
}
function photoEditor(id, withImg = true) {
  return `<div class="photo-edit">
    ${withImg ? `<img data-photo="${esc(id)}" class="photo" hidden alt="">` : ''}
    <div class="row" style="justify-content:center">
      <label class="btn small" style="margin:0;color:var(--text);font-size:14px">📷 Foto<input type="file" accept="image/*" data-photo-in="${esc(id)}" hidden></label>
      <button class="btn small danger" data-photo-del="${esc(id)}" hidden>✕ Foto</button>
    </div>
  </div>`;
}
function bindPhotoEditors(root) {
  $$('[data-photo-in]', root).forEach(inp => {
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      try {
        await photoDB.put(photoKey(inp.dataset.photoIn), await resizeImage(file));
        fillPhotos(root);
      } catch (e) { toast('Foto konnte nicht gespeichert werden: ' + e.message); }
    };
  });
  $$('[data-photo-del]', root).forEach(b => {
    b.onclick = async () => {
      await photoDB.del(photoKey(b.dataset.photoDel)).catch(() => {});
      const img = $(`img[data-photo="${CSS.escape(b.dataset.photoDel)}"]`, root);
      if (img) { img.hidden = true; img.removeAttribute('src'); }
      b.hidden = true;
    };
  });
  fillPhotos(root);
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
// Sätze, die in der Satz-Abfrage noch nicht sitzen – schlechteste zuerst (für Hören & Shadowing)
function sentenceWeakness(c) {
  return (c.lapses || 0) * 2 + Math.max(0, 2.5 - c.ef) * 6 + (c.iv < 3 ? 2 : c.iv < 7 ? 1 : 0) + (c.due <= today() ? 1 : 0);
}
function weakSentences() {
  return allSentences()
    .filter(s => state.srs[s.id])
    .map(s => ({ s, c: state.srs[s.id] }))
    .filter(x => x.c.iv < 21) // sicher Gekonntes (≥ 3 Wochen Abstand) bleibt draußen
    .map(x => ({ s: x.s, w: sentenceWeakness(x.c) }))
    .filter(x => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .map(x => x.s);
}
function islandSelect(id, selected, withAll, weakCount) {
  return `<select id="${id}">
    ${weakCount !== undefined ? `<option value="weak" ${selected === 'weak' ? 'selected' : ''}>⭐ Schwierige Sätze (${weakCount})</option>` : ''}
    ${withAll ? `<option value="all" ${selected === 'all' ? 'selected' : ''}>Alle Inseln</option>` : ''}
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
    cancelDictation();
    if (!queue.length) {
      root.innerHTML = `<div class="card flash"><div class="target">🎉</div>
        <p>${done ? `Fertig – ${done} Abfragen.` : cfg.emptyText}</p></div>${typeof cfg.doneExtra === 'function' ? cfg.doneExtra() : (cfg.doneExtra || '')}`;
      cfg.onDone && cfg.onDone(root);
      return;
    }
    const id = queue[0];
    const it = cfg.get(id);
    if (!it) { queue.shift(); show(); return; }
    root.innerHTML = `
      <div class="row between muted small"><span>${queue.length} übrig</span>${it.isNew ? '<span class="pill">neu</span>' : ''}</div>
      <div class="card flash">
        <img data-photo="${esc(id)}" class="photo" hidden alt="">
        <div class="native">${esc(it.d)}</div>
        ${it.note ? `<button class="btn small" id="hint" style="margin-top:8px">💡 Eselsbrücke</button><div class="hint" id="hint-t" hidden>${esc(it.note)}</div>` : ''}
        <div id="answer" hidden><div class="${cfg.big}">${esc(it.t)}</div><div id="cmp" class="small"></div><div id="wordhelp"></div></div>
      </div>
      ${cfg.typing ? `<input type="text" id="typed" placeholder="Antwort tippen (optional)" autocomplete="off" autocapitalize="off" spellcheck="false">` : ''}
      <div class="row" id="pre" style="margin-top:8px">
        ${SR ? '<button class="btn" id="say">🎙 Sprechen</button>' : ''}
        <button class="btn primary grow" id="reveal">Aufdecken</button>
      </div>
      <div id="post" hidden class="stack">
        <div class="row"><button class="btn grow" id="replay">🔊 Nochmal hören</button>${cfg.correct ? '<button class="btn" id="fix">✎ Korrigieren</button>' : ''}${cfg.check && talkCfg.key ? '<button class="btn" id="chk" title="Mit Claude prüfen (≈ 1–3 Cent)">🔍 Prüfen</button>' : ''}</div>
        <div id="chk-out"></div>
        <div class="rate">
          <button class="btn again" data-r="0">Nochmal</button>
          <button class="btn hard" data-r="1">Schwer</button>
          <button class="btn good" data-r="2">Gut</button>
          <button class="btn easy" data-r="3">Leicht</button>
        </div>
        <p class="muted small">Laut nachsprechen, dann ehrlich bewerten. Tasten 1–4 gehen auch.</p>
        <details class="card" id="memo" style="margin-top:4px">
          <summary><b>🧠 ${it.note ? 'Eselsbrücke & Foto bearbeiten' : 'Eselsbrücke & Foto hinzufügen'}</b></summary>
          <div class="row between" style="margin-top:8px"><span class="muted small">Welches Bild, welche Geschichte verbindet Klang und Bedeutung?</span>
            ${SR ? '<button class="btn small" id="memo-mic">🎙 Einsprechen</button>' : ''}</div>
          <textarea id="memo-t" placeholder="z. B. eine absurde Szene – je lustiger oder emotionaler, desto besser">${esc(it.note || '')}</textarea>
          ${photoEditor(id, false)}
        </details>
      </div>`;
    let said = '';
    let revealed = false;
    fillPhotos(root);
    // Eselsbrücke/Foto auch bei bekannten Karten anlegen oder ändern
    const memo = $('#memo-t', root);
    const saveMemo = () => { setNote(id, memo.value.trim()); it.note = memo.value.trim(); persist(); };
    memo.onchange = saveMemo;
    bindPhotoEditors(root);
    if ($('#memo-mic', root)) {
      let base = null;
      micToggle($('#memo-mic', root), '🎙 Einsprechen', text => {
        memo.value = ((base || '') + ' ' + text).trim();
        base = null;
        saveMemo();
        toast('Eselsbrücke gespeichert');
      }, live => { if (base === null) base = memo.value.trim(); memo.value = (base + ' ' + live).trim(); }, 'de-DE');
    }
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
      // Wörter des Satzes, die noch nicht sicher sitzen – damit man nicht an einem unbekannten Wort hängen bleibt
      const gl = cfg.gloss && cfg.gloss(id);
      if (gl) $('#wordhelp', root).innerHTML = `<div class="muted small" style="margin-top:8px">Wort für Wort (geprüft)</div>${glossRow(gl, false)}`;
      else if (cfg.wordHelp) {
        const ws = wordsInSentence(it.t).map(wid => wordById(wid)).filter(w => w && !(state.srs[w.id] && state.srs[w.id].iv >= 3));
        if (ws.length) $('#wordhelp', root).innerHTML = `<div class="wordhelp">${ws.map(w => `<span><b>${esc(w.t)}</b> – ${esc(w.d)}${state.srs[w.id] ? '' : ' <span class="pill">neu</span>'}</span>`).join('')}</div><div class="muted small">aus der Wortliste – im Satz kann ein Wort etwas anderes heißen${talkCfg.key ? ' (🔍 Prüfen)' : ''}</div>`;
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
    if ($('#chk', root)) $('#chk', root).onclick = () => cfg.check(id, $('#chk', root), $('#chk-out', root), n => {
      it.t = n.t; it.d = n.d;
      $('#answer .' + cfg.big, root).textContent = n.t;
      $('.native', root).textContent = n.d;
    });
    if (cfg.correct) $('#fix', root).onclick = () => cfg.correct(id, () => { const n = cfg.get(id); if (n) { it.t = n.t; it.d = n.d; $('#answer .' + cfg.big, root).textContent = n.t; $('.native', root).textContent = n.d; } });
    $$('.rate .btn', root).forEach(b => { b.onclick = () => rate(Number(b.dataset.r)); });
    if ($('#hint', root)) $('#hint', root).onclick = () => { $('#hint-t', root).hidden = false; };
    if ($('#say', root)) micToggle($('#say', root), '🎙 Sprechen', t => { said = t; reveal(); }, t => { if (cfg.typing) $('#typed', root).value = t; });
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
views.locked = function (root) {
  root.innerHTML = `<h1>💬 Reden</h1><div class="card"><p>Gespräche mit Claude sind auf diesem Gerät gesperrt (Eltern-Sperre).</p>
    <p class="muted small">Freischalten unter Einstellungen → Eltern-Sperre, mit PIN.</p></div>`;
};

// ---------- „Heute zuerst“: lerngerechte Empfehlung nach festen Regeln ----------
const REVIEW_CAP = 50; // Wort-Wiederholungen pro Runde – nach Pausen den Rückstand verteilen statt alles nachzuholen
function daysSince(key) {
  for (let d = today(); d >= today() - 60; d--) {
    const l = state.log[d];
    if (l && l.sec && (l.sec[key] || 0) >= 60) return today() - d;
  }
  return null; // in den letzten 60 Tagen nie (mind. 1 Min.)
}
function pauseDays() {
  for (let d = today() - 1; d >= today() - 60; d--) {
    const l = state.log[d];
    if (l && Object.values(l.sec || {}).reduce((a, b) => a + b, 0) >= 60) return today() - d - 1;
  }
  return null;
}
function sinceText(n) { return n === null ? 'länger nicht gemacht' : n === 1 ? 'seit gestern nicht gemacht' : `seit ${n} Tagen nicht gemacht`; }
function todayPlan() {
  const l = dayLog();
  const steps = [];
  const learnedWords = Object.keys(state.srs).filter(isWordId).length;
  if (!learnedWords && !state.level) {
    steps.push({ href: '#level/test', title: 'Einstufungstest (5 Min.)', why: 'damit die App weiß, was du schon kannst' });
    steps.push({ href: '#builder/modal', title: 'Satzbaukasten', why: 'erste eigene Sätze über dich' });
    steps.push({ href: '#vocab/new', title: 'Erste neue Wörter', why: 'die häufigsten Wörter zuerst' });
    return { steps, pause: null };
  }
  const dueW = dueIds(isWordId).length;
  const dueS = dueIds(id => id.startsWith('s:')).length;
  // Sprech-Schritte: welcher wurde am längsten nicht gemacht?
  const output = [
    { key: 'review', href: '#review', title: 'Sätze wiederholen', extra: dueS ? `${dueS} fällig` : '' },
    { key: 'shadow', href: '#shadow', title: 'Shadowing', extra: '' },
  ];
  if (talkCfg.key && !talkLocked()) output.push({ key: 'talk', href: '#talk', title: 'Gespräch führen', extra: '' });
  output.forEach(o => { o.days = daysSince(o.key); o.score = o.days === null ? 99 : o.days; });
  const neglected = output.filter(o => (l.sec[o.key] || 0) < 60).sort((a, b) => b.score - a.score)[0];
  const neglectedStep = neglected && neglected.score >= 2
    ? { href: neglected.href, title: neglected.title, why: [sinceText(neglected.days), neglected.extra].filter(Boolean).join(' · ') + ' – Sprechen ist dein Ziel' }
    : null;
  const reviewStep = dueW
    ? { href: '#vocab/recall', title: `${Math.min(dueW, REVIEW_CAP)} Wörter wiederholen`, why: dueW > REVIEW_CAP ? `${dueW} fällig – heute höchstens ${REVIEW_CAP}, der Rest verteilt sich auf die nächsten Tage` : 'fällig – jetzt wiederholen, bevor sie verblassen' }
    : null;
  // Lange Vernachlässigtes (≥ 3 Tage) zuerst, sonst gilt: fällige Wiederholungen vor allem anderen
  if (neglectedStep && neglected.score >= 3) { steps.push(neglectedStep); if (reviewStep) steps.push(reviewStep); }
  else { if (reviewStep) steps.push(reviewStep); if (neglectedStep) steps.push(neglectedStep); }
  const tempo = newWordTempo();
  const newLeft = Math.max(0, tempo.n + (l.extraNew || 0) - l.newWords);
  if (newLeft && dueW <= REVIEW_CAP * 2) steps.push({ href: '#vocab/new', title: `${newLeft} neue Wörter`, why: tempo.reason ? `heute weniger: ${tempo.reason}` : 'mit Eselsbrücke oder Foto' });
  else if (newLeft) steps.push({ href: '#vocab/new', title: 'Neue Wörter: heute auslassen', why: 'erst den Rückstand abbauen – sonst wächst er weiter' });
  // Rückrichtung (hören → Deutsch) nur ohne großen Rückstand in der Hauptrichtung
  const hearN = hearQueue().length;
  if (hearN && dueW <= REVIEW_CAP) steps.push({ href: '#vocab/hear', title: `${hearN} Wörter verstehen`, why: 'hören → Bedeutung sagen' });
  // Lücken auffüllen, falls noch nichts empfohlen ist
  if (steps.length < 2 && dueS && !steps.some(x => x.href === '#review')) steps.push({ href: '#review', title: 'Sätze wiederholen', why: `${dueS} fällig` });
  if (steps.length < 2 && (l.sec.listen || 0) < 300) steps.push({ href: '#listen/words', title: 'Gelernte Wörter anhören', why: 'nebenbei, ohne Bildschirm' });
  // Wochen-Check ab Samstag, wenn diese Woche noch keiner gemacht wurde
  const wk = weekStart(today());
  if (steps.length < 3 && today() - wk >= 5 && !(state.weekTests || {})[wk] && learnedWords >= 20) steps.push({ href: '#week/test', title: 'Wochen-Check (≈ 5 Min.)', why: 'was sitzt nach dieser Woche?' });
  // Grammatik: alle paar Tage eine Regel, wenn noch Platz ist
  const ng = nextGrammar();
  if (steps.length < 3 && ng && learnedWords >= 30 && grammarDaysSince() >= 3 && (talkCfg.key || (grammarState()[ng.id] || {}).lesson)) steps.push({ href: '#grammar/' + ng.id, title: 'Grammatik: ' + ng.title, why: 'eine Regel, ca. 10 Minuten' });
  return { steps: steps.slice(0, 3), pause: pauseDays() };
}

views.home = function (root) {
  const l = dayLog();
  const total = minutesToday();
  const learnedWords = Object.keys(state.srs).filter(isWordId).length;
  const sentencesInTraining = Object.keys(state.srs).filter(id => id.startsWith('s:')).length;
  const dueW = dueIds(isWordId).length;
  const dueS = dueIds(id => id.startsWith('s:')).length;
  const sentCount = allSentences().length;
  const info = {
    vocab: `${l.newWords}/${newWordTempo().n} neu · ${dueW} fällig · ${hearQueue().length} verstehen`,
    review: `${dueS} fällig · bis zu ${Math.max(0, settings.newSentences - l.newSent)} neue`,
    listen: 'so viel wie möglich',
    shadow: '5–15 Minuten',
    islands: `${state.islands.length} Inseln · ${sentCount} Sätze`,
  };
  root.innerHTML = `
    <h1>${LANGS[settings.lang].flag} Heute</h1>
    ${voiceNotice()}
    <div class="card">
      <div class="row between"><b>${total} / ${goalMin()} Minuten</b><span class="muted small">🔥 ${streakInfo().days} Tage in Folge · 🃏 ${streakInfo().jokersLeft} Joker</span></div>
      <div class="progress" style="margin-top:8px"><div style="width:${Math.min(100, total / goalMin() * 100)}%"></div></div>
      <a href="#awards" class="row between" style="margin-top:10px;text-decoration:none;color:var(--text)"><span>⭐ <b>${totalXP()}</b> Punkte · ${rankOf(totalXP()).cur.name}</span><span class="muted small">🏅 ${Object.keys(state.badges || {}).length} Abzeichen ›</span></a>
      <a href="#week" class="small">📅 Wochenrückblick</a>
    </div>
    ${(() => {
      const plan = todayPlan();
      if (!plan.steps.length) return '<div class="card"><b>✅ Heute ist alles Wichtige erledigt.</b><p class="muted small">Wenn du magst: ein Gespräch, Hören oder neue Texte.</p></div>';
      return `<div class="card plan">
        <b>Heute zuerst</b>
        ${plan.pause >= 2 ? `<p class="small" style="margin:4px 0 0">Willkommen zurück nach ${plan.pause} Tagen Pause – nichts nachholen, einfach hier weitermachen.</p>` : ''}
        ${plan.steps.map((st, i) => `<a class="plan-step" href="${st.href}"><span class="num">${'①②③'[i]}</span><span class="grow"><b>${esc(st.title)}</b><span class="meta">${esc(st.why)}</span></span><span>›</span></a>`).join('')}
      </div>`;
    })()}
    <div class="stats">
      <div class="stat"><b>${learnedWords}</b><span>Wörter im Training</span></div>
      <div class="stat"><b>${sentencesInTraining}</b><span>Sätze im Training</span></div>
      <div class="stat"><b>${l.reviews}</b><span>Abfragen heute</span></div>
    </div>
    <a class="card step" href="#level">
      <div class="num">${levelInfo().stage.id}</div>
      <div class="grow"><b>Dein Niveau</b><div class="meta">${levelInfo().words} sichere Wörter${levelInfo().acc.total ? ` · ${Math.round(levelInfo().acc.rate * 100)} % Treffer (7 Tage)` : ''}${state.level ? '' : ' · Einstufungstest machen'}</div></div>
      <div>›</div></a>
${talkLocked() ? '' : `    <a class="card step" href="#talk">
      <div class="num">💬</div>
      <div class="grow"><b>Gespräch führen</b><div class="meta">${talkCfg.key ? `frei sprechen mit Claude · heute ${l.talks || 0} Gespräche · ${minutesToday('talk')} Min.` : 'KI-Gesprächspartner einrichten'}</div></div>
      <div>›</div></a>`}
    <a class="card step" href="#builder/${learnedWords < 300 ? 'modal' : 'drill'}">
      <div class="num">🧱</div>
      <div class="grow"><b>Satzbaukasten</b><div class="meta">${learnedWords < 300 ? 'Für den Start: mit wenigen Mustern erste Gespräche führen' : 'Drill: zufällige Sätze laut bilden'} · heute ${l.drill || 0} Sätze</div></div>
      <div>›</div></a>
    ${(() => { const ng = nextGrammar(); const gd = grammarList().filter(x => (grammarState()[x.id] || {}).done).length; return `<a class="card step" href="#grammar${ng ? '/' + ng.id : ''}">
      <div class="num">📐</div>
      <div class="grow"><b>Grammatik</b><div class="meta">${ng ? 'Als Nächstes: ' + esc(ng.title) : 'Alle Lektionen geschafft'} · ${gd}/${grammarList().length}</div></div>
      <div>›</div></a>`; })()}
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
      <p class="muted small">Mitgeliefert: ${starterWords(settings.lang).length} Wörter, nach Häufigkeit sortiert. Übersetzungen ungeprüft – Fehler mit ✎ korrigieren. Mehr unter „Wörter → Eigene“ importieren.</p>
    </div>
    <div class="row"><a class="btn grow" href="#settings">⚙️ Einstellungen & Backup</a><a class="btn grow" href="#method">📖 Methode</a></div>`;
};

views.method = function (root) {
  root.innerHTML = `
    <h1>Die Methode</h1>
    <div class="card stack">
      <p><b>Start: Satzbaukasten.</b> Für die ersten Wochen: wenige feste Muster über dich selbst – „Voglio / Posso / Devo / Cerco di + Infinitiv“, „Sono …“, „Mi piace …“ und Grundfragen mit Rückfrage („E tu?“). Jedes neue Verb im Infinitiv passt sofort in jedes Muster. So entstehen hunderte einfache Sätze, mit denen du erste Gespräche führen kannst.</p>
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
      <button data-m="hear" class="${mode === 'hear' ? 'on' : ''}">Verstehen (${hearQueue().length})</button>
      <button data-m="own" class="${mode === 'own' ? 'on' : ''}">Eigene</button>
    </div>
    <div id="pane"></div>`;
  $$('.seg button', root).forEach(b => { b.onclick = () => { location.hash = '#vocab/' + b.dataset.m; }; });
  const pane = $('#pane', root);
  if (mode === 'recall') {
    const due = dueIds(isWordId);
    recallSession(pane, due.slice(0, REVIEW_CAP), {
      big: 'target',
      emptyText: 'Keine Wörter fällig.',
      doneExtra: () => {
        const rest = dueIds(isWordId).length;
        const hear = hearQueue().length;
        return (rest ? `<div class="card"><p class="small">Noch ${rest} fällig. Für heute reicht das – der Rest verteilt sich auf die nächsten Tage.</p><button class="btn" onclick="views.vocab($('#view'), 'recall')">Trotzdem weitere ${Math.min(rest, REVIEW_CAP)}</button></div>` : '')
          + (hear ? `<a class="btn big" href="#vocab/hear">Weiter: ${hear} Wörter verstehen (hören)</a>` : '');
      },
      correct: correctWord,
      check: checkWordUI,
      get: id => { const w = wordById(id); return w && { t: w.t, d: w.d, note: state.notes[id] }; },
    });
  } else if (mode === 'hear') {
    hearSession(pane);
  } else if (mode === 'own') {
    vocabOwn(pane);
  } else {
    vocabNew(pane);
  }
};

// ---------- Rückrichtung: Wort hören → Bedeutung auf Deutsch ----------
// Eigene Planung unter 'r:<Wort-ID>'. Ein Wort kommt erst dazu, wenn es in der Hauptrichtung
// (Deutsch → Zielsprache) sitzt (Abstand ≥ 3 Tage) – sonst verdoppelt sich die Abfragemenge.
const HEAR_NEW = 15; // neue Wörter in der Rückrichtung pro Tag
const HEAR_CAP = 30; // Wiederholungen pro Runde
function hearQueue() {
  const words = new Map(allWords().map(w => [w.id, w]));
  const due = dueIds(id => id.startsWith('r:') && words.has(id.slice(2))).slice(0, HEAR_CAP);
  const l = dayLog();
  const room = Math.max(0, Math.min(HEAR_NEW - (l.newHear || 0), HEAR_CAP - due.length));
  const fresh = room ? allWords()
    .filter(w => state.srs[w.id] && state.srs[w.id].iv >= 3 && !state.srs['r:' + w.id])
    .slice(0, room).map(w => 'r:' + w.id) : [];
  return due.concat(fresh);
}
function hearSession(pane) {
  const queue = hearQueue();
  let done = 0;
  function show() {
    keyHandler = null;
    if (!queue.length) {
      pane.innerHTML = `<div class="card flash"><div class="target">🎉</div><p>${done ? `Fertig – ${done} Wörter.` : 'Nichts zu tun. Wörter kommen hierher, sobald sie in der Abfrage sitzen (ab 3 Tagen Abstand).'}</p></div>`;
      return;
    }
    const id = queue[0];
    const wid = id.slice(2);
    const w = wordById(wid);
    if (!w) { queue.shift(); show(); return; }
    const isNew = !state.srs[id];
    pane.innerHTML = `
      <div class="row between muted small"><span>${queue.length} übrig</span>${isNew ? '<span class="pill">neu in dieser Richtung</span>' : ''}</div>
      <div class="card flash">
        <button class="btn big" id="h-play">🔊 Anhören</button>
        <div class="target" id="h-t" hidden>${esc(w.t)}</div>
        <div id="h-answer" hidden>
          <div class="native">${esc(w.d)}</div>
          ${state.notes[wid] ? `<div class="hint">💡 ${esc(state.notes[wid])}</div>` : ''}
        </div>
      </div>
      <p class="muted small">Hören → laut sagen, was es auf Deutsch heißt → aufdecken.</p>
      <div class="row" id="h-pre">
        <button class="btn" id="h-show">👁 Wort zeigen</button>
        <button class="btn primary grow" id="h-reveal">Aufdecken</button>
      </div>
      <div id="h-post" hidden class="stack">
        <div class="row"><button class="btn grow" id="h-fix">✎ Korrigieren</button></div>
        <div class="rate">
          <button class="btn again" data-r="0">Nochmal</button>
          <button class="btn hard" data-r="1">Schwer</button>
          <button class="btn good" data-r="2">Gut</button>
          <button class="btn easy" data-r="3">Leicht</button>
        </div>
      </div>`;
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      $('#h-t', pane).hidden = false;
      $('#h-answer', pane).hidden = false;
      $('#h-pre', pane).hidden = true;
      $('#h-post', pane).hidden = false;
    };
    const rate = r => {
      if (isNew) { const l = dayLog(); l.newHear = (l.newHear || 0) + 1; }
      grade(id, r);
      done++;
      queue.shift();
      if (r === 0) queue.push(id);
      show();
    };
    speak(w.t);
    $('#h-play', pane).onclick = () => speak(w.t);
    $('#h-show', pane).onclick = () => { $('#h-t', pane).hidden = false; };
    $('#h-reveal', pane).onclick = reveal;
    $('#h-fix', pane).onclick = () => correctWord(wid, () => { const n = wordById(wid); if (n) { $('#h-t', pane).textContent = n.t; $('#h-answer .native', pane).textContent = n.d; } });
    $$('.rate .btn', pane).forEach(b => { b.onclick = () => rate(Number(b.dataset.r)); });
    keyHandler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
      else if (revealed && ['1', '2', '3', '4'].includes(e.key)) rate(Number(e.key) - 1);
    };
  }
  show();
}

// ---------- Wortpakete nach Alltagssituationen ----------
function packList() {
  return ((window.PACKS || {})[settings.lang] || []).filter(p => (settings.teen ? !p.adult : !p.teen));
}
function packEntries(p) {
  return p.words.split('\n').map(l => l.trim()).filter(Boolean)
    .filter(l => !(settings.teen && l.startsWith('!')))
    .map(l => splitPair(l.replace(/^!/, ''))).filter(x => x && x[0] && x[1]);
}
// Vergleichsschlüssel: Italienisch ohne bestimmten Artikel (il treno = treno), Englisch exakt (to work ≠ work)
function packKey(t) {
  const k = t.toLowerCase().replace(/[!?.…]/g, '').trim();
  return settings.lang === 'it' ? k.replace(/^(il |lo |la |i |gli |le |l')/, '').trim() : k;
}
// Paketwörter: vorhandene Wörter wiederverwenden, fehlende (create) als eigene Wörter anlegen
function packWordIds(p, create) {
  const byKey = new Map();
  allWords().forEach(w => { const k = packKey(w.t); if (!byKey.has(k)) byKey.set(k, w.id); });
  let added = 0;
  const ids = packEntries(p).map(([t, d]) => {
    const id = byKey.get(packKey(t));
    if (id || !create) return id || null;
    const w = { id: 'u:' + uid(), t, d, ts: Date.now(), pack: p.k };
    state.words.push(w);
    byKey.set(packKey(t), w.id);
    added++;
    return w.id;
  });
  if (added) persist();
  return ids;
}
function packOpen(p) { return packWordIds(p, false).filter(id => !(id && state.srs[id])).length; }
function activePack() {
  const k = (settings.packs || {})[settings.lang];
  return k ? packList().find(p => p.k === k) || null : null;
}

// ---------- Grammatik: eine Regel pro Lektion ----------
const GRAMMAR_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['intro', 'rule', 'compare', 'forms', 'examples', 'pitfall', 'exercises'],
  properties: {
    intro: { type: 'string' }, rule: { type: 'string' }, compare: { type: 'string' },
    pitfall: { type: 'object', additionalProperties: false, required: ['wrong', 'right', 'de', 'why'], properties: { wrong: { type: 'string' }, right: { type: 'string' }, de: { type: 'string' }, why: { type: 'string' } } },
    forms: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['t', 'de'], properties: { t: { type: 'string' }, de: { type: 'string' } } } },
    examples: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['t', 'de'], properties: { t: { type: 'string' }, de: { type: 'string' } } } },
    exercises: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['kind', 'q', 'options', 'answer', 'solution', 'explain'], properties: {
      kind: { type: 'string', enum: ['choice', 'translate'] }, q: { type: 'string' }, options: { type: 'array', items: { type: 'string' } },
      answer: { type: 'integer' }, solution: { type: 'string' }, explain: { type: 'string' },
    } } },
  },
};
const GRAMMAR_PASS = 0.75; // ab 6 von 8 richtig gilt die Lektion als geschafft
function grammarList() { return (window.GRAMMAR || {})[settings.lang] || []; }
function grammarState() { if (!state.grammar) state.grammar = {}; return state.grammar; }
function nextGrammar() { const g = grammarState(); return grammarList().find(x => !(g[x.id] && g[x.id].done)) || null; }
function grammarDaysSince() {
  const last = Math.max(0, ...Object.values(grammarState()).map(x => x.doneTs || x.practiceTs || 0));
  return last ? Math.floor((Date.now() - last) / 86400000) : 99;
}
function fmtRich(s, terms) { const h = esc(s || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); return terms ? explainTerms(h, terms) : h; }
// Grammatik-Begriffe einfach erklären: beim ersten Vorkommen pro Seite in Klammern dahinter.
// Längere Begriffe zuerst (Relativpronomen vor Pronomen); vor/nach dem Treffer darf kein Buchstabe stehen.
const GRAMMAR_TERMS = [
  ['Relativpronomen', 'Satzverbinder wie „der, die, das“ in „das Buch, das ich lese“'],
  ['Possessivpronomen', 'mein, dein, sein …'],
  ['Personalpronomen', 'ich, du, er, sie …'],
  ['Objektpronomen', 'ihn, sie, ihm, ihr … – ersetzt ein Nomen'],
  ['Subjektpronomen', 'ich, du, er, sie …'],
  ['Pronomen', 'Fürwort, z. B. ich, du, er'],
  ['Hilfsverb(?:en)?', 'haben, sein oder werden – helfen einem anderen Verb'],
  ['Modalverb(?:en)?', 'wollen, können, müssen …'],
  ['Verb(?:en|s)?', 'Tunwort, z. B. gehen, essen'],
  ['Nomen', 'Namenwort, z. B. Haus, Freundin'],
  ['Substantiv(?:e|en)?', 'Namenwort, z. B. Haus, Freundin'],
  ['Adjektiv(?:e|en)?', 'Wiewort, z. B. groß, rot'],
  ['Adverb(?:ien)?', 'sagt wie, wann oder wo, z. B. schnell, heute'],
  ['bestimmte[nrs]? Artikel', 'der, die, das'],
  ['unbestimmte[nrs]? Artikel', 'ein, eine'],
  ['Artikel', 'Begleiter: der, die, das, ein, eine'],
  ['Präposition(?:en)?', 'Verhältniswort, z. B. in, auf, mit'],
  ['Vokal(?:e|en)?', 'a, e, i, o, u'],
  ['Konsonant(?:en)?', 'alle anderen Buchstaben, z. B. b, k, s'],
  ['Infinitiv(?:e)?', 'Grundform, z. B. gehen'],
  ['Partizip(?:ien)?', 'Form wie „gegessen“, „gegangen“'],
  ['Präsens', 'Gegenwart: ich esse'],
  ['Perfekt', 'Vergangenheit: ich habe gegessen'],
  ['Futur', 'Zukunft: ich werde essen'],
  ['Imperativ', 'Befehlsform: Geh!'],
  ['Konjunktiv', 'Möglichkeitsform: er sei, ich hätte'],
  ['Konditional', 'würde-Form: ich würde gehen'],
  ['Gerundium', '-ando/-ing-Form: sto mangiando = ich esse gerade'],
  ['Singular', 'Einzahl'],
  ['Plural', 'Mehrzahl'],
  ['maskulin', 'männlich'],
  ['feminin', 'weiblich'],
  ['Subjekt', 'wer etwas tut'],
  ['Objekt(?:e)?', 'wen/was oder wem'],
  ['Akkusativ', 'wen oder was?'],
  ['Dativ', 'wem?'],
  ['Endung(?:en)?', 'das veränderliche Wortende, z. B. parl-o, parl-i'],
  ['[Kk]onjugier\\p{L}*', 'Verb an die Person anpassen: ich gehe, du gehst'],
  ['Konjugation', 'Verb an die Person anpassen: ich gehe, du gehst'],
  ['Komparativ', 'Vergleichsform: größer'],
  ['Superlativ', 'höchste Stufe: am größten'],
  ['Passiv', 'Leideform: das Haus wird gebaut'],
  ['[Rr]eflexiv\\p{L}*', 'mit sich/mich/dich: sich waschen'],
  ['Verneinung', 'nicht/kein-Form'],
];
const TERM_RE = new RegExp(`(?<!\\p{L})(${GRAMMAR_TERMS.map(t => t[0]).join('|')})(?!\\p{L})`, 'gu');
const TERM_LIST = GRAMMAR_TERMS.map(([p, d]) => [new RegExp(`^(?:${p})$`, 'u'), d]);
function explainTerms(html, seen) {
  if (settings.termHelp === false) return html;
  // nur Text zwischen Tags bearbeiten
  return html.split(/(<[^>]+>)/).map(part => part.startsWith('<') ? part : part.replace(TERM_RE, m => {
    const hit = TERM_LIST.find(([re]) => re.test(m));
    if (!hit || seen.has(hit[1])) return m;
    seen.add(hit[1]);
    return `${m} <span class="term">(${esc(hit[1])})</span>`;
  })).join('');
}
async function createGrammarLesson(item) {
  const lang = settings.lang === 'it' ? 'Italian' : 'British English';
  const list = grammarList();
  const before = list.slice(0, list.indexOf(item)).map(x => x.title).join('; ');
  const known = knownWordList(300);
  const r = await callClaude(
    `You are a patient, friendly ${lang} teacher for a German-speaking learner. Write ONE short grammar lesson about exactly this topic: "${item.title}" (${item.what}). Teach only this one rule – nothing else.
Earlier lessons in the course: ${before || 'none'}. You may use those structures in examples; avoid grammar from later lessons where possible.
Learner level: ${talkStage().id} (vocabulary-based estimate).${settings.lang === 'it' ? ` The learner is ${settings.profile.gender === 'f' ? 'female' : 'male'} – use matching endings when sentences are about the learner.` : ''}
Words the learner already knows (for orientation only): ${known.length ? known.join(', ') : 'almost none'}.
${settings.teen ? TEEN_RULES + '\n' : ''}
All explanations in simple, friendly German (du-Form), short sentences, no grammar jargon without a short explanation. Use the usual German grammar terms (Verb, Nomen, Vokal, Artikel, Plural …) without explaining them in brackets – the app adds a plain explanation itself. Write for someone without grammar knowledge: every statement must be understandable on its own, show it with a concrete example, never leave out steps of reasoning. Every ${lang} sentence must be correct and natural, exactly as a native speaker would say it; prefer known words, but naturalness always comes first.
Fields:
- "intro": 1–2 sentences: what the learner learns and why it is useful in everyday life.
- "rule": the rule in 3–6 short sentences; mark key forms with **double asterisks**.
- "compare": how it differs from or resembles German (1–3 sentences); empty string if not helpful.
- "forms": a small table of forms (max 10 rows, t = ${lang}, de = German); empty array if the topic has no forms table.
- "examples": 5 everyday example sentences.
- "pitfall": the typical mistake German speakers make with this rule, as one concrete example: "wrong" = the wrong ${lang} phrase, "right" = the correct one, "de" = what it means in German (use the most common German word, e.g. "das Auto", not a rare synonym), "why" = one plain German sentence why – no reasoning that needs extra knowledge.
- "exercises": exactly 8 exercises that test only this rule. First 5 with kind "choice": q = a ${lang} sentence with ___ for the gap (or a short German question about the rule), options = 3 short answers, answer = index of the correct option, solution = the complete correct ${lang} sentence. Then 3 with kind "translate": q = a short German sentence, options = [], answer = 0, solution = its natural ${lang} translation. "explain" = one short German sentence why the solution is right, naming the rule.`,
    [{ role: 'user', content: 'Write the lesson.' }], GRAMMAR_SCHEMA, 12000);
  const g = grammarState();
  const prev = g[item.id] || {};
  g[item.id] = Object.assign({}, prev, { ts: Date.now(), lesson: r.data });
  persist();
  return r.cost;
}
let grammarBusy = null;
views.grammar = function (root, arg) {
  const item = arg && grammarList().find(x => x.id === arg);
  if (item) { grammarLesson(root, item); return; }
  const g = grammarState();
  const next = nextGrammar();
  const done = grammarList().filter(x => g[x.id] && g[x.id].done).length;
  root.innerHTML = `
    ${islandsSeg('grammar')}
    <label class="inline small" style="margin:0 0 8px"><input type="checkbox" id="gr-terms" ${settings.termHelp === false ? '' : 'checked'}> Fachwörter in Klammern erklären (Vokal → a, e, i, o, u)</label>
    <p class="muted small">Eine Regel pro Lektion, in fester Reihenfolge: kurze Erklärung, Vergleich mit dem Deutschen, Beispiele, 8 Übungen. Ab 6 von 8 richtig gilt sie als geschafft. ${done}/${grammarList().length} geschafft.</p>
    ${talkCfg.key ? '' : '<div class="notice small">Neue Lektionen schreibt Claude (einmalig grob 5–10 Cent pro Lektion, Schätzung). Dafür einen <a href="#talk/setup">Claude-Schlüssel</a> eintragen. Schon erstellte Lektionen gehen ohne.</div>'}
    ${grammarList().map((x, i) => {
      const s = g[x.id] || {};
      const badge = s.done ? `✓ ${Math.round((s.best || 0) * 100)} %` : s.lesson ? 'begonnen' : '';
      return `<a class="card step ${s.done ? 'done' : ''}" href="#grammar/${x.id}" ${next === x ? 'style="border-color:var(--accent)"' : ''}>
        <div class="num">${s.done ? '✓' : i + 1}</div>
        <div class="grow"><b>${esc(x.title)}</b>${next === x ? ' <span class="pill">als Nächstes</span>' : ''}<div class="meta">${explainTerms(esc(x.what), new Set())}${badge && !s.done ? ' · ' + badge : s.done ? ' · ' + badge : ''}</div></div><div>›</div></a>`;
    }).join('')}`;
  bindGo(root);
  $('#gr-terms', root).onchange = e => { settings.termHelp = e.target.checked; saveSettings(); views.grammar(root); };
};
function grammarLesson(root, item) {
  const g = grammarState();
  const s = g[item.id] || {};
  const L = s.lesson;
  const islandId = 'gram-' + settings.lang;
  const isl = state.islands.find(i => i.id === islandId);
  const inIsland = t => !!(isl && isl.sentences.some(x => x.t === t));
  if (!L) {
    root.innerHTML = `<a href="#grammar" class="small">‹ Alle Lektionen</a>
      <h1>📐 ${esc(item.title)}</h1>
      <div class="card"><p class="small">${esc(item.what)}</p>
        ${talkCfg.key ? `<button class="btn primary big" id="gr-make" ${grammarBusy ? 'disabled' : ''}>${grammarBusy === item.id ? '🤖 Claude schreibt die Lektion …' : '📐 Lektion erstellen'}</button>
          <p class="muted small">Einmalig grob 5–10 Cent (Schätzung). Danach gespeichert und beliebig oft kostenlos.</p>`
        : '<p class="small">Dafür brauchst du einen <a href="#talk/setup">Claude-Schlüssel</a>.</p>'}</div>`;
    if ($('#gr-make', root)) $('#gr-make', root).onclick = async () => {
      grammarBusy = item.id;
      grammarLesson(root, item);
      try { const cost = await createGrammarLesson(item); toast(`Lektion erstellt (≈ $${cost.toFixed(2)})`); }
      catch (e) { toast(e.message); }
      grammarBusy = null;
      if (location.hash === '#grammar/' + item.id) grammarLesson(root, item);
    };
    return;
  }
  const seen = new Set();
  root.innerHTML = `<a href="#grammar" class="small">‹ Alle Lektionen</a>
    <h1>📐 ${esc(item.title)}</h1>
    ${s.done ? `<div class="notice small">✓ Geschafft – bestes Ergebnis ${Math.round((s.best || 0) * 100)} %. Üben geht jederzeit.</div>` : ''}
    <div class="card stack">
      <p>${fmtRich(L.intro, seen)}</p>
      <p>${fmtRich(L.rule, seen)}</p>
      ${L.compare ? `<p class="small">🇩🇪 ${fmtRich(L.compare, seen)}</p>` : ''}
    </div>
    ${L.forms && L.forms.length ? `<div class="card"><table class="wk">${L.forms.map(f => `<tr><td><b>${esc(f.t)}</b></td><td class="muted">${esc(f.de)}</td></tr>`).join('')}</table></div>` : ''}
    <h2>Beispiele</h2>
    <ul class="list card">${L.examples.map((x, i) => `<li><div class="grow"><div class="t">${esc(x.t)}</div><div class="d">${esc(x.de)}</div></div>
      <div class="stack" style="flex:none"><button class="btn small" data-gp="${i}">🔊</button><button class="btn small" data-ga="${i}" ${inIsland(x.t) ? 'disabled' : ''} title="In die Wiederholung">➕</button></div></li>`).join('')}</ul>
    ${!L.pitfall ? '' : typeof L.pitfall === 'string' ? `<div class="notice warn small">⚠️ ${fmtRich(L.pitfall, seen)}</div>`
      : `<div class="notice warn small"><b>⚠️ Typischer Fehler</b><div style="margin-top:6px">✗ <s>${esc(L.pitfall.wrong)}</s> → ✓ <b>${esc(L.pitfall.right)}</b>${L.pitfall.de ? ` <span class="muted">(${esc(L.pitfall.de)})</span>` : ''}</div><div style="margin-top:4px">${fmtRich(L.pitfall.why, seen)}</div></div>`}
    <button class="btn primary big" id="gr-ex">✏️ Übung starten (${L.exercises.length} Aufgaben)</button>
    ${talkCfg.key ? '<button class="btn small" id="gr-redo" style="margin-top:10px">🔄 Lektion neu erstellen</button>' : ''}
    <p class="muted small">Inhalt von Claude erstellt – Fehler sind möglich. ➕ holt Beispielsätze in die Insel „Grammatik“ (Wiederholung & Shadowing).</p>`;
  $$('[data-gp]', root).forEach(b => { b.onclick = () => speak(L.examples[b.dataset.gp].t); });
  $$('[data-ga]', root).forEach(b => {
    b.onclick = () => {
      const x = L.examples[b.dataset.ga];
      let target = state.islands.find(i => i.id === islandId);
      if (!target) { target = { id: islandId, title: 'Grammatik', sentences: [], ts: Date.now() }; state.islands.push(target); }
      if (!target.sentences.some(y => y.t === x.t)) target.sentences.push({ id: 's:' + uid(), t: x.t, d: x.de, ts: Date.now() });
      persist();
      b.disabled = true;
      toast('In Insel „Grammatik“ – kommt in die Wiederholung');
    };
  });
  $('#gr-ex', root).onclick = () => grammarPractice(root, item);
  if ($('#gr-redo', root)) $('#gr-redo', root).onclick = async () => {
    if (!confirm('Lektion neu erstellen? Kostet wieder ein paar Cent; dein Fortschritt bleibt.')) return;
    const b = $('#gr-redo', root);
    b.disabled = true; b.textContent = '🤖 Schreibe …';
    try { await createGrammarLesson(item); toast('Neu erstellt'); } catch (e) { toast(e.message); }
    if (location.hash === '#grammar/' + item.id) grammarLesson(root, item);
  };
}
function grammarPractice(root, item) {
  const s = grammarState()[item.id];
  const ex = s.lesson.exercises.filter(x => x.kind === 'translate' || (x.options && x.options.length >= 2));
  let i = 0, right = 0;
  const wrong = [];
  function finish() {
    keyHandler = null;
    const score = ex.length ? right / ex.length : 0;
    const first = !s.done;
    s.practiceTs = Date.now();
    s.last = score;
    s.best = Math.max(s.best || 0, score);
    if (score >= GRAMMAR_PASS && !s.done) { s.done = true; s.doneTs = Date.now(); addXP(10); }
    s.ts = Date.now();
    persist();
    const next = nextGrammar();
    root.innerHTML = `<a href="#grammar" class="small">‹ Alle Lektionen</a>
      <div class="card flash"><div class="target">${right}/${ex.length}</div>
        <p>${score >= GRAMMAR_PASS ? (first && s.done ? '✓ Lektion geschafft!' : '✓ Gut gemacht.') : 'Noch nicht ganz – lies die Regel nochmal und übe erneut.'}</p></div>
      ${wrong.length ? `<div class="card"><b>Deine Fehler</b><ul class="list">${wrong.map(w => `<li><div><div class="d">${esc(w.q)}</div><div class="t">${esc(w.solution)}</div><div class="d">💡 ${fmtRich(w.explain, new Set())}</div></div></li>`).join('')}</ul></div>` : ''}
      <div class="row"><button class="btn grow" id="gr-again">Nochmal üben</button><a class="btn grow" href="#grammar/${item.id}">Zur Regel</a></div>
      ${score >= GRAMMAR_PASS && next ? `<a class="btn primary big" href="#grammar/${next.id}" style="display:block;margin-top:8px">Weiter: ${esc(next.title)}</a>` : ''}`;
    $('#gr-again', root).onclick = () => grammarPractice(root, item);
  }
  function show() {
    keyHandler = null;
    cancelDictation();
    if (i >= ex.length) { finish(); return; }
    const x = ex[i];
    const choice = x.kind === 'choice';
    root.innerHTML = `<a href="#grammar/${item.id}" class="small">‹ ${esc(item.title)}</a>
      <div class="row between muted small" style="margin-top:8px"><span>Aufgabe ${i + 1} / ${ex.length}</span><span>${right} richtig</span></div>
      <div class="progress" style="margin:6px 0 12px"><div style="width:${i / ex.length * 100}%"></div></div>
      <div class="card flash">
        <div class="muted small">${choice ? 'Was passt?' : `Auf ${LANGS[settings.lang].name}:`}</div>
        <div class="sentence">${esc(x.q)}</div>
      </div>
      ${choice ? `<div class="stack" id="gr-opts">${x.options.map((o, k) => `<button class="btn" data-o="${k}" style="width:100%">${esc(o)}</button>`).join('')}</div>`
        : `<input type="text" id="gr-typed" placeholder="Antwort tippen (oder sprechen / im Kopf)" autocomplete="off" autocapitalize="off" spellcheck="false">
          <div class="row" id="gr-pre" style="margin-top:8px">${SR ? '<button class="btn" id="gr-say">🎙 Sprechen</button>' : ''}<button class="btn primary grow" id="gr-reveal">Aufdecken</button></div>`}
      <div id="gr-res"></div>`;
    const result = ok => {
      const res = $('#gr-res', root);
      res.innerHTML = `<div class="notice ${ok === false ? 'warn' : ''}" style="margin-top:10px">
          ${ok === true ? '✓ Richtig! ' : ok === false ? '✗ Richtig wäre: ' : ''}<b>${esc(x.solution)}</b> <button class="btn small" id="gr-play">🔊</button>
          <div class="small" style="margin-top:4px">💡 ${fmtRich(x.explain, new Set())}</div></div>`;
      $('#gr-play', res).onclick = () => speak(x.solution);
    };
    const next = ok => {
      if (ok) { right++; addXP(1); } else wrong.push(x);
      i++;
      show();
    };
    if (choice) {
      let answered = false;
      $$('#gr-opts [data-o]', root).forEach(b => {
        b.onclick = () => {
          if (answered) return;
          answered = true;
          const k = Number(b.dataset.o);
          const ok = k === x.answer;
          $$('#gr-opts [data-o]', root).forEach(o => {
            const n = Number(o.dataset.o);
            if (n === x.answer) o.style.cssText += ';border-color:var(--good);color:var(--good);font-weight:600';
            else if (n === k) o.style.cssText += ';border-color:var(--bad);color:var(--bad)';
            o.disabled = n !== x.answer && n !== k;
          });
          result(ok);
          speak(x.solution);
          $('#gr-res', root).insertAdjacentHTML('beforeend', '<button class="btn primary big" id="gr-next" style="margin-top:8px">Weiter</button>');
          $('#gr-next', root).onclick = () => next(ok);
        };
      });
    } else {
      let said = '';
      const reveal = () => {
        $('#gr-pre', root).hidden = true;
        const attempt = said || $('#gr-typed', root).value.trim();
        result(null);
        const res = $('#gr-res', root);
        if (attempt) { const c = compareWords(x.solution, attempt); res.insertAdjacentHTML('afterbegin', `<p class="small">Deine Antwort: „${esc(attempt)}“ – ${c.html} <b>${c.score}%</b></p>`); }
        speak(x.solution);
        res.insertAdjacentHTML('beforeend', `<p class="muted small">Stimmt deine Antwort (kleine Abweichungen sind ok)?</p><div class="row"><button class="btn grow" id="gr-no" style="color:var(--bad)">✗ Falsch</button><button class="btn grow" id="gr-yes" style="color:var(--good)">✓ Richtig</button></div>`);
        $('#gr-yes', root).onclick = () => next(true);
        $('#gr-no', root).onclick = () => next(false);
      };
      $('#gr-reveal', root).onclick = reveal;
      $('#gr-typed', root).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); reveal(); } });
      if ($('#gr-say', root)) micToggle($('#gr-say', root), '🎙 Sprechen', t => { said = t; reveal(); }, t => { $('#gr-typed', root).value = t; });
    }
  }
  show();
}

// ---------- Wochen-Check: kurzer Test ohne KI, misst den Stand der Woche ----------
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weekTestItems() {
  const ws = weekStart(today()) * 86400000;
  const learned = Object.entries(state.srs).filter(([id]) => isWordId(id)).map(([id, c]) => ({ w: wordById(id), c })).filter(x => x.w);
  // Wörter dieser Woche zuerst, dann der Rest gemischt
  const words = shuffle(learned.filter(x => (x.c.ts || 0) >= ws)).concat(shuffle(learned.filter(x => (x.c.ts || 0) < ws))).map(x => x.w);
  const uniq = (list, key) => { const seen = new Set(); return list.filter(x => !seen.has(key(x)) && seen.add(key(x))); };
  const pool = uniq(words, w => w.t.toLowerCase());
  const opts = (right, all, key) => shuffle([right].concat(shuffle(all.filter(x => key(x) !== key(right))).slice(0, 3)));
  const items = [];
  pool.slice(0, 5).forEach(w => items.push({ cat: 'w', q: w.d, options: opts(w, pool, x => x.t).map(x => x.t), answer: w.t }));
  pool.slice(5, 9).forEach(w => items.push({ cat: 'h', audio: w.t, q: '🔊 Was heißt das?', options: opts(w, uniq(pool, x => x.d), x => x.d).map(x => x.d), answer: w.d }));
  const sents = uniq(allSentences().filter(s => state.srs[s.id]), s => s.d);
  shuffle(sents).slice(0, 3).forEach(s => items.push({ cat: 's', audio: s.t, q: '🔊 Was bedeutet der Satz?', options: shuffle([s].concat(shuffle(sents.filter(x => x !== s)).slice(0, 2))).map(x => x.d), answer: s.d }));
  const g = grammarState();
  const gex = [].concat(...grammarList().filter(x => g[x.id] && g[x.id].done && g[x.id].lesson).map(x => g[x.id].lesson.exercises.filter(e => e.kind === 'choice' && e.options[e.answer])));
  shuffle(gex).slice(0, 3).forEach(e => items.push({ cat: 'g', q: e.q, options: e.options.slice(), answer: e.options[e.answer], explain: e.explain }));
  return items.filter(x => x.options.length >= 2);
}
const WT_CATS = { w: '🧠 Wörter', h: '👂 Wörter hören', s: '🎧 Sätze verstehen', g: '📐 Grammatik' };
function weekTest(root) {
  const items = weekTestItems();
  if (Object.keys(state.srs).filter(isWordId).length < 8 || items.length < 6) {
    root.innerHTML = `<a href="#week" class="small">‹ Wochenrückblick</a><div class="card"><p>Für den Wochen-Check brauchst du mindestens 8 gelernte Wörter.</p></div>`;
    return;
  }
  let i = 0;
  const cats = {};
  const wrong = [];
  function finish() {
    const ok = Object.values(cats).reduce((a, c) => a + c[0], 0);
    const pct = Math.round(ok / items.length * 100);
    const wk = weekStart(today());
    state.weekTests = state.weekTests || {};
    const prev = state.weekTests[wk];
    state.weekTests[wk] = { ts: Date.now(), last: pct, best: Math.max(pct, prev ? prev.best : 0), cats };
    addXP(10);
    persist();
    const before = Object.keys(state.weekTests).map(Number).filter(k => k < wk).sort((a, b) => b - a)[0];
    const pb = before !== undefined ? state.weekTests[before].last : null;
    root.innerHTML = `<a href="#week" class="small">‹ Wochenrückblick</a>
      <div class="card flash"><div class="target">${pct} %</div><p>${ok} von ${items.length} richtig${pb !== null ? ` · letzte Woche ${pb} %` : ''}</p></div>
      <div class="card"><table class="wk">${Object.entries(cats).map(([k, c]) => `<tr><td>${WT_CATS[k]}</td><td><b>${c[0]}/${c[1]}</b></td></tr>`).join('')}</table></div>
      ${wrong.length ? `<div class="card"><b>Das übst du nochmal</b><ul class="list">${wrong.map(w => `<li><div><div class="d">${esc(w.audio || w.q)}</div><div class="t">${esc(w.answer)}</div>${w.explain ? `<div class="d">💡 ${esc(w.explain)}</div>` : ''}</div></li>`).join('')}</ul></div>` : ''}
      <a class="btn big" href="#week" style="display:block">Zum Wochenrückblick</a>`;
  }
  function show() {
    if (i >= items.length) { finish(); return; }
    const x = items[i];
    root.innerHTML = `<a href="#week" class="small">‹ Wochenrückblick</a>
      <div class="row between muted small" style="margin-top:8px"><span>${WT_CATS[x.cat]}</span><span>${i + 1} / ${items.length}</span></div>
      <div class="progress" style="margin:6px 0 12px"><div style="width:${i / items.length * 100}%"></div></div>
      <div class="card flash">
        ${x.audio ? '<button class="btn big" id="wt-play">🔊 Nochmal hören</button>' : ''}
        <div class="${x.cat === 'w' ? 'native' : 'sentence'}">${esc(x.q)}</div>
      </div>
      <div class="stack" id="wt-opts">${x.options.map((o, k) => `<button class="btn" data-o="${k}" style="width:100%">${esc(o)}</button>`).join('')}</div>
      <div id="wt-res"></div>`;
    if (x.audio) { speak(x.audio); $('#wt-play', root).onclick = () => speak(x.audio); }
    let answered = false;
    $$('#wt-opts [data-o]', root).forEach(b => {
      b.onclick = () => {
        if (answered) return;
        answered = true;
        const pick = x.options[b.dataset.o];
        const ok = pick === x.answer;
        cats[x.cat] = cats[x.cat] || [0, 0];
        cats[x.cat][1]++;
        if (ok) { cats[x.cat][0]++; addXP(1); } else wrong.push(x);
        $$('#wt-opts [data-o]', root).forEach(o => {
          const v = x.options[o.dataset.o];
          if (v === x.answer) o.style.cssText += ';border-color:var(--good);color:var(--good);font-weight:600';
          else if (o === b) o.style.cssText += ';border-color:var(--bad);color:var(--bad)';
        });
        if (x.cat === 'w') speak(x.answer);
        $('#wt-res', root).innerHTML = `${x.explain && !ok ? `<p class="small">💡 ${esc(x.explain)}</p>` : ''}<button class="btn primary big" id="wt-next" style="margin-top:8px">Weiter</button>`;
        $('#wt-next', root).onclick = () => { i++; show(); };
      };
    });
  }
  show();
}

// ---------- Wörter ↔ Sätze ----------
// Findet Wörter der Wortliste in Sätzen – über den Wortstamm, damit auch gebeugte Formen passen
// (bicchieri → bicchiere, mangiamo → mangiare). Unregelmäßige Formen (sono → essere) werden nicht erkannt.
// Erlaubte Endungen hinter dem Stamm (sonst zu viele Zufallstreffer wie per → pera)
const IT_NOUN_END = new Set(['a', 'e', 'i', 'o', 'he', 'hi']);
const IT_VERB_END = new Set(['o', 'i', 'a', 'e', 'iamo', 'ate', 'ete', 'ite', 'ano', 'ono', 'ato', 'ata', 'ati', 'uto', 'uta', 'uti', 'ito', 'ita', 'iti',
  'ando', 'endo', 'avo', 'avi', 'ava', 'avamo', 'avate', 'avano', 'evo', 'evi', 'eva', 'evano', 'ivo', 'ivi', 'iva', 'ivano', 'ò', 'ì', 'erò', 'irò', 'erà', 'irà',
  'eremo', 'iremo', 'erei', 'irei', 'erebbe', 'irebbe', 'are', 'ere', 'ire', 'isco', 'isci', 'isce', 'iscono', 'iamo']);
const EN_END = new Set(['', 'e', 's', 'es', 'ed', 'd', 'ing', 'er', 'ers']);
function wordStem(t) {
  let k = t.toLowerCase().replace(/\(.*?\)/g, '').replace(/[?!.,;:¿¡"«»“”]/g, '').trim();
  let article = false;
  if (settings.lang === 'it') {
    const k2 = k.replace(/^(il|lo|la|i|gli|le|un|una|uno)\s+/, '').replace(/^(l|un)['’]/, '');
    article = k2 !== k;
    k = k2;
  } else k = k.replace(/^(to|the|a|an)\s+/, '');
  if (!k || /\s/.test(k)) return null; // Wendungen aus mehreren Wörtern auslassen
  if (k.length <= 3) return { stem: k, kind: 'exact' };
  if (settings.lang !== 'it') return { stem: k.replace(/e$/, ''), kind: 'en' };
  if (!article && /(are|ere|ire)$/.test(k)) return { stem: k.slice(0, -3), kind: 'verb' };
  if (/[aeio]$/.test(k)) return { stem: k.slice(0, -1), kind: 'noun' };
  return { stem: k, kind: 'exact' };
}
function stemMatches(tok, e) {
  if (e.kind === 'exact') return tok === e.stem;
  if (!tok.startsWith(e.stem)) return false;
  const rest = tok.slice(e.stem.length);
  return e.kind === 'verb' ? IT_VERB_END.has(rest) : e.kind === 'noun' ? IT_NOUN_END.has(rest) : EN_END.has(rest);
}
let stemIndexCache = null;
function stemIndex() {
  const key = settings.lang + ':' + allWords().length;
  if (stemIndexCache && stemIndexCache.key === key) return stemIndexCache.map;
  const map = new Map();
  allWords().forEach(w => {
    const st = wordStem(w.t);
    if (!st || st.stem.length < 2) return;
    const b = st.stem.slice(0, 2);
    if (!map.has(b)) map.set(b, []);
    map.get(b).push({ id: w.id, stem: st.stem, kind: st.kind });
  });
  stemIndexCache = { key, map };
  return map;
}
function wordsInSentence(text) {
  const idx = stemIndex();
  const found = new Set();
  text.split(/\s+/).forEach((raw, pos) => {
    // Großgeschriebene Wörter mitten im Satz sind meist Namen – dann nur exakte Treffer
    const name = pos > 0 && /^[A-ZÀ-Ý]/.test(raw.replace(/^[^\p{L}]+/u, ''));
    normWords(raw).forEach(tok => {
      tok = tok.replace(/^(l|un|dell|dall|nell|sull|all|d|c)['’]/, '');
      (idx.get(tok.slice(0, 2)) || []).forEach(e => {
        if (name ? tok === e.stem && e.kind === 'exact' : stemMatches(tok, e)) found.add(e.id);
      });
    });
  });
  return [...found];
}
// Vorrang für neue Wörter: Wörter aus Sätzen, die du übst – schwierige zuerst. Ungeübte Sätze zählen nicht.
function wordPriorities() {
  const prio = new Map(); // Wort-ID → { score, sentence }
  allSentences().forEach(s => {
    const c = state.srs[s.id];
    if (!c || c.iv >= 21) return; // noch nicht geübt oder sitzt sicher
    const score = 1 + sentenceWeakness(c);
    wordsInSentence(s.t).forEach(id => {
      const p = prio.get(id);
      if (!p || p.score < score) prio.set(id, { score, sentence: s });
    });
  });
  return prio;
}

function vocabNew(pane) {
  const l = dayLog();
  const tempo = newWordTempo();
  const limit = tempo.n + (l.extraNew || 0);
  const recallTab = $('.seg [data-m="recall"]');
  if (recallTab) recallTab.textContent = `Abfragen (${dueIds(isWordId).length})`;
  // Wörter aus deinen Sätzen (schwierige zuerst) vor der Häufigkeitsreihenfolge
  const prio = wordPriorities();
  // Wortpaket gewählt: dessen Wörter in Paket-Reihenfolge, sonst nach Häufigkeit (Wörter aus deinen Sätzen zuerst)
  const pack = activePack();
  let pool = [];
  if (pack) {
    const byId = new Map(allWords().map(w => [w.id, w]));
    pool = packWordIds(pack, true).filter(id => id && !state.srs[id]).map(id => byId.get(id)).filter(Boolean);
  }
  const packDone = pack && !pool.length;
  if (!pool.length) pool = allWords().filter(w => !state.srs[w.id])
    .map((w, i) => ({ w, i, p: prio.get(w.id) }))
    .sort((a, b) => (b.p ? b.p.score : 0) - (a.p ? a.p.score : 0) || a.i - b.i)
    .map(x => x.w);
  const packSel = `<select id="pack" style="margin-bottom:8px"><option value="">📊 Häufigste Wörter zuerst</option>${packList().map(p => { const n = packOpen(p); return `<option value="${p.k}" ${pack === p ? 'selected' : ''}>${esc(p.l)} (${n ? n + ' offen' : 'fertig'})</option>`; }).join('')}</select>
    ${packDone ? `<div class="notice small">✓ Paket „${esc(pack.l)}“ ist komplett im Training – weiter mit den häufigsten Wörtern.</div>` : ''}`;
  const bindPack = () => { $('#pack', pane).onchange = e => { settings.packs = Object.assign({}, settings.packs, { [settings.lang]: e.target.value }); saveSettings(); vocabNew(pane); }; };
  if (!pool.length) {
    pane.innerHTML = `${packSel}<div class="card">Alle Wörter sind im Training. Importiere weitere unter „Eigene“.</div>`;
    bindPack();
    return;
  }
  if (l.newWords >= limit) {
    pane.innerHTML = `${packSel}<div class="card flash"><div class="target">✅</div><p>Tagesziel erreicht: ${l.newWords} neue Wörter.</p>
      <div class="row" style="justify-content:center"><a class="btn primary" href="#vocab/recall">Jetzt abfragen</a><button class="btn" id="more">+10 weitere</button></div></div>`;
    $('#more', pane).onclick = () => { l.extraNew = (l.extraNew || 0) + 10; persist(); vocabNew(pane); };
    bindPack();
    return;
  }
  const w = pool[0];
  const from = pack && !packDone ? null : prio.get(w.id);
  const nudge = l.newWords > 0 && l.newWords % 10 === 0;
  pane.innerHTML = `
    ${packSel}
    <div class="row between muted small"><span>Heute ${l.newWords}/${limit}</span><span>${pool.length} noch nicht gelernt</span></div>
    <div class="progress" style="margin:6px 0 12px"><div style="width:${l.newWords / limit * 100}%"></div></div>
    ${tempo.reason ? `<div class="notice small">Tempo angepasst: ${tempo.n} statt ${settings.newWords} neue Wörter – ${tempo.reason}</div>` : ''}
    ${nudge ? `<div class="notice">${l.newWords} neue Wörter – kurz <a href="#vocab/recall">abfragen</a>, bevor es weitergeht?</div>` : ''}
    <div class="card flash">
      ${from ? `<div class="pill" style="margin-bottom:8px">aus deinem Satz</div><div class="small muted" style="margin-bottom:8px">„${esc(from.sentence.t)}“</div>` : ''}
      ${photoEditor(w.id)}
      <div class="target">${esc(w.t)}</div>
      <div class="native">${esc(w.d)}</div>
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="btn small" id="play">🔊 Anhören</button>
        <button class="btn small" id="fix" title="Übersetzung korrigieren">✎ Korrigieren</button>
        ${talkCfg.key ? '<button class="btn small" id="chk" title="Mit Claude prüfen (≈ 1–3 Cent)">🔍 Prüfen</button>' : ''}
      </div>
      <div id="chk-out"></div>
    </div>
    <div class="row between" style="margin-top:10px"><label for="note" style="margin:0">Eselsbrücke: Welches Bild, welche Geschichte verbindet Klang und Bedeutung?</label>
      ${SR ? '<button class="btn small" id="note-mic">🎙 Einsprechen</button>' : ''}</div>
    <textarea id="note" placeholder="z. B. eine absurde Szene, die du dir vorstellst – je lustiger oder emotionaler, desto besser">${esc(state.notes[w.id] || '')}</textarea>
    <div class="row" style="margin-top:10px">
      <button class="btn" id="known">Kenne ich schon</button>
      <button class="btn primary grow" id="learned">Gelernt ✓</button>
    </div>
    <p class="muted small">Wort 2–3× laut nachsprechen. Gelernte Wörter kommen heute noch in die Abfrage.</p>`;
  const saveNote = () => setNote(w.id, $('#note', pane).value.trim());
  bindPack();
  bindPhotoEditors(pane);
  // Eselsbrücke auf Deutsch diktieren – wird an den vorhandenen Text angehängt
  if ($('#note-mic', pane)) {
    const before = () => $('#note', pane).dataset.before ?? ($('#note', pane).dataset.before = $('#note', pane).value.trim());
    micToggle($('#note-mic', pane), '🎙 Einsprechen', text => {
      const b = before();
      $('#note', pane).value = (b ? b + ' ' : '') + text;
      delete $('#note', pane).dataset.before;
      saveNote();
      persist();
    }, live => { const b = before(); $('#note', pane).value = (b ? b + ' ' : '') + live; }, 'de-DE');
  }
  speak(w.t);
  $('#play', pane).onclick = () => speak(w.t);
  $('#fix', pane).onclick = () => { saveNote(); correctWord(w.id, () => vocabNew(pane)); };
  if ($('#chk', pane)) $('#chk', pane).onclick = () => checkWordUI(w.id, $('#chk', pane), $('#chk-out', pane), n => { $('.flash .target', pane).textContent = n.t; $('.flash .native', pane).textContent = n.d; });
  $('#known', pane).onclick = () => {
    saveNote();
    const t = today();
    state.srs[w.id] = { iv: 21, ef: 2.5, reps: 1, lapses: 0, due: t + 21, ts: Date.now() };
    addXP(1);
    persist();
    vocabNew(pane);
  };
  $('#learned', pane).onclick = () => {
    saveNote();
    state.srs[w.id] = { iv: 0, ef: 2.5, reps: 0, lapses: 0, due: today(), ts: Date.now() };
    l.newWords++;
    addXP(3);
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
    state.words.push({ id: 'u:' + uid(), t, d, ts: Date.now() });
    persist();
    vocabOwn(pane);
  };
  $('#w-import', pane).onclick = () => {
    const pairs = parseLines($('#w-bulk', pane).value);
    let n = 0;
    pairs.forEach(([t, d]) => { if (!exists(t)) { state.words.push({ id: 'u:' + uid(), t, d, ts: Date.now() }); n++; } });
    persist();
    toast(`${n} Wörter importiert` + (pairs.length - n ? `, ${pairs.length - n} übersprungen` : ''));
    vocabOwn(pane);
  };
  $$('[data-del]', pane).forEach(b => {
    b.onclick = () => {
      const id = b.dataset.del;
      state.words = state.words.filter(w => w.id !== id);
      delete state.srs[id];
      delete state.srs['r:' + id];
      delete state.notes[id];
      markDeleted(id);
      photoDB.del(photoKey(id)).catch(() => {});
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
    wordHelp: true,
    typing: true,
    emptyText: 'Nichts fällig. Neue Sätze kommen aus deinen Sprachinseln.',
    doneExtra: `<a class="btn big" href="#shadow">Weiter zum Shadowing</a>`,
    get: id => { const s = byId[id]; return s && { t: s.t, d: s.d, isNew: !state.srs[id], note: state.notes[id] }; },
    gloss: id => { const s = findSentence(id); return s && s.gloss && s.gloss.length ? s.gloss : null; },
    check: checkSentenceUI,
  });
};

let listenToken = null;
function stopAudio() {
  if (shadowToken) { shadowToken.stop = true; shadowToken = null; }
  if (textPlayToken) { textPlayToken.stop = true; textPlayToken = null; }
  if (listenToken) listenToken.stop = true;
  listenToken = null;
  listening = false;
  if (window.speechSynthesis) speechSynthesis.cancel();
}

function listenSeg(active) {
  return `<div class="seg">
    <button data-go="#listen" class="${active === 'sent' ? 'on' : ''}">🏝️ Sätze</button>
    <button data-go="#listen/words" class="${active === 'words' ? 'on' : ''}">🧠 Wörter</button>
    <button data-go="#listen/check" class="${active === 'check' ? 'on' : ''}">👂 Check</button>
    <button data-go="#listen/stories" class="${active === 'stories' ? 'on' : ''}">🎭 Dialoge</button>
  </div>`;
}

// Hör-Check: Satz hören → verstanden? → Deutsch aufdecken. Ohne Bewertung/Wiederholungsplanung.
function listenCheck(root) {
  const opts = Object.assign({ island: 'all', count: 10 }, load('sl.listenc', {}));
  const weak = weakSentences();
  root.innerHTML = `
    <h1>🎧 Hören</h1>
    ${listenSeg('check')}
    ${voiceNotice()}
    <div id="hc-pane">
      <div class="card">
        <p class="small" style="margin-top:0">Satz nur hören – verstehst du ihn? Dann Deutsch aufdecken. Zählt nicht in die Wiederholungsplanung.</p>
        <label for="hc-isl">Welche Sätze?</label>${islandSelect('hc-isl', opts.island, true, weak.length)}
        <label for="hc-count">Anzahl</label><select id="hc-count">${[10, 20, 0].map(n => `<option value="${n}" ${n === opts.count ? 'selected' : ''}>${n || 'alle'}</option>`).join('')}</select>
        <button class="btn primary big" id="hc-start" style="margin-top:12px">▶ Starten</button>
      </div>
    </div>`;
  bindGo(root);
  const pane = $('#hc-pane', root);
  const pick = () => {
    const v = opts.island;
    let list = v === 'weak' ? weak.slice() : v === 'all' ? allSentences() : ((state.islands.find(i => i.id === v) || { sentences: [] }).sentences).slice();
    if (v !== 'weak') for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return opts.count ? list.slice(0, opts.count) : list;
  };
  $('#hc-start', root).onclick = () => {
    opts.island = $('#hc-isl', root).value;
    opts.count = Number($('#hc-count', root).value);
    save('sl.listenc', opts);
    const list = pick();
    if (!list.length) { toast('Keine Sätze in dieser Auswahl.'); return; }
    run(list);
  };
  function run(list) {
    let i = 0;
    const missed = [];
    function show() {
      keyHandler = null;
      if (i >= list.length) {
        const ok = list.length - missed.length;
        pane.innerHTML = `<div class="card flash"><div class="target">${ok}/${list.length}</div><p>verstanden</p></div>
          ${missed.length ? `<div class="card"><b>Nicht verstanden</b><ul class="list">${missed.map(s => `<li><div><div class="t">${esc(s.t)}</div><div class="d">${esc(s.d)}</div></div></li>`).join('')}</ul>
            <button class="btn" id="hc-again" style="margin-top:8px">Nur diese nochmal</button></div>` : ''}
          <button class="btn big" id="hc-new">Neue Runde</button>`;
        if ($('#hc-again', pane)) $('#hc-again', pane).onclick = () => run(missed.slice());
        $('#hc-new', pane).onclick = () => listenCheck(root);
        return;
      }
      const s = list[i];
      pane.innerHTML = `
        <div class="row between muted small"><span>${i + 1} / ${list.length}</span></div>
        <div class="card flash">
          <button class="btn big" id="hc-play">🔊 Nochmal hören</button>
          <div class="sentence" id="hc-t" hidden>${esc(s.t)}</div>
          <div class="native" id="hc-d" hidden>${esc(s.d)}</div>
        </div>
        <div class="row" id="hc-pre">
          <button class="btn" id="hc-show">👁 Text zeigen</button>
          <button class="btn primary grow" id="hc-reveal">Aufdecken</button>
        </div>
        <div class="row" id="hc-post" hidden>
          <button class="btn grow" id="hc-no" style="color:var(--bad)">✗ Nicht verstanden</button>
          <button class="btn grow" id="hc-yes" style="color:var(--good)">✓ Verstanden</button>
        </div>`;
      let revealed = false;
      const reveal = () => {
        if (revealed) return;
        revealed = true;
        $('#hc-t', pane).hidden = false; $('#hc-d', pane).hidden = false;
        $('#hc-pre', pane).hidden = true; $('#hc-post', pane).hidden = false;
      };
      const next = ok => { if (!ok) missed.push(s); else addXP(1); i++; show(); };
      speak(s.t);
      $('#hc-play', pane).onclick = () => speak(s.t);
      $('#hc-show', pane).onclick = () => { $('#hc-t', pane).hidden = false; };
      $('#hc-reveal', pane).onclick = reveal;
      $('#hc-yes', pane).onclick = () => next(true);
      $('#hc-no', pane).onclick = () => next(false);
      keyHandler = e => {
        if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
        else if (revealed && (e.key === '1' || e.key === '2')) next(e.key === '2');
      };
    }
    show();
  }
}

// Gelernte Wörter anhören: Hör-Abfrage (Deutsch → Pause → Zielsprache) oder Nachsprechen
function listenWords(root) {
  const opts = Object.assign({ mode: 'recall', pick: 'hard', count: 20, pause: 3, loop: false }, load('sl.listenw', {}));
  const learned = Object.entries(state.srs).filter(([id]) => isWordId(id)).map(([id, c]) => ({ w: wordById(id), c })).filter(x => x.w);
  root.innerHTML = `
    <h1>🎧 Hören</h1>
    ${listenSeg('words')}
    ${voiceNotice()}
    <div class="card">
      <label>Art</label>
      ${chips('lw-mode', [{ k: 'recall', l: 'Deutsch → selbst sagen → Lösung' }, { k: 'reverse', l: 'Wort hören → Bedeutung sagen → Deutsch' }, { k: 'repeat', l: 'Anhören & nachsprechen' }], ['recall', 'reverse', 'repeat'].indexOf(opts.mode), x => x.l)}
      <label>Welche Wörter?</label>
      ${chips('lw-pick', [{ k: 'hard', l: 'Schwierige zuerst' }, { k: 'recent', l: 'Zuletzt geübt' }, { k: 'all', l: 'Alle gemischt' }], ['hard', 'recent', 'all'].indexOf(opts.pick), x => x.l)}
      <div class="row" style="margin-top:6px">
        <div class="grow"><label for="lw-count">Anzahl</label><select id="lw-count">${[10, 20, 50, 0].map(n => `<option value="${n}" ${n === opts.count ? 'selected' : ''}>${n || 'alle'}</option>`).join('')}</select></div>
        <div class="grow"><label for="lw-pause">Pause (Sek.)</label><select id="lw-pause">${[2, 3, 4, 6].map(n => `<option ${n === opts.pause ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <label class="inline"><input type="checkbox" id="lw-loop" ${opts.loop ? 'checked' : ''}> Endlosschleife</label>
      <button class="btn primary big" id="lw-play" style="margin-top:12px" ${learned.length ? '' : 'disabled'}>▶ Abspielen</button>
      <p class="muted small">${learned.length ? `${learned.length} Wörter im Training. Gut nebenbei – beim Gehen, Kochen, Autofahren. Bildschirm anlassen.` : 'Noch keine gelernten Wörter – erst unter „Wörter“ lernen.'}</p>
    </div>
    <ul class="list card" id="lw-list"></ul>`;
  bindGo(root);
  const store = () => save('sl.listenw', opts);
  const pickList = () => {
    let list = learned.slice();
    if (opts.pick === 'hard') list.sort((a, b) => (b.c.lapses || 0) - (a.c.lapses || 0) || a.c.ef - b.c.ef || a.c.iv - b.c.iv);
    else if (opts.pick === 'recent') list.sort((a, b) => (b.c.ts || 0) - (a.c.ts || 0));
    else for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return (opts.count ? list.slice(0, opts.count) : list).map(x => x.w);
  };
  let list = pickList();
  // In der Hör-Abfrage bleibt die Lösung verdeckt, bis sie gesprochen wurde
  const renderList = (now = -1, shownUpTo = -1) => {
    $('#lw-list', root).innerHTML = list.map((w, i) => `<li class="${i === now ? 'now' : ''}"><div><div class="t">${opts.mode === 'recall' && i > shownUpTo ? '…' : esc(w.t)}</div><div class="d">${opts.mode === 'reverse' && i > shownUpTo ? '…' : esc(w.d)}</div></div></li>`).join('') || '<li class="muted">Keine Wörter.</li>';
  };
  renderList(-1, opts.mode !== 'repeat' ? -1 : list.length);
  $$('.chips[data-name="lw-mode"] .chip', root).forEach(c => { c.onclick = () => { stopAudio(); opts.mode = ['recall', 'reverse', 'repeat'][c.dataset.i]; store(); listenWords(root); }; });
  $$('.chips[data-name="lw-pick"] .chip', root).forEach(c => { c.onclick = () => { stopAudio(); opts.pick = ['hard', 'recent', 'all'][c.dataset.i]; store(); listenWords(root); }; });
  $('#lw-count', root).onchange = e => { stopAudio(); opts.count = Number(e.target.value); store(); listenWords(root); };
  $('#lw-pause', root).onchange = e => { opts.pause = Number(e.target.value); store(); };
  $('#lw-loop', root).onchange = e => { opts.loop = e.target.checked; store(); };
  const btn = $('#lw-play', root);
  btn.onclick = async () => {
    if (listenToken) { stopAudio(); btn.textContent = '▶ Abspielen'; renderList(-1, opts.mode !== 'repeat' ? -1 : list.length); return; }
    if (!list.length) return;
    const token = { stop: false };
    listenToken = token;
    listening = true;
    btn.textContent = '■ Stopp';
    const ms = opts.pause * 1000;
    do {
      for (let i = 0; i < list.length && !token.stop; i++) {
        const w = list[i];
        renderList(i, opts.mode !== 'repeat' ? i - 1 : list.length);
        const li = $('#lw-list .now', root);
        if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (opts.mode === 'recall') {
          await speakP(w.d, { lang: 'de' });            // Deutsch
          if (!token.stop) await wait(ms);               // selbst sagen
          if (token.stop) break;
          renderList(i, i);
          await speakP(w.t);                             // Lösung
          if (!token.stop) await wait(Math.max(1500, ms / 2));
          if (!token.stop) await speakP(w.t);            // nochmal zum Nachsprechen
          if (!token.stop) await wait(ms);
        } else if (opts.mode === 'reverse') {
          await speakP(w.t);                             // Zielsprache
          if (!token.stop) await wait(ms);               // Bedeutung selbst sagen
          if (token.stop) break;
          renderList(i, i);
          await speakP(w.d, { lang: 'de' });             // Lösung
          if (!token.stop) await wait(Math.max(1500, ms / 2));
        } else {
          for (let r = 0; r < 2 && !token.stop; r++) {
            await speakP(w.t);
            if (!token.stop) await wait(ms);             // nachsprechen
          }
        }
      }
      if (opts.loop && !token.stop && opts.pick === 'all') list = pickList();
    } while (opts.loop && !token.stop);
    if (listenToken === token) { listenToken = null; listening = false; btn.textContent = '▶ Abspielen'; renderList(-1, opts.mode !== 'repeat' ? -1 : list.length); }
  };
}

views.listen = function (root, arg) {
  if (arg === 'words') { listenWords(root); return; }
  if (arg === 'check') { listenCheck(root); return; }
  if (arg === 'stories') { listenStories(root); return; }
  const opts = Object.assign({ island: 'weak', de: false, repeat: 2, pause: 2, loop: false }, load('sl.listen', {}));
  const weak = weakSentences();
  root.innerHTML = `
    <h1>🎧 Hören</h1>
    ${listenSeg('sent')}
    ${voiceNotice()}
    <div class="card">
      <label for="l-isl">Welche Sätze?</label>${islandSelect('l-isl', opts.island, true, weak.length)}
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
  bindGo(root);
  const items = () => {
    const v = $('#l-isl', root).value;
    if (v === 'weak') return weak;
    return v === 'all' ? allSentences() : (state.islands.find(i => i.id === v) || { sentences: [] }).sentences;
  };
  const renderList = (now = -1) => {
    $('#l-list', root).innerHTML = items().map((s, i) => `<li class="${i === now ? 'now' : ''}"><div><div class="t">${esc(s.t)}</div><div class="d">${esc(s.d)}</div></div></li>`).join('') || `<li class="muted">${$('#l-isl', root).value === 'weak' ? 'Noch keine schwierigen Sätze – erst unter „Sätze“ abfragen oder oben eine Insel wählen.' : 'Keine Sätze.'}</li>`;
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
// Shadowing-Takt: Einzählen (Balken + 3·2·1) → Wort-Markierung beim Sprechen → Pause „Jetzt du“
let shadowToken = null;
function shadowCue(pane, text) {
  const box = $('#s-cue', pane);
  const bar = $('.cue-bar', box);
  const label = $('.cue-label', box);
  const spans = $$('#s-sent .w', pane);
  // Startposition jedes Worts im Text, um Wortgrenzen-Ereignisse zuzuordnen
  const starts = [];
  let pos = 0;
  spans.forEach(sp => { const i = text.indexOf(sp.textContent, pos); starts.push(i < 0 ? pos : i); pos = (i < 0 ? pos : i) + sp.textContent.length; });
  const mark = n => spans.forEach((sp, i) => { sp.classList.toggle('on', i === n); sp.classList.toggle('past', i < n); });
  const setBar = (from, to, ms, cls) => {
    box.className = 'cue ' + cls;
    bar.style.transition = 'none';
    bar.style.width = from + '%';
    void bar.offsetWidth; // Neustart der Animation erzwingen
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = to + '%';
  };
  const reset = () => { mark(-1); box.className = 'cue'; bar.style.transition = 'none'; bar.style.width = '0%'; label.textContent = 'Tippe ▶ – die App zählt ein'; };
  async function once(token, rate) {
    // 1. Einzählen
    setBar(0, 100, 1200, 'count');
    for (const n of ['3', '2', '1']) { if (token.stop) return; label.textContent = `Gleich geht's los … ${n}`; await wait(400); }
    if (token.stop) return;
    // 2. Sprechen mit Wort-Markierung
    const est = Math.max(1200, text.length * 70 / rate); // geschätzte Sprechdauer
    let gotBoundary = false, fallback = null;
    label.textContent = '▶ Jetzt mitsprechen';
    await speakP(text, {
      rate,
      onstart: () => {
        setBar(0, 100, est, 'speak');
        const t0 = performance.now();
        // Ohne Wortgrenzen-Ereignisse: Markierung zeitlich schätzen
        fallback = setInterval(() => {
          if (gotBoundary) return;
          const c = Math.min(text.length, ((performance.now() - t0) / est) * text.length);
          let n = 0;
          while (n + 1 < starts.length && starts[n + 1] <= c) n++;
          mark(n);
        }, 80);
      },
      onboundary: e => {
        if (e.name && e.name !== 'word') return;
        gotBoundary = true;
        let n = 0;
        while (n + 1 < starts.length && starts[n + 1] <= e.charIndex) n++;
        mark(n);
      },
    });
    clearInterval(fallback);
    mark(spans.length);
  }
  return {
    async run(times, rate) {
      if (shadowToken) { shadowToken.stop = true; shadowToken = null; speechSynthesis.cancel(); reset(); return; }
      const token = { stop: false };
      shadowToken = token;
      const pause = Math.max(1500, text.length * 80 / rate);
      for (let i = 0; i < times && !token.stop; i++) {
        await once(token, rate);
        if (!token.stop) addXP(1);
        if (token.stop) break;
        // 3. Pause zum Selbersprechen
        label.textContent = times > 1 ? `Jetzt du (${i + 1}/${times})` : 'Jetzt du';
        setBar(100, 0, pause, 'you');
        await wait(pause);
      }
      if (shadowToken === token) { shadowToken = null; reset(); }
    },
  };
}
views.shadow = function (root) {
  const saved = load('sl.shadow.' + settings.lang, {});
  const weak = weakSentences(); // einmal beim Öffnen berechnen, damit die Reihenfolge während der Übung stabil bleibt
  let islandId = saved.island === 'weak' || state.islands.some(i => i.id === saved.island) ? saved.island : (weak.length ? 'weak' : state.islands[0] && state.islands[0].id);
  if (!saved.island && weak.length) islandId = 'weak';
  let idx = islandId === 'weak' ? 0 : (saved.idx || 0);
  let ownUrl = null;
  root.innerHTML = `
    <h1>🗣️ Shadowing</h1>
    ${voiceNotice()}
    <p class="muted small">Anhören → sofort laut mitsprechen. Rhythmus, Betonung und Melodie kopieren, nicht nur die Wörter.</p>
    ${state.islands.length ? islandSelect('s-isl', islandId, false, weak.length) : ''}
    <p class="muted small" id="s-weakinfo" ${islandId === 'weak' ? '' : 'hidden'}>Aus deinen Bewertungen in der Satz-Abfrage – was am wenigsten sitzt, kommt zuerst. Sicher gekonnte Sätze fehlen hier.</p>
    <div id="s-pane" style="margin-top:12px"></div>`;
  const pane = $('#s-pane', root);
  if (!state.islands.length) { pane.innerHTML = '<div class="card">Erst eine Sprachinsel anlegen.</div>'; return; }
  $('#s-isl', root).onchange = e => { islandId = e.target.value; idx = 0; $('#s-weakinfo', root).hidden = islandId !== 'weak'; render(); };
  function render() {
    if (islandId === 'weak' && !weak.length) { pane.innerHTML = '<div class="card">Noch keine schwierigen Sätze – entweder noch nichts unter „Sätze“ abgefragt oder alles sitzt. Wähle oben eine Insel.</div>'; return; }
    const isl = state.islands.find(i => i.id === islandId);
    const list = islandId === 'weak' ? weak : isl ? isl.sentences : [];
    if (!list.length) { pane.innerHTML = '<div class="card">Diese Insel hat noch keine Sätze.</div>'; return; }
    if (idx >= list.length) idx = 0;
    save('sl.shadow.' + settings.lang, { island: islandId, idx });
    const s = list[idx];
    if (ownUrl) { URL.revokeObjectURL(ownUrl); ownUrl = null; }
    pane.innerHTML = `
      <div class="row between muted small"><span>Satz ${idx + 1}/${list.length}</span></div>
      <div class="card flash">
        <img data-photo="${esc(s.id)}" class="photo" hidden alt="">
        <div class="sentence" id="s-sent">${s.t.split(/(\s+)/).map(w => /^\s+$/.test(w) ? w : `<span class="w">${esc(w)}</span>`).join('')}</div>
        <div class="native">${esc(s.d)}</div>
        <div class="cue" id="s-cue"><div class="cue-bar"></div><span class="cue-label">Tippe ▶ – die App zählt ein</span></div>
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
    fillPhotos(pane);
    if (shadowToken) { shadowToken.stop = true; shadowToken = null; speechSynthesis.cancel(); }
    const cue = shadowCue(pane, s.t);
    cue.run(1, settings.rate);
    $('#s-play', pane).onclick = () => cue.run(1, settings.rate);
    $('#s-slow', pane).onclick = () => cue.run(1, 0.6);
    $('#s-loop', pane).onclick = () => cue.run(3, settings.rate);
    $('#s-prev', pane).onclick = () => { idx = (idx - 1 + list.length) % list.length; render(); };
    $('#s-next', pane).onclick = () => { idx = (idx + 1) % list.length; render(); };
    if ($('#s-check', pane)) {
      micToggle($('#s-check', pane), '✅ Aussprache prüfen', said => {
        const c = compareWords(s.t, said);
        $('#s-cmp', pane).innerHTML = `<p>Erkannt: „${esc(said)}“</p><p>${c.html} <b>${c.score}%</b></p>`;
      }, live => { $('#s-cmp', pane).innerHTML = `<p class="muted">${esc(live)}</p>`; });
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

// ---------- Satzbaukasten ----------
function builderData() {
  const b = window.BUILDER[settings.lang];
  if (!settings.teen) return b;
  // Jugend-Modus: unpassende Bausteine ausblenden
  const h = window.TEEN.hideBuilder;
  return Object.assign({}, b, {
    adjectives: b.adjectives.filter(x => !h.adjectives.includes(x.id)),
    likes: b.likes.filter(x => !h.likes.includes(x.id)),
    verbs: b.verbs.filter(x => !h.verbs.includes(x.id)),
  });
}
function builderVerbs() { return builderData().verbs.concat(state.builderVerbs); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fillProfile(s, german) {
  const b = builderData(), p = settings.profile;
  const o = b.origins[p.origin] || b.origins.de;
  const city = p.city || (german || settings.lang === 'en' ? 'Berlin' : 'Berlino');
  const name = p.name || (settings.lang === 'it' ? 'Luca' : 'Alex');
  return s.replace('{name}', name).replace('{city}', city).replace('{originDe}', o.de).replace('{origin}', o.t);
}
// „ein Buch lesen“ -> „kein Buch lesen“, sonst „nicht …“
function negateDe(v) {
  if (v.deNeg) return v.deNeg;
  const m = v.de.match(/^(ein|eine|einen|einem)\s(.*)$/);
  return m ? `k${m[1]} ${m[2]}` : 'nicht ' + v.de;
}
function buildModal(m, v, time, neg) {
  const n = neg && m.tNeg;
  const tm = time ? ' ' + time.t : '';
  const dm = time ? time.de + ' ' : '';
  return {
    t: `${n ? m.tNeg : m.t} ${v.t}${tm}.`,
    d: m.zu ? `${m.de} ${dm}${v.deZu}.` : `${m.de} ${dm}${n ? negateDe(v) : v.de}.`,
  };
}
function buildBe(a, level, gender) {
  const adj = gender === 'f' ? a.f : a.m;
  const deAdj = gender === 'f' && a.deF ? a.deF : a.de;
  const lv = a.noIntens && level === 'molto' ? '' : level;
  const it = settings.lang === 'it';
  const t = lv === 'non' ? (it ? `Non sono ${adj}.` : `I'm not ${adj}.`)
    : lv === 'molto' ? (it ? `Sono molto ${adj}.` : `I'm very ${adj}.`)
    : (it ? `Sono ${adj}.` : `I'm ${adj}.`);
  let d;
  if (lv === 'non') d = a.deF ? `Ich bin ${gender === 'f' ? 'keine' : 'kein'} ${deAdj}.` : `Ich bin nicht ${deAdj}.`;
  else d = lv === 'molto' ? `Ich bin sehr ${deAdj}.` : `Ich bin ${deAdj}.`;
  return { t, d };
}
function buildLike(x, level) {
  let t;
  if (settings.lang === 'it') {
    const v = x.pl ? 'piacciono' : 'piace';
    t = level === 'non' ? `Non mi ${v} ${x.t}.` : level === 'molto' ? `Mi ${v} molto ${x.t}.` : `Mi ${v} ${x.t}.`;
  } else {
    t = level === 'non' ? `I don't like ${x.t}.` : level === 'molto' ? `I really like ${x.t}.` : `I like ${x.t}.`;
  }
  const d = x.verb
    ? x.de.replace('{g}', level === 'molto' ? 'sehr gern' : level === 'non' ? 'nicht gern' : 'gern') + '.'
    : `Ich mag ${x.de}${level === 'molto' ? ' sehr' : level === 'non' ? ' nicht' : ''}.`;
  return { t, d };
}
function dialogItems() {
  return builderData().dialog.map(p => ({ q: p.q, qd: p.qd, t: fillProfile(p.a), d: fillProfile(p.ad, true) }));
}
function randomSentence() {
  const b = builderData();
  const r = Math.random();
  if (r < 0.45) {
    const m = pick(b.modals);
    return buildModal(m, pick(builderVerbs()), Math.random() < 0.5 ? pick(b.times) : null, !!m.tNeg && Math.random() < 0.25);
  }
  if (r < 0.65) return buildBe(pick(b.adjectives), pick(['', '', 'molto', 'non']), settings.profile.gender);
  if (r < 0.85) return buildLike(pick(b.likes), pick(['', '', 'molto', 'non']));
  return pick(dialogItems());
}
function addToBuilderIsland(sent, quiet) {
  const id = 'bk-' + settings.lang;
  let isl = state.islands.find(i => i.id === id);
  if (!isl) {
    isl = { id, title: 'Satzbaukasten', sentences: [], ts: Date.now() };
    state.islands.push(isl);
  }
  if (isl.sentences.some(s => s.t === sent.t)) { if (!quiet) toast('Schon in der Insel'); return false; }
  isl.sentences.push({ id: 's:' + uid(), t: sent.t, d: sent.d, ts: Date.now() });
  persist();
  if (!quiet) toast('In Insel „Satzbaukasten“ – kommt in Wiederholung & Shadowing');
  return true;
}
function islandsSeg(active) {
  return `<div class="seg">
    <button data-go="#islands" class="${active === 'islands' ? 'on' : ''}">🏝️ Inseln</button>
    <button data-go="#builder" class="${active === 'builder' ? 'on' : ''}">🧱 Baukasten</button>
    <button data-go="#grammar" class="${active === 'grammar' ? 'on' : ''}">📐 Grammatik</button>
    <button data-go="#texts" class="${active === 'texts' ? 'on' : ''}">📄 Texte</button>
  </div>`;
}
function bindGo(root) { $$('[data-go]', root).forEach(b => { b.onclick = () => { location.hash = b.dataset.go; }; }); }
function chips(name, items, selected, label, extra = '') {
  return `<div class="chips" data-name="${name}">${items.map((x, i) =>
    `<button class="chip ${i === selected ? 'on' : ''}" data-i="${i}">${esc(label(x))}</button>`).join('')}${extra}</div>`;
}
function sentenceCard(sent, lead) {
  return `<div class="card flash">
    ${lead ? `<div class="muted small">${lead}</div>` : ''}
    <div class="sentence">${esc(sent.t)}</div>
    <div class="native">${esc(sent.d)}</div>
    <div id="b-cmp" class="small"></div>
    <div class="row" style="justify-content:center;margin-top:10px">
      <button class="btn small" id="b-play">🔊 Anhören</button>
      ${SR ? '<button class="btn small" id="b-say">🎙 Nachsprechen</button>' : ''}
      <button class="btn small" id="b-add">➕ In Insel</button>
    </div>
  </div>`;
}
function bindSentenceCard(pane, sent) {
  $('#b-play', pane).onclick = () => speak(sent.t);
  $('#b-add', pane).onclick = () => addToBuilderIsland(sent);
  if ($('#b-say', pane)) {
    micToggle($('#b-say', pane), '🎙 Nachsprechen', said => {
      const c = compareWords(sent.t, said);
      $('#b-cmp', pane).innerHTML = `<p>Erkannt: „${esc(said)}“</p><p>${c.html} <b>${c.score}%</b></p>`;
    }, live => { $('#b-cmp', pane).innerHTML = `<p class="muted">${esc(live)}</p>`; });
  }
}

views.builder = function (root, arg) {
  const b = builderData();
  const it = settings.lang === 'it';
  const mode = ['modal', 'be', 'like', 'dialog', 'drill'].includes(arg) ? arg : 'modal';
  const selKey = 'sl.builder.' + settings.lang;
  const sel = Object.assign({ m: 0, v: 0, time: -1, neg: false, a: 2, bl: 0, l: 0, ll: 0 }, load(selKey, {}));
  const labels = { modal: it ? 'Voglio …' : 'I want to …', be: it ? 'Sono …' : "I'm …", like: it ? 'Mi piace …' : 'I like …', dialog: 'Fragen', drill: '🎲 Drill' };
  root.innerHTML = `
    ${islandsSeg('builder')}
    <p class="muted small">Wenige feste Satzmuster über dich selbst, dazu austauschbare Wörter – so entstehen hunderte einfache Sätze. Damit kannst du nach wenigen Wochen erste kleine Gespräche führen.</p>
    <div class="seg">${Object.keys(labels).map(k => `<button data-m="${k}" class="${k === mode ? 'on' : ''}">${labels[k]}</button>`).join('')}</div>
    <div id="pane"></div>`;
  bindGo(root);
  $$('.seg [data-m]', root).forEach(x => { x.onclick = () => { location.hash = '#builder/' + x.dataset.m; }; });
  const pane = $('#pane', root);
  const store = () => save(selKey, sel);
  let profileOpen = !settings.profile.name;
  const onChips = (name, fn) => $$(`.chips[data-name="${name}"] .chip`, pane).forEach(c => { c.onclick = () => { fn(Number(c.dataset.i)); store(); render(); }; });

  function render() {
    if (mode === 'modal') renderModal();
    else if (mode === 'be') renderBe();
    else if (mode === 'like') renderLike();
    else if (mode === 'dialog') renderDialog();
    else renderDrill();
  }

  function renderModal() {
    const verbs = builderVerbs();
    if (sel.m >= b.modals.length) sel.m = 0;
    if (sel.v >= verbs.length) sel.v = 0;
    const m = b.modals[sel.m];
    const sent = buildModal(m, verbs[sel.v], sel.time >= 0 ? b.times[sel.time] : null, sel.neg);
    pane.innerHTML = `
      ${sentenceCard(sent)}
      <label>1. Hilfsverb</label>${chips('m', b.modals, sel.m, x => x.t)}
      <label class="inline"><input type="checkbox" id="b-neg" ${m.tNeg ? '' : 'disabled'} ${sel.neg && m.tNeg ? 'checked' : ''}> verneinen ${m.tNeg ? `(${esc(m.tNeg)})` : '(hier nicht üblich)'}</label>
      <label>2. Verb im Infinitiv</label>${chips('v', verbs, sel.v, x => x.t)}
      <label>3. Wann? (optional)</label>${chips('time', [{ t: '—' }].concat(b.times), sel.time + 1, x => x.t)}
      <details class="card" style="margin-top:12px">
        <summary><b>Eigenes Verb einsetzen</b></summary>
        <p class="muted small">Neues Verb im Wörterbuch oder Übersetzer nachschlagen und im Infinitiv eintragen – es passt in jedes Muster.</p>
        <label for="bv-t">${LANGS[settings.lang].name} (Infinitiv${it ? '' : ' ohne „to“'})</label><input type="text" id="bv-t" autocapitalize="off" placeholder="${it ? 'nuotare' : 'swim'}">
        <label for="bv-d">Deutsch (Infinitiv)</label><input type="text" id="bv-d" placeholder="schwimmen">
        <label for="bv-z">Deutsch mit „zu“ (optional – nötig bei trennbaren Verben: anzurufen)</label><input type="text" id="bv-z" placeholder="zu schwimmen">
        <button class="btn primary" id="bv-add" style="margin-top:8px">Hinzufügen</button>
        ${state.builderVerbs.length ? `<ul class="list">${state.builderVerbs.map(v => `<li><div class="grow"><div class="t">${esc(v.t)}</div><div class="d">${esc(v.de)}</div></div><button class="btn small danger" data-delv="${v.id}">✕</button></li>`).join('')}</ul>` : ''}
      </details>`;
    bindSentenceCard(pane, sent);
    onChips('m', i => { sel.m = i; });
    onChips('v', i => { sel.v = i; });
    onChips('time', i => { sel.time = i - 1; });
    $('#b-neg', pane).onchange = e => { sel.neg = e.target.checked; store(); render(); };
    $('#bv-add', pane).onclick = () => {
      const t = $('#bv-t', pane).value.trim(), de = $('#bv-d', pane).value.trim();
      if (!t || !de) { toast('Verb und Deutsch ausfüllen'); return; }
      let deZu = $('#bv-z', pane).value.trim();
      if (!deZu) { const w = de.split(/\s+/); const last = w.pop(); deZu = w.concat('zu', last).join(' '); }
      state.builderVerbs.push({ id: 'bv:' + uid(), t, de, deZu, ts: Date.now() });
      persist();
      sel.v = builderVerbs().length - 1;
      store();
      render();
    };
    $$('[data-delv]', pane).forEach(x => {
      x.onclick = () => {
        state.builderVerbs = state.builderVerbs.filter(v => v.id !== x.dataset.delv);
        markDeleted(x.dataset.delv);
        persist();
        sel.v = 0;
        store();
        render();
      };
    });
  }

  function renderBe() {
    const g = settings.profile.gender;
    const levels = it ? ['Sono …', 'Sono molto …', 'Non sono …'] : ["I'm …", "I'm very …", "I'm not …"];
    const lv = ['', 'molto', 'non'];
    if (sel.a >= b.adjectives.length) sel.a = 0;
    const sent = buildBe(b.adjectives[sel.a], lv[sel.bl], g);
    pane.innerHTML = `
      ${sentenceCard(sent)}
      ${it ? `<label>Ich bin …</label>${chips('g', ['männlich (-o)', 'weiblich (-a)'], g === 'f' ? 1 : 0, x => x)}
        <p class="muted small">Adjektive richten sich nach dir: stanco → stanca. Endet es auf -e (felice), bleibt es gleich.</p>` : ''}
      <label>Form</label>${chips('bl', levels, sel.bl, x => x)}
      <label>Eigenschaft</label>${chips('a', b.adjectives, sel.a, x => (g === 'f' ? x.f : x.m))}`;
    bindSentenceCard(pane, sent);
    if (it) onChips('g', i => { settings.profile.gender = i ? 'f' : 'm'; settings.profile.ts = Date.now(); saveSettings(); });
    onChips('bl', i => { sel.bl = i; });
    onChips('a', i => { sel.a = i; });
  }

  function renderLike() {
    const levels = it ? ['Mi piace …', 'Mi piace molto …', 'Non mi piace …'] : ['I like …', 'I really like …', "I don't like …"];
    const lv = ['', 'molto', 'non'];
    if (sel.l >= b.likes.length) sel.l = 0;
    const sent = buildLike(b.likes[sel.l], lv[sel.ll]);
    pane.innerHTML = `
      ${sentenceCard(sent)}
      <label>Form</label>${chips('ll', levels, sel.ll, x => x)}
      <label>Was? (Nomen oder Verb im ${it ? 'Infinitiv' : '-ing'})</label>${chips('l', b.likes, sel.l, x => x.t)}
      <p class="muted small">${it ? 'Wörtlich „mir gefällt“ – bei Mehrzahl „mi piacciono“ (i gatti). Verneinung: „non“ ganz nach vorn.' : 'Nach „like“ steht bei Tätigkeiten die -ing-Form: I like cooking.'}</p>`;
    bindSentenceCard(pane, sent);
    onChips('ll', i => { sel.ll = i; });
    onChips('l', i => { sel.l = i; });
  }

  function renderDialog() {
    const p = settings.profile;
    const items = dialogItems();
    pane.innerHTML = `
      <div class="notice">${esc(b.backTip)}</div>
      <details class="card" id="p-box" ${profileOpen ? 'open' : ''}>
        <summary><b>Deine Angaben</b> <span class="muted small">(für die Antworten)</span></summary>
        <label for="p-name">Vorname</label><input type="text" id="p-name" value="${esc(p.name)}">
        <label for="p-city">Wohnort</label><input type="text" id="p-city" value="${esc(p.city)}" placeholder="${it ? 'z. B. Monaco di Baviera' : 'z. B. Munich'}">
        <label for="p-origin">Herkunft</label>
        <select id="p-origin">${Object.entries({ de: 'Deutschland', at: 'Österreich', ch: 'Schweiz' }).map(([k, v]) => `<option value="${k}" ${p.origin === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </details>
      ${items.map((x, i) => `
        <div class="card">
          <div class="row between"><div class="grow"><div class="t">${esc(x.q)}</div><div class="d muted small">${esc(x.qd)}</div></div><button class="btn small" data-sq="${i}">🔊</button></div>
          <div class="row between" style="margin-top:8px"><div class="grow"><div class="t">↳ ${esc(x.t)}</div><div class="d muted small">${esc(x.d)}</div></div><button class="btn small" data-sa="${i}">🔊</button></div>
        </div>`).join('')}
      <button class="btn primary big" id="d-all">➕ Alle Antworten in die Insel</button>
      <p class="muted small">Tipp: Im Drill kommen die Fragen per Audio – du antwortest laut.</p>`;
    const saveP = () => {
      p.name = $('#p-name', pane).value.trim();
      p.city = $('#p-city', pane).value.trim();
      p.origin = $('#p-origin', pane).value;
      p.ts = Date.now();
      saveSettings();
      render();
    };
    ['#p-name', '#p-city', '#p-origin'].forEach(s => { $(s, pane).onchange = saveP; });
    $('#p-box', pane).ontoggle = e => { profileOpen = e.target.open; };
    $$('[data-sq]', pane).forEach(x => { x.onclick = () => speak(items[x.dataset.sq].q); });
    $$('[data-sa]', pane).forEach(x => { x.onclick = () => speak(items[x.dataset.sa].t); });
    $('#d-all', pane).onclick = () => {
      const n = items.filter(x => addToBuilderIsland({ t: x.q + ' – ' + x.t, d: x.qd + ' – ' + x.d }, true)).length;
      toast(n ? `${n} Dialogzeilen in Insel „Satzbaukasten“` : 'Schon alle in der Insel');
    };
  }

  function renderDrill() {
    const l = dayLog();
    const sent = randomSentence();
    pane.innerHTML = `
      <div class="row between muted small"><span>Heute ${l.drill || 0} Sätze gebildet</span><span>laut sprechen!</span></div>
      <div class="card flash">
        ${sent.q ? `<div class="muted small">Jemand fragt:</div><div class="sentence">${esc(sent.q)}</div><div class="muted small" style="margin-top:8px">Antworte:</div>` : `<div class="muted small">Sag auf ${LANGS[settings.lang].name}:</div>`}
        <div class="native">${esc(sent.d)}</div>
        <div id="answer" hidden><div class="sentence" style="margin-top:10px">${esc(sent.t)}</div><div id="cmp" class="small"></div></div>
      </div>
      <div class="row" id="pre">
        ${SR ? '<button class="btn" id="say">🎙 Sprechen</button>' : ''}
        <button class="btn primary grow" id="reveal">Aufdecken</button>
      </div>
      <div class="row" id="post" hidden>
        <button class="btn" id="again">🔊</button>
        <button class="btn" id="add">➕ Insel</button>
        <button class="btn primary grow" id="next">Nächster Satz ›</button>
      </div>`;
    if (sent.q) speak(sent.q);
    let said = '';
    const reveal = () => {
      $('#answer', pane).hidden = false;
      $('#pre', pane).hidden = true;
      $('#post', pane).hidden = false;
      if (said) {
        const c = compareWords(sent.t, said);
        $('#cmp', pane).innerHTML = `<p>Gesagt: „${esc(said)}“</p><p>${c.html} <b>${c.score}%</b></p>`;
      }
      speak(sent.t);
    };
    $('#reveal', pane).onclick = reveal;
    $('#again', pane).onclick = () => speak(sent.t);
    $('#add', pane).onclick = () => addToBuilderIsland({ t: sent.q ? sent.q + ' – ' + sent.t : sent.t, d: sent.q ? sent.qd + ' – ' + sent.d : sent.d });
    $('#next', pane).onclick = () => { l.drill = (l.drill || 0) + 1; addXP(2); persist(); renderDrill(); };
    if ($('#say', pane)) micToggle($('#say', pane), '🎙 Sprechen', t => { said = t; reveal(); }, live => { $('#cmp', pane).innerHTML = `<p class="muted">${esc(live)}</p>`; $('#answer', pane).hidden = true; });
    keyHandler = e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if ($('#pre', pane).hidden) $('#next', pane).click(); else reveal(); }
    };
  }

  render();
};

// ---------- Eigene Texte (z. B. Liedtexte) ----------
// Text einfügen → Zeilen → Claude übersetzt Zeile für Zeile (+ Wort für Wort, Redewendungen) → mitlesen, anhören, nachsprechen.
const TEXT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['lines'],
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['i', 'de', 'words', 'note'],
        properties: {
          i: { type: 'integer' },
          de: { type: 'string' },
          words: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['t', 'de'], properties: { t: { type: 'string' }, de: { type: 'string' } } } },
          note: { type: 'string' },
        },
      },
    },
  },
};
function splitTextLines(raw) {
  const out = [];
  raw.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
    // Lange Prosa-Zeilen in Sätze teilen, Liedzeilen bleiben, wie sie sind
    if (l.length > 160) (l.match(/[^.!?…]+[.!?…]*["»”)]?\s*/g) || [l]).map(x => x.trim()).filter(Boolean).forEach(x => out.push(x));
    else out.push(l);
  });
  return out;
}
function findText(id) { return (state.texts || []).find(x => x.id === id); }

views.texts = function (root, id) {
  state.texts = state.texts || [];
  const tx = id && findText(id);
  if (tx) { textDetail(root, tx); return; }
  root.innerHTML = `
    ${islandsSeg('texts')}
    <p class="muted small">Eigene Texte verstehen lernen – z. B. Liedtexte, die du beim Hören mitliest. Claude übersetzt Zeile für Zeile, Wort für Wort und erklärt Redewendungen. Texte bleiben getrennt vom normalen Lernen; einzelne Zeilen holst du mit ➕ in die Wiederholung.</p>
    ${state.texts.map(x => `
      <a class="card step" href="#texts/${x.id}">
        <div class="num">${x.lines.length}</div>
        <div class="grow"><b>${x.story ? '🎭 ' : ''}${esc(x.title)}</b><div class="meta">${x.lines.length} Zeilen · ${x.lines.every(l => l.de) ? 'übersetzt' : 'noch nicht übersetzt'}</div></div><div>›</div>
      </a>`).join('')}
    <div class="card">
      <b>Neuer Text</b>
      <label for="tx-title">Titel</label><input type="text" id="tx-title" placeholder="z. B. Liedtitel – Interpret">
      <label for="tx-body">Text (${LANGS[settings.lang].name}) – eine Zeile pro Zeile</label>
      <textarea id="tx-body" style="min-height:180px" placeholder="Text hier einfügen"></textarea>
      <button class="btn primary" id="tx-save" style="margin-top:8px">Speichern</button>
      <p class="muted small">Der Text ist nur für dich: Er liegt auf dem Gerät und – wenn eingerichtet – in deinem privaten Sync-Gist.</p>
    </div>`;
  bindGo(root);
  $('#tx-save', root).onclick = () => {
    const lines = splitTextLines($('#tx-body', root).value);
    if (!lines.length) { toast('Bitte Text einfügen'); return; }
    if (lines.length > 300) { toast('Höchstens 300 Zeilen pro Text'); return; }
    const title = $('#tx-title', root).value.trim() || lines[0].slice(0, 40);
    const n = { id: 'tx' + uid(), title, ts: Date.now(), autoSeg: true, lines: lines.map(t => ({ id: 'l' + uid(), t, de: '', words: [], note: '' })) };
    state.texts.push(n);
    persist();
    location.hash = '#texts/' + n.id;
  };
};

// ---------- Prüfen mit Claude: Wortkarten und Sätze ----------
// Wortliste und Vorlagen sind ungeprüft; Wörter haben je nach Satz andere Bedeutungen (sei = sechs / du bist).
const CHECK_WORD_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['ok', 'problems', 't', 'de', 'other'],
  properties: { ok: { type: 'boolean' }, problems: { type: 'string' }, t: { type: 'string' }, de: { type: 'string' }, other: { type: 'string' } },
};
const CHECK_SENT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['ok', 'problems', 'target', 'de', 'words'],
  properties: {
    ok: { type: 'boolean' }, problems: { type: 'string' }, target: { type: 'string' }, de: { type: 'string' },
    words: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['t', 'de'], properties: { t: { type: 'string' }, de: { type: 'string' } } } },
  },
};
function findSentence(id) {
  for (const isl of state.islands) { const s = isl.sentences.find(x => x.id === id); if (s) return s; }
  return null;
}
function setWordCard(id, t, d) {
  if (id.startsWith('u:')) {
    const own = state.words.find(x => x.id === id);
    if (own) { own.t = t; own.d = d; own.ts = Date.now(); }
  } else state.overrides[id] = { t, d, ts: Date.now() };
  persist();
}
async function checkWordUI(id, btn, out, onChange) {
  const w = wordById(id);
  if (!w) return;
  const lang = settings.lang === 'it' ? 'Italian' : 'British English';
  btn.disabled = true; btn.textContent = '🔍 Prüfe …';
  try {
    const r = await callClaude(
      `Check a vocabulary card for a German-speaking learner of ${lang}. The German translation comes from an unchecked frequency word list and may be wrong or misleading. ok = true if the German is a correct, common translation of the word. "t": the ${lang} word as it should stand on the card (normally unchanged; dictionary form). "de": the best short German translation – up to 3 common meanings separated by " / ", most common first. "other": other important meanings a learner should know, especially homographs and words that are also forms of another word (e.g. Italian "sei" = "sechs", but also "du bist" from essere) – short German, empty if none. "problems": a short German explanation if the card is wrong or misleading, else empty.`,
      [{ role: 'user', content: `${w.t} = ${w.d}` }], CHECK_WORD_SCHEMA, 4000);
    const d = r.data;
    const changed = !d.ok && (d.t.trim() !== w.t || d.de.trim() !== w.d);
    out.innerHTML = `<div class="notice ${d.ok ? '' : 'warn'}" style="margin-top:10px;text-align:left">
      ${d.ok ? '✓ Passt.' : '⚠️ ' + esc(d.problems || 'Nicht ganz richtig.')}
      ${changed ? `<div style="margin-top:6px">Vorschlag: <b>${esc(d.t)}</b> – ${esc(d.de)}</div><button class="btn small" id="chk-take" style="margin-top:6px">✓ Übernehmen</button>` : ''}
      ${d.other ? `<div style="margin-top:6px">Auch: ${esc(d.other)}</div>` : ''}
    </div>`;
    if (changed) $('#chk-take', out).onclick = () => { setWordCard(id, d.t.trim(), d.de.trim()); toast('Übernommen'); onChange && onChange({ t: d.t.trim(), d: d.de.trim() }); $('#chk-take', out).remove(); };
    btn.remove();
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = '🔍 Prüfen'; }
}
async function checkSentenceUI(id, btn, out, onChange) {
  const s = findSentence(id);
  if (!s) return;
  const lang = settings.lang === 'it' ? 'Italian' : 'British English';
  btn.disabled = true; btn.textContent = '🔍 Prüfe …';
  try {
    const r = await callClaude(
      `A German-speaking learner studies a ${lang} sentence with its German translation (written by the learner or taken from a template – it may contain mistakes). Check: 1) Is the ${lang} sentence correct and natural, exactly as a native speaker would say it? 2) Does the German translation match its meaning? ok = true only if both are fine (small style preferences are not mistakes). "problems": a short German explanation of what is wrong or unnatural, empty if ok. "target": the corrected, natural ${lang} sentence – identical to the given one if it is fine; keep the meaning and keep it simple. "de": a natural German translation of "target". "words": "target" split into its words in original order (punctuation attached), each with its German meaning IN THIS SENTENCE, literal and in ${lang} word order (e.g. Italian "Sei mai stato in Germania?" → Sei = "bist-du", mai = "jemals", stato = "gewesen" – not "sechs" or "Staat"); join several German words with hyphens.`,
      [{ role: 'user', content: `${lang}: ${s.t}\nGerman: ${s.d}` }], CHECK_SENT_SCHEMA, 6000);
    const d = r.data;
    const changed = !d.ok && (d.target.trim() !== s.t || d.de.trim() !== s.d);
    if (!changed) { s.gloss = d.words; s.ts = Date.now(); persist(); }
    out.innerHTML = `<div class="notice ${changed ? 'warn' : ''}" style="margin-top:10px;text-align:left">
      ${changed ? '⚠️ ' + esc(d.problems || 'Nicht ganz richtig.') : '✓ Passt.' + (d.problems ? ' ' + esc(d.problems) : '')}
      ${changed ? `<div style="margin-top:6px">Vorschlag: <b>${esc(d.target)}</b><br>${esc(d.de)}</div><button class="btn small" id="chk-take" style="margin-top:6px">✓ Übernehmen</button>` : ''}
      <div style="margin-top:6px">${glossRow(d.words, false)}</div>
    </div>`;
    if (changed) $('#chk-take', out).onclick = () => {
      s.t = d.target.trim(); s.d = d.de.trim(); s.gloss = d.words; s.ts = Date.now();
      persist();
      toast('Übernommen');
      onChange && onChange({ t: s.t, d: s.d });
      $('#chk-take', out).remove();
    };
    btn.remove();
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = '🔍 Prüfen'; }
}

// Liedtexte: Zeilenumbrüche beim Kopieren liegen oft mitten im Satz. Claude bekommt nummerierte Wörter
// und nennt nur die Wort-Nummern, an denen eine neue Lerneinheit beginnt – der Text selbst bleibt unverändert.
const SEGMENT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['starts'],
  properties: { starts: { type: 'array', items: { type: 'integer' } } },
};
const LABEL_LINE = /^\s*[\[(].*[\])]\s*$/; // Abschnittsmarken wie [Ritornello] oder (x2)
// Wörter des Originaltexts (ohne Abschnittsmarken) – Neu-Ordnen geht immer vom eingefügten Original aus
function originalWords(tx) {
  if (!tx.original) tx.original = tx.lines.map(l => l.t);
  return tx.original.filter(t => !LABEL_LINE.test(t)).map(line => line.split(/\s+/).filter(Boolean));
}
const SENT_END = /[.!?…]["»”)]*$/;
// Bruchstücke aus 1–2 Wörtern an den Nachbarsatz hängen: ans vorige Stück, wenn das noch nicht mit Satzzeichen
// endet (typisch: Satzende rutscht in die nächste Kopierzeile), sonst ans nächste. Echte Ausrufe bleiben.
function mergeFragments(units) {
  const out = [];
  let carry = [];
  units.forEach(u => {
    u = carry.concat(u);
    carry = [];
    const short = u.length <= 2 && !/[!?]["»”)]*$/.test(u[u.length - 1]);
    if (!short) { out.push(u); return; }
    const prev = out[out.length - 1];
    if (prev && !SENT_END.test(prev[prev.length - 1])) out[out.length - 1] = prev.concat(u);
    else carry = u;
  });
  if (carry.length) { if (out.length) out[out.length - 1] = out[out.length - 1].concat(carry); else out.push(carry); }
  return out;
}
function setUnits(tx, units) {
  tx.lines = units.map(u => ({ id: 'l' + uid(), t: u.join(' '), de: '', words: [], note: '' }));
  tx.grouped = true;
  tx.ts = Date.now();
  persist();
}
// Ohne Claude: nur an Satzzeichen teilen; ohne Satzzeichen bleiben die Zeilen, wie sie sind
function localSegment(tx) {
  const lines = originalWords(tx);
  const words = [].concat(...lines);
  if (!words.some(w => SENT_END.test(w))) { setUnits(tx, lines.filter(l => l.length)); return; }
  const units = [];
  let cur = [];
  words.forEach(w => { cur.push(w); if (SENT_END.test(w)) { units.push(cur); cur = []; } });
  if (cur.length) units.push(cur);
  setUnits(tx, mergeFragments(units));
}
async function segmentText(tx) {
  const lines = originalWords(tx);
  const words = [];
  const listing = lines.map(line => line.map(w => { words.push(w); return `${words.length - 1}:${w}`; }).join(' ')).join('\n');
  if (words.length < 2) return;
  const lang = settings.lang === 'it' ? 'Italian' : 'English';
  const r = await callClaude(
    `A learner pasted a ${lang} text (often song lyrics) for private study. The pasted line breaks are unreliable: a sentence often runs over several lines, one line can hold the end of one sentence and the start of the next, and lyric lines usually start with a capital letter even in the middle of a sentence – so capital letters at line starts are NOT evidence of a new sentence. Every word below is prefixed with its index.
Split the text into study units that are COMPLETE sentences, judged by grammar and meaning (punctuation helps when present). Rules:
- Keep each sentence whole. Only split a sentence if it is longer than about 25 words, and then only at a strong boundary between two main clauses.
- Never create fragments: no unit may be an incomplete phrase that only makes sense with the previous or next words. Words that finish a sentence belong to that sentence.
- A repeated line or a short exclamation that stands on its own may be its own unit.
Return "starts": the ascending word indices where each unit begins (the first is 0). Do not return any text.`,
    [{ role: 'user', content: listing }], SEGMENT_SCHEMA, 8000);
  const starts = [...new Set([0].concat(r.data.starts || []))].filter(i => Number.isInteger(i) && i >= 0 && i < words.length).sort((a, b) => a - b);
  setUnits(tx, mergeFragments(starts.map((st, k) => words.slice(st, starts[k + 1] ?? words.length))));
}

async function translateText(tx, onProgress) {
  const lang = settings.lang === 'it' ? 'Italian' : 'British English';
  const todo = tx.lines.map((l, i) => i).filter(i => !tx.lines[i].de);
  for (let k = 0; k < todo.length; k += 40) {
    const chunk = todo.slice(k, k + 40);
    onProgress && onProgress(k, todo.length);
    const listing = chunk.map(i => `${i}: ${tx.lines[i].t}`).join('\n');
    const r = await callClaude(
      `You help a German-speaking learner understand a ${lang} text they pasted for private study (for example song lyrics). For every numbered line, return an object with the same "i" and: "de" = a natural German translation of the line (keep the meaning and tone; for song lyrics a faithful, readable translation, not a rhyming one); "words" = the line split into its words in original order (punctuation attached) with a literal word-for-word German gloss for each, keeping the ${lang} word order, several German words joined with hyphens; "note" = a short German explanation of idioms, slang, contractions, poetic or dialect forms, or anything a learner would misunderstand in this line – empty string if nothing needs explaining. Use the surrounding lines for context. Return all lines, in order.`,
      [{ role: 'user', content: listing }], TEXT_SCHEMA, 16000);
    r.data.lines.forEach(x => {
      const line = tx.lines[x.i];
      if (!line || !chunk.includes(x.i)) return;
      line.de = x.de; line.words = x.words || []; line.note = x.note || '';
    });
    tx.ts = Date.now();
    persist();
  }
}

// ---------- Hör-Dialoge: Claude schreibt eine Alltagsszene mit mehreren Personen auf deinem Niveau ----------
const STORY_SITUATIONS = [
  { k: 'cafe', l: '☕ Café / Bar', it: 'ordering and chatting at a café or bar' },
  { k: 'market', l: '🛒 Markt / Laden', it: 'shopping at a market or small shop' },
  { k: 'restaurant', l: '🍝 Restaurant', it: 'at a restaurant: ordering, a small problem, paying' },
  { k: 'friends', l: '👋 Freunde treffen', it: 'two or three friends meet and make plans for the weekend' },
  { k: 'phone', l: '📞 Telefonat', it: 'a phone call to arrange something (appointment, meeting, reservation)' },
  { k: 'doctor', l: '💊 Arzt / Apotheke', it: 'at the doctor or the pharmacy' },
  { k: 'train', l: '🚆 Bahnhof / Zug', it: 'at the station or on the train: tickets, delays, a chat with another passenger' },
  { k: 'neighbours', l: '🏠 Nachbarn', it: 'neighbours talking on the stairs or in the courtyard' },
  { k: 'work', l: '💼 Arbeit', it: 'colleagues at work during a break or a small problem' },
  { k: 'family', l: '👨‍👩‍👧 Familie', it: 'a family at dinner talking about their day' },
];
const STORY_SITUATIONS_TEEN = [
  { k: 'school', l: '🏫 Schule', it: 'classmates before a lesson or during break' },
  { k: 'friends', l: '👋 Freunde', it: 'teen friends make plans for the afternoon or weekend' },
  { k: 'icecream', l: '🍦 Eisdiele', it: 'teens ordering at an ice cream shop' },
  { k: 'family', l: '👨‍👩‍👧 Familie', it: 'a family at dinner talking about the day' },
  { k: 'sport', l: '⚽ Sport', it: 'teens at sports practice or watching a match' },
  { k: 'shopping', l: '🛍️ Einkaufen', it: 'teens shopping for clothes or a present' },
  { k: 'exchange', l: '🌍 Austausch', it: 'a host family welcomes an exchange student' },
];
const STORY_LEN = [{ k: 10, l: 'Kurz (~10 Zeilen)' }, { k: 18, l: 'Mittel (~18)' }, { k: 28, l: 'Lang (~28)' }];
const STORY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'speakers', 'lines'],
  properties: {
    title: { type: 'string' },
    speakers: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'gender'], properties: { name: { type: 'string' }, gender: { type: 'string', enum: ['m', 'f'] } } } },
    lines: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['sp', 't', 'de', 'words', 'note'], properties: {
      sp: { type: 'integer' }, t: { type: 'string' }, de: { type: 'string' }, note: { type: 'string' },
      words: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['t', 'de'], properties: { t: { type: 'string' }, de: { type: 'string' } } } },
    } } },
  },
};
// Stimme pro Sprecher: Die Browser-Schnittstelle verrät das Geschlecht einer Stimme nicht – deshalb ordnet
// der Nutzer seine Gerätestimmen einmal Mann/Frau zu (settings.voiceGender). Ohne passende Stimme: Tonhöhe.
function storyVoices() {
  const code = langCode().toLowerCase();
  const vs = voicesFor(settings.lang);
  return vs.filter(v => v.lang.toLowerCase().replace('_', '-') === code).concat(vs.filter(v => v.lang.toLowerCase().replace('_', '-') !== code));
}
function storyVoice(tx, sp) {
  if (!tx.story || sp === undefined || sp === null) return {};
  const base = pickVoice(settings.lang);
  if (sp < 0) return base ? { voice: base } : {};
  const sps = tx.story.speakers;
  const g = (sps[sp] && sps[sp].gender) || 'f';
  const n = sps.slice(0, sp).filter(x => x.gender === g).length; // wievielte Person dieses Geschlechts
  const pool = storyVoices().filter(v => (settings.voiceGender || {})[v.name] === g);
  if (pool.length) {
    // genug passende Stimmen: jede Person eine eigene; sonst dieselbe Stimme leicht verstellt
    const round = Math.floor(n / pool.length);
    const pitch = round ? (g === 'm' ? [1, 0.85, 1.1] : [1, 1.15, 0.9])[round % 3] : 1;
    return { voice: pool[n % pool.length], pitch };
  }
  // keine Stimme dieses Geschlechts bekannt: nicht zugeordnete (oder Standard-)Stimme mit Tonhöhe
  const other = storyVoices().filter(v => !(settings.voiceGender || {})[v.name]);
  const voice = other.includes(base) ? base : other[0] || base;
  const pitch = g === 'm' ? [0.7, 0.55, 0.85][n % 3] : [1.25, 1.5, 1.1][n % 3];
  return Object.assign({ pitch }, voice ? { voice } : {});
}
async function createStory(o) {
  const lang = settings.lang === 'it' ? 'Italian' : 'British English';
  const stage = talkStage();
  const known = knownWordList(400);
  const city = settings.lang === 'it' ? 'Italy' : 'Britain';
  const sentence = { A0: 'very short, simple sentences (3–6 words), present tense, very common words', A1: 'short, simple sentences in the present tense, everyday words', A2: 'simple sentences; present, past (passato prossimo / simple past) and near future', B1: 'natural everyday sentences with common tenses and some idioms', B2: 'natural, fluent conversation with idioms and varied tenses' }[stage.id];
  const r = await callClaude(
    `You write short listening dialogues for a German-speaking learner of ${lang}. The dialogue is read aloud by text-to-speech with a different voice for each person, so it must work purely by listening.

Situation: ${o.situation}. Set it in ${city}.
People: exactly ${o.speakers} fictional characters with common ${settings.lang === 'it' ? 'Italian' : 'British'} first names; give each a gender (m/f) and mix genders where it fits.
Length: about ${o.lines} lines.${o.narrator ? ' Add a few short narrator lines (sp = -1) in the present tense to set the scene and connect moments; most lines are dialogue.' : ' Dialogue only, no narrator (no line with sp = -1).'}
Learner level: ${stage.id} (vocabulary-based estimate). Use ${sentence}.
Words the learner already knows (${known.length}) – for orientation only: ${known.length ? known.join(', ') : 'almost none'}.

${settings.teen ? TEEN_RULES + '\n\n' : ''}Most important rule: every line must be natural, idiomatic ${lang} exactly as native speakers would talk in this situation. Never write unnatural sentences just to use known words; keep it easy through short sentences and everyday phrasing instead. Give the scene a small story: a beginning, a little surprise or problem, and an ending. People react to each other, use typical everyday phrases, greetings and fillers.

Return: "title" in ${lang} (short); "speakers" in order of appearance; "lines" with "sp" = index into speakers (or -1 for the narrator), "t" = the spoken line only (no name prefix), "de" = natural German translation, "words" = the line split into its words in original order (punctuation attached) each with a literal word-for-word German gloss keeping the ${lang} word order (several German words joined with hyphens), "note" = a short German explanation of an idiom, colloquial form or anything a learner would misunderstand, else an empty string.`,
    [{ role: 'user', content: 'Write the dialogue.' }], STORY_SCHEMA, 16000);
  const d = r.data;
  const n = d.speakers.length;
  const tx = {
    id: 'tx' + uid(), title: d.title, ts: Date.now(),
    story: { speakers: d.speakers, situation: o.label, stage: stage.id },
    lines: d.lines.filter(l => l.t && l.t.trim()).map(l => ({ id: 'l' + uid(), sp: Number.isInteger(l.sp) && l.sp < n ? Math.max(-1, l.sp) : -1, t: l.t.trim(), de: l.de || '', words: l.words || [], note: l.note || '' })),
  };
  state.texts = state.texts || [];
  state.texts.push(tx);
  persist();
  return { tx, cost: r.cost };
}
let storyBusy = false;
function listenStories(root) {
  state.texts = state.texts || [];
  const sits = settings.teen ? STORY_SITUATIONS_TEEN : STORY_SITUATIONS;
  const opts = Object.assign({ sit: 0, speakers: 2, len: 1, narrator: false, custom: '' }, load('sl.story', {}));
  if (opts.sit > sits.length) opts.sit = 0;
  const stories = state.texts.filter(x => x.story).slice().reverse();
  const nVoices = voicesFor(settings.lang).length;
  root.innerHTML = `
    <h1>🎧 Hören</h1>
    ${listenSeg('stories')}
    ${voiceNotice()}
    <div class="card">
      <b>Neuer Hör-Dialog</b>
      <p class="muted small">Claude schreibt eine Alltagsszene auf deinem Niveau (${talkStage().id}). Jede Person bekommt eine eigene Stimme. Mit Übersetzung und Wort-für-Wort-Hilfe.</p>
      ${talkCfg.key ? `
      <label>Situation</label>
      ${chips('st-sit', sits.concat([{ l: '✏️ Eigene' }]), opts.sit, x => x.l)}
      <input type="text" id="st-custom" placeholder="z. B. Streit um den letzten Parkplatz" value="${esc(opts.custom)}" ${opts.sit === sits.length ? '' : 'hidden'} style="margin-top:6px">
      <div class="row" style="margin-top:6px">
        <div class="grow"><label for="st-sp">Personen</label><select id="st-sp">${[2, 3, 4].map(n => `<option ${n === opts.speakers ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="grow"><label for="st-len">Länge</label><select id="st-len">${STORY_LEN.map((x, i) => `<option value="${i}" ${i === opts.len ? 'selected' : ''}>${x.l}</option>`).join('')}</select></div>
      </div>
      <label class="inline"><input type="checkbox" id="st-nar" ${opts.narrator ? 'checked' : ''}> Mit Erzähler</label>
      <button class="btn primary big" id="st-go" style="margin-top:12px" ${storyBusy ? 'disabled' : ''}>${storyBusy ? '🤖 Schreibe …' : '🎭 Dialog erstellen'}</button>
      <p class="muted small">Kostet einmalig grob 5–15 Cent (Schätzung), danach beliebig oft anhören.</p>`
      : `<p class="small">Dafür brauchst du einen Claude-Schlüssel: <a href="#talk/setup">Reden → ⚙️</a>.</p>`}
    </div>
    ${nVoices ? `<details class="card" id="st-voices" ${Object.keys(settings.voiceGender || {}).some(k => storyVoices().some(v => v.name === k)) ? '' : 'open'}>
      <summary><b>🗣️ Stimmen zuordnen</b> <span class="muted small">(${nVoices} auf diesem Gerät)</span></summary>
      <p class="muted small">Der Browser verrät nicht, ob eine Stimme männlich oder weiblich ist. Einmal anhören und zuordnen – dann sprechen Männer mit Männerstimme.${nVoices === 1 ? ' Nur eine Stimme: Die zweite Stimme wird über die Tonhöhe erzeugt. Weitere Stimmen ggf. in den Geräte-Einstellungen (Text-in-Sprache) installieren; Chrome auf Android zeigt oft trotzdem nur eine.' : ''}</p>
      <ul class="list">${storyVoices().map((v, i) => `<li><div class="grow"><div class="t small">${esc(v.name)}</div><div class="d">${esc(v.lang)}</div>
        <div class="chips" style="margin-top:4px"><button class="chip" data-vt="${i}">▶</button>${[['m', 'Mann'], ['f', 'Frau'], ['', '?']].map(([g, l]) => `<button class="chip ${((settings.voiceGender || {})[v.name] || '') === g ? 'on' : ''}" data-vg="${i}" data-g="${g}">${l}</button>`).join('')}</div></div></li>`).join('')}</ul>
    </details>` : ''}
    ${stories.map(x => `
      <a class="card step" href="#texts/${x.id}">
        <div class="num">🎭</div>
        <div class="grow"><b>${esc(x.title)}</b><div class="meta">${esc(x.story.situation)} · ${x.story.speakers.length} Personen · ${x.lines.length} Zeilen · ${esc(x.story.stage)}</div></div><div>›</div>
      </a>`).join('')}`;
  bindGo(root);
  const vlist = storyVoices();
  $$('[data-vt]', root).forEach(b => { b.onclick = () => speak(settings.lang === 'it' ? 'Ciao, come stai? Io sto bene.' : 'Hello, how are you? I\'m fine, thanks.', { voice: vlist[b.dataset.vt] }); });
  $$('[data-vg]', root).forEach(b => {
    b.onclick = () => {
      settings.voiceGender = settings.voiceGender || {};
      const name = vlist[b.dataset.vg].name;
      if (b.dataset.g) settings.voiceGender[name] = b.dataset.g; else delete settings.voiceGender[name];
      saveSettings();
      $$(`[data-vg="${b.dataset.vg}"]`, root).forEach(x => x.classList.toggle('on', x === b));
    };
  });
  if (!talkCfg.key) return;
  const store = () => save('sl.story', opts);
  $$('.chips[data-name="st-sit"] .chip', root).forEach(c => { c.onclick = () => { opts.sit = Number(c.dataset.i); store(); listenStories(root); }; });
  $('#st-custom', root).onchange = e => { opts.custom = e.target.value.trim(); store(); };
  $('#st-sp', root).onchange = e => { opts.speakers = Number(e.target.value); store(); };
  $('#st-len', root).onchange = e => { opts.len = Number(e.target.value); store(); };
  $('#st-nar', root).onchange = e => { opts.narrator = e.target.checked; store(); };
  $('#st-go', root).onclick = async () => {
    const custom = opts.sit === sits.length;
    if (custom) opts.custom = $('#st-custom', root).value.trim();
    if (custom && !opts.custom) { toast('Bitte Situation eingeben'); return; }
    store();
    storyBusy = true;
    listenStories(root);
    try {
      const { tx, cost } = await createStory({
        situation: custom ? opts.custom : sits[opts.sit].it,
        label: custom ? opts.custom : sits[opts.sit].l.replace(/^\S+\s/, ''),
        speakers: opts.speakers, lines: STORY_LEN[opts.len].k, narrator: opts.narrator,
      });
      storyBusy = false;
      toast(`Fertig (≈ $${cost.toFixed(2)})`);
      if (location.hash === '#listen/stories') location.hash = '#texts/' + tx.id;
    } catch (e) {
      storyBusy = false;
      toast(e.message);
      if (location.hash === '#listen/stories') listenStories(root);
    }
  };
}

let textPlayToken = null;
let textBusy = null; // ID des Texts, der gerade geordnet/übersetzt wird
function textDetail(root, tx) {
  const done = tx.lines.every(l => l.de);
  const islandId = 'txt-' + settings.lang;
  const isl = state.islands.find(i => i.id === islandId);
  const inIsland = t => !!(isl && isl.sentences.some(s => s.t === t));
  root.innerHTML = `
    <a href="${tx.story ? '#listen/stories' : '#texts'}" class="small">‹ ${tx.story ? 'Alle Dialoge' : 'Alle Texte'}</a>
    <input type="text" id="tx-name" value="${esc(tx.title)}" style="font-size:20px;font-weight:700;margin:8px 0 12px">
    ${textBusy === tx.id ? `<div class="card"><p class="typing" id="tx-status">🤖 Ordne in ganze Sätze und übersetze …</p></div>` : done ? '' : `<div class="card"><p class="small">${tx.lines.filter(l => !l.de).length} Sätze ohne Übersetzung.</p>
      ${talkCfg.key ? '<button class="btn primary" id="tx-tr">🌐 Übersetzen</button>' : '<p class="muted small">Ohne Claude-Schlüssel wird nur an Punkt/Fragezeichen geteilt und nicht übersetzt. Schlüssel unter <a href="#talk/setup">Reden → ⚙️</a>.</p>'}</div>`}
    ${tx.story ? `<p class="muted small">🎭 ${tx.story.speakers.map(x => esc(x.name)).join(', ')} · ${esc(tx.story.situation)} · Niveau ${esc(tx.story.stage)}</p>` : ''}
    ${talkCfg.key && textBusy !== tx.id && !tx.story ? '<button class="btn small" id="tx-reseg" style="margin-bottom:8px">🔄 Neu in Sätze ordnen & übersetzen</button>' : ''}
    ${tx.original ? '<button class="btn small" id="tx-orig" style="margin-bottom:8px">↩ Ursprüngliche Zeilen wiederherstellen</button>' : ''}
    <div class="row" style="margin-bottom:8px">
      <button class="btn grow" id="tx-play">▶ Alles vorlesen</button>
      <label class="inline small" style="margin:0"><input type="checkbox" id="tx-show" ${tx.showDe ? 'checked' : ''}> Deutsch zeigen</label>
      <label class="inline small" style="margin:0"><input type="checkbox" id="tx-loop" ${tx.loop ? 'checked' : ''}> 🔁 Schleife</label>
      ${tx.story ? `<label class="inline small" style="margin:0"><input type="checkbox" id="tx-hide" ${tx.hideT ? 'checked' : ''}> Text verbergen</label>` : ''}
    </div>
    <ul class="list card ${tx.story && tx.hideT ? 'tx-hidden' : ''}" id="tx-list">
      ${tx.lines.map((l, i) => `
        <li data-i="${i}">
          <div class="grow">
            ${tx.story && l.sp >= 0 && tx.story.speakers[l.sp] ? `<div class="muted small">${esc(tx.story.speakers[l.sp].name)}</div>` : ''}
            <div class="t">${esc(l.t)}</div>
            <div class="tx-de" ${tx.showDe ? '' : 'hidden'}>
              ${l.de ? `<div class="d">${esc(l.de)}</div>` : ''}
              ${l.words && l.words.length ? glossRow(l.words.map(w => ({ t: w.t, de: w.de })), false) : ''}
              ${l.note ? `<div class="d" style="margin-top:4px">💬 ${esc(l.note)}</div>` : ''}
              ${l.words && l.words.length ? `<details style="margin-top:6px"><summary class="small">＋ Wörter übernehmen</summary><div class="tools" style="margin-top:6px">${l.words.map((w, j) => `<button class="btn small" data-tw="${i}-${j}">＋ ${esc(w.t.replace(/[.,!?;:«»"“”()…]+/g, ''))}</button>`).join('')}</div></details>` : ''}
            </div>
          </div>
          <div class="stack" style="flex:none">
            <button class="btn small" data-tp="${i}">🔊</button>
            <button class="btn small" data-td="${i}">DE</button>
            ${l.de ? `<button class="btn small" data-ta="${i}" ${inIsland(l.t) ? 'disabled' : ''} title="In die Wiederholung">➕</button>` : ''}
          </div>
        </li>`).join('')}
    </ul>
    <button class="btn danger" id="tx-del" style="width:100%">Text löschen</button>`;
  $('#tx-name', root).onchange = e => { tx.title = e.target.value.trim() || tx.title; tx.ts = Date.now(); persist(); };
  const rerender = () => { if (location.hash === '#texts/' + tx.id) textDetail(root, tx); };
  // Ordnen + Übersetzen in einem Rutsch (automatisch nach dem Speichern oder per „Neu ordnen“)
  const runAuto = async () => {
    textBusy = tx.id;
    rerender();
    try {
      await segmentText(tx);
      rerender();
      await translateText(tx, (k, n) => { const el = $('#tx-status'); if (el) el.textContent = `🤖 Übersetze … (${k}/${n})`; });
      toast('In Sätze geordnet und übersetzt');
    } catch (e) { toast(e.message); }
    textBusy = null;
    rerender();
  };
  if (tx.autoSeg && textBusy !== tx.id) {
    delete tx.autoSeg;
    persist();
    if (talkCfg.key) { runAuto(); return; }
    localSegment(tx);
    rerender();
    return;
  }
  if ($('#tx-reseg', root)) {
    $('#tx-reseg', root).onclick = () => {
      if (tx.lines.some(l => l.de) && !confirm('Neu ordnen? Die bisherigen Übersetzungen werden ersetzt (kostet einmalig ein paar Cent).')) return;
      runAuto();
    };
  }
  if ($('#tx-orig', root)) {
    $('#tx-orig', root).onclick = () => {
      if (!confirm('Ursprüngliche Zeilen wiederherstellen? Übersetzungen gehen dabei verloren.')) return;
      tx.lines = tx.original.map(t => ({ id: 'l' + uid(), t, de: '', words: [], note: '' }));
      delete tx.original;
      tx.grouped = false;
      tx.ts = Date.now();
      persist();
      rerender();
    };
  }
  if ($('#tx-tr', root)) {
    $('#tx-tr', root).onclick = async () => {
      const b = $('#tx-tr', root);
      b.disabled = true;
      try {
        await translateText(tx, (k, n) => { b.textContent = `Übersetze … (${k}/${n})`; });
        toast('Übersetzt');
      } catch (e) { toast(e.message); }
      if (location.hash === '#texts/' + tx.id) textDetail(root, tx);
    };
  }
  $('#tx-show', root).onchange = e => { tx.showDe = e.target.checked; persist(); $$('.tx-de', root).forEach(x => { x.hidden = !tx.showDe; }); };
  $$('[data-td]', root).forEach(b => { b.onclick = () => { const el = $(`li[data-i="${b.dataset.td}"] .tx-de`, root); el.hidden = !el.hidden; }; });
  $$('[data-tp]', root).forEach(b => { b.onclick = () => speak(tx.lines[b.dataset.tp].t, storyVoice(tx, tx.lines[b.dataset.tp].sp)); });
  $('#tx-loop', root).onchange = e => { tx.loop = e.target.checked; persist(); };
  if ($('#tx-hide', root)) $('#tx-hide', root).onchange = e => { tx.hideT = e.target.checked; persist(); $('#tx-list', root).classList.toggle('tx-hidden', tx.hideT); };
  $$('[data-ta]', root).forEach(b => {
    b.onclick = () => {
      const l = tx.lines[b.dataset.ta];
      let target = state.islands.find(i => i.id === islandId);
      if (!target) { target = { id: islandId, title: 'Texte', sentences: [], ts: Date.now() }; state.islands.push(target); }
      if (!target.sentences.some(s => s.t === l.t)) target.sentences.push({ id: 's:' + uid(), t: l.t, d: l.de, ts: Date.now() });
      persist();
      b.disabled = true;
      toast('In Insel „Texte“ – kommt in Wiederholung & Shadowing');
    };
  });
  $$('[data-tw]', root).forEach(b => {
    b.onclick = () => {
      const [i, j] = b.dataset.tw.split('-').map(Number);
      const w = tx.lines[i].words[j];
      const t = w.t.replace(/[.,!?;:«»"“”()…]+/g, '').trim();
      const d = w.de.replace(/[.,!?;:]+$/g, '').replace(/-/g, ' ').trim();
      if (!t) return;
      if (allWords().some(x => x.t.toLowerCase() === t.toLowerCase())) { toast('Wort gibt es schon'); return; }
      state.words.push({ id: 'u:' + uid(), t, d, ts: Date.now() });
      persist();
      b.disabled = true;
      toast(`„${t}“ zu deinen Wörtern – Bedeutung ggf. mit ✎ anpassen`);
    };
  });
  // Mitlesen: alle Zeilen nacheinander vorlesen, aktuelle Zeile markieren
  $('#tx-play', root).onclick = async () => {
    const btn = $('#tx-play', root);
    if (textPlayToken) { textPlayToken.stop = true; textPlayToken = null; speechSynthesis.cancel(); listening = false; btn.textContent = '▶ Alles vorlesen'; $$('#tx-list li', root).forEach(x => x.classList.remove('now')); return; }
    const token = { stop: false };
    textPlayToken = token;
    listening = true;
    btn.textContent = '■ Stopp';
    do {
      for (let i = 0; i < tx.lines.length && !token.stop; i++) {
        $$('#tx-list li', root).forEach(x => x.classList.toggle('now', Number(x.dataset.i) === i));
        const li = $(`#tx-list li[data-i="${i}"]`, root);
        if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await speakP(tx.lines[i].t, storyVoice(tx, tx.lines[i].sp));
        if (!token.stop) await wait(700);
      }
      if (tx.loop && !token.stop) await wait(2500); // kurze Pause vor der nächsten Runde
    } while (tx.loop && !token.stop);
    if (textPlayToken === token) { textPlayToken = null; listening = false; btn.textContent = '▶ Alles vorlesen'; }
  };
  $('#tx-del', root).onclick = () => {
    if (!confirm(`Text „${tx.title}“ löschen?`)) return;
    state.texts = state.texts.filter(x => x !== tx);
    markDeleted(tx.id);
    persist();
    location.hash = '#texts';
  };
}

views.islands = function (root, id) {
  const isl = id && state.islands.find(i => i.id === id);
  if (isl) { islandDetail(root, isl); return; }
  root.innerHTML = `
    ${islandsSeg('islands')}
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
  bindGo(root);
  $('#i-add', root).onclick = () => {
    const title = $('#i-title', root).value.trim();
    if (!title) return;
    const n = { id: uid(), title, sentences: [], ts: Date.now() };
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
          <div class="grow"><div class="t">${esc(s.t)}</div><div class="d">${esc(s.d)}</div>${photoEditor(s.id)}</div>
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
  bindPhotoEditors(root);
  $('#i-name', root).onchange = e => { isl.title = e.target.value.trim() || isl.title; isl.ts = Date.now(); persist(); };
  $('#s-add', root).onclick = () => {
    const d = $('#s-d', root).value.trim(), t = $('#s-t', root).value.trim();
    if (!d || !t) { toast('Beide Felder ausfüllen'); return; }
    isl.sentences.push({ id: 's:' + uid(), t, d, ts: Date.now() });
    persist();
    islandDetail(root, isl);
    $('#s-d', root).focus();
  };
  $('#s-import', root).onclick = () => {
    const pairs = parseLines($('#s-bulk', root).value);
    pairs.forEach(([t, d]) => isl.sentences.push({ id: 's:' + uid(), t, d, ts: Date.now() }));
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
      if (t.trim() && t.trim() !== s.t) delete s.gloss; // Wort-für-Wort-Hilfe passt nicht mehr
      if (t.trim()) s.t = t.trim();
      if (d.trim()) s.d = d.trim();
      s.ts = Date.now();
      persist();
      islandDetail(root, isl);
    };
  });
  $$('[data-del]', root).forEach(b => {
    b.onclick = () => {
      isl.sentences = isl.sentences.filter(s => s.id !== b.dataset.del);
      delete state.srs[b.dataset.del];
      markDeleted(b.dataset.del);
      photoDB.del(photoKey(b.dataset.del)).catch(() => {});
      persist();
      islandDetail(root, isl);
    };
  });
  $('#i-del', root).onclick = () => {
    if (!confirm(`Insel „${isl.title}“ mit ${isl.sentences.length} Sätzen löschen?`)) return;
    isl.sentences.forEach(s => { delete state.srs[s.id]; markDeleted(s.id); });
    markDeleted(isl.id);
    state.islands = state.islands.filter(i => i !== isl);
    persist();
    location.hash = '#islands';
  };
}

// ---------- Niveau & Einstufungstest ----------
// Häufigkeitsstufen der mitgelieferten Wortliste (sortiert: Grundwörter, dann nach Häufigkeit)
const BANDS = [[0, 100], [100, 250], [250, 500], [500, 800], [800, 1150], [1150, 1500]];
const PER_BAND = 6;

views.level = function (root, arg) {
  if (arg === 'test') { levelTest(root); return; }
  const li = levelInfo();
  const lv = state.level;
  const acc = li.acc;
  root.innerHTML = `
    <h1>📈 Dein Niveau</h1>
    <div class="card">
      <div class="row between"><b style="font-size:22px">${li.stage.id}</b><span class="muted small">${li.words} sichere Wörter</span></div>
      <p>${li.stage.text}</p>
      ${li.next ? `<div class="progress"><div style="width:${Math.round(li.progress * 100)}%"></div></div>
        <p class="muted small">Noch ${li.next.min - li.words} sichere Wörter bis ${li.next.id}.</p>` : ''}
      <p class="muted small">Grobe Einschätzung nur über den Wortschatz – kein offizielles Sprachniveau. „Sicher“ = mehrmals richtig abgerufen oder im Test bestätigt.</p>
    </div>
    <div class="card">
      <b>Trefferquote (7 Tage)</b>
      <p>${acc.total ? `${Math.round(acc.rate * 100)} % richtig bei ${acc.total} Wortabfragen` : 'Noch keine Abfragen.'}</p>
      <label class="inline"><input type="checkbox" id="lv-auto" ${settings.autoTempo ? 'checked' : ''}> Tempo automatisch anpassen</label>
      <p class="muted small">Heute: ${newWordTempo().n} neue Wörter${newWordTempo().reason ? ' – ' + esc(newWordTempo().reason) : ''}. Unter 75 % Treffern wird es weniger, über 90 % mehr.</p>
    </div>
    <div class="card">
      <b>Einstufungstest</b>
      ${lv ? `<p class="small">Zuletzt am ${new Date(lv.ts).toLocaleDateString('de-DE')}: ca. <b>${lv.estimate}</b> Wörter der Liste bekannt.</p>
        ${lv.bands.map((b, i) => `<div class="band"><span>Stufe ${i + 1}</span><div class="progress"><div style="width:${b === null ? 0 : Math.round(b * 100)}%"></div></div><span>${b === null ? '–' : Math.round(b * 100) + '%'}</span></div>`).join('')}` :
        '<p class="muted small">Etwa 5 Minuten. Du bekommst deutsche Wörter aus immer selteneren Häufigkeitsstufen, sagst sie auf ' + LANGS[settings.lang].name + ' und bewertest dich ehrlich. Stufen, die du sicher kannst, werden als bekannt übernommen und nur noch gelegentlich geprüft.</p>'}
      <a class="btn primary" href="#level/test" style="display:inline-block;margin-top:8px">${lv ? 'Test wiederholen' : 'Test starten'}</a>
    </div>
    <div class="card">
      <b>Gespräche</b>
      <p class="small">Der Gesprächspartner spricht auf Stufe <b>${STAGES[Math.max(0, Math.min(STAGES.length - 1, li.idx + (state.talkAdjust || 0)))].id}</b>${state.talkAdjust ? ` (angepasst: ${state.talkAdjust > 0 ? '+' : ''}${state.talkAdjust})` : ''}.</p>
      <div class="row"><button class="btn grow" id="lv-easier">Einfacher</button><button class="btn grow" id="lv-harder">Schwieriger</button></div>
    </div>`;
  $('#lv-auto', root).onchange = e => { settings.autoTempo = e.target.checked; saveSettings(); route(); };
  const adj = d => {
    state.talkAdjust = Math.max(-2, Math.min(2, (state.talkAdjust || 0) + d));
    state.talkAdjustTs = Date.now();
    persist();
    route();
  };
  $('#lv-easier', root).onclick = () => adj(-1);
  $('#lv-harder', root).onclick = () => adj(1);
};

function levelTest(root) {
  const words = starterWords(settings.lang);
  const bands = BANDS.map(([a, b]) => words.slice(a, Math.min(b, words.length))).filter(b => b.length);
  const results = bands.map(() => null);
  let bi = 0, qi = 0, known = 0, sample = [];
  const newSample = () => {
    const pool = bands[bi].slice();
    sample = [];
    while (sample.length < PER_BAND && pool.length) sample.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  };
  newSample();
  function show() {
    const w = sample[qi];
    root.innerHTML = `
      <h1>📈 Einstufungstest</h1>
      <div class="row between muted small"><span>Stufe ${bi + 1} von ${bands.length}</span><span>Wort ${qi + 1}/${sample.length}</span></div>
      <div class="progress" style="margin:6px 0 12px"><div style="width:${(bi * PER_BAND + qi) / (bands.length * PER_BAND) * 100}%"></div></div>
      <div class="card flash">
        <div class="muted small">Wie heißt das auf ${LANGS[settings.lang].name}?</div>
        <div class="target" style="font-size:26px">${esc(w.d)}</div>
        <div id="answer" hidden><div class="sentence">${esc(w.t)}</div></div>
      </div>
      <div class="row" id="pre"><button class="btn grow" id="skip">Weiß ich nicht</button><button class="btn primary grow" id="reveal">Aufdecken</button></div>
      <div id="post" hidden>
        <p class="muted small">Hattest du es (fast) richtig? Kleine Fehler beim Artikel zählen als richtig.</p>
        <div class="row"><button class="btn grow" id="no">✗ Nein</button><button class="btn primary grow" id="yes">✓ Ja, gewusst</button></div>
      </div>
      <p class="muted small">Ehrlich bewerten – sonst bekommst du zu schwere Wörter und Gespräche.</p>`;
    $('#reveal', root).onclick = () => { $('#answer', root).hidden = false; $('#pre', root).hidden = true; $('#post', root).hidden = false; speak(w.t); };
    const answer = ok => {
      if (ok) known++;
      qi++;
      if (qi < sample.length) { show(); return; }
      results[bi] = known / sample.length;
      const stop = results[bi] < 0.34;
      bi++; qi = 0; known = 0;
      if (stop || bi >= bands.length) { finish(); return; }
      newSample();
      show();
    };
    $('#skip', root).onclick = () => answer(false);
    $('#no', root).onclick = () => answer(false);
    $('#yes', root).onclick = () => answer(true);
  }
  function finish() {
    const estimate = Math.round(bands.reduce((sum, b, i) => sum + b.length * (results[i] || 0), 0));
    const sure = bands.map((b, i) => (results[i] !== null && results[i] >= 5 / 6 ? i : -1)).filter(i => i >= 0);
    const toMark = [].concat(...sure.map(i => bands[i])).filter(w => !state.srs[w.id]);
    state.level = { ts: Date.now(), estimate, bands: results };
    persist();
    root.innerHTML = `
      <h1>📈 Ergebnis</h1>
      <div class="card">
        <p>Du kennst geschätzt <b>${estimate}</b> der ${words.length} mitgelieferten Wörter.</p>
        ${results.map((b, i) => `<div class="band"><span>Stufe ${i + 1}</span><div class="progress"><div style="width:${b === null ? 0 : Math.round(b * 100)}%"></div></div><span>${b === null ? '–' : Math.round(b * 100) + '%'}</span></div>`).join('')}
        ${results.includes(null) ? '<p class="muted small">Seltenere Stufen übersprungen, weil die vorherige unter einem Drittel lag.</p>' : ''}
      </div>
      ${toMark.length ? `<div class="card">
        <p>In ${sure.length === 1 ? 'Stufe ' + (sure[0] + 1) : 'den Stufen ' + sure.map(i => i + 1).join(', ')} hast du fast alles gewusst. <b>${toMark.length}</b> Wörter daraus als bekannt übernehmen?</p>
        <p class="muted small">Sie werden in den nächsten 1–2 Wochen verteilt kurz geprüft. Was du doch nicht kannst, kommt über „Nochmal“ zurück ins Training.</p>
        <button class="btn primary big" id="apply">Übernehmen</button></div>` : '<p class="muted small">Keine Stufe fast vollständig gewusst – du startest mit den häufigsten Wörtern. Das ist genau richtig.</p>'}
      <a class="btn big" href="#level" style="display:block;margin-top:8px">Zur Übersicht</a>`;
    if (toMark.length) {
      $('#apply', root).onclick = () => {
        const t = today();
        toMark.forEach(w => { state.srs[w.id] = { iv: 7, ef: 2.5, reps: 1, lapses: 0, due: t + 3 + Math.floor(Math.random() * 12), ts: Date.now(), placed: true }; });
        persist();
        toast(`${toMark.length} Wörter übernommen`);
        location.hash = '#level';
      };
    }
  }
  show();
}

// ---------- Gespräche mit KI ----------
const TALK_MODELS = {
  'claude-opus-5-5': { name: 'Claude Opus 5.5 (beste Qualität)', in: 4, out: 20, fallback: true, effort: true },
  'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5 (günstiger)', in: 2, out: 10, fallback: true, effort: true },
  'claude-haiku-4-5': { name: 'Claude Haiku 4.5 (am günstigsten)', in: 1, out: 5, fallback: false, effort: false },
};
const SCENARIOS = {
  describe: { label: '🔎 Beschreiben', it: 'Description practice ("describe what you see"). Give the learner a small real-world mission: ask them to look around them or go outside and find one concrete thing that suits their level (e.g. the grass, a tree, a cup, the sky, their shoes, a car). Ask them to describe it in 2–3 short sentences: colour, where it is, size or shape, and whether they like it. After each description: react briefly and naturally, then ask ONE follow-up question about the same thing (Where exactly is it? What is next to it? Is it big or small? What is it for?). After 2–3 follow-up questions, give a new mission with a different thing. If the learner sends a photo, use it and ask about details you can actually see in it.' },
  free: { label: 'Freies Gespräch', it: 'Casual small talk as a friendly acquaintance: ask about the learner\'s day, life, work and hobbies.' },
  meet: { label: 'Kennenlernen', it: 'You meet the learner for the first time at a friend\'s party. Get to know each other.' },
  cafe: { label: 'Im Café', it: 'You work at a café in {city}. The learner is the customer and orders. Stay in role.' },
  way: { label: 'Nach dem Weg fragen', it: 'You are a local passer-by in {city}. The learner asks for directions. Stay in role.' },
  shop: { label: 'Einkaufen', it: 'You are a shop assistant in a clothes shop in {city}. The learner is the customer. Stay in role.' },
  hotel: { label: 'Im Hotel', it: 'You are a hotel receptionist in {city}. The learner is checking in. Stay in role.' },
  doctor: { label: 'Beim Arzt', it: 'You are a doctor. The learner describes how they feel. Keep it light, simple and not alarming. Stay in role.' },
  weekend: { label: 'Wochenende', it: 'You are a friend. Talk about what the learner did last weekend and plans for the next one.' },
};
const TALK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['reply', 'translation', 'correction', 'new_words', 'suggestion'],
  properties: {
    reply: { type: 'string' },
    translation: { type: 'string' },
    correction: {
      type: 'object', additionalProperties: false, required: ['needed', 'corrected', 'explanation'],
      properties: { needed: { type: 'boolean' }, corrected: { type: 'string' }, explanation: { type: 'string' } },
    },
    new_words: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['t', 'd'], properties: { t: { type: 'string' }, d: { type: 'string' } } },
    },
    suggestion: {
      type: 'object', additionalProperties: false, required: ['answer', 'words'],
      properties: {
        answer: { type: 'string' },
        words: {
          type: 'array',
          items: { type: 'object', additionalProperties: false, required: ['t', 'de'], properties: { t: { type: 'string' }, de: { type: 'string' } } },
        },
      },
    },
  },
};
const FEEDBACK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'mistakes', 'sentences'],
  properties: {
    summary: { type: 'string' },
    mistakes: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['wrong', 'right', 'explanation'], properties: { wrong: { type: 'string' }, right: { type: 'string' }, explanation: { type: 'string' } } },
    },
    sentences: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['t', 'd'], properties: { t: { type: 'string' }, d: { type: 'string' } } },
    },
  },
};
const talkCfg = Object.assign({ key: '' }, load('sl.talkcfg', {}));
function saveTalkCfg() { save('sl.talkcfg', talkCfg); }
let sdkModule = null;
async function claudeClient() {
  if (!sdkModule) sdkModule = await import('./vendor/anthropic-sdk.js');
  const Anthropic = sdkModule.default;
  // Der Schlüssel bleibt auf diesem Gerät; die Anfrage geht direkt vom Browser an die Claude-API.
  return { Anthropic, client: new Anthropic({ apiKey: talkCfg.key, dangerouslyAllowBrowser: true, maxRetries: 2 }) };
}
function talkError(e, Anthropic) {
  if (Anthropic && e instanceof Anthropic.AuthenticationError) return 'API-Schlüssel ungültig. Bitte unter „Reden → ⚙️ Schlüssel & Modell“ prüfen.';
  if (Anthropic && e instanceof Anthropic.PermissionDeniedError) return 'Keine Berechtigung für dieses Modell.';
  if (Anthropic && e instanceof Anthropic.RateLimitError) return 'Zu viele Anfragen – kurz warten und nochmal versuchen.';
  if (Anthropic && e instanceof Anthropic.BadRequestError) return /credit/i.test(e.message) ? 'Guthaben aufgebraucht – auf console.anthropic.com aufladen.' : 'Anfrage abgelehnt: ' + e.message;
  if (Anthropic && e instanceof Anthropic.APIConnectionError) return 'Keine Verbindung – Gespräche brauchen Internet.';
  if (Anthropic && e instanceof Anthropic.APIError) return 'Claude-Fehler ' + (e.status || '') + ': ' + e.message;
  return 'Fehler: ' + (e && e.message ? e.message : e);
}
function knownWordList(max) {
  return Object.entries(state.srs)
    .filter(([id]) => isWordId(id))
    .sort((a, b) => b[1].iv - a[1].iv)
    .slice(0, max)
    .map(([id]) => { const w = wordById(id); return w ? w.t : null; })
    .filter(Boolean);
}
function talkStage() {
  const li = levelInfo();
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, li.idx + (state.talkAdjust || 0)))];
}
// Jugend-Modus: zusätzliche Regeln für Claude (Lernende ist minderjährig)
const TEEN_RULES = `The learner is a teenager (about 14). Keep everything age-appropriate: no romantic or sexual content, no alcohol, drugs, gambling or graphic violence. Stay on language practice and everyday teen topics (school, friends, hobbies, music, sport, family, holidays). Never ask for or encourage sharing personal details (full name, address, school name, phone number, social media, photos of themselves), and never suggest meeting anyone. If the learner brings up something unsafe or a serious personal problem, respond kindly and briefly, suggest talking to a parent or another trusted adult, and gently return to the practice. Do not comment on anyone's looks or body.`;
function scenarios() { return settings.teen ? window.TEEN.scenarios : SCENARIOS; }

function talkSystem(scenarioKey, custom) {
  const lang = settings.lang === 'it' ? 'Italian' : 'British English';
  const stage = talkStage();
  const p = settings.profile;
  const city = settings.lang === 'it' ? 'Rome' : 'London';
  const scen = scenarioKey === 'custom' ? `Talk about this topic chosen by the learner: ${custom}` : (scenarios()[scenarioKey] || SCENARIOS.free).it.replace('{city}', city);
  const known = knownWordList(400);
  const length = { A0: 'one very short, simple sentence plus a question', A1: '1–2 short, simple sentences (present tense)', A2: '2–3 simple sentences', B1: 'up to 4 natural sentences', B2: 'natural, conversational length (max 5 sentences)' }[stage.id];
  return `You are a warm, patient conversation partner helping a German-speaking learner practise spoken ${lang}. The conversation is spoken aloud: your reply is read out by text-to-speech and the learner answers by voice.

Learner: ${p.name || 'unknown name'}${settings.lang === 'it' ? `, ${p.gender === 'f' ? 'female' : 'male'} (use matching adjective endings when you talk about them)` : ''}.
Estimated level: ${stage.id} – vocabulary-based estimate, adapt if the learner clearly understands more or less.
Words the learner already knows (${known.length}) – for orientation only: ${known.length ? known.join(', ') : 'almost none – keep sentences very short and simple'}.
Scenario: ${scen}

${settings.teen ? TEEN_RULES + '\n\n' : ''}Most important rule: everything you write in ${lang} – "reply", "correction.corrected" and "suggestion.answer" – must be natural, idiomatic ${lang} exactly as a native speaker would say it in this situation. Never build an unnatural or word-by-word sentence just to use words from the list above. If the natural way needs words the learner doesn't know yet, use them and list them in "new_words". Keep it simple through short sentences and everyday phrasing, not through odd word choices.${settings.lang === 'it' ? ' Drop subject pronouns (io, tu …) unless a native speaker would use them for emphasis.' : ''}

How to reply:
- "reply": only ${lang}. Length: ${length}. Prefer words the learner knows where that stays natural; at most 2–3 new words per reply.
- Always end with a question or a clear prompt so the learner has to speak again.
- The learner's messages come from speech recognition: ignore missing punctuation or capitals and obvious recognition glitches.
- If the learner answers in German or mixes languages, respond kindly and give the ${lang} version in "correction".
- "correction": needed=true only for a real grammar or vocabulary mistake in the learner's last message; "corrected" = the natural full sentence in ${lang}; "explanation" = one short sentence in German. Otherwise needed=false with empty strings.
- "translation": German translation of your reply.
- "new_words": up to 3 words from your reply the learner probably does not know yet, in base form, with the German meaning.
- "suggestion": a model answer the learner could give to your reply – hidden and only shown if they get stuck. "answer": one natural, short ${lang} answer at the learner's level, mostly with words they know, true to what you know about them (otherwise plausible). "words": that answer split into its words in their original order (punctuation stays attached), each with a literal word-for-word German gloss in "de" – keep the ${lang} word order, do not make it natural German; join several German words with hyphens when one word needs them (e.g. ${settings.lang === 'it' ? 'Vorrei → "ich-hätte-gern", un → "einen", per → "für", favore → "Gefallen"' : 'I\'d → "ich-würde", like → "mögen", a → "einen", coffee → "Kaffee"'}).
- A note in square brackets from the learner, such as [einfacher] or [schwieriger], means: adjust your difficulty from now on.`;
}
function loadTalk() { return load('sl.talk.' + settings.lang, null); }
function saveTalk(t) { if (t) save('sl.talk.' + settings.lang, t); else localStorage.removeItem('sl.talk.' + settings.lang); }
function addUsage(model, usage) {
  const m = TALK_MODELS[model] || TALK_MODELS['claude-opus-5-5'];
  const inTok = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) * 1.25 + (usage.cache_read_input_tokens || 0) * 0.1;
  const usd = (inTok * m.in + (usage.output_tokens || 0) * m.out) / 1e6;
  const month = new Date().toISOString().slice(0, 7);
  const u = load('sl.usage', {});
  u[month] = (u[month] || 0) + usd;
  save('sl.usage', u);
  return usd;
}
async function callClaude(system, messages, schema, maxTokens) {
  const { Anthropic, client } = await claudeClient();
  const model = TALK_MODELS[settings.talkModel] ? settings.talkModel : 'claude-opus-5-5';
  const m = TALK_MODELS[model];
  const params = {
    model,
    max_tokens: maxTokens,
    system,
    messages,
    cache_control: { type: 'ephemeral' },
    // Mittlerer Denkaufwand: sorgfältigere, natürlichere Sätze (etwas teurer und langsamer als „low“)
    output_config: Object.assign({ format: { type: 'json_schema', schema } }, m.effort ? { effort: 'medium' } : {}),
  };
  let res;
  try {
    // Server-seitiger Fallback: lehnt das Modell eine Anfrage ab, übernimmt automatisch ein anderes.
    res = m.fallback
      ? await client.beta.messages.create(Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }))
      : await client.messages.create(params);
  } catch (e) {
    throw new Error(talkError(e, Anthropic));
  }
  const cost = addUsage(model, res.usage || {});
  if (res.stop_reason === 'refusal') throw new Error('Claude hat diese Anfrage abgelehnt. Formuliere es anders oder starte ein neues Gespräch.');
  if (res.stop_reason === 'max_tokens') throw new Error('Antwort abgeschnitten – bitte nochmal senden.');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('Antwort nicht lesbar – bitte nochmal senden.'); }
  return { data, content: res.content, cost };
}

let talkBusy = false;
views.talk = function (root, arg) {
  if (!talkCfg.key || arg === 'setup') { talkSetup(root); return; }
  const t = loadTalk();
  if (arg === 'feedback' && t) { talkFeedback(root, t); return; }
  if (!t) { talkStart(root); return; }
  talkChat(root, t);
};

function talkSetup(root) {
  const month = new Date().toISOString().slice(0, 7);
  const spent = load('sl.usage', {})[month] || 0;
  root.innerHTML = `
    <h1>💬 Gespräche – Einrichtung</h1>
    <div class="card stack">
      <p>Der Gesprächspartner ist Claude. Du brauchst einen eigenen API-Schlüssel:</p>
      <p class="small">1. Auf <b>console.anthropic.com</b> anmelden.<br>2. Unter „Billing“ Guthaben aufladen (Prepaid) und ein Monatslimit setzen.<br>3. Unter „API Keys“ einen Schlüssel erstellen und hier einfügen.</p>
      <input type="password" id="k" placeholder="sk-ant-…" value="${esc(talkCfg.key)}" autocomplete="off">
      <label for="m">Modell</label>
      <select id="m">${Object.entries(TALK_MODELS).map(([id, m]) => `<option value="${id}" ${settings.talkModel === id ? 'selected' : ''}>${m.name} – $${m.in}/$${m.out} pro 1 Mio. Tokens</option>`).join('')}</select>
      <p class="muted small">Ein Gespräch mit 15–20 Wechseln kostet mit Opus 5.5 grob 30–80 Cent (Schätzung, nicht gemessen), mit Sonnet etwa die Hälfte, mit Haiku ein Viertel – je länger das Gespräch, desto teurer jeder weitere Wechsel. Diesen Monat geschätzt verbraucht: <b>$${spent.toFixed(2)}</b> (auf diesem Gerät).</p>
      <p class="muted small">Der Schlüssel wird nur in diesem Browser gespeichert (nicht im Sync, nicht im Backup) und direkt an die Claude-API geschickt. Wer Zugriff auf dein entsperrtes Gerät hat, könnte ihn auslesen – deshalb ein Limit in der Console setzen.</p>
      <div class="row"><button class="btn primary grow" id="save">Speichern</button>${talkCfg.key ? '<button class="btn danger" id="del">Schlüssel löschen</button>' : ''}</div>
    </div>`;
  $('#m', root).onchange = e => { settings.talkModel = e.target.value; saveSettings(); };
  $('#save', root).onclick = () => {
    talkCfg.key = $('#k', root).value.trim();
    saveTalkCfg();
    toast(talkCfg.key ? 'Gespeichert' : 'Kein Schlüssel');
    if (talkCfg.key && talkLocked()) location.hash = '#listen/stories';
    else if (talkCfg.key) { if (location.hash === '#talk') route(); else location.hash = '#talk'; }
  };
  if ($('#del', root)) $('#del', root).onclick = () => { talkCfg.key = ''; saveTalkCfg(); route(); };
}

function talkStart(root) {
  const stage = talkStage();
  root.innerHTML = `
    <h1>💬 Gespräch führen</h1>
    ${!SR ? '<div class="notice warn">Dieser Browser hat keine Spracherkennung – du kannst tippen. Zum Sprechen Chrome (Android/PC) oder Safari (iPhone) nutzen.</div>' : ''}
    <div class="card">
      <div class="row between"><span>Niveau im Gespräch: <b>${stage.id}</b></span><a href="#level" class="small">anpassen</a></div>
      ${!state.level ? '<p class="muted small">Tipp: Mach zuerst den <a href="#level/test">Einstufungstest</a>, damit der Gesprächspartner deine Wörter kennt.</p>' : ''}
    </div>
    <label>Worüber willst du reden?</label>
    ${chips('scen', Object.values(scenarios()), -1, x => x.label)}
    <div class="row" style="margin-top:8px"><input type="text" id="topic" class="grow" placeholder="Eigenes Thema (Deutsch geht)"><button class="btn" id="go-custom">Los</button></div>
    <p class="muted small" style="margin-top:12px">So läuft es: Claude beginnt, liest vor, du antwortest laut (🎙). Korrekturen erscheinen unter deiner Nachricht, die Übersetzung per Tipp. Am Ende gibt es eine Auswertung.<br>🔎 Beschreiben: Claude gibt dir eine Aufgabe („Such etwas Grünes …“), du beschreibst es in 2–3 Sätzen und bekommst Nachfragen. Mit 📷 kannst du ein Foto davon mitschicken – kostet etwas mehr.</p>
    <a href="#talk/setup" class="small">⚙️ Schlüssel & Modell</a>`;
  const begin = async (key, custom) => {
    if (talkBusy) return;
    const system = talkSystem(key, custom);
    const t = { scenario: key, custom: custom || '', system, messages: [], turns: [], cost: 0, started: Date.now(), model: settings.talkModel };
    saveTalk(t);
    route();
    await talkSend(t, settings.lang === 'it' ? 'Inizia tu la conversazione, per favore.' : 'Please start the conversation.', true);
  };
  $$('.chips[data-name="scen"] .chip', root).forEach(c => { c.onclick = () => begin(Object.keys(scenarios())[Number(c.dataset.i)]); });
  $('#go-custom', root).onclick = () => { const v = $('#topic', root).value.trim(); if (v) begin('custom', v); };
}

// Eine Nachricht senden und die Antwort anhängen. hidden: nicht im Chat anzeigen (Start-Anweisung)
async function talkSend(t, text, hidden, note, img) {
  if (talkBusy) return;
  talkBusy = true;
  const blocks = [];
  if (img) blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.split(',')[1] } });
  blocks.push({ type: 'text', text });
  if (note) blocks.push({ type: 'text', text: `[${note}]` });
  const content = blocks.length === 1 ? text : blocks;
  t.messages.push({ role: 'user', content });
  if (!hidden) t.turns.push({ role: 'me', text, img: img || null });
  saveTalk(t);
  renderTalkIfOpen();
  try {
    const { data, content: reply, cost } = await callClaude(t.system, t.messages, TALK_SCHEMA, 4000);
    // Vollständigen Antwortinhalt anhängen (inkl. Denkblöcken), damit der Verlauf gültig bleibt
    t.messages.push({ role: 'assistant', content: reply });
    t.cost += cost;
    const lastMe = [...t.turns].reverse().find(x => x.role === 'me');
    if (lastMe && data.correction && data.correction.needed && !hidden) lastMe.fix = data.correction;
    if (!hidden) addXP(5);
    t.turns.push({ role: 'ai', text: data.reply, tr: data.translation, words: data.new_words || [], sug: data.suggestion || null, hint: 0 });
    saveTalk(t);
    talkBusy = false;
    renderTalkIfOpen();
    speak(data.reply, { onend: () => { if (talkHandsFree && location.hash.startsWith('#talk')) listenAndSend(); } });
  } catch (e) {
    // Fehlgeschlagene Nutzernachricht wieder entfernen, damit der Verlauf abwechselnd bleibt
    t.messages.pop();
    if (!hidden) t.turns.pop();
    if (!t.messages.length) saveTalk(null); else saveTalk(t);
    talkBusy = false;
    toast(e.message);
    renderTalkIfOpen();
  }
}
let talkHandsFree = false;
function renderTalkIfOpen() { if (location.hash.startsWith('#talk')) views.talk($('#view')); }
let talkNote = null; // „einfacher“ / „schwieriger“ – wird an die nächste Nachricht gehängt
let talkPendingImg = null; // Foto, das mit der nächsten Nachricht mitgeht (Daten-URL)
function talkSendText(text) {
  const t = loadTalk();
  if (!t || talkBusy) return;
  if (!text && !talkPendingImg) return;
  const note = talkNote;
  const img = talkPendingImg;
  talkNote = null;
  talkPendingImg = null;
  talkSend(t, text || '(Foto)', false, note, img);
}
function listenAndSend() {
  const btn = $('#t-mic');
  if (btn && !talkBusy && !activeDictation) btn.click();
}

// Antworthilfe in Stufen – nur auf Wunsch: Wort für Wort (Deutsch) → Einstieg → Lückensatz → ganze Antwort
const HINT_STEPS = ['💡 Hilfe', '💡 Mehr Hilfe', '💡 Noch mehr', '💡 Ganze Antwort'];
function gapWord(w) { return w.replace(/(\p{L})(\p{L}*)/gu, (m, a, b) => a + '_'.repeat(b.length)); }
function hintStart(answer) {
  const words = answer.split(/\s+/);
  return words.slice(0, words.length > 4 ? 2 : 1).join(' ') + ' …';
}
function lastAiTurn(t) {
  const x = t.turns[t.turns.length - 1];
  return x && x.role === 'ai' ? x : null;
}
// Wortpaare untereinander: oben Fremdsprache (ggf. mit Lücken), unten die deutsche Wort-für-Wort-Bedeutung
function glossRow(words, gaps) {
  return `<div class="gloss">${words.map((w, i) => `<span><b>${esc(gaps && i > 0 ? gapWord(w.t) : w.t)}</b><small>${esc(w.de)}</small></span>`).join('')}</div>`;
}
function talkHintBox(t) {
  const ai = lastAiTurn(t);
  if (!ai || talkBusy || !ai.sug) return '';
  const lvl = ai.hint || 0;
  const words = Array.isArray(ai.sug.words) && ai.sug.words.length ? ai.sug.words : null;
  const lines = [];
  if (lvl === 1 || lvl === 2) {
    lines.push(words
      ? `<div><span class="muted">Wort für Wort:</span> ${esc(words.map(w => w.de).join(' '))}</div>`
      : `<div><span class="muted">Idee:</span> ${esc(ai.sug.idea_de || '')}</div>`);
  }
  if (lvl === 2) lines.push(`<div><span class="muted">Einstieg:</span> <b>${esc(hintStart(ai.sug.answer))}</b></div>`);
  if (lvl === 3) lines.push(words ? glossRow(words, true) : `<div><b>${esc(ai.sug.answer.split(/\s+/).map((w, i) => (i ? gapWord(w) : w)).join(' '))}</b></div>`);
  if (lvl >= 4) {
    lines.push(words ? glossRow(words, false) : `<div><b>${esc(ai.sug.answer)}</b></div>`);
    lines.push(`<div class="row" style="margin-top:4px"><button class="btn small" id="t-hint-say">🔊 Anhören</button><span class="muted small">Sag es jetzt selbst – gern mit eigenen Änderungen.</span></div>`);
  }
  return `<div class="card small" id="t-hintbox" style="margin-bottom:6px;padding:10px 12px"${lvl ? '' : ' hidden'}>${lines.join('')}</div>
    ${lvl < 4 ? `<button class="btn small" id="t-help" style="margin-bottom:6px">${HINT_STEPS[lvl]}</button>` : ''}`;
}

function talkChat(root, t) {
  const scen = t.scenario === 'custom' ? t.custom : ((scenarios()[t.scenario] || SCENARIOS[t.scenario] || { label: 'Gespräch' }).label);
  root.innerHTML = `
    <div class="row between"><b>💬 ${esc(scen)}</b><span class="muted small">≈ $${t.cost.toFixed(2)}</span></div>
    <div class="chat" id="chat" style="margin-top:10px">
      ${t.turns.map((x, i) => x.role === 'me' ? `
        <div class="bubble me">${x.img ? `<img class="photo" src="${x.img}" alt="">` : ''}${esc(x.text)}
          ${x.fix ? `<div class="fix">✏️ <b>${esc(x.fix.corrected)}</b><br><span class="muted">${esc(x.fix.explanation)}</span> <button class="btn small" data-say="${i}">🔊</button></div>` : ''}
        </div>` : `
        <div class="bubble">${esc(x.text)}
          <div class="tr" id="tr-${i}" hidden>${esc(x.tr)}</div>
          <div class="tools">
            <button class="btn small" data-play="${i}">🔊</button>
            <button class="btn small" data-tr="${i}">DE</button>
            ${(x.words || []).map((w, j) => `<button class="btn small" data-word="${i}-${j}" title="${esc(w.d)}">＋ ${esc(w.t)}</button>`).join('')}
          </div>
        </div>`).join('')}
      ${talkBusy ? '<div class="typing">… schreibt</div>' : ''}
    </div>
    <div class="talkbar">
      <div id="t-hintwrap">${talkHintBox(t)}</div>
      <div class="row">
        ${SR ? '<button class="btn primary grow" id="t-mic" style="padding:14px">🎙 Sprechen</button>' : ''}
      </div>
      ${SR ? '<p class="muted small" id="t-hint" hidden style="margin:4px 0 0">Nimm dir Zeit – Pausen sind okay. Tippe auf „✓ Fertig“, wenn du fertig bist.</p>' : ''}
      <div id="t-pimg">${talkPendingImg ? `<div class="row" style="margin-top:6px"><img class="photo" src="${talkPendingImg}" style="max-height:80px;margin:0" alt=""><span class="muted small grow">geht mit deiner nächsten Antwort mit</span><button class="btn small danger" id="t-pimg-x">✕</button></div>` : ''}</div>
      <div class="row" style="margin-top:6px"><label class="btn" style="margin:0;color:var(--text);font-size:16px" title="Foto mitschicken">📷<input type="file" accept="image/*" id="t-photo" hidden></label><input type="text" id="t-text" class="grow" placeholder="oder tippen …"><button class="btn" id="t-send">➤</button></div>
      <div class="row" style="margin-top:6px">
        ${SR ? `<label class="inline small" style="margin:0"><input type="checkbox" id="t-hf" ${talkHandsFree ? 'checked' : ''}> Mikro automatisch</label>` : ''}
        <button class="btn small" id="t-easy">Zu schwer</button>
        <button class="btn small" id="t-hard">Zu leicht</button>
        <button class="btn small" id="t-end">Beenden</button>
      </div>
    </div>`;
  window.scrollTo(0, document.body.scrollHeight);
  $$('[data-play]', root).forEach(b => { b.onclick = () => speak(t.turns[b.dataset.play].text); });
  $$('[data-say]', root).forEach(b => { b.onclick = () => speak(t.turns[b.dataset.say].fix.corrected); });
  $$('[data-tr]', root).forEach(b => { b.onclick = () => { const el = $('#tr-' + b.dataset.tr, root); el.hidden = !el.hidden; }; });
  $$('[data-word]', root).forEach(b => {
    b.onclick = () => {
      const [i, j] = b.dataset.word.split('-').map(Number);
      const w = t.turns[i].words[j];
      if (allWords().some(x => x.t.toLowerCase() === w.t.toLowerCase())) { toast('Wort gibt es schon'); return; }
      state.words.push({ id: 'u:' + uid(), t: w.t, d: w.d, ts: Date.now() });
      persist();
      toast(`„${w.t}“ zu deinen Wörtern hinzugefügt`);
      b.disabled = true;
    };
  });
  // Hilfe nur im Hilfe-Bereich aktualisieren – ein laufendes Diktat bleibt erhalten
  const bindHint = () => {
    if ($('#t-help', root)) {
      $('#t-help', root).onclick = () => {
        const ai = lastAiTurn(t);
        if (!ai) return;
        ai.hint = Math.min(4, (ai.hint || 0) + 1);
        t.hintsUsed = (t.hintsUsed || 0) + 1;
        saveTalk(t);
        $('#t-hintwrap', root).innerHTML = talkHintBox(t);
        bindHint();
      };
    }
    if ($('#t-hint-say', root)) $('#t-hint-say', root).onclick = () => speak(lastAiTurn(t).sug.answer);
  };
  bindHint();
  if ($('#t-mic', root)) {
    micToggle($('#t-mic', root), '🎙 Sprechen', text => talkSendText(text), live => { $('#t-text', root).value = live; });
    const hint = $('#t-hint', root);
    $('#t-mic', root).addEventListener('click', () => { if (hint) hint.hidden = !activeDictation; });
  }
  const sendText = () => { const v = $('#t-text', root).value.trim(); if (v && !talkBusy) { cancelDictation(); talkSendText(v); } };
  $('#t-send', root).onclick = sendText;
  // Foto anhängen: verkleinert, damit es wenig Token kostet
  const bindPimg = () => { if ($('#t-pimg-x', root)) $('#t-pimg-x', root).onclick = () => { talkPendingImg = null; $('#t-pimg', root).innerHTML = ''; }; };
  bindPimg();
  $('#t-photo', root).onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      talkPendingImg = await resizeImage(file, 720);
      $('#t-pimg', root).innerHTML = `<div class="row" style="margin-top:6px"><img class="photo" src="${talkPendingImg}" style="max-height:80px;margin:0" alt=""><span class="muted small grow">geht mit deiner nächsten Antwort mit</span><button class="btn small danger" id="t-pimg-x">✕</button></div>`;
      bindPimg();
    } catch (err) { toast(err.message); }
  };
  $('#t-text', root).addEventListener('keydown', e => { if (e.key === 'Enter') sendText(); });
  if ($('#t-hf', root)) $('#t-hf', root).onchange = e => { talkHandsFree = e.target.checked; };
  // Schwierigkeit gilt fürs Gespräch sofort und künftig: Hinweis an die nächste Nachricht hängen
  const adjust = (d, note) => {
    state.talkAdjust = Math.max(-2, Math.min(2, (state.talkAdjust || 0) + d));
    state.talkAdjustTs = Date.now();
    persist();
    talkNote = note;
    toast(d < 0 ? 'Wird einfacher – gilt ab deiner nächsten Antwort' : 'Wird anspruchsvoller – gilt ab deiner nächsten Antwort');
  };
  $('#t-easy', root).onclick = () => adjust(-1, 'einfacher');
  $('#t-hard', root).onclick = () => adjust(1, 'schwieriger');
  $('#t-end', root).onclick = () => { cancelDictation(); stopAudio(); talkHandsFree = false; location.hash = '#talk/feedback'; };
}

async function talkFeedback(root, t) {
  const mine = t.turns.filter(x => x.role === 'me');
  if (!mine.length) { saveTalk(null); location.hash = '#talk'; return; }
  root.innerHTML = `<h1>📝 Auswertung</h1><div class="card"><p class="typing">Claude wertet das Gespräch aus …</p></div>`;
  const transcript = t.turns.map(x => (x.role === 'me' ? 'Learner: ' : 'Partner: ') + x.text).join('\n');
  const lang = settings.lang === 'it' ? 'Italian' : 'British English';
  let fb;
  try {
    const r = await callClaude(
      `${settings.teen ? TEEN_RULES + '\n\n' : ''}You give short, encouraging feedback to a German-speaking ${lang} learner (level ${talkStage().id}) after a spoken practice conversation. Write "summary" in German (2–3 sentences: what went well, one thing to practise). "mistakes": up to 5 of the learner's most useful mistakes (ignore punctuation, capitals and likely speech-recognition glitches). "sentences": 3–6 useful ${lang} sentences the learner could have said or should keep for next time, adapted to their situation, with German translation.`,
      [{ role: 'user', content: transcript }], FEEDBACK_SCHEMA, 6000);
    fb = r.data;
    t.cost += r.cost;
  } catch (e) {
    root.innerHTML = `<h1>📝 Auswertung</h1><div class="card"><p>${esc(e.message)}</p><div class="row"><button class="btn" id="retry">Nochmal</button><button class="btn danger" id="drop">Ohne Auswertung beenden</button></div></div>`;
    $('#retry', root).onclick = () => route();
    $('#drop', root).onclick = () => { saveTalk(null); location.hash = '#talk'; };
    return;
  }
  const l = dayLog();
  l.talks = (l.talks || 0) + 1;
  persist();
  saveTalk(null);
  root.innerHTML = `
    <h1>📝 Auswertung</h1>
    <div class="card"><p>${esc(fb.summary)}</p><p class="muted small">${mine.length} Antworten von dir · Kosten ≈ $${t.cost.toFixed(2)}</p></div>
    ${fb.mistakes.length ? `<h2>Besser so</h2><ul class="list card">${fb.mistakes.map(m => `<li><div class="grow"><div class="d" style="text-decoration:line-through">${esc(m.wrong)}</div><div class="t">${esc(m.right)}</div><div class="d">${esc(m.explanation)}</div></div></li>`).join('')}</ul>` : ''}
    ${fb.sentences.length ? `<h2>Sätze für dich</h2><ul class="list card">${fb.sentences.map((s, i) => `<li><button class="btn small" data-p="${i}">🔊</button><div class="grow"><div class="t">${esc(s.t)}</div><div class="d">${esc(s.d)}</div></div></li>`).join('')}</ul>
      <button class="btn primary big" id="keep">➕ Sätze in Insel „Gespräche“ (Wiederholung & Shadowing)</button>` : ''}
    <a class="btn big" href="#talk" style="display:block;margin-top:8px">Neues Gespräch</a>`;
  $$('[data-p]', root).forEach(b => { b.onclick = () => speak(fb.sentences[b.dataset.p].t); });
  if ($('#keep', root)) {
    $('#keep', root).onclick = () => {
      const id = 'talk-' + settings.lang;
      let isl = state.islands.find(i => i.id === id);
      if (!isl) { isl = { id, title: 'Gespräche', sentences: [], ts: Date.now() }; state.islands.push(isl); }
      const n = fb.sentences.filter(s => !isl.sentences.some(x => x.t === s.t)).map(s => { isl.sentences.push({ id: 's:' + uid(), t: s.t, d: s.d, ts: Date.now() }); return 1; }).length;
      persist();
      toast(n === 1 ? '1 Satz übernommen' : `${n} Sätze übernommen`);
      $('#keep', root).disabled = true;
    };
  }
}

views.awards = function (root) {
  checkBadges(true);
  const xp = totalXP();
  const r = rankOf(xp);
  const si = streakInfo();
  root.innerHTML = `
    <h1>⭐ Punkte & Abzeichen</h1>
    <div class="card">
      <div class="row between"><b style="font-size:20px">${r.cur.name}</b><span><b>${xp}</b> Punkte</span></div>
      ${r.next ? `<div class="progress" style="margin-top:8px"><div style="width:${Math.round((xp - r.cur.min) / (r.next.min - r.cur.min) * 100)}%"></div></div>
        <p class="muted small">Noch ${r.next.min - xp} Punkte bis ${r.next.name}.</p>` : ''}
      <p class="small">🔥 ${si.days} Tage in Folge · 🃏 noch ${si.jokersLeft} Joker diese Woche</p>
      <p class="muted small">Punkte gibt es fürs Abrufen (gleich viel für jede Bewertung – ehrlich bewerten lohnt sich), für neue Wörter, Drill, Shadowing, Gespräche, je Lernminute und +20 fürs Tagesziel. Joker: bis zu ${JOKERS_PER_WEEK} verpasste Tage pro Woche halten die Serie.</p>
    </div>
    <div class="badges">
      ${BADGES.map(b => { const got = (state.badges || {})[b.id]; return `<div class="badge ${got ? 'got' : ''}"><span class="bi">${b.icon}</span><b>${esc(b.name)}</b><span class="muted small">${esc(b.desc)}</span>${got ? `<span class="small">✓ ${new Date(got).toLocaleDateString('de-DE')}</span>` : ''}</div>`; }).join('')}
    </div>
    <a class="btn big" href="#week" style="display:block;margin-top:12px">📅 Wochenrückblick</a>`;
};

views.week = function (root, arg) {
  if (arg === 'test') { weekTest(root); return; }
  const cur = weekStart(today());
  const wt = (state.weekTests || {})[cur], wtPrev = (state.weekTests || {})[cur - 7];
  const gDone = grammarList().filter(x => { const s = grammarState()[x.id]; return s && s.done && (s.doneTs || 0) >= cur * 86400000; });
  const a = weekStats(cur), b = weekStats(cur - 7);
  const cmp = (x, y) => (y ? (x > y ? ' <span style="color:var(--good)">▲</span>' : x < y ? ' <span style="color:var(--bad)">▼</span>' : '') : '');
  const row = (label, x, y, f = v => v) => `<tr><td>${label}</td><td><b>${f(x)}</b>${cmp(x, y)}</td><td class="muted">${f(y)}</td></tr>`;
  const newBadges = BADGES.filter(x => (state.badges || {})[x.id] && (state.badges[x.id] / 86400000) >= cur);
  root.innerHTML = `
    <h1>📅 Wochenrückblick</h1>
    <p class="muted small">${LANGS[settings.lang].flag} ${fmtDay(cur)} – heute, verglichen mit der Vorwoche</p>
    <div class="card">
      <table class="wk"><tr><th></th><th>Diese Woche</th><th>Vorwoche</th></tr>
        ${row('⭐ Punkte', a.xp, b.xp)}
        ${row('⏱ Lernzeit', a.minutes, b.minutes, fmtMin)}
        ${row('📅 Lerntage', a.days, b.days)}
        ${row('🧠 Neue Wörter', a.newWords, b.newWords)}
        ${row('🔁 Abfragen', a.reviews, b.reviews)}
        ${row('🎯 Treffer Wörter', a.acc ?? '–', b.acc ?? '–', v => (v === '–' ? v : v + ' %'))}
        ${row('💬 Neue Sätze', a.newSent, b.newSent)}
        ${row('🎙️ Gespräche', a.talks, b.talks)}
      </table>
    </div>
    <div class="card">
      <b>📝 Wochen-Check</b>
      <p class="small">${wt ? `Diese Woche: <b>${wt.last} %</b>${wt.best > wt.last ? ` (bestes ${wt.best} %)` : ''}${wtPrev ? ` · Vorwoche ${wtPrev.last} %` : ''}` : 'Ca. 15 Fragen, 5 Minuten: Wörter, Hören, Sätze, Grammatik. Ohne KI.'}</p>
      <a class="btn ${wt ? '' : 'primary'}" href="#week/test">${wt ? 'Nochmal machen' : 'Check starten'}</a>
    </div>
    <div class="card">
      <b>Das kannst du jetzt</b>
      <ul class="small" style="margin:6px 0 0;padding-left:18px">
        <li>${secureWordCount()} Wörter sicher (Abstand ≥ 3 Tage) – Stufe ${levelInfo().stage.id}</li>
        <li>${Object.keys(state.srs).filter(id => id.startsWith('s:')).length} Sätze im Training</li>
        ${gDone.length ? `<li>Neu diese Woche: ${gDone.map(x => esc(x.title)).join(', ')}</li>` : ''}
        <li>${grammarList().filter(x => (grammarState()[x.id] || {}).done).length} von ${grammarList().length} Grammatik-Lektionen geschafft</li>
      </ul>
    </div>
    ${newBadges.length ? `<div class="card"><b>Neu diese Woche:</b> ${newBadges.map(x => x.icon + ' ' + esc(x.name)).join(', ')}</div>` : ''}
    <button class="btn primary big" id="wk-share">📤 Woche teilen</button>
    <p class="muted small">Teilt eine kurze Zusammenfassung, z. B. per WhatsApp – gut für ein Familien-Duell.</p>`;
  $('#wk-share', root).onclick = async () => {
    const name = settings.profile.name ? settings.profile.name + ' – ' : '';
    const text = `📚 ${name}Sprachtraining ${LANGS[settings.lang].flag} Woche ab ${fmtDay(cur)}\n⭐ ${a.xp} Punkte · ⏱ ${fmtMin(a.minutes)} · 📅 ${a.days} Tage\n🧠 ${a.newWords} neue Wörter · 🔁 ${a.reviews} Abfragen${a.acc !== null ? ` (${a.acc} % richtig)` : ''}\n💬 ${a.newSent} neue Sätze · 🎙️ ${a.talks} Gespräche · 🔥 Serie ${streakInfo().days} Tage\n${rankOf(totalXP()).cur.name}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('In die Zwischenablage kopiert'); }
    } catch (e) { /* Teilen abgebrochen */ }
  };
};

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
      <b>Über dich</b> <span class="muted small">(für Satzbaukasten & Dialoge)</span>
      <label class="inline" style="margin-top:8px"><input type="checkbox" id="p-teen" ${settings.teen ? 'checked' : ''} ${talkLocked() ? 'disabled' : ''}> Jugend-Modus${talkLocked() ? ' 🔒' : ''}</label>
      <p class="muted small">Altersgerechte Gesprächsthemen und Regeln für Claude, Vorlage-Inseln „Schule“ und „Freunde & Freizeit“, passender Satzbaukasten.</p>
      <label for="p-goal">Tagesziel (Minuten)</label><select id="p-goal">${[10, 15, 20, 30, 45, 60].map(n => `<option ${n === goalMin() ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label for="p-name">Vorname</label><input type="text" id="p-name" value="${esc(settings.profile.name)}">
      <label for="p-gender">Ich bin</label>
      <select id="p-gender"><option value="m" ${settings.profile.gender === 'm' ? 'selected' : ''}>männlich (sono stanco)</option><option value="f" ${settings.profile.gender === 'f' ? 'selected' : ''}>weiblich (sono stanca)</option></select>
    </div>
    <div class="card" id="lock-card">
      <b>👪 Eltern-Sperre</b>
      ${talkLocked()
        ? `<p class="small">Aktiv: KI-Gespräche (Reden) sind aus, Jugend-Modus ist fest an. Hör-Dialoge, Prüfen und Texte funktionieren weiter, wenn ein <a href="#talk/setup">Claude-Schlüssel</a> eingetragen ist.</p>
          <div class="row"><input type="password" id="lk-pin" inputmode="numeric" placeholder="PIN" class="grow" autocomplete="off"><button class="btn" id="lk-off">Entsperren</button></div>`
        : `<p class="muted small">Für Kinder: schaltet die KI-Gespräche (Reden) ab und den Jugend-Modus fest an. Aufheben nur mit PIN. Gilt nur für dieses Gerät.</p>
          <div class="row"><input type="password" id="lk-pin" inputmode="numeric" placeholder="PIN (mind. 4 Ziffern)" class="grow" autocomplete="off"><input type="password" id="lk-pin2" inputmode="numeric" placeholder="wiederholen" class="grow" autocomplete="off"></div>
          <button class="btn" id="lk-on" style="margin-top:8px">🔒 Sperre einschalten</button>`}
      <p class="muted small">Hinweis: Wer die Browserdaten löscht, löscht auch die Sperre (und den Lernstand).</p>
    </div>
    <div class="card">
      <b>Sync zwischen Geräten (GitHub Gist)</b>
      ${syncCfg.token ? `
        <p class="small">Verbunden${syncCfg.last ? ' · zuletzt ' + new Date(syncCfg.last).toLocaleString('de-DE') : ''}${syncCfg.error ? `<br><span style="color:var(--bad)">Fehler: ${esc(syncCfg.error)}</span>` : ''}</p>
        <div class="row"><button class="btn primary grow" id="y-now">🔄 Jetzt synchronisieren</button><button class="btn danger" id="y-off">Trennen</button></div>
        <p class="muted small">Synchronisiert automatisch beim Start, beim Verlassen der App und alle 10 Minuten.</p>` : `
        <p class="muted small">Dein Fortschritt wird als privates Gist in deinem GitHub-Konto gespeichert. Einmalig: auf github.com → Settings → Developer settings → Personal access tokens → <b>Tokens (classic)</b> → „Generate new token“, nur Haken bei <b>gist</b>, Ablaufdatum wählen. Token auf jedem Gerät hier einfügen.</p>
        <input type="password" id="y-token" placeholder="ghp_…" autocomplete="off">
        <button class="btn primary" id="y-connect" style="margin-top:8px">Verbinden</button>
        <p class="muted small">Das Token liegt im Browserspeicher dieses Geräts und erlaubt nur Zugriff auf deine Gists. Nicht weitergeben.</p>`}
    </div>
    <div class="card">
      <b>Backup</b>
      <p class="muted small">Ohne Sync liegen alle Daten nur in diesem Browser. Browserdaten löschen = Fortschritt weg. Die Backup-Datei enthält kein Token.</p>
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
  const saveProfile = () => {
    settings.profile.name = $('#p-name', root).value.trim();
    settings.profile.gender = $('#p-gender', root).value;
    settings.profile.ts = Date.now();
    saveSettings();
  };
  $('#p-name', root).onchange = saveProfile;
  $('#p-teen', root).onchange = e => {
    settings.teen = e.target.checked;
    saveSettings();
    if (settings.teen) { const n = ensureTeenIslands(); toast(n ? `Jugend-Modus an – ${n} Vorlage-Inseln hinzugefügt` : 'Jugend-Modus an'); }
    else toast('Jugend-Modus aus');
  };
  $('#p-goal', root).onchange = e => { settings.dailyGoal = Number(e.target.value); saveSettings(); };
  if ($('#lk-on', root)) $('#lk-on', root).onclick = async () => {
    const a = $('#lk-pin', root).value.trim(), b = $('#lk-pin2', root).value.trim();
    if (!/^\d{4,}$/.test(a)) { toast('PIN: mindestens 4 Ziffern'); return; }
    if (a !== b) { toast('PINs stimmen nicht überein'); return; }
    settings.lock = { pin: await pinHash(a) };
    if (!settings.teen) { settings.teen = true; ensureTeenIslands(); }
    saveSettings();
    toast('Sperre aktiv');
    route();
  };
  if ($('#lk-off', root)) $('#lk-off', root).onclick = async () => {
    if ((await pinHash($('#lk-pin', root).value.trim())) !== settings.lock.pin) { toast('Falsche PIN'); return; }
    delete settings.lock;
    saveSettings();
    toast('Sperre aufgehoben');
    route();
  };
  $('#p-gender', root).onchange = saveProfile;
  if ($('#y-connect', root)) {
    $('#y-connect', root).onclick = async () => {
      const token = $('#y-token', root).value.trim();
      if (!token) return;
      syncCfg.token = token;
      syncCfg.gistId = '';
      $('#y-connect', root).textContent = 'Verbinde …';
      await syncNow({ manual: true });
      if (syncCfg.error) { syncCfg.token = ''; saveSync(); } else toast('Sync eingerichtet');
      route();
    };
  } else {
    $('#y-now', root).onclick = async () => {
      $('#y-now', root).textContent = 'Synchronisiere …';
      await syncNow({ manual: true });
      if (!syncCfg.error) toast('Synchronisiert');
      route();
    };
    $('#y-off', root).onclick = () => {
      if (!confirm('Sync auf diesem Gerät trennen? Die Daten im Gist bleiben erhalten.')) return;
      syncCfg.token = ''; syncCfg.gistId = ''; syncCfg.error = '';
      saveSync();
      route();
    };
  }
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
    state.resetAt = Date.now();
    persist();
    // Mit Sync: zurückgesetzten Stand hochladen, statt ihn wieder mit dem alten zusammenzuführen
    if (syncCfg.token) syncNow({ overwriteLang: settings.lang, manual: true });
    toast('Zurückgesetzt');
    location.hash = '#home';
  };
};

// ---------- Sync über ein privates GitHub-Gist ----------
const SYNC_FILE = 'sprachtraining.json';
const SYNC_DESC = 'Sprachtraining Sync (nicht löschen)';
const syncCfg = Object.assign({ token: '', gistId: '', last: 0, error: '' }, load('sl.sync', {}));
function saveSync() { save('sl.sync', syncCfg); }
let syncing = false;

// Zwei Stände zusammenführen: pro Eintrag gewinnt der neuere Zeitstempel, Gelöschtes bleibt gelöscht.
function mergeState(a, b) {
  a = Object.assign(emptyState(), a);
  b = Object.assign(emptyState(), b);
  // Wurde eine Seite zurückgesetzt, zählt von der anderen nur, was danach entstanden ist.
  if (a.resetAt !== b.resetAt) {
    const [nw, old] = a.resetAt > b.resetAt ? [a, b] : [b, a];
    const keep = x => (x.ts || 0) > nw.resetAt;
    const keepObj = o => Object.fromEntries(Object.entries(o).filter(([, v]) => keep(v)));
    a = nw;
    b = Object.assign(emptyState(), {
      words: old.words.filter(keep),
      builderVerbs: old.builderVerbs.filter(keep),
      islands: old.islands.filter(keep).map(i => Object.assign({}, i, { sentences: i.sentences.filter(keep) })),
      srs: keepObj(old.srs), overrides: keepObj(old.overrides), log: old.log, deleted: old.deleted, resetAt: nw.resetAt,
    });
  }
  const deleted = {};
  [a.deleted, b.deleted].forEach(d => Object.entries(d).forEach(([k, v]) => { deleted[k] = Math.max(deleted[k] || 0, v); }));
  const alive = (id, ts) => !(deleted[id] && deleted[id] >= (ts || 0));
  const newer = (x, y) => ((y.ts || 0) > (x.ts || 0) ? y : x);
  const byTs = (x = {}, y = {}) => { const o = Object.assign({}, x); Object.entries(y || {}).forEach(([k, v]) => { if (!o[k] || (v.ts || 0) > (o[k].ts || 0)) o[k] = v; }); return o; };
  const mergeList = (la, lb) => {
    const m = new Map();
    la.concat(lb).forEach(x => m.set(x.id, m.has(x.id) ? newer(m.get(x.id), x) : x));
    return [...m.values()].filter(x => alive(x.id, x.ts));
  };
  const im = new Map();
  a.islands.concat(b.islands).forEach(isl => {
    const prev = im.get(isl.id);
    if (!prev) { im.set(isl.id, Object.assign({}, isl)); return; }
    im.set(isl.id, Object.assign({}, newer(prev, isl), { sentences: mergeList(prev.sentences, isl.sentences) }));
  });
  const islands = [...im.values()].filter(i => alive(i.id, i.ts))
    .map(i => Object.assign(i, { sentences: i.sentences.filter(s => alive(s.id, s.ts)) }));
  const srs = {};
  new Set(Object.keys(a.srs).concat(Object.keys(b.srs))).forEach(id => {
    if (!alive(id, 0)) return;
    const x = a.srs[id], y = b.srs[id];
    srs[id] = !x ? y : !y ? x : (y.ts || 0) > (x.ts || 0) ? y : x;
  });
  const notes = {}, noteTs = {};
  new Set(Object.keys(a.notes).concat(Object.keys(b.notes), Object.keys(a.noteTs), Object.keys(b.noteTs))).forEach(id => {
    const useB = (b.noteTs[id] || 0) > (a.noteTs[id] || 0);
    const v = useB ? b.notes[id] : a.notes[id];
    if (v) notes[id] = v;
    noteTs[id] = Math.max(a.noteTs[id] || 0, b.noteTs[id] || 0);
  });
  const overrides = Object.assign({}, a.overrides);
  Object.entries(b.overrides).forEach(([k, v]) => { if (!overrides[k] || (v.ts || 0) > (overrides[k].ts || 0)) overrides[k] = v; });
  const log = {};
  new Set(Object.keys(a.log).concat(Object.keys(b.log))).forEach(day => {
    const x = a.log[day] || { sec: {} }, y = b.log[day] || { sec: {} };
    const out = { sec: {} };
    new Set(Object.keys(x.sec || {}).concat(Object.keys(y.sec || {}))).forEach(k => { out.sec[k] = Math.max((x.sec || {})[k] || 0, (y.sec || {})[k] || 0); });
    new Set(Object.keys(x).concat(Object.keys(y))).forEach(k => { if (k !== 'sec') out[k] = Math.max(x[k] || 0, y[k] || 0); });
    log[day] = out;
  });
  return {
    words: mergeList(a.words, b.words), islands, srs, notes, noteTs, overrides, log, deleted, resetAt: a.resetAt,
    badges: Object.assign({}, b.badges || {}, a.badges || {}),
    level: !a.level ? b.level : !b.level ? a.level : (b.level.ts || 0) > (a.level.ts || 0) ? b.level : a.level,
    talkAdjust: (b.talkAdjustTs || 0) > (a.talkAdjustTs || 0) ? b.talkAdjust : a.talkAdjust,
    talkAdjustTs: Math.max(a.talkAdjustTs || 0, b.talkAdjustTs || 0),
    builderVerbs: mergeList(a.builderVerbs, b.builderVerbs),
    texts: mergeList(a.texts || [], b.texts || []),
    grammar: byTs(a.grammar, b.grammar),
    weekTests: byTs(a.weekTests, b.weekTests),
  };
}

async function gh(path, opts = {}) {
  const res = await fetch('https://api.github.com' + path, Object.assign({}, opts, {
    headers: { Authorization: 'Bearer ' + syncCfg.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  }));
  if (res.status === 401) throw new Error('Token ungültig oder abgelaufen');
  if (res.status === 403) throw new Error('Keine Berechtigung – Token braucht „gist“');
  if (res.status === 404) throw new Error('Gist nicht gefunden');
  if (!res.ok) throw new Error('GitHub-Fehler ' + res.status);
  return res.json();
}
function syncPayload() {
  const data = {};
  Object.keys(LANGS).forEach(l => { data[l] = load(stateKey(l), null); });
  return { app: 'sprachtraining', version: 2, updated: new Date().toISOString(), profile: settings.profile, data };
}
async function findOrCreateGist() {
  for (let page = 1; page <= 5; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`);
    const hit = list.find(g => g.description === SYNC_DESC && g.files[SYNC_FILE]);
    if (hit) return hit.id;
    if (list.length < 100) break;
  }
  const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: SYNC_DESC, public: false, files: { [SYNC_FILE]: { content: JSON.stringify(syncPayload()) } } }) });
  return g.id;
}
// overwriteLang: diese Sprache nicht zusammenführen, sondern lokalen Stand hochladen (nach Zurücksetzen)
async function syncNow(opts = {}) {
  if (!syncCfg.token || syncing) return false;
  syncing = true;
  persist();
  const before = JSON.stringify(state);
  try {
    if (!syncCfg.gistId) syncCfg.gistId = await findOrCreateGist();
    const g = await gh('/gists/' + syncCfg.gistId);
    const f = g.files[SYNC_FILE];
    let remote = null;
    if (f) {
      const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
      remote = JSON.parse(text);
    }
    if (remote && remote.data) {
      Object.keys(LANGS).forEach(l => {
        if (l === opts.overwriteLang) return;
        const loc = load(stateKey(l), null), rem = remote.data[l];
        if (rem) save(stateKey(l), loc ? mergeState(loc, rem) : rem);
      });
      if (remote.profile && (remote.profile.ts || 0) > (settings.profile.ts || 0)) { settings.profile = remote.profile; saveSettings(); }
    }
    state = loadState(settings.lang);
    await gh('/gists/' + syncCfg.gistId, { method: 'PATCH', body: JSON.stringify({ files: { [SYNC_FILE]: { content: JSON.stringify(syncPayload()) } } }) });
    syncCfg.last = Date.now();
    syncCfg.error = '';
    saveSync();
    return JSON.stringify(state) !== before;
  } catch (e) {
    syncCfg.error = e.message;
    saveSync();
    if (opts.manual) toast('Sync fehlgeschlagen: ' + e.message);
    return false;
  } finally {
    syncing = false;
  }
}
// Nach einem Sync, der Daten geändert hat, die Ansicht neu aufbauen (sonst arbeitet sie mit altem Stand).
async function autoSync() {
  if (await syncNow()) route();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) autoSync(); });
setInterval(() => { if (!document.hidden && Date.now() - syncCfg.last > 10 * 60000) autoSync(); }, 60000);

// ---------- Router ----------
function renderLangSwitch() {
  $$('#lang-switch button').forEach(b => b.classList.toggle('on', b.dataset.lang === settings.lang));
}
function route() {
  setTimeout(() => checkBadges(true), 300);
  cancelDictation();
  stopAudio();
  if (recorder && recorder.state === 'recording') recorder.stop();
  keyHandler = null;
  persist();
  const [name, arg] = location.hash.slice(1).split('/');
  let view = views[name] ? name : 'home';
  if (view === 'talk' && talkLocked() && arg !== 'setup') view = 'locked';
  applyLock();
  activeStep = view === 'builder' || view === 'grammar' ? 'islands' : view === 'texts' ? 'listen' : view === 'talk' ? 'talk' : STEPS.some(s => s.key === view) ? view : null;
  const tab = view === 'builder' || view === 'texts' || view === 'grammar' ? 'islands' : view === 'week' ? 'home' : view;
  $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
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
if (syncCfg.token) autoSync();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
