"use client";

import { useState } from "react";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Worum geht es?",
    body: "Diese App hilft dabei, den Zusammenhang zwischen Belastung (Reiz) und Schmerzreaktion sichtbar zu machen – statt zu raten, ob eine Aktivität zu viel war, siehst Du es anhand Deiner eigenen Verlaufsdaten.",
  },
  {
    title: "Bereich wählen",
    body: "Oben wählst Du den Körperbereich, um den es geht (z. B. Knie, Rücken, Sehne). Jeder Bereich hat seinen eigenen, getrennten Verlauf.",
  },
  {
    title: "Tab \"Heute\" – Check-in",
    body: "Trage nach einer Aktivität (Training, aber auch Alltag wie langes Sitzen) ein: was Du gemacht hast, wie stark der Schmerz direkt davor und direkt danach war (0 = kein Schmerz, 10 = maximaler Schmerz). Dauert etwa 30 Sekunden.",
  },
  {
    title: "Tab \"Rechner\"",
    body: "Gib den Schmerz während einer Übung ein und erhalte eine Empfehlung für die Trainingsanstrengung (RPE/RIR). Liegt der Schmerz über 5, kommt statt einer Steigerung eine Warnung mit Anpassungsvorschlag.",
  },
  {
    title: "Tab \"Verlauf\" – Ampel-Feedback",
    body: "Jeder Eintrag bekommt automatisch eine Ampel-Bewertung in drei Punkten: Intensität (wie hoch war der Schmerz), Anstieg (wie stark ist er durch die Aktivität gestiegen) und Erholung (wie schnell war er wieder auf dem Ausgangsniveau). Grün = Belastung kann gesteigert werden, Gelb = Belastung halten und beobachten, Rot = Belastung anpassen/reduzieren. Trage 24 und 48 Stunden später den Schmerz über \"Verlauf nachtragen\" nach – erst dann ist die Erholungs-Ampel vollständig.",
  },
  {
    title: "Tab \"Bereiche\" – PDDM-Einschätzung",
    body: "Eine kurze Fragerunde (ca. alle 4 Wochen sinnvoll), die zeigt, ob neben der reinen Belastung auch andere Bereiche eine Rolle spielen könnten (z. B. Nervensystem, Stimmung, Arbeitsumfeld). Es gibt keine Punktzahl, nur eine Einordnung je Bereich. Ersetzt keine ärztliche oder therapeutische Diagnose.",
  },
  {
    title: "Tab \"Wissen\"",
    body: "Interaktive Hintergrundinfos zum Thema Schmerz: das Schmerz-Mischpult zeigt, wie Stress, Schlaf und Bewegungsangst die Schmerzwahrnehmung mitbeeinflussen können, ein Abschnitt zu Bildgebungsbefunden (MRT) und einer zum sogenannten Stabilisations-Paradoxon.",
  },
  {
    title: "Daten exportieren",
    body: "Erzeugt eine Text-Übersicht all Deiner Einträge, die Du kopieren und z. B. per WhatsApp oder E-Mail an Deine Therapeutin/Deinen Therapeuten schicken kannst.",
  },
  {
    title: "Datenschutz",
    body: "Alle Daten werden ausschließlich lokal in Deinem Browser gespeichert – es gibt keinen Server und keinen automatischen Zugriff durch Dritte. Löschst Du die Browserdaten oder wechselst das Gerät, sind die Einträge weg, außer Du hast sie vorher exportiert.",
  },
  {
    title: "\"Demo-Patient laden\"",
    body: "Nur zu Testzwecken gedacht: lädt Beispiel-Verlaufsdaten in den Bereich \"Sehne\" und überschreibt dort vorhandene Einträge. Für den eigenen echten Verlauf nicht nötig.",
  },
];

export default function HelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Hilfe anzeigen"
        className="w-6 h-6 rounded-full border border-teal-100 text-teal-100 text-xs font-semibold flex items-center justify-center shrink-0"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Hilfe</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 text-sm">
                Schließen
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {SECTIONS.map((s) => (
                <div key={s.title}>
                  <p className="text-sm font-semibold text-slate-900 mb-1">{s.title}</p>
                  <p className="text-sm text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
