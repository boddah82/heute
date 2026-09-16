"use client";

import { useMemo, useState } from "react";
import { TRAINING_GOALS, TrainingGoal, getGoalGuidance } from "@/lib/trainingGoals";

export default function RuleOfTenCalculator() {
  const [goal, setGoal] = useState<TrainingGoal>("kraft");
  const [pain, setPain] = useState(2);
  const guidance = useMemo(() => getGoalGuidance(goal, pain), [goal, pain]);

  const isRed = guidance.ruleOfTen?.isOverPainThreshold ?? false;
  const isCaution = !isRed && guidance.leavesGoalRange;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900">Trainingsanpassung (&quot;Rule of 10&quot;)</h3>
        <p className="text-sm text-slate-600 mt-1">
          Passt die Empfehlung an Dein Trainingsziel und Deinen aktuellen Schmerz an. Eiserne Regel:
          Der Schmerz während der Übung sollte nie über 5 von 10 liegen.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">Trainingsziel</label>
        <div className="flex gap-2 flex-wrap">
          {TRAINING_GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGoal(g.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                goal === g.id ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">{TRAINING_GOALS.find((g) => g.id === goal)?.hint}</p>
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
          className="w-full h-2 rounded-lg cursor-pointer accent-brand-700"
        />
      </div>

      <div
        className={`rounded-lg border p-4 space-y-3 ${
          isRed
            ? "bg-red-50 border-red-200"
            : isCaution
            ? "bg-amber-50 border-amber-200"
            : "bg-brand-50 border-brand-100"
        }`}
      >
        {guidance.ruleOfTen && !isRed && (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-800">{guidance.ruleOfTen.maxAllowedRPE}</p>
              <p className="text-xs text-brand-900">Max. RPE (0–10)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-800">{guidance.ruleOfTen.targetRIR}</p>
              <p className="text-xs text-brand-900">RIR (Wiederholungen im Tank)</p>
            </div>
          </div>
        )}

        <p className={`text-sm font-semibold ${isRed ? "text-red-800" : isCaution ? "text-amber-800" : "text-brand-900"}`}>
          {guidance.primaryLever}
        </p>
        <p className={`text-sm ${isRed ? "text-red-700" : isCaution ? "text-amber-700" : "text-brand-900"}`}>
          {guidance.explanation}
        </p>

        {guidance.alternativeLevers.length > 0 && (
          <div className="pt-2 border-t border-black/5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Alternative Stellschrauben</p>
            <ul className="text-sm space-y-1">
              {guidance.alternativeLevers.map((lever) => (
                <li key={lever} className={isRed ? "text-red-700" : "text-amber-700"}>
                  • {lever}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        RPE = wahrgenommene Anstrengung (10 = Muskelversagen, 0 Reps in Reserve). RIR = wie viele
        Wiederholungen zusätzlich noch möglich wären. Faustregeln, keine individuelle
        Trainingsplanung – im Zweifel mit Deiner Therapeutin/Deinem Therapeuten absprechen.
      </p>
    </div>
  );
}
