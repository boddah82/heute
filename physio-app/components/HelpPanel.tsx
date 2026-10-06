"use client";

import { useState } from "react";

type Section = { title: string; body: string };

const PATIENT_SECTIONS: Section[] = [
  {
    title: "So gehst Du vor",
    body: "1) Bereiche (PDDM): alle ca. 4 Wochen eine Einschätzung, zeigt mögliche Treiber neben der reinen Belastung. 2) Ziele (PSFS): wöchentlich bewerten, wie nah Du an Deinen 2-5 wichtigsten Aktivitäten bist. 3) Heute: bei jeder bewusst getesteten Belastung ein Check-in, danach im Verlauf-Tab den 24h/48h-Wert nachtragen (dafür erinnert Dich die App automatisch). Fragebögen nur bei Bedarf, meist einmalig am Anfang.",
  },
  {
    title: "Worum geht es?",
    body: "Diese App hilft dabei, den Zusammenhang zwischen Belastung (Reiz) und Schmerzreaktion sichtbar zu machen – statt zu raten, ob eine Aktivität zu viel war, siehst Du es anhand Deiner eigenen Verlaufsdaten.",
  },
  {
    title: "Bereich wählen",
    body: "Oben wählst Du den Körperbereich, um den es geht (z. B. Knie, Rücken, Sehne). Jeder Bereich hat seinen eigenen, getrennten Verlauf.",
  },
  {
    title: "Tab \"Bereiche\" – PDDM-Einschätzung",
    body: "Eine kurze Fragerunde (ca. alle 4 Wochen sinnvoll), die zeigt, ob neben der reinen Belastung auch andere Bereiche eine Rolle spielen könnten (z. B. Nervensystem, Stimmung, Arbeitsumfeld). Dazu ein paar Schmerzwerte (aktuell, bei maximaler Belastung, danach). Es gibt keine Punktzahl, nur eine Einordnung je Bereich. Ersetzt keine ärztliche oder therapeutische Diagnose.",
  },
  {
    title: "Tab \"Ziele\" (PSFS)",
    body: "Nenne 2-5 für Dich persönlich bedeutsame Aktivitäten oder Leistungsziele (z. B. \"Schraubglas aufschrauben\", \"Bouldern\", aber auch \"20 kg Kniebeuge\" oder \"5 km laufen\") – nicht was andere für wichtig halten. Bewerte wöchentlich auf einer Skala 0-10, wie nah Du daran bist, das (wieder) zu können. So siehst Du Fortschritt bei dem, was Dir wirklich wichtig ist, nicht nur beim Schmerzwert – und merkst auch, wenn Du Deine eigene Leistungsfähigkeit schlechter einschätzt, als sie ist.",
  },
  {
    title: "Tab \"Heute\" – Check-in",
    body: "Ein Belastungs-Tagebuch, kein Schmerz-Tagebuch: trage ein, wenn Du bewusst etwas belastet hast, das mit dem Bereich zu tun hat (Training, aber auch Alltag wie langes Sitzen) – nicht jeden Schmerz ohne erkennbaren Auslöser (Faustregel direkt im Formular unter \"Was trage ich hier ein?\"). Erfasst wird, was Du gemacht hast und wie stark der Schmerz direkt davor und direkt danach war (0 = kein Schmerz, 10 = maximaler Schmerz). Hast Du bereits Einträge in einer anderen Region, kannst Du optional vermerken, ob sich das für Dich damit verbunden anfühlt – Deine eigene Einschätzung, kein automatischer Befund. Dauert etwa 30 Sekunden.",
  },
  {
    title: "Tab \"Verlauf\" – Ampel-Feedback",
    body: "Jeder Eintrag bekommt automatisch eine Ampel-Bewertung in drei Punkten: Intensität (wie hoch war der Schmerz), Anstieg (wie stark ist er durch die Aktivität gestiegen) und Erholung (wie schnell war er wieder auf dem Ausgangsniveau). Grün = Belastung kann gesteigert werden, Gelb = Belastung halten und beobachten, Rot = Belastung anpassen/reduzieren. Trage 24 und 48 Stunden später den Schmerz über \"Verlauf nachtragen\" nach – die App erinnert Dich beim nächsten Öffnen des \"Heute\"-Tabs automatisch an offene Nachträge. Ab zwei Einträgen zeigt Dir oben ein Diagramm den Verlauf, plus eine Tendenz (rückläufig/gleichbleibend/steigend).",
  },
  {
    title: "Tab \"Rechner\"",
    body: "Wähle Dein Trainingsziel (Kraft, Hypertrophie oder Athletik/Sprünge) und gib den Schmerz während der Übung ein. Du bekommst eine passende Stellschraube vorgeschlagen – z. B. Gewicht reduzieren, Bewegungsumfang verringern, Übung wechseln oder auf eine Vorbereitungsübung ausweichen – statt nur eine RPE-Zahl.",
  },
  {
    title: "Tab \"Fragebögen\"",
    body: "Validierte Screening-Fragebögen (TSK zu Bewegungsangst, FESS zu funktioneller Selbstwirksamkeit, ÖREBRO zu Chronifizierungsrisiko). Üblich: einmalig bei der ersten Nutzung ausfüllen, Wiederholung nur bei deutlicher Veränderung oder auf Anraten Deiner Therapeutin/Deines Therapeuten – kein täglicher oder wöchentlicher Check.",
  },
  {
    title: "Tab \"Wissen\"",
    body: "Interaktive Hintergrundinfos zum Thema Schmerz: das Schmerz-Mischpult zeigt, wie Stress, Schlaf und Bewegungsangst die Schmerzwahrnehmung mitbeeinflussen können, ein Abschnitt zu Bildgebungsbefunden (MRT) und einer zum sogenannten Stabilisations-Paradoxon.",
  },
  {
    title: "Für Therapeutinnen/Therapeuten",
    body: "Über \"Therapeuten-Bereich\" oben rechts kommt man in die Mandanten-Verwaltung (separat von der eigenen Patientenansicht). Zwei Link-Richtungen: ein Trainingsplan wird dort erstellt und per Link an die Patientin/den Patienten geschickt (kein Live-Sync, bei Änderungen neuen Link schicken); umgekehrt schickt die Patientin/der Patient über \"Verlauf an Therapeut senden\" (siehe unten) einen Link zurück, der im Therapeuten-Bereich direkt importiert wird.",
  },
  {
    title: "Icon-Schnellauswahl",
    body: "Im Check-in kannst Du häufige Aktivitäten per Icon antippen, statt sie einzutippen – das Freitextfeld bleibt trotzdem für alles Individuelle nutzbar. Ist ein Plan geladen, erscheinen dessen Übungen zusätzlich oben als eigene Kacheln.",
  },
  {
    title: "Verlauf exportieren / an Therapeut senden",
    body: "Oben rechts: entweder als Link (Therapeutin/Therapeut öffnet ihn im Therapeuten-Bereich, Verlauf wird direkt übernommen) oder als Text zum Kopieren und selbst Verschicken, z. B. per WhatsApp oder E-Mail.",
  },
  {
    title: "Datenschutz",
    body: "Alle Daten werden ausschließlich lokal in Deinem Browser gespeichert – es gibt keinen Server und keinen automatischen Zugriff durch Dritte. Löschst Du die Browserdaten oder wechselst das Gerät, sind die Einträge weg, außer Du hast sie vorher exportiert.",
  },
];

const THERAPIST_SECTIONS: Section[] = [
  {
    title: "Mandanten",
    body: "Hier legst Du Mandantinnen/Mandanten an und wählst eine als aktiv aus. Für jede aktive Mandantin/jeden aktiven Mandanten gibt es zwei Ansichten: \"Daten eingeben\" (Du trägst direkt eine PDDM-Einschätzung, Ziele, Check-ins oder Fragebögen für sie/ihn ein, z. B. im Termin) und \"Übersicht\" (read-only Zusammenfassung über alle Regionen).",
  },
  {
    title: "Daten von der Patientin/dem Patienten erhalten",
    body: "Schickt Dir jemand per \"Verlauf an Therapeut senden\" einen Link, fügst Du ihn beim Anlegen/Importieren ein – der Verlauf wird direkt der jeweiligen Mandantin/dem jeweiligen Mandanten zugeordnet. Alternativ: \"Eigene Testdaten übernehmen\" kopiert den Tracking-Stand dieses Geräts (z. B. für eigene Testzwecke) in einen Mandanten-Datensatz.",
  },
  {
    title: "Plan erstellen",
    body: "Stellt einen Trainingsplan für eine Region zusammen und erzeugt daraus einen Link. Die Patientin/der Patient öffnet ihn auf dem eigenen Gerät, kein Konto nötig. Kein Live-Sync – bei Planänderungen neuen Link schicken.",
  },
  {
    title: "Testvorschau",
    body: "Lädt synthetische Demo-Verläufe (3 Beispielpatienten, Bereich \"Sehne\") – nur zum Ausprobieren der App, keine echten Daten.",
  },
  {
    title: "Datenschutz",
    body: "Auch Mandanten-Daten liegen nur lokal in diesem Browser, nicht auf einem Server. Das ist keine Zugriffskontrolle im eigentlichen Sinn – auf diesem Gerät kommt jede Person mit Zugriff auf den Browser an alle Mandanten-Daten.",
  },
];

export default function HelpPanel({ audience = "patient" }: { audience?: "patient" | "therapist" }) {
  const [open, setOpen] = useState(false);
  const sections = audience === "therapist" ? THERAPIST_SECTIONS : PATIENT_SECTIONS;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Hilfe anzeigen"
        className="w-6 h-6 rounded-full border border-brand-100 text-brand-100 text-xs font-semibold flex items-center justify-center shrink-0"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Hilfe</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 text-sm">
                Schließen
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {sections.map((s) => (
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
