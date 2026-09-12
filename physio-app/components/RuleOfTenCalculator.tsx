"use client";

import { useMemo, useState } from "react";
import { calculateRuleOfTen } from "@/lib/ruleOfTen";

export default function RuleOfTenCalculator() {
  const [pain, setPain] = useState(2);
  const result = useMemo(() => calculateRuleOfTen(pain), [pain]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900">Trainingsintensität (&quot;Rule of 10&quot;)</h3>
        <p className="text-sm text-slate-600 mt-1">
          Passt die empfohlene Trainingsanstrengung an Deinen aktuellen Schmerz während der Übung
          an. Eiserne Regel: Der Schmerz während der Übung sollte nie über 5 von 10 liegen.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-slate-700">Schmerz während der Übung</label>
          <span className="text-sm font-semibold text-slate-900 tabular-nums">{pain}/10</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          value={pain}
          onChange={(e) => setPain(Number(e.target.value))}
          className="w-full h-2 rounded-lg cursor-pointer accent-teal-700"
        />
      </div>

      {result.isOverPainThreshold ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-red-800">
            Schmerz liegt im roten Bereich (&gt;5). Belastung jetzt reduzieren.
          </p>
          <p className="text-sm text-red-700">{result.recommendedAction}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-teal-800">{result.maxAllowedRPE}</p>
              <p className="text-xs text-teal-900">Max. RPE (0–10)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-800">{result.targetRIR}</p>
              <p className="text-xs text-teal-900">RIR (Wiederholungen im Tank)</p>
            </div>
          </div>
          <p className="text-sm text-teal-900">{result.recommendedAction}</p>
        </div>
      )}

      <p className="text-xs text-slate-400">
        RPE = wahrgenommene Anstrengung (10 = Muskelversagen, 0 Reps in Reserve). RIR = wie viele
        Wiederholungen zusätzlich noch möglich wären. Ersetzt keine individuelle Trainingsplanung.
      </p>
    </div>
  );
}
