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

function PainSliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-slate-700">{label}</label>
        <span className="text-sm font-semibold text-slate-900 tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-700"
      />
    </div>
  );
}

export default function PDDMForm({ regionId, onSubmit, onDone }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [avg4Weeks, setAvg4Weeks] = useState(0);
  const [maxLoad, setMaxLoad] = useState(0);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const results = evaluatePDDM(answers);
    onSubmit({ regionId, date: today(), answers, results, painBaseline: { current, avg4Weeks, maxLoad } });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg p-5 shadow-sm border border-slate-200">
      <div>
        <h2 className="font-semibold text-slate-900">Bereichs-Einschätzung (PDDM)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Es gibt kein &quot;richtig&quot; oder &quot;falsch&quot; – die Antworten helfen nur dabei zu sehen, welche
          Bereiche neben der reinen Belastung noch eine Rolle spielen könnten.
        </p>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Schmerzintensität &amp; Schmerzverlauf</p>
        <PainSliderRow label="Schmerz aktuell" value={current} onChange={setCurrent} />
        <PainSliderRow label="Schmerz im Durchschnitt (letzte 4 Wochen)" value={avg4Weeks} onChange={setAvg4Weeks} />
        <PainSliderRow label="Schmerz bei maximaler Belastung" value={maxLoad} onChange={setMaxLoad} />
      </div>

      {PDDM_DOMAINS.map((domain) => (
        <div key={domain} className="space-y-3 pt-3 border-t border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">{PDDM_DOMAIN_LABELS[domain]}</p>
            <p className="text-xs text-slate-500">{PDDM_DOMAIN_HINTS[domain]}</p>
          </div>
          {PDDM_QUESTIONS.filter((q) => q.domain === domain).map((q) => (
            <div key={q.id} className="space-y-1.5">
              <p className="text-sm text-slate-700">{q.text}</p>
              {q.type === "boolean" && (
                <div className="flex gap-2">
                  {["Ja", "Nein"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(q.id, opt)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium border ${
                        answers[q.id] === opt
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "scale3" && q.scaleLabels && (
                <div className="flex flex-wrap gap-2">
                  {q.scaleLabels.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(q.id, opt)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium border ${
                        answers[q.id] === opt
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "text" && (
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              )}
            </div>
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
