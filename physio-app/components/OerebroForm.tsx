"use client";

import { useState } from "react";
import { OEREBRO_PAIN_SITES, OEREBRO_QUESTIONS, scoreOerebro, isOerebroComplete } from "@/lib/oerebro";

interface Props {
  onSubmit: (answers: Record<string, number | null>, totalScore: number) => void;
  onCancel: () => void;
}

export default function OerebroForm({ onSubmit, onCancel }: Props) {
  const [answers, setAnswers] = useState<Record<string, number | null>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOerebroComplete(answers)) return;
    onSubmit(answers, scoreOerebro(answers));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg p-5 shadow-sm border border-slate-200">
      <div>
        <h2 className="font-semibold text-slate-900">Örebro Musculoskeletal Pain Screening Questionnaire</h2>
        <p className="text-sm text-slate-500 mt-1">
          Original in Englisch, keine offiziell validierte deutsche Fassung verfügbar.
        </p>
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-100 first:pt-0 first:border-t-0">
        <p className="text-sm text-slate-700">5. Where do you have pain? Check the appropriate sites.</p>
        <div className="flex flex-wrap gap-2">
          {OEREBRO_PAIN_SITES.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => setAnswers((prev) => ({ ...prev, [site.id]: prev[site.id] ? 0 : 1 }))}
              className={`rounded-md px-3 py-1.5 text-xs font-medium border ${
                answers[site.id] ? "bg-brand-700 text-white border-brand-700" : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {site.label}
            </button>
          ))}
        </div>
      </div>

      {OEREBRO_QUESTIONS.map((q) => (
        <div key={q.id} className="space-y-2 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-700">
            {q.number}. {q.text}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {q.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: c.value }))}
                className={`rounded-md px-2.5 py-1 text-xs font-medium border ${
                  answers[q.id] === c.value
                    ? "bg-brand-700 text-white border-brand-700"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!isOerebroComplete(answers)}
          className="flex-1 rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition disabled:opacity-40"
        >
          Auswertung anzeigen
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg bg-slate-100 text-slate-700 font-medium py-2.5 px-4 text-sm">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
