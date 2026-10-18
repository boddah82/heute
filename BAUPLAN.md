# Bauplan: Sprachtraining-App – Aufbau, Funktionen, Lernprinzipien

Dieses Dokument beschreibt die Lern-App in `lernen/` so, dass ein anderes Claude (Terminal, Desktop) sie versteht, weiterbauen oder als **Vorlage für andere Lernthemen** nutzen kann, z. B. Physiotherapie oder Trainer-Ausbildung.

- Live: https://boddah82.github.io/heute/lernen/
- Technische Kurzreferenz: `CLAUDE.md`
- Verlauf und Wünsche des Nutzers: `VERLAUF.md` (vor größeren Änderungen lesen)

---

## 1. Lernprinzipien (das Wichtigste zum Übertragen)

Die App folgt wenigen Grundsätzen. Sie gelten für jedes Lernthema, nicht nur für Sprachen.

1. **Aktiv abrufen statt wiederlesen (Active Recall).** Die App zeigt eine Frage, man erinnert sich selbst (laut, getippt oder im Kopf) und deckt erst dann auf. Die Anstrengung beim Erinnern ist der Lerneffekt.
2. **Verteilte Wiederholung (Spaced Repetition, SM-2).** Nach jeder Abfrage bewertet man sich: Nochmal / Schwer / Gut / Leicht. Daraus berechnet die App, wann die Karte wiederkommt: erst nach 1 Tag, dann nach 3, 7, 20 Tagen und so weiter. Was sitzt, kommt seltener, was hakt, öfter.
3. **Eselsbrücken und eigene Bilder.** Zu jeder Karte kann man eine eigene Merkgeschichte schreiben oder einsprechen und ein eigenes Foto anhängen.
4. **Wie ein Trainer, nicht wie ein Lehrbuch.** Keine vorgekauten Regeln, sondern Übungsformen, in denen man das Muster selbst entdeckt:
   - erst Beispiele, in denen sich nur eines ändert,
   - dann „Was ändert sich?“,
   - dann erst die Regel als Name dafür.

   Nachfragen ist jederzeit möglich.
5. **Fachwörter immer einfach erklären.** Beim ersten Vorkommen steht eine Erklärung in Klammern dahinter, z. B. „Vokal (a, e, i, o, u)“.
6. **Klein schneiden.** Ein Muster pro Lektion, nur der häufigste Fall, Ausnahmen später.
7. **Viel Input auf passendem Niveau.** Texte und Dialoge, die man zu etwa 95 % versteht. Bei Unbekanntem antippt man das Wort, statt dass alles übersetzt daneben steht.
8. **Hören und Sprechen, nicht nur Lesen.** Vorlesen, Nachsprechen (Shadowing), Hör-Abfragen und Gespräche.
9. **Heute zuerst: feste Regeln, keine KI.**
   - Fälliges vor Neuem.
   - Pro Runde höchstens 50 Wiederholungen; Rückstand nach Pausen wird verteilt statt nachgeholt.
   - Lange Vernachlässigtes nach vorn.
   - Neues aussetzen, wenn der Rückstand groß ist.
10. **Ehrlich messen.** Wochen-Check ohne KI, Punkte für jede ehrliche Bewertung (auch „Nochmal“), eine Serie mit Jokern statt Strafe.
11. **Kosten offen zeigen.** Alles ohne KI ist kostenlos und offline. KI-Funktionen zeigen eine geschätzte Kosten-Angabe und merken sich das Ergebnis, damit nichts doppelt bezahlt wird.

---

## 2. Funktionen (Stand Oktober 2026)

| Bereich | Was es tut | KI? |
|---|---|---|
| **Heute** | Tagesziel, Serie, Punkte; „Heute zuerst“ mit 2–3 empfohlenen Schritten; Karten zu Grammatik und Lesen | nein |
| **Wörter → Neu** | neue Wörter nach Häufigkeit oder als Paket nach Situation (Restaurant, Notfall …); Wörter aus geübten Sätzen zuerst; Eselsbrücke tippen oder einsprechen; Foto | nein |
| **Wörter → Abfragen** | Deutsch → Fremdsprache, Bewertung mit SM-2, höchstens 50 pro Runde | nein |
| **Wörter → Verstehen** | Rückrichtung als Hören: Wort hören → Bedeutung sagen; startet erst, wenn die Hauptrichtung sitzt | nein |
| **Sätze** | Satz-Abfrage aus den Sprachinseln, mit Wort-Hilfe | nein |
| **Hören** | Sätze in Schleife; gelernte Wörter als Hör-Abfrage; Hör-Check ohne Bewertung; Hör-Dialoge mit mehreren Stimmen | Dialoge: ja |
| **Shadowing** | Einzählen, Wort-Markierung, Pause zum Nachsprechen, Aufnahme und Vergleich; schwierige Sätze zuerst | nein |
| **Inseln** | Satzsammlungen pro Thema (eigene und Vorlagen); Satzbaukasten mit Drill; Grammatik; eigene Texte | Grammatik und Texte: ja |
| **Grammatik** | feste Reihenfolge; „Muster zuerst“ → Frage → Auflösung → 8 Spielformen (umbauen, auswählen, übersetzen); „❓ Frag nach“ und „❓ Warum?“ | ja, einmal pro Lektion, Fragen extra |
| **Lesen** | Geschichten in Kapiteln auf dem eigenen Niveau; Wort antippen; Vorlesen; 3 Verständnisfragen; Karteikarten mit allen Wörtern des Kapitels; nachgeschlagene Wörter kommen wieder | ja, pro Kapitel |
| **Texte** | eigene Texte (z. B. Liedtexte) automatisch in Sätze ordnen und übersetzen, Wort für Wort, Redewendungen; darunter Wörter und Sätze in kleinen Runden mit der normalen Abfrage (4 Bewertungen, SM-2), alle Sätze mit einem Tipp in eine Insel (→ Satz-Abfrage) | ja, einmal pro Text |
| **Reden** | Gespräche und Rollenspiele per Sprache, Korrektur, Antworthilfe in Stufen, Beschreiben-Modus mit Foto, Auswertung | ja |
| **🔍 Prüfen** | Wort- oder Satzkarte prüfen lassen, Vorschlag übernehmen, Wort für Wort im Zusammenhang | ja, pro Prüfung |
| **Niveau** | Einstufungstest (5 Min.), Stufe A0–B2 aus den sicheren Wörtern, Tempo neuer Wörter passt sich an | nein |
| **Woche** | Wochenrückblick, Wochen-Check (15 Fragen), „Das kannst du jetzt“, Teilen per WhatsApp | nein |
| **Punkte** | Punkte, Ränge, 16 Abzeichen | nein |
| **Jugend-Modus** | altersgerechte Themen, Inseln und Regeln für die KI; Eltern-Sperre per PIN (Gespräche aus) | – |
| **Sync** | privates GitHub-Gist, Zusammenführen nach Zeitstempel, Löschmarker; ohne Sync: Backup-Datei | nein |

---

## 3. Technischer Aufbau

**Grundsatz: eine statische Web-App (PWA) ohne Server und ohne Build-Schritt.** Sie läuft auf GitHub Pages, lässt sich auf den Startbildschirm legen und funktioniert offline.

```
lernen/
  index.html            Gerüst + Tab-Leiste (7 Tabs), lädt die Skripte in fester Reihenfolge
  app.js                gesamte Logik (~4400 Zeilen, Vanilla-JS), Hash-Router #ansicht/argument
  style.css             Design-Tokens in :root, Dark Mode automatisch
  sw.js                 Service Worker: Netzwerk zuerst, offline aus dem Cache; VERSION bei jeder Änderung erhöhen
  manifest.webmanifest  PWA (Name, Icons)
  data/                 Inhalte als window.<NAME> = …  (Wortlisten „ziel|deutsch“, Vorlage-Inseln,
                        Satzbaukasten, Grammatik-Reihenfolge, Wortpakete, Jugend-Modus)
  vendor/anthropic-sdk.js  offizielles Claude-SDK als Browser-Bundle, wird erst bei Bedarf geladen
  tests/                22 Playwright-Tests, Claude/GitHub/Mikrofon/Sprachausgabe werden darin nachgebaut
```

**Router:** `location.hash` wird zu `views.<name>(root, arg)`. Jede Ansicht rendert per Template-String in `#view`.

**Daten (nur im Browser):**
- `localStorage`:
  - `sl.settings` – Einstellungen
  - `sl.data.<sprache>` – Lernstand
  - `sl.talkcfg` – API-Schlüssel, nur auf dem Gerät
  - `sl.sync` – Gist-Token
  - `sl.usage` – Kostenschätzung
- Fotos in IndexedDB, nur lokal.
- Lernstand (`state`):
  - `words`, `islands` (mit `sentences`)
  - `srs` – Karten-ID → `{iv, ef, reps, lapses, due, ts}`
  - `notes`, `overrides`, `log` (pro Tag: Sekunden je Bereich, Zähler, Punkte)
  - `texts`, `grammar`, `books`, `weekTests`, `badges`, `deleted`
- IDs:
  - `w:<wort>` – Grundwörter
  - `u:…` – eigene Wörter
  - `s:…` – Sätze
  - `r:<wort-id>` – Rückrichtung
- Jede Änderung setzt `ts`, Löschen setzt einen Löschmarker. `mergeState()` führt zwei Stände zusammen; der neuere Zeitstempel gewinnt.

**Wiederholungsplanung:** `grade(id, r)` (SM-2, Intervalle in Tagen). `dueIds()` liefert die fälligen Karten, `recallSession()` ist die gemeinsame Abfrage-Oberfläche (Frage → Sprechen/Tippen → Aufdecken → 4 Knöpfe → Eselsbrücke/Foto).

**Claude im Browser:** `callClaude(system, messages, schema, maxTokens)`
- offizielles SDK mit `dangerouslyAllowBrowser`; der Schlüssel des Nutzers bleibt im Browser
- strukturierte Ausgabe über ein JSON-Schema (`output_config.format`), `effort: 'medium'`, `cache_control`
- Server-Fallback (Beta `server-side-fallback-2026-07-01`)
- Kosten werden pro Monat geschätzt (`addUsage`)
- Regel in allen Prompts: natürliche, korrekte Sprache geht vor „nur bekannte Wörter“; im Jugend-Modus kommen zusätzliche Regeln für Minderjährige dazu
- Ergebnisse (Lektionen, Kapitel, Übersetzungen, Prüfungen) werden gespeichert, damit sie nicht erneut bezahlt werden müssen

**Sprache:**
- Ausgabe: Web Speech `speechSynthesis`; Stimme pro Sprecher, Männer- und Frauenstimmen ordnet der Nutzer selbst zu
- Spracherkennung: `dictation()`; läuft weiter, auch bei Pausen, und endet erst mit „✓ Fertig“, weil Lernende Denkpausen brauchen

**Tests:** `lernen/tests/run-all.sh` (Server auf Port 8765). Vor jedem Veröffentlichen ausführen; Ablauf in `CLAUDE.md`.

**Veröffentlichen:** auf dem Branch arbeiten, Pull Request nach `main`, mergen. GitHub Pages baut automatisch.

---

## 4. Übertragen auf andere Lernthemen (z. B. Physio, Trainer-Ausbildung)

Das Gerüst passt auf jedes Fach, in dem man Begriffe, Zusammenhänge und Anwendung lernen muss. Die meisten Bausteine lassen sich direkt umdeuten:

| Baustein in der Sprach-App | Entsprechung Physio / Trainer |
|---|---|
| Wörter mit Eselsbrücke und Foto | Fachbegriffe: Muskel → Ursprung, Ansatz, Funktion; Foto oder Skizze aus dem eigenen Skript |
| Wörter → Abfragen (SM-2) | Karteikarten für Prüfungswissen: Frage → selbst beantworten → aufdecken → bewerten |
| Rückrichtung „Verstehen“ | umgekehrt fragen: Funktion → welcher Muskel? Symptom → welches Krankheitsbild? |
| Sprachinseln (Sätze pro Thema) | Kernaussagen pro Kapitel: Definitionen, Kontraindikationen, Trainingsprinzipien |
| Satz-Abfrage | Kernaussage frei wiedergeben und mit dem Original vergleichen |
| Hören (Schleife) | Lernstoff vorlesen lassen, z. B. beim Autofahren oder Laufen |
| Shadowing | laut erklären, als würde man es einem Patienten oder Spieler erklären (Feynman-Methode, Feynman = Physiker: wer etwas einfach erklären kann, hat es verstanden) |
| Grammatik „Muster zuerst“ | Fallbeispiele zuerst: 4–6 ähnliche Fälle, bei denen sich nur eins ändert → „Was ist hier anders?“ → dann das Prinzip |
| Spielformen (umbauen, auswählen, übersetzen) | Fall abwandeln („Was ändert sich, wenn der Patient 70 ist?“), richtige Übung auswählen, Befund in Fachsprache übersetzen |
| ❓ Frag nach / ❓ Warum? | Rückfragen zum Stoff direkt an der Stelle, an der man hängt |
| Lesen (Kapitel auf Niveau) | Fallgeschichten in Fortsetzungen: Patient oder Spieler über mehrere Termine, Fragen zum Verständnis |
| Gespräche / Rollenspiele | Anamnese-Gespräch oder Prüfungssimulation: KI spielt Patient, Prüfer oder Spieler |
| Hör-Dialoge | Gespräch Therapeut–Patient oder Trainer–Spieler zum Zuhören |
| Wochen-Check | Probeprüfung jede Woche, Ergebnis pro Themenbereich |
| Wortpakete nach Situation | Pakete nach Körperregion (Schulter, Knie …) oder Trainingsbereich (Ausdauer, Kraft, Koordination) |
| 🔍 Prüfen | eigene Karten gegen das Skript prüfen lassen |
| Heute zuerst | fällige Wiederholungen vor Neuem, Rückstand verteilen, vernachlässigte Bereiche nach vorn |

**Wichtig bei Gesundheitsthemen:** KI-Antworten können falsch sein. Grundlage sollten die eigenen Unterlagen sein (Skript, Lehrbuch), die man in die App einfügt. Die KI erklärt und fragt ab, entscheidet aber nicht, was richtig ist. In Prompts sollte deshalb stehen: „Nur auf Basis des eingefügten Materials antworten, Unsicheres kennzeichnen.“ Bei Lehrbüchern gilt dasselbe wie bei Liedtexten: Geschützte Inhalte nicht in ein öffentliches Repo legen, sondern nur lokal in der App speichern.

**Vorgehen für eine neue App, z. B. `physio/` im selben oder einem neuen Repo:**
1. `lernen/` als Startpunkt kopieren und sprachspezifische Teile entfernen: Sprachumschalter, Satzbaukasten, Aussprache, Wortlisten.
2. Datenmodell behalten (Karten, SRS, Inseln = Kapitel, Log, Sync); „Wörter“ in „Begriffe“ umbenennen.
3. Inhalte als `data/*.js` (eigene Formulierungen) oder über eine Import-Funktion („Frage | Antwort“ pro Zeile) aus dem eigenen Skript.
4. KI-Prompts umschreiben: Rolle Prüfer, Patient oder Trainer; Muster-zuerst-Didaktik; Fachwörter in Klammern erklären; nur auf eingefügtem Material.
5. Tests nach dem Muster in `lernen/tests/` schreiben, mit nachgebauter API.

---

## 5. Wie der Nutzer arbeitet (für jedes Claude, das hier weiterbaut)

- Kurz antworten, nichts erfinden, nicht schmeicheln; mitdenken und nachfragen, wenn etwas unklar ist.
- Nachrichten kommen oft per Spracherkennung: Gemeintes zusammenfassen, bei Unklarheit nachfragen.
- Er tut sich auch mit deutscher Grammatik schwer: Fachwörter immer mit einfacher Erklärung in Klammern, auch im Chat.
- Er erwartet Trainer-Didaktik: Übungsformen statt Regeln, Nachfragen möglich, in seinem Tempo.
- Kosten offen nennen und Schätzungen als Schätzung kennzeichnen.
- Bisher wird sofort nach `main` gemergt, weil er die App direkt nutzen will.
