"use client";

import { useState } from "react";
import { QuestionnaireDef, scoreQuestionnaire, isComplete } from "@/lib/questionnaires";

interface Props {
  def: QuestionnaireDef;
  onSubmit: (answers: Record<string, number>, totalScore: number) => void;
  onCancel: () => void;
}

export default function QuestionnaireForm({ def, onSubmit, onCancel }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete(def, answers)) return;
    onSubmit(answers, scoreQuestionnaire(def, answers));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg p-5 shadow-sm border border-slate-200">
      <div>
        <h2 className="font-semibold text-slate-900">{def.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{def.instructions}</p>
      </div>

      {def.items.map((item, i) => (
        <div key={item.id} className="space-y-2 pt-3 border-t border-slate-100 first:pt-0 first:border-t-0">
          <p className="text-sm text-slate-700">
            {i + 1}. {item.text}
          </p>
          <div className="flex flex-wrap gap-2">
            {def.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: o.value }))}
                className={`rounded-md px-3 py-1.5 text-xs font-medium border ${
                  answers[item.id] === o.value
                    ? "bg-brand-700 text-white border-brand-700"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!isComplete(def, answers)}
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
