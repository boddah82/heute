"use client";

import { useState } from "react";
import { QuestionnaireResult, QuestionnaireId } from "@/lib/types";
import { QUESTIONNAIRES, QUESTIONNAIRE_IDS } from "@/lib/questionnaires";
import QuestionnaireForm from "./QuestionnaireForm";
import QuestionnairePrintable from "./QuestionnairePrintable";

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function printNode() {
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
}

export default function QuestionnairePanel({
  regionId,
  results,
  onSubmit,
  onDelete,
}: {
  regionId: string;
  results: QuestionnaireResult[];
  onSubmit: (result: Omit<QuestionnaireResult, "id" | "createdAt">) => void;
  onDelete: (id: string) => void;
}) {
  const [filling, setFilling] = useState<QuestionnaireId | null>(null);
  const [printing, setPrinting] = useState<QuestionnaireId | null>(null);

  if (filling) {
    const def = QUESTIONNAIRES[filling];
    return (
      <QuestionnaireForm
        def={def}
        onCancel={() => setFilling(null)}
        onSubmit={(answers, totalScore) => {
          onSubmit({
            regionId,
            questionnaireId: filling,
            date: new Date().toISOString().slice(0, 10),
            answers,
            totalScore,
          });
          setFilling(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {QUESTIONNAIRE_IDS.map((id) => {
        const def = QUESTIONNAIRES[id];
        const history = results
          .filter((r) => r.questionnaireId === id)
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        const latest = history[0];

        return (
          <div key={id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900">{def.title}</h3>
              <p className="text-xs text-slate-500">{def.subtitle}</p>
            </div>

            {latest && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="text-slate-800">
                  Letztes Ergebnis: <span className="font-semibold">{latest.totalScore}</span> / {def.scoreRange[1]}{" "}
                  <span className="text-slate-400">({formatDate(latest.date)})</span>
                </p>
                {def.interpret && <p className="text-slate-600 mt-1">{def.interpret(latest.totalScore)}</p>}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setFilling(id)}
                className="flex-1 rounded-lg bg-brand-700 text-white font-semibold py-2 text-sm hover:bg-brand-800 transition"
              >
                Digital ausfüllen
              </button>
              <button
                onClick={() => {
                  setPrinting(id);
                  printNode();
                }}
                className="rounded-lg bg-slate-100 text-slate-700 font-medium py-2 px-3 text-sm"
              >
                Drucken
              </button>
            </div>

            {history.length > 1 && (
              <details className="text-sm">
                <summary className="text-brand-700 font-medium cursor-pointer">
                  Verlauf anzeigen ({history.length})
                </summary>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {history.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>{formatDate(r.date)}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">
                          {r.totalScore}/{def.scoreRange[1]}
                        </span>
                        <button onClick={() => onDelete(r.id)} className="text-xs text-slate-400">
                          Löschen
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <p className="text-[11px] text-slate-400">{def.resultNote}</p>
          </div>
        );
      })}

      {printing && (
        <div className="hidden print:block">
          <QuestionnairePrintable def={QUESTIONNAIRES[printing]} />
        </div>
      )}
    </div>
  );
}
