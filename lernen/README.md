# Sprachtraining Italienisch & Englisch

Web-App (PWA) nach dem Ansatz „Vokabeln zuerst, Active Recall, Shadowing, Sprachinseln“. Läuft offline, Daten liegen lokal im Browser.

## Start: Satzbaukasten
Für die ersten Wochen: feste Satzmuster über dich selbst (Modalverb + Infinitiv, „Ich bin …“ mit m/w-Endung, „Ich mag …“, Grundfragen mit Rückfrage „E tu?“ / „And you?“). Eigene Verben lassen sich einsetzen. Der Drill erzeugt zufällige Sätze zum lauten Bilden; gute Sätze wandern per ➕ in die Insel „Satzbaukasten“ und damit in Wiederholung und Shadowing.

## Niveau
Einstufungstest (~5 Min.) über sechs Häufigkeitsstufen der Wortliste; sicher gewusste Stufen werden als bekannt übernommen und verteilt nachgeprüft. Danach grobe Stufe A0–B2 anhand der sicheren Wörter (kein offizielles Niveau). Die Zahl neuer Wörter pro Tag passt sich an Trefferquote und Rückstand an (abschaltbar).

## Gespräche (Claude)
Freie Gespräche oder Rollenspiele (Café, Weg fragen, Hotel …) per Sprache. Claude antwortet auf deinem Niveau mit deinen bekannten Wörtern, liest vor, korrigiert und liefert am Ende eine Auswertung mit Sätzen für die Insel „Gespräche“. Braucht einen eigenen API-Schlüssel (console.anthropic.com, Prepaid, Limit setzen); Schlüssel bleibt nur im Browser. Kostenschätzung in der App.

## Fotos & Eselsbrücken
Zu jedem Wort und jedem Inselsatz lässt sich ein eigenes Foto speichern (Kamera oder Galerie, verkleinert, nur auf diesem Gerät – nicht im Sync/Backup). Eselsbrücken lassen sich auf Deutsch einsprechen.

## Beschreiben (Claude)
Modus „🔎 Beschreiben“ unter Reden: Claude gibt eine Aufgabe („Such etwas Grünes und beschreib es“), du beschreibst in 2–3 Sätzen, Claude korrigiert und fragt nach. Optional mit Foto (📷).

## Eigene Texte
Unter Inseln → „📄 Texte“: eigene Texte einfügen (z. B. Liedtexte zum Mitlesen). Claude übersetzt Zeile für Zeile, Wort für Wort und erklärt Redewendungen (einmalige Kosten pro Text). Vorlesen mit Markierung, Wörter in die Wortliste übernehmen, einzelne Zeilen per ➕ in die Insel „Texte“ (Wiederholung & Shadowing).
Beim Speichern wird automatisch in ganze Sätze geordnet: Claude setzt kopierte Liedzeilen an echten Satzgrenzen neu zusammen (nur Wort-Nummern, der Wortlaut bleibt), übrig gebliebene Bruchstücke (≤ 2 Wörter) werden angehängt, dann wird übersetzt. Ohne Schlüssel nur Teilung an Satzzeichen. „🔄 Neu ordnen“ geht immer vom Originaltext aus; „↩ Ursprüngliche Zeilen“ stellt ihn wieder her.

## Grammatik
Inseln → „📐 Grammatik“: feste Reihenfolge (IT 29, EN 28 Lektionen, `data/grammar.js`), ein Muster pro Lektion, aufgebaut wie Training statt Vortrag:
1. **Hör hin und schau genau** – 6 ähnliche Sätze, in denen sich nur eins ändert (markiert), dazu die Frage „Was ändert sich?“; die Auflösung (Regel in 2–3 Sätzen) erst auf Tipp.
2. **Jetzt du** – 8 Spielformen: Satz umbauen („Sag es für ‚du‘“), Auswahl, Übersetzen; jede mit kurzer Erklärung und „❓ Warum?“.
3. **❓ Frag nach** – eigene Frage tippen oder sprechen, Claude antwortet zur Lektion (≈ 1–2 Cent); Fragen bleiben gespeichert.

Claude schreibt eine Lektion einmal (grob 5–10 Cent, Schätzung), danach gespeichert (auch im Sync). Ab 6/8 richtig geschafft. Fachwörter (Vokal, Verb, Plural …) bekommen beim ersten Vorkommen eine einfache Erklärung in Klammern (abschaltbar).

## Wochen-Check
Wochenrückblick → „📝 Wochen-Check“: ca. 15 Auswahlfragen ohne KI – Wörter (Deutsch → Zielsprache), Wörter hören, Sätze verstehen, Grammatik aus geschafften Lektionen. Ergebnis pro Bereich, Vergleich mit der Vorwoche; „Das kannst du jetzt“ mit sicheren Wörtern, Sätzen, Grammatik. „Heute zuerst“ schlägt ihn ab Samstag vor.

## Wortpakete
Wörter → Neu: Auswahl „Häufigste Wörter zuerst“ oder ein Paket nach Situation (Begrüßung, Smalltalk, Zeit, Unterwegs, Einkaufen, Essen, Arbeit, Notfall; im Jugend-Modus Schule statt Arbeit, ohne Alkohol). `data/packs.js`; vorhandene Wörter werden wiederverwendet, fehlende als eigene Wörter angelegt.

## Heute zuerst
Karte oben auf „Heute“: 2–3 empfohlene Schritte in lerngerechter Reihenfolge, nach festen Regeln (keine KI): fällige Wiederholungen vor Neuem, höchstens 50 Wort-Wiederholungen pro Runde (Rückstand nach Pausen verteilen statt nachholen), lange vernachlässigte Sprech-Schritte (Sätze, Shadowing, Gespräch) nach vorn, neue Wörter bei großem Rückstand aussetzen.

## Gelernte Wörter anhören
Hören → „🧠 Gelernte Wörter“: Hör-Abfrage (Deutsch → Pause zum Selbst-Sagen → Lösung, zweimal) oder Anhören & Nachsprechen; schwierige Wörter zuerst, zuletzt geübte oder alle gemischt.

## Prüfen (Claude)
„🔍 Prüfen“ nach dem Aufdecken in der Satz-Abfrage, in der Wort-Abfrage und bei neuen Wörtern (≈ 1–3 Cent, Schätzung). Sätze: korrekt und natürlich? Deutsch passend? Vorschlag per „Übernehmen“, dazu Wort für Wort mit der Bedeutung im Satz (z. B. sei = bist-du statt sechs) – wird gespeichert und ersetzt danach die Wortlisten-Hilfe. Wörter: Übersetzung richtig? Weitere Bedeutungen/gleich geschriebene Wörter.

## Rückrichtung & Hör-Check
- Wörter → „Verstehen“: Wort hören → Bedeutung auf Deutsch sagen → aufdecken, bewerten. Eigene Wiederholungsplanung; ein Wort kommt erst dazu, wenn es in der Hauptrichtung (Deutsch → Zielsprache) sitzt (≥ 3 Tage Abstand). Höchstens 15 neue pro Tag, 30 pro Runde.
- Hören → Wörter: zusätzlich „Wort hören → Bedeutung sagen → Deutsch“ als Schleife.
- Hören → „👂 Hör-Check“: Satz nur hören, verstanden? Deutsch aufdecken. Ohne Bewertung/Planung; am Ende die nicht verstandenen Sätze zum Wiederholen.

## Hör-Dialoge (Claude)
Hören → „🎭 Dialoge“: Claude schreibt eine Alltagsszene (Café, Markt, Telefonat … oder eigene Situation) mit 2–4 Personen, optional mit Erzähler, auf deinem Niveau (Stufe aus den sicheren Wörtern, bekannte Wörter als Orientierung; natürliche Sprache geht vor). Mit Übersetzung, Wort-für-Wort und Erklärungen in einem Aufruf (grob 5–15 Cent, Schätzung). Wiedergabe mit eigener Gerätestimme pro Person: Unter „🗣️ Stimmen zuordnen“ einmal jede Gerätestimme anhören und Mann/Frau zuordnen (der Browser liefert das Geschlecht nicht). Fehlt eine passende Stimme, wird die Person über die Tonhöhe unterschieden. „Text verbergen“ zum reinen Hören, „🔁 Schleife“ für Dauerwiedergabe (gilt für alle Texte). Dialoge liegen bei den Texten (Zeilen per ➕ in die Wiederholung).

## Schwierige Sätze hören & shadowen
In Hören und Shadowing ist „⭐ Schwierige Sätze“ der Standard: Sätze, die in der Satz-Abfrage noch nicht sitzen (oft „Nochmal“/„Schwer“, kurze Abstände), schlechteste zuerst; sicher gekonnte (≥ 3 Wochen Abstand) fehlen. Bewertet wird nur in der Satz-Abfrage.

## Wörter aus deinen Sätzen
Neue Vokabeln kommen nicht stur nach Häufigkeit: Wörter der Wortliste, die in Sätzen vorkommen, die du gerade übst, werden vorgezogen – schwierige Sätze zuerst (Karte zeigt „aus deinem Satz“). Nach dem Aufdecken in der Satz-Abfrage zeigt die Wort-Hilfe die Wörter des Satzes, die noch nicht sicher sitzen. Erkennung über den Wortstamm (bicchieri → bicchiere); unregelmäßige Formen (sono → essere) werden nicht erkannt.

## Punkte, Abzeichen, Wochenrückblick
Punkte fürs Abrufen (gleich viel für jede Bewertung), neue Wörter, Drill, Shadowing, Gespräche, je Lernminute und +20 fürs Tagesziel; Ränge von 🌱 Neuling bis 👑 Meister(in); 16 Abzeichen für Meilensteine. Serie mit 2 Jokern pro Woche, Tagesziel einstellbar. Wochenrückblick mit Vorwochenvergleich und „Teilen“ (z. B. WhatsApp).

## Jugend-Modus
Einstellungen → „Über dich“: altersgerechte Regeln für Claude, Gesprächsthemen für Jugendliche (Schule, Hobbys, Eisdiele, Austauschschülerin …), Vorlage-Inseln „Über mich (Jugend)“, „Schule“, „Freunde & Freizeit“ (IT + EN), Satzbaukasten ohne „verheiratet“/Wein/Kaffee.

## Eltern-Sperre
Einstellungen → „👪 Eltern-Sperre“ mit PIN: KI-Gespräche (Reden) aus, Jugend-Modus fest an. Hör-Dialoge, Prüfen und Texte bleiben (mit Schlüssel unter `#talk/setup`). Nur auf diesem Gerät; die PIN wird nur als Hash gespeichert. Wer die Browserdaten löscht, löscht auch die Sperre.

## Tagesablauf (~30 Min.)
1. **Wörter** – neue Wörter mit eigener Eselsbrücke, danach Abfrage (Deutsch → Zielsprache) mit Wiederholungsplanung (SM-2).
2. **Sätze** – Sätze aus den Sprachinseln aktiv abrufen (sprechen, tippen oder im Kopf), aufdecken, bewerten.
3. **Hören** – Inseln in Schleife per Sprachausgabe; Zeit für Podcasts/Serien manuell eintragen.
4. **Shadowing** – anhören, nachsprechen, aufnehmen, vergleichen; optional Abgleich per Spracherkennung.
5. **Inseln** – eigene Sätze pro Thema anlegen (Deutsch + Übersetzung), auch als Liste einfügbar.

## Nutzung
- Hosting über GitHub Pages (Repo-Einstellungen → Pages → Branch wählen), dann `…/lernen/` öffnen und „Zum Startbildschirm hinzufügen“.
- Aufnahme und Spracherkennung brauchen HTTPS. Spracherkennung: Chrome/Edge/Safari; in Chrome nur online.
- Die Aussprache kommt aus den Stimmen des Geräts – ggf. italienische/englische Stimme im System installieren.
- Sync zwischen Geräten: Einstellungen → „Sync“ mit einem GitHub-Token (classic, nur Scope `gist`). Die Daten liegen als privates Gist in deinem Konto; zusammengeführt wird pro Eintrag nach Zeitstempel.
- Ohne Sync: Backup unter Einstellungen exportieren/importieren.

## Wortlisten
Je ~1500 Wörter (Italienisch, Englisch britisch), sortiert nach Häufigkeit laut [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (MIT). Die Übersetzungen sind ohne Wörterbuchabgleich erstellt – falsche Einträge in der App mit ✎ korrigieren.

## Import-Format
Eine Zeile pro Eintrag: `Zielsprache | Deutsch` (auch `;` oder Tab).
