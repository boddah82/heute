"use client";

import { useMemo, useState } from "react";

const FACTORS = [
  { id: "tissue", label: "Gewebebelastung", hint: "Wie stark war die körperliche Belastung?" },
  { id: "stress", label: "Stress", hint: "Wie angespannt/gestresst bist Du gerade?" },
  { id: "sleep", label: "Schlafmangel", hint: "Wie ausgeruht bist Du (0 = ausgeruht, 10 = übermüdet)?" },
  { id: "fear", label: "Bewegungsangst", hint: "Wie viel Sorge hast Du, dass Bewegung schadet?" },
] as const;

type FactorId = (typeof FACTORS)[number]["id"];

function volumeColor(v: number) {
  if (v <= 3) return "bg-emerald-500";
  if (v <= 6) return "bg-amber-500";
  return "bg-red-500";
}

export default function PainMixer() {
  const [values, setValues] = useState<Record<FactorId, number>>({
    tissue: 2,
    stress: 2,
    sleep: 2,
    fear: 2,
  });

  const total = useMemo(
    () => (values.tissue + values.stress + values.sleep + values.fear) / 4,
    [values]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900">Schmerz-Mischpult</h3>
        <p className="text-sm text-slate-600 mt-1">
          Schmerz entsteht nicht nur durch Gewebebelastung. Stress, Schlafmangel und Bewegungsangst
          können die &quot;Lautstärke&quot; des Schmerzsystems mit erhöhen – auch wenn das Gewebe kaum
          belastet ist. Schieb die Regler und beobachte den Gesamtpegel unten.
        </p>
      </div>

      <div className="space-y-4">
        {FACTORS.map((f) => (
          <div key={f.id}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">{f.label}</label>
              <span className="text-sm font-semibold text-slate-900 tabular-nums">{values[f.id]}/10</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={values[f.id]}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: Number(e.target.value) }))}
              className="w-full h-2 rounded-lg cursor-pointer accent-teal-700"
            />
            <p className="text-xs text-slate-400 mt-0.5">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-900">Gesamtpegel (Master Volume)</span>
          <span className="text-sm font-bold text-slate-900 tabular-nums">{total.toFixed(1)}/10</span>
        </div>
        <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all ${volumeColor(total)}`}
            style={{ width: `${(total / 10) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Diese Darstellung ist eine vereinfachte Veranschaulichung (Durchschnitt aus allen vier
          Reglern), keine medizinische Berechnung. Sie soll zeigen: Auch wenn die Gewebebelastung
          niedrig ist, kann der Gesamtpegel durch andere Einflüsse hoch bleiben – und umgekehrt lässt
          er sich absenken, ohne die Belastung zu verändern.
        </p>
      </div>
    </div>
  );
}
