"use client";

import { useState } from "react";
import { DEMO_PATIENTS, buildDemoPatientData, DemoPatientDefinition } from "@/lib/demoPatients";
import { seedDemoData } from "@/lib/storage";

interface Props {
  onLoaded: (regionId: string) => void;
  variant?: "onDark" | "onLight";
}

export default function DemoPatientPicker({ onLoaded, variant = "onDark" }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DemoPatientDefinition | null>(null);

  function confirmLoad() {
    if (!pending) return;
    const { checkIns, pddm } = buildDemoPatientData(pending, "sehne");
    seedDemoData("sehne", checkIns, pddm);
    setPending(null);
    setOpen(false);
    onLoaded("sehne");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs font-medium underline underline-offset-2 ${
          variant === "onDark" ? "text-brand-100" : "text-brand-700"
        }`}
      >
        Demo-Patient laden
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg bg-white shadow-lg border border-slate-200 p-2 z-10 text-slate-800">
          {pending ? (
            <div className="p-2 space-y-2">
              <p className="text-sm">
                Demo-Daten für <span className="font-medium">&quot;{pending.label}&quot;</span> laden?
                Bestehende Einträge im Bereich &quot;Sehne&quot; werden dabei ersetzt.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmLoad}
                  className="flex-1 rounded-lg bg-brand-700 text-white text-sm font-medium py-1.5"
                >
                  Ja, laden
                </button>
                <button
                  onClick={() => setPending(null)}
                  className="flex-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium py-1.5"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 px-2 py-1">
                Simulierte Verlaufsdaten (patellare Tendinopathie) zum Ausprobieren.
              </p>
              {DEMO_PATIENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPending(p)}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50"
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.description}</p>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
