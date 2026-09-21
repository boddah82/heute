"use client";

import { useState } from "react";
import { PDDM_QUESTIONS, PDDM_DOMAINS, PDDM_DOMAIN_LABELS, PDDM_DOMAIN_HINTS, evaluatePDDM } from "@/lib/pddm";
import { PDDMAssessment } from "@/lib/types";

interface Props {
  regionId: string;
  onSubmit: (assessment: Omit<PDDMAssessment, "id" | "createdAt">) => void;
  onDone: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PDDMForm({ regionId, onSubmit, onDone }: Props) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const results = evaluatePDDM(answers);
    onSubmit({ regionId, date: today(), answers, results });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg p-5 shadow-sm border border-slate-200">
      <div>
        <h2 className="font-semibold text-slate-900">Bereichs-Einschätzung (PDDM)</h2>
        <p className="text-sm text-slate-500 mt-1">
          10 kurze Fragen, ca. alle 4 Wochen sinnvoll. Es gibt kein &quot;richtig&quot; oder &quot;falsch&quot; –
          die Antworten helfen nur dabei zu sehen, welche Bereiche neben der reinen Belastung noch eine Rolle spielen könnten.
        </p>
      </div>

      {PDDM_DOMAINS.map((domain) => (
        <div key={domain} className="space-y-2.5 pt-3 border-t border-slate-100 first:pt-0 first:border-t-0">
          <div>
            <p className="text-sm font-semibold text-slate-900">{PDDM_DOMAIN_LABELS[domain]}</p>
            <p className="text-xs text-slate-500">{PDDM_DOMAIN_HINTS[domain]}</p>
          </div>
          {PDDM_QUESTIONS.filter((q) => q.domain === domain).map((q) => (
            <label key={q.id} className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(answers[q.id])}
                onChange={() => toggle(q.id)}
                className="mt-1 h-4 w-4 accent-brand-700"
              />
              <span>{q.text}</span>
            </label>
          ))}
        </div>
      ))}

      <button
        type="submit"
        className="w-full rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition"
      >
        Auswertung anzeigen
      </button>
    </form>
  );
}
