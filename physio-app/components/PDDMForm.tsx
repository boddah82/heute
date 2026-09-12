"use client";

import { useState } from "react";
import { PDDM_QUESTIONS, evaluatePDDM } from "@/lib/pddm";
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
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <div>
        <h2 className="font-semibold text-slate-900">Bereichs-Einschätzung (PDDM)</h2>
        <p className="text-sm text-slate-500 mt-1">
          10 kurze Fragen, ca. alle 4 Wochen sinnvoll. Es gibt kein &quot;richtig&quot; oder &quot;falsch&quot; –
          die Antworten helfen nur dabei zu sehen, welche Bereiche neben der reinen Belastung noch eine Rolle spielen könnten.
        </p>
      </div>

      {PDDM_QUESTIONS.map((q) => (
        <label key={q.id} className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(answers[q.id])}
            onChange={() => toggle(q.id)}
            className="mt-1 h-4 w-4 accent-teal-700"
          />
          <span>{q.text}</span>
        </label>
      ))}

      <button
        type="submit"
        className="w-full rounded-xl bg-teal-700 text-white font-semibold py-2.5 text-sm hover:bg-teal-800 transition"
      >
        Auswertung anzeigen
      </button>
    </form>
  );
}
