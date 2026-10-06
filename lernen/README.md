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
„🤖 In Sätze ordnen“: Claude teilt kopierte Liedzeilen an echten Satzgrenzen neu auf (auch mitten in einer Zeile; nur Wort-Nummern, der Wortlaut bleibt). Von Hand: ⤴ verbinden, ✂ teilen, ↩ Ursprüngliche Zeilen.

## Heute zuerst
Karte oben auf „Heute“: 2–3 empfohlene Schritte in lerngerechter Reihenfolge, nach festen Regeln (keine KI): fällige Wiederholungen vor Neuem, höchstens 50 Wort-Wiederholungen pro Runde (Rückstand nach Pausen verteilen statt nachholen), lange vernachlässigte Sprech-Schritte (Sätze, Shadowing, Gespräch) nach vorn, neue Wörter bei großem Rückstand aussetzen.

## Gelernte Wörter anhören
Hören → „🧠 Gelernte Wörter“: Hör-Abfrage (Deutsch → Pause zum Selbst-Sagen → Lösung, zweimal) oder Anhören & Nachsprechen; schwierige Wörter zuerst, zuletzt geübte oder alle gemischt.

## Schwierige Sätze hören & shadowen
In Hören und Shadowing ist „⭐ Schwierige Sätze“ der Standard: Sätze, die in der Satz-Abfrage noch nicht sitzen (oft „Nochmal“/„Schwer“, kurze Abstände), schlechteste zuerst; sicher gekonnte (≥ 3 Wochen Abstand) fehlen. Bewertet wird nur in der Satz-Abfrage.

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
