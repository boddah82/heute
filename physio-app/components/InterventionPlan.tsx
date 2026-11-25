"use client";

import { useState } from "react";
import { buildInterventions, InterventionInput } from "@/lib/interventions";

// Behandlungsvorschlag für die Therapeutin/den Therapeuten: geordnete
// Bausteine aus PDDM, Fragebögen und Zielen. Bewusst als Vorschlag
// formuliert – die Entscheidung bleibt beim Therapeuten.
export default function InterventionPlan(input: InterventionInput) {
  const [showReha, setShowReha] = useState(true);
  const items = buildInterventions(input);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-brand-200 dark:border-brand-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">Behandlungsvorschlag</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aus Bereichs-Einschätzung, Fragebögen und Zielen. Vorschlag zur Orientierung, keine Vorgabe.
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <input type="checkbox" checked={showReha} onChange={(e) => setShowReha(e.target.checked)} />
          Sucht-Reha
        </label>
      </div>

      {!input.pddm && (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Noch keine Bereichs-Einschätzung – die meisten Bausteine ergeben sich erst daraus.
        </p>
      )}

      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={item.id} className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {i + 1}. {item.title}
              </p>
              <span
                className={`text-xs font-medium rounded px-1.5 py-0.5 shrink-0 ${
                  item.who === "team"
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                    : "bg-brand-100 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100"
                }`}
              >
                {item.who === "team" ? "mit Team" : "selbst"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Weil: {item.reason}</p>
            <ul className="list-disc pl-5 space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
              {item.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            {showReha && item.rehaNote && (
              <p className="text-xs text-brand-800 dark:text-brand-200">Sucht-Reha: {item.rehaNote}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
