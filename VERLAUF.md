# Verlauf & Übergabe – Sprachtraining-App

Zusammenfassung der bisherigen Arbeit (Sept./Okt. 2026, Claude Code im Web) für die Weiterarbeit im Terminal. Technischer Aufbau: siehe `CLAUDE.md`.

## Wie der Nutzer arbeiten möchte
- Kurz antworten, nur das Wichtigste. Nichts erfinden. Nicht schmeicheln.
- Mitdenken: Wenn etwas vergessen sein könnte oder unklar ist, **nachfragen**, statt zu raten.
- Nachrichten kommen oft per Spracherkennung (abgeschnitten, verdrehte Wörter) → Gemeintes zusammenfassen und bei Unklarheit nachfragen.
- Bei größeren Ideen erst Feedback geben („was ergibt Sinn, was nicht“), wenn er danach fragt.
- Kosten offen nennen (Claude-API kostet; alles andere soll kostenlos bleiben). Schätzungen als Schätzung kennzeichnen.
- Nutzt die App auf dem Handy (PWA) und Chromebook. Lernt Italienisch (Hauptsprache) und Englisch (britisch).

## Ablauf bisher
1. **Basis-PWA** nach dem HyperLingua-Ansatz: Vokabeln mit Eselsbrücke + SM-2, Satz-Abfrage (Active Recall), Hören, Shadowing (Aufnahme, Spracherkennungs-Abgleich), Sprachinseln, Backup, offline.
2. **Satzbaukasten** (aus einem YouTube-Video): Modalverb + Infinitiv (voglio/vorrei/posso/devo/cerco di), „Sono …“ m/w, „Mi piace/piacciono …“, Grundfragen mit „E tu?“, eigene Verben, Drill. Deutsche Verneinung „kein“ bei unbestimmtem Artikel.
3. **Gist-Sync** (privates GitHub-Gist, Token mit Scope `gist`), Merge per Zeitstempel, Löschmarker, Reset-Epoche.
4. **Wortlisten ~1500/Sprache**, nach Häufigkeit (FrequencyWords) sortiert; Übersetzungen von Claude ohne Wörterbuch → in der App per ✎ korrigierbar.
5. **Einstufungstest + Niveau** (A0–B2 grob, nur Wortschatz), adaptives Tempo neuer Wörter.
6. **Gespräche mit Claude** (eigener API-Schlüssel des Nutzers im Browser), Rollenspiele, Korrektur, Auswertung.
7. **Spracheingabe**: Pausen erlaubt, Ende erst mit „✓ Fertig“ (Nutzer braucht Denkzeit – war ein echtes Problem).
8. **Antworthilfe** im Gespräch in Stufen: Wort-für-Wort-Deutsch in fremder Satzstellung → Einstieg → Lückensatz → ganze Antwort (die „deutsche Idee“ wollte er nicht).
9. **Natürliche Sprache vor bekannten Wörtern** (Anlass: Claude sagte „Dopo il letto…“), `effort` von low auf medium.
10. **Eigene Fotos** pro Wort/Satz (nur lokal), **Eselsbrücke einsprechen** (Deutsch) – auch nachträglich in der Abfrage.
11. **Beschreiben-Modus** („geh raus, beschreib das Gras“) mit optionalem Foto.
12. **Eigene Texte** (z. B. Liedtexte, die er selbst einfügt): Claude übersetzt Zeile/Wort für Wort, Redewendungen erklärt.
13. **Heute zuerst** (feste Regeln, keine KI) + **gelernte Wörter anhören** (Hör-Abfrage).
14. **Shadowing-Takt**: Einzähl-Balken 3·2·1, Wort-Markierung, „Jetzt du“-Pause.
15. **Schwierige Sätze** in Hören/Shadowing aus den Satz-Abfrage-Bewertungen; Bewertung bleibt nur in der Satz-Abfrage.

16. **Texte in Sätze ordnen**: kopierte Liedzeilen brechen mitten im Satz um; Claude liefert nur Wort-Indizes für Satzanfänge (`segmentText()`), Text bleibt unverändert. Läuft automatisch beim Speichern (danach Übersetzung), `mergeFragments()` hängt Bruchstücke an, Neu-Ordnen immer vom Original. Manuelles ⤴/✂ wieder entfernt (Nutzer: umständlich, erzeugte nur mehr Bruchstücke).
17. **Wörter aus Sätzen**: neue Vokabeln aus geübten (v. a. schwierigen) Sätzen vorgezogen, Wort-Hilfe in der Satz-Abfrage (`wordsInSentence()`, Stamm + erlaubte Endungen, Namen nur exakt). Anlass: er bleibt an einzelnen unbekannten Wörtern im Satz hängen.
18. **Jugend-Modus + Punkte/Abzeichen/Wochenrückblick**: für seine 14-jährige Tochter (eigenes Handy, lernt IT + EN, soll KI-Gespräche nutzen; Vater klärt Anthropic-Regeln für Minderjährige und nutzt eigenen Schlüssel mit Limit für sie). `TEEN_RULES` im Prompt, `data/teen.js`; Punkte gleich für jede Bewertung (ehrliches „Nochmal“), Serie mit 2 Jokern/Woche. Später angedacht: Duell/Familienziel (bräuchte Server oder geteilte Wochenkarte).
19. **Rückrichtung + Hör-Check**: Wörter auch Zielsprache → Deutsch, als Hören (SRS-IDs `r:<Wort-ID>`, erst ab Abstand ≥ 3 Tage in der Hauptrichtung, 15 neue/Tag – Kompromiss, damit sich die Abfragen nicht verdoppeln). Sätze IT → DE nur als Hör-Check ohne Bewertung (Nutzer fand eigene Satz-Abfrage in Gegenrichtung wenig sinnvoll).
20. **Hör-Dialoge**: Claude schreibt Alltagsszenen mit mehreren Personen auf seinem Niveau (`createStory()`, `listenStories()`); gespeichert als Text mit `story` und `sp` pro Zeile, Stimmen pro Sprecher über `storyVoice()`: Nutzer ordnet Gerätestimmen Mann/Frau zu (`settings.voiceGender`, Anlass: Mann sprach mit Frauenstimme), sonst Tonhöhe. Wortwahl teils über seinem Wortschatz – laut Nutzer vorerst ok. Wie echte Gerätestimmen klingen, ist ungetestet.

## Bewusst nicht gemacht / abgelehnt
- KI-Übersetzung für eigene Sprachinseln (manuell gewünscht), Emoji-Bilder, KI-Merkbild als Text, Prüfknopf „Klingt komisch?“.
- Sprachaufnahme der eigenen Stimme als Eselsbrücke (Text-Diktat gebaut; Audio wäre möglich, nicht angefragt).
- Fotos im Sync/Backup (zu groß).

## Nicht real getestet (nur mit nachgebauten APIs/Browser-Funktionen)
Echte Claude-API, echtes Mikrofon/Kamera, Gerätestimmen (Wortgrenzen-Ereignisse beim Shadowing), echtes GitHub-Gist. Rückmeldungen des Nutzers dazu ernst nehmen.

## Tests
`lernen/tests/run-all.sh` – Playwright-Tests je Funktion; Claude- und GitHub-API, Spracherkennung und Sprachausgabe werden darin simuliert (keine Kosten). Testtexte sind selbst ausgedacht – keine geschützten Texte verwenden.

## Veröffentlichen
Bisher: Arbeit auf einem Branch, Pull Request nach `main`, sofort gemergt (der Nutzer will die App direkt nutzen). GitHub Pages baut `main` automatisch. Vor jeder Arbeit `git pull`; nicht parallel im Web und im Terminal ändern.
