# Sprachtraining Italienisch & Englisch

Web-App (PWA) nach dem Ansatz „Vokabeln zuerst, Active Recall, Shadowing, Sprachinseln“. Läuft offline, Daten liegen lokal im Browser.

## Start: Satzbaukasten
Für die ersten Wochen: feste Satzmuster über dich selbst (Modalverb + Infinitiv, „Ich bin …“ mit m/w-Endung, „Ich mag …“, Grundfragen mit Rückfrage „E tu?“ / „And you?“). Eigene Verben lassen sich einsetzen. Der Drill erzeugt zufällige Sätze zum lauten Bilden; gute Sätze wandern per ➕ in die Insel „Satzbaukasten“ und damit in Wiederholung und Shadowing.

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
