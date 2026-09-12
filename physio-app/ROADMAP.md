# Roadmap / Backlog

Ideen, die bewusst zurückgestellt wurden, damit sie nicht verloren gehen.

## LLM-Trainingscoach (zurückgestellt, Stand: Modul-2-Ausbau)

Idee: Statt eines regelbasierten Rechners entscheidet ein Sprachmodell im Dialog,
welche Stellschraube (Übungswechsel, Modifikation, Streichen, Schmerz tolerieren)
für das aktuelle Trainingsziel (Kraft/Hypertrophie/Athletik) und den aktuellen
Schmerz am sinnvollsten ist.

Warum zurückgestellt: Anders als die aktuelle App (rein clientseitig, keine
Serverkosten) würde das laufende API-Kosten pro Anfrage verursachen. Außerdem
braucht ein Gesundheits-Use-Case vorherige Absicherung der Empfehlungen
(keine falschen Sicherheiten, keine riskanten Vorschläge), bevor er live geht.

Erste Wahl stattdessen: regelbasierte Variante (siehe Tab "Rechner",
`lib/trainingGoals.ts`) für die 2-3 häufigsten Zielsituationen. Wenn diese zu
unübersichtlich wird oder mehr Nuancen (z. B. individuelle Ziel-Abwägung,
freies Nachfragen) gebraucht werden, ist das der Punkt, an dem sich ein
LLM-Coach lohnen könnte.

Technische Eckpunkte für später (aus Konversation mit dem Nutzer):
- Modell: kleines/günstiges Modell (z. B. Haiku) für Kosten, Prompt Caching
  für wiederkehrenden Kontext (Trainierenden-Profil, Trainingsziel).
- Kein Automatismus ohne Kostenbewusstsein: jeder echte Modellaufruf kostet,
  auch mit Caching – das ist keine Einmalinvestition.
- Würde vermutlich als eigenständige Ausbaustufe mit eigener
  Kosten-/Sicherheits-Prüfung entstehen, nicht als einfache Erweiterung des
  bestehenden Rechners.
