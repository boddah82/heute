# Repo „heute“

- `index.html` (Root): kleines WhatsApp-artiges Widget „Was machen wir heute?“ – unabhängig von der Lern-App, nicht anfassen ohne Auftrag.
- `BAUPLAN.md`: Gesamtüberblick (Lernprinzipien, Funktionen, Aufbau, Übertragung auf andere Lernthemen wie Physio/Trainer).
- `VERLAUF.md`: bisheriger Verlauf, Wünsche und Arbeitsweise des Nutzers – **vor größeren Änderungen lesen**.
- `rhetorik/`: **Rhetorik-Training** (eigene PWA, Abschnitt unten).
- `lernen/`: **Sprachtraining-App** (Italienisch + Englisch britisch) für den Repo-Besitzer. Deutschsprachige Oberfläche.
- `physio-app/`: **Reiz-Reaktions-Tracker** (Next.js-PWA für Schmerz/Belastungs-Tracking in der Physiotherapie) – liegt (noch) nicht auf `main`, sondern auf Branch `claude/amazing-franklin-5ue3h5`. Veröffentlicht als Artifact: https://claude.ai/artifact/SVYaLs3cpjJSRiwiVsaz8K.

Live: GitHub Pages von `main` → https://boddah82.github.io/heute/lernen/

## Lern-App – Aufbau

Reine statische PWA ohne Build-Schritt, Vanilla-JS, kein Framework.

| Datei | Inhalt |
|---|---|
| `lernen/index.html` | Gerüst, Tab-Leiste, lädt Skripte in fester Reihenfolge |
| `lernen/app.js` | gesamte Logik (~2500 Zeilen), Hash-Router `#view/arg` |
| `lernen/style.css` | Design-Tokens in `:root`, Dark Mode per `prefers-color-scheme` |
| `lernen/data/it.js`, `en.js` | Grundwörter + Vorlagen-Sprachinseln (`window.STARTER`) |
| `lernen/data/it-words.js`, `en-words.js` | ~1250 weitere Wörter je Sprache, nach Häufigkeit sortiert (`ziel\|deutsch`) |
| `lernen/data/builder.js` | Satzbaukasten-Muster (`window.BUILDER`) |
| `lernen/data/grammar.js` | Grammatik-Lektionen (Titel/Thema, Reihenfolge) je Sprache (`window.GRAMMAR`); Inhalt erzeugt Claude → `state.grammar` |
| `lernen/data/packs.js` | Wortpakete nach Situation (`window.PACKS`, `!` = im Jugend-Modus aus) |
| `lernen/data/teen.js` | Jugend-Modus: Inseln, Gesprächsthemen, ausgeblendete Bausteine (`window.TEEN`) |
| `lernen/vendor/anthropic-sdk.js` | offizielles `@anthropic-ai/sdk`, per esbuild als ESM-Browser-Bundle; wird per `import()` erst bei Bedarf geladen |
| `lernen/sw.js` | Service Worker, Netzwerk zuerst; nur same-origin. **`VERSION` bei jeder Änderung hochzählen** |

Views in `app.js` (`views.<name>`): `home` (mit „Heute zuerst“ aus `todayPlan()`, Regeln dort kommentiert), `method`, `vocab` (neu/abfragen/verstehen/eigene; „verstehen“ = Rückrichtung hören → Deutsch, SRS-ID `r:<Wort-ID>`, `hearQueue()`; neue Wörter nach `wordPriorities()` – Wörter aus geübten Sätzen zuerst), `review` (Sätze; Knopf „✂️ Aufteilen“ auch in Text-Runden: `splitSentenceUI()` zerlegt lange Sätze wörtlich in Teil-Sätze mit `partOf`, Satz bekommt `parts`; `withParts()` stellt neue/fällige Teile vor den ganzen Satz; Teile stehen in der Insel direkt davor; ✂️ auch in Sprachinsel-Liste und Shadowing; Zahlen-Wortkarten zeigt `numberCard()` ausgeschrieben, Ziffern in Sätzen der Zielsprache `numText()` (nur Anzeige/Vorlesen/Vergleich)), `listen` (Sätze, `#listen/words` gelernte Wörter, `#listen/check` Hör-Check ohne Bewertung, `#listen/stories` Hör-Dialoge von Claude → als Text mit `story`/`sp` gespeichert, Stimmen über `storyVoice()` + `settings.voiceGender`), `shadow` (beide mit „Schwierige Sätze“ aus `weakSentences()`; Bewertung nur in `review`), `builder` (Satzbaukasten + Drill; `#builder/var` Muster-Drill: `#builder/var~<Satz-ID>`, `makeVariants()` holt einmal 15 Abwandlungen → `s.vars` `{t,d,k}`, `VAR_KINDS`; ohne Bewertung, zählt `log.drill`; Links `varLink()` in Inseln und Shadowing), `texts` (eigene Texte; beim Speichern automatisch `segmentText()`/`localSegment()` + `mergeFragments()`, dann Übersetzung; Karte „Diesen Text lernen“: `#texts/<id>~cards` / `~sents` = `textRound()` mit der normalen `recallSession()` (4 Bewertungen, SM-2, dieselben Karten wie Wort-/Satz-Abfrage); pro Runde fällige + `TEXT_NEW_W`/`TEXT_NEW_S` neue (`textQueue()`), kleine Wörter (`isSmallWord()`) ohne eigene Wortkarte, Wörter-Richtung `settings.cardRev` (Zielsprache → Deutsch = `r:<Wort-ID>` wie „Verstehen“, `recallSession` mit `cfg.rev`), Sätze nur Deutsch → Zielsprache; Ziel-Insel `textIsland()`/`tx.island`, Sätze per `lineToIsland()` mit `gloss`; 🔊 pro Satz wiederholt per `repeatSentence()` 1×/3×/5×/endlos nach `settings.sentRep`, auch in Lesekapiteln „🔊 Satz“), `islands`, `grammar` (`#grammar/<id>`: „Muster zuerst“ – `pattern` mit `hl`, Frage, Auflösung; Spielformen `swap`/`choice`/`translate`; Nachfragen `askGrammar()` → `qa`; Fachwörter via `explainTerms()`), `read` (Lesegeschichten: `#read`, `#read/<id>`, `#read/<id>~<kapitel>`, `~cards` Wörter-Runde / `~sents` Sätze-Runde des Kapitels = `textRound(root, chapterSrc(book, ch))` wie bei eigenen Texten, Sätze in Insel `read-<buch-id>`; `writeChapter()` → `state.books`), `level` (Einstufungstest), `awards` (Punkte/Ränge/Abzeichen), `week` (Wochenrückblick, `#week/test` Wochen-Check → `state.weekTests`), `talk` (Gespräche mit Claude; bei Eltern-Sperre `talkLocked()` → `views.locked`, nur `#talk/setup` erreichbar), `settings`.

Motivation: Abfragen in Häppchen (`biteCounter()`, `cfg.bite` = `settings.bite`, Standard 15) mit Zwischenstand; Wörter-Tagesportion `wordBudget()` (= `REVIEW_CAP` pro Tag), „Heute zuerst“ nennt Häppchen statt Rückstand; Startseite `progressCard()`: Etappenziel aus `STAGES` (sichere Wörter), Prognose `secureTempo()` aus täglichen Notizen `log[tag].secure` (`noteSecure()`), Woche, Balken `activityBars()`, Meilensteine `MILESTONES` (`log.mile`), eigenes Ziel `settings.goalWords`/`goalDate`. Kein festes 10.000-Ziel mehr. Nach jedem Häppchen/jeder Runde `cheer()`: Lob, „Heute bis jetzt …“ + Hochrechnung `projection()` „Wenn du jeden Tag so lernst wie heute: Etappenziel in X Tagen“ (Tempo 2 Wochen × heutiger Einsatz/Schnitt, auf 0,5–1,5 begrenzt; dazu „mit 1 Häppchen mehr pro Tag“, als grob gekennzeichnet).

Effizienz: Wort-Abfrage mischt fällige und neue Wörter 70/30 (`mixNew()`, `NEW_SHARE`, Pool `newWordPool()`, Tagesrest `newWordsLeft()`), ebenso die Satz-Abfrage; neue Karten werden zuerst gezeigt (`cfg.introNew`, Lernschritte fragen sie danach ab); „⏭ Später“ (`cfg.later` = `postpone()`, 3 Tage, Sätze mit `s.later`); geteilte Sätze: ganzer Satz erst, wenn alle Teile gelernt sind (`partsLearned()` in `withParts()`), neue Sätze über `LONG_SENT` Wörter nach den kurzen; `log.secured` = heute sicher gewordene Wörter (in `cheer()`), ohne messbares Tempo Wenn-dann-Rechnung mit dem Tagesziel neuer Wörter. „Heute zuerst“ hat keinen eigenen Neue-Wörter-Schritt mehr.

Karteikarten-Abfrage `recallSession()`: nach dem Aufdecken deckt „🙈 Zudecken“ (`cover()`) die Lösung wieder zu (Einprägen → ohne Hilfe nochmal sagen); bewertet wird erst nach erneutem Aufdecken.

### Daten
- `localStorage`: `sl.settings`, `sl.data.<lang>` (Zustand pro Sprache), `sl.sync`, `sl.talkcfg` (API-Schlüssel), `sl.talk.<lang>` (laufendes Gespräch), `sl.usage`.
- Wiederholung: `nextCard()` (SM-2 ohne Seiteneffekte, ±10 % Streuung ab 3 Tagen, Verspätung zählt mit), `grade()`, Lernschritte `learnSteps()` in `recallSession`/`hearSession` (neue Karten zweimal, vergessene einmal gewusst, Wiederkehr nach `LEARN_GAP` Karten), Vorschau `rateButtons(steps.labels(id))`; Text-/Lese-Runden halten Tageslimits ein (`textNewLeft()`).
- Zustand: `words`, `islands`, `srs` (SM-2, Intervalle in Tagen), `notes`/`noteTs`, `overrides`, `log` (pro Tag), `deleted` (Löschmarker), `builderVerbs`, `texts`, `grammar`, `weekTests`, `books`, `level`, `talkAdjust`, `resetAt`.
- Jede Änderung setzt `ts: Date.now()`, Löschen ruft `markDeleted(id)` – nötig für `mergeState()` (Gist-Sync, neuerer Zeitstempel gewinnt).
- Fotos: IndexedDB `sl-photos`, Schlüssel `<lang>|<id>`, nur lokal (nicht im Sync/Backup).
- IDs: Grundwörter `w:<wort>`, eigene `u:…`, Sätze `s:…`, Vorlagen-Inseln fest `st-<lang>-<n>`.

### Claude im Browser
- Nur in `talk`, `texts` (Ordnen/Übersetzung), Hör-Dialogen, Lesegeschichten, Grammatik-Lektionen (einmal pro Lektion) und „🔍 Prüfen“ (Wörter/Sätze; Satz bekommt `gloss` = Wort für Wort im Zusammenhang). Alles andere ist kostenlos/offline.
- `callClaude()` nutzt das SDK mit `dangerouslyAllowBrowser`, Modell aus Einstellungen (Standard `claude-opus-5-5`), `output_config.format` (JSON-Schema), `effort: 'medium'`, `cache_control`, Server-Fallback (`fallbacks: 'default'`, Beta `server-side-fallback-2026-07-01`) außer bei Haiku. Antwortinhalt wird vollständig in den Verlauf übernommen (Denkblöcke nicht verändern).
- Prompt-Regel: natürliche, idiomatische Sprache geht immer vor „bekannte Wörter benutzen“.
- Wort für Wort (Texte, Dialoge, Lesen): Schema `WORD_ITEMS` mit `ctx` (welche Bedeutung gemeint ist / worauf sich ein kleines Wort bezieht) und `base` (Grundform), Regel `wordCtxRule()`; Wortkarten bekommen `wordMeaning()` als Bedeutung, auf der Karte zerlegt `splitMeaning()` das wieder: vorne nur die Bedeutung, hinten „Warum so?“ + Grundform (`meaningExtra()`); Text-Runden zeigen per `cfg.ctx` „📖 Satz zeigen“ und nach dem Aufdecken die Stelle im Text.

### Spracherkennung
`dictation()` / `micToggle()`: kontinuierlich, startet bei Stille neu, endet erst mit „✓ Fertig“ (Lernende brauchen Denkpausen). Nicht auf Einzelaufnahme zurückbauen.

## Rhetorik-App (`rhetorik/`)

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

## Konventionen
- Didaktik wie ein Trainer: Übungsformen, in denen Lernende Muster selbst entdecken, statt Regeln vorzukauen; Nachfragen ermöglichen. Fachwörter einfach erklären (Nutzer tut sich auch mit deutscher Grammatik schwer).
- UI-Texte auf Deutsch, kurz. Code-Kommentare deutsch, sparsam.
- Ehrlich bleiben: keine erfundenen Inhalte; Übersetzungen der Wortlisten sind ungeprüft (Korrektur in der App per ✎).
- Keine Liedtexte o. ä. urheberrechtlich geschützte Texte ins Repo legen; Nutzer fügen eigene Texte selbst ein.
- Nach Änderungen: `node --check lernen/app.js`, Tests `lernen/tests/run-all.sh`, App lokal testen (`cd lernen && python3 -m http.server 8765`, dann http://localhost:8765/), `sw.js`-VERSION erhöhen.
- Veröffentlichen = nach `main` mergen (GitHub Pages baut automatisch).
