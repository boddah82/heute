# Repo „heute“ – Kurzüberblick für Claude

Erst diese Datei lesen. Details nur bei Bedarf (Tabelle „Wo steht was?“).

## 1. Regeln für Claude
- Deutsch, kurz, ohne Fachjargon. Fachwörter mit einfacher Erklärung in Klammern (auch deutsche Grammatik wie Verb, Vokal).
- Nichts erfinden. Ohne Quelle offen sagen. Widersprechen erlaubt, nicht schmeicheln.
- Mitdenken: Unklares oder Vergessenes nachfragen. Nachrichten kommen oft per Spracherkennung → Gemeintes zusammenfassen.
- Vor Code-Änderungen, Pushes oder PRs Ricky fragen. Nach seinem Ja direkt live schalten (PR nach `main` mergen), ohne zweite Rückfrage.
- Kosten offen nennen (nur Claude-API kostet), Schätzungen als Schätzung kennzeichnen.
- Keine Liedtexte o. ä. geschützte Texte ins Repo; Nutzer fügen eigene Texte selbst ein.

## 2. Lernprinzipien und Kartenregeln
- Ziel: Alltags-Sprechen (Italienisch Hauptsprache, Englisch britisch), kein Grammatikwissen.
- Didaktik wie ein Trainer: Muster selbst entdecken (Beispiele → „Was ändert sich?“ → Regel), nachfragen können, klein schneiden.
- Vokabeln und Texte: dieselbe Karteikarten-Abfrage `recallSession()`, 4 Knöpfe Nochmal/Schwer/Gut/Leicht, SM-2.
- Karte vorne: nur das Wort bzw. die kurze Bedeutung. Hinten: Erklärung wie ein guter Lehrer (Faustregel, Aha-Moment, Grammatik-Trick, z. B. „avevo: -vo = ich, früher“), kein Wörterbuch-/Fachjargon.
- Zahlen ausgeschrieben („quaranta“), Ziffer nur in der Bedeutung („vierzig (40)“).
- Natürliche, idiomatische Sprache geht vor „nur bekannte Wörter benutzen“.
- Spracheingabe endet erst mit „✓ Fertig“ (Denkpausen). Nicht auf Einzelaufnahme zurückbauen.
- Ausführlich: `BAUPLAN.md` Abschnitt 1.

## 3. Projekte im Repo
| Ordner | Was | Live |
|---|---|---|
| `lernen/` | Sprachtraining-App (Hauptprojekt) | https://boddah82.github.io/heute/lernen/ |
| `rhetorik/` | Rhetorik-Training für Ricky (Widerspruch, spontane Fragen) | https://boddah82.github.io/heute/rhetorik/ |
| `index.html` | Mini-Widget „Was machen wir heute?“ – nur mit Auftrag anfassen | Pages-Wurzel |
| `physio-app/` | Reiz-Reaktions-Tracker (Next.js), nur auf Branch `claude/amazing-franklin-5ue3h5` | Artifact https://claude.ai/artifact/SVYaLs3cpjJSRiwiVsaz8K |

## 4. Aufbau des Codes (Lern-App)
- Statische PWA, Vanilla-JS, kein Framework, kein Build-Schritt. Hash-Router `#view/arg`.
- `lernen/app.js` = gesamte Logik (Views `views.<name>`). `style.css` = Design. `data/*.js` = Wortlisten, Inseln, Grammatik, Pakete, Jugend-Modus. `sw.js` = Offline-Cache.
- Daten nur im Browser (`localStorage` `sl.*`, Fotos in IndexedDB), Sync optional über privates GitHub-Gist.
- Claude-API nur in wenigen Funktionen (Gespräche, Texte, Dialoge, Lesen, Grammatik, Varianten, Beispielsätze, Prüfen), eigener API-Schlüssel im Browser. Alles andere offline und kostenlos.
- Rhetorik-App: gleicher Aufbau, eigene Dateien; nutzt das SDK aus `lernen/vendor/`.

## 5. Arbeitsablauf: prüfen, testen, live schalten
1. Vor der Arbeit `git pull`.
2. `node --check lernen/app.js`
3. Tests: `lernen/tests/run-all.sh` (Playwright, Claude-/GitHub-API simuliert, keine Kosten). Rhetorik: `rhetorik/tests/run-all.sh`.
4. Lokal ansehen: `cd lernen && python3 -m http.server 8765` → http://localhost:8765/
5. `VERSION` in `lernen/sw.js` (`sl-…`) bzw. `rhetorik/sw.js` (`rh-…`) bei jeder Änderung erhöhen.
6. Live = Branch → PR → nach `main` mergen. GitHub Pages baut automatisch.

## 6. Was ist live (Stand 29.10.2026)
- Alle Grundfunktionen (Liste: `lernen/README.md`, `BAUPLAN.md` Abschnitt 2).
- Zuletzt dazugekommen:
  - #38 Kartenrückseite einfach erklärt („💡 Warum so?“)
  - #40 ✂️ Lange Sätze aufteilen + Sätze-Runde beim Lesen
  - #41 🙈 Zudecken (Lösung wieder verdecken, nochmal sagen)
  - #42 Satz in Schleife hören (1×/3×/5×/endlos)
  - #45 🔁 Varianten / Muster-Drill (Idee aus Video „1000 nützliche Sätze, Sprachinseln“)
  - #46 Neue Wörter mit Beispielsatz (Claude holt Sätze für je 10 Wörter, geschätzt 1–3 Cent pro Abruf)
  - #48–#50 Hochrechnung nach jedem Häppchen, Effizienz (70 % Fälliges / 30 % Neues, „⏭ Später“)
- Rhetorik-App live (gebaut ab 23.10.2026).

## 7. Offene Punkte
- Bei „Gut“ zeigte eine Karte immer „gleich“ – ob Fehler, unbestätigt.
- Alter Test zum Einstufungstest stürzt seit der Effizienz-Änderung ab (Hilfsfunktion fehlt). App nicht betroffen. Reparieren noch nicht entschieden.
- #46 Beispielsätze mit echter Claude-API noch ungetestet.
- Nie echt getestet (nur simuliert): Claude-API, Mikrofon/Kamera, Gerätestimmen, Gist-Sync.
- Weitere Ideen aus dem Video (nicht gebaut): Vorlage-Insel „Kennenlernen“ als Frage-Antwort-Paare, Zähler „sichere Sätze“.
- Rhetorik-Ideen (nicht gebaut): Einwand-Rollenspiel, Ausdruck-Karteikarten, Sync.

## 8. Wo steht was?
| Frage | Datei |
|---|---|
| Funktionen, Variablen, Datenformat der Lern-App | `lernen/TECHNIK.md` |
| Technik der Rhetorik-App | `rhetorik/TECHNIK.md` |
| Lernprinzipien, Funktionsliste, Übertragung auf andere Themen | `BAUPLAN.md` |
| Warum etwas so gebaut ist, was abgelehnt wurde | `VERLAUF.md` (vor größeren Änderungen lesen) |
| Bedienung für Nutzer | `lernen/README.md` |

Diese Datei bei jeder wichtigen Änderung aktuell halten (Abschnitte 6 und 7), ebenso die Kopie im Google-Drive-Ordner „Claude-Wissen“.
