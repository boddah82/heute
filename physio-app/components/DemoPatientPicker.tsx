"use client";

import { useState } from "react";
import { DEMO_PATIENTS, buildDemoPatientData } from "@/lib/demoPatients";
import { seedDemoData } from "@/lib/storage";

interface Props {
  onLoaded: (regionId: string) => void;
}

export default function DemoPatientPicker({ onLoaded }: Props) {
  const [open, setOpen] = useState(false);

  function load(patientId: (typeof DEMO_PATIENTS)[number]["id"]) {
    const patient = DEMO_PATIENTS.find((p) => p.id === patientId)!;
    const confirmed = window.confirm(
      `Demo-Daten für "${patient.label}" laden? Bestehende Einträge im Bereich "Sehne" werden dabei ersetzt.`
    );
    if (!confirmed) return;

    const { checkIns, pddm } = buildDemoPatientData(patient, "sehne");
    seedDemoData("sehne", checkIns, pddm);
    setOpen(false);
    onLoaded("sehne");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-teal-100 underline underline-offset-2"
      >
        Demo-Patient laden
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-lg border border-slate-200 p-2 z-10 text-slate-800">
          <p className="text-xs text-slate-500 px-2 py-1">
            Simulierte Verlaufsdaten (patellare Tendinopathie) zum Ausprobieren.
          </p>
          {DEMO_PATIENTS.map((p) => (
            <button
              key={p.id}
              onClick={() => load(p.id)}
              className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50"
            >
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-slate-500">{p.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
