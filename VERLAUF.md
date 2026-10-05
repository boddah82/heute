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
