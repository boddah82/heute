# Rhetorik-App – Technik-Nachschlagewerk

Nur bei Code-Arbeit an `rhetorik/` lesen. Kurzüberblick: `CLAUDE.md` im Repo-Wurzelordner.

Live: https://boddah82.github.io/heute/rhetorik/ – gleicher Aufbau wie die Lern-App (statisch, Vanilla-JS, Hash-Router), eigene Dateien; nur das SDK kommt aus `../lernen/vendor/`.

- Anlass (23.10.2026): Ricky will souveräner sprechen – Physio in Suchtreha (interdisziplinäre Meetings), MAV, Sicherheitsbeauftragter, Patienten/Schmerzkurs, Fußballtrainer, Videos. **Schwerpunkt** (`RH.focus`): Widerspruch (er kommt oft mit absoluten Aussagen, fühlt sich bei Widerspruch schnell missverstanden), Fragen, die er gerade nicht beantworten kann (Angst, „müsste ich wissen“), Position mit Spielraum. Schwächen laut ihm: roter Faden, Wortschatz/Ausdruck, Spontanität/Nervosität. 10–15 Min./Tag.
- `data/tasks.js` (`window.RH`): Lagen (`cats`) mit Werkzeug (`tool`, `steps`), Beispielpaar A/B (`example`, B-Sätze mit Schritt-Index) und Aufgaben (`tasks`: `ctx`, `say` = Satz des Gegenübers, vorgelesen, `task`). Aufgaben allgemein, keine echten Namen (gehen an Claude).
- Runde (`views.round`, `#round/<task-id>`): beim ersten Mal pro Lage erst „Muster entdecken“ (A vs. B → „Was macht B anders?“ → Auflösung, `state.seen`). Dann Gegenüber anhören → Denkzeit → sprechen (`dictation()` wie Lern-App, Ende erst mit „✓ Fertig“; parallel `MediaRecorder`, Aufnahme in IndexedDB `rh-audio`, Schlüssel `<runde>|<versuch>`) → Auswertung → zweiter Versuch mit Fokus.
- Stufen (Graded Exposure, `DENK`): 1 = 45 s Denkzeit + Werkzeug, 2 = 20 s + Stichworte, 3 = 5 s, Gegenüber nur hören. „Bereit für Stufe X?“ nach 3 Runden mit Gefühl ≥ 4 (`readyForNext()`), nie automatisch.
- Auswertung ohne KI (`analyze()`, `MARKS`): absolute Wörter, Selbstabwertung, Spielraum/Spiegeln, oft wiederholte Wörter, Tempo. „äh“ erkennt die Spracherkennung meist nicht – ehrlich so angezeigt.
- Claude (`getFeedback()`, `FB_SYSTEM`, `FB_SCHEMA`): Kernaussage, Werkzeug-Schritte ja/teils/nein, Gedankensprung, eine Stärke, max. 2 „besser sagen“ (Sprechsprache, nichts dazuerfinden), ein Fokus, beim 2. Versuch Vergleich. API-Schlüssel geteilt mit der Lern-App (`sl.talkcfg`), Kosten in `sl.usage`.
- „Heute“ (`todayPlan()`): 3 Runden, zwei aus dem Schwerpunkt, eine andere Lage; Vergleich mit derselben Aufgabe nach ≥ 28 Tagen. Eigene Situationen (`state.custom`, IDs `c:…`).
- `localStorage`: `rh.data` (`rounds`, `seen`, `level`, `custom`, `plan`), `rh.settings`. Kein Sync (nur Sicherungsdatei).
- Tests: `rhetorik/tests/run-all.sh` (Server Port 8766 auf der Repo-Wurzel). `sw.js`-VERSION (`rh-…`) bei jeder Änderung erhöhen. Beide Service Worker löschen nur ihre eigenen Caches (`sl-`/`rh-`).
- Noch nicht gebaut (Ideen): Einwand-Training als Rollenspiel mit Nachhaken, Ausdruck-Karteikarten aus eigenen Aufnahmen (SM-2), Sync.
