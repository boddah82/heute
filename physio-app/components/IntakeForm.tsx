"use client";

import { useState } from "react";
import { IntakeCourse, IntakeData, IntakeDuration } from "@/lib/types";
import { RED_FLAG_QUESTIONS, DURATION_OPTIONS, COURSE_OPTIONS } from "@/lib/intake";
import { LEAD_SYMPTOM_SUGGESTIONS } from "@/lib/regions";

// Erstbogen Teil A übertragen (Therapeuten-Bereich). Gleiche Reihenfolge wie
// der Papierbogen. Danach folgt Teil B = die PDDM-Fragen (PDDMForm im
// Übertragungsmodus). Alles ist optional – leer lassen, was auf dem Bogen
// fehlt.

function Choice<T extends string>({ options, value, onChange }: { options: readonly T[]; value?: T; onChange: (v: T | undefined) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? undefined : o)}
          className={`rounded-md px-3 py-1.5 text-sm border ${
            value === o
              ? "bg-brand-700 text-white border-brand-700 dark:border-brand-400"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function NumberPick({ value, onChange, label }: { value?: number; onChange: (v: number | undefined) => void; label: string }) {
  return (
    <div className="grid grid-cols-11 gap-1" role="group" aria-label={label}>
      {Array.from({ length: 11 }, (_, v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(value === v ? undefined : v)}
          className={`rounded-md py-1.5 text-xs font-medium border ${
            value === v
              ? "bg-brand-700 text-white border-brand-700 dark:border-brand-400"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

const input = "w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900";
const section = "space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700 first:border-t-0 first:pt-0";
const h = "text-sm font-semibold text-slate-900 dark:text-slate-100";
const sub = "text-xs text-slate-500 dark:text-slate-400";

export default function IntakeForm({
  regionId,
  onNext,
  onCancel,
}: {
  regionId: string;
  onNext: (intake: IntakeData) => void;
  onCancel: () => void;
}) {
  const [duration, setDuration] = useState<IntakeDuration>();
  const [course, setCourse] = useState<IntakeCourse>();
  const [lead, setLead] = useState("");
  const [leadValue, setLeadValue] = useState<number>();
  const [leadMin, setLeadMin] = useState("");
  const [goals, setGoals] = useState<{ label: string; value?: number }[]>([{ label: "" }, { label: "" }, { label: "" }]);
  const [rested, setRested] = useState<number>();
  const [redFlags, setRedFlags] = useState<Record<string, "Ja" | "Nein">>({});
  const [ownExplanation, setOwnExplanation] = useState("");
  const [toldSoFar, setToldSoFar] = useState("");
  const [expectation, setExpectation] = useState("");

  const suggestions = LEAD_SYMPTOM_SUGGESTIONS[regionId] ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = leadMin.trim() === "" ? undefined : Math.max(0, Math.round(Number(leadMin)));
    onNext({
      duration,
      course,
      redFlags,
      leadSymptom: lead.trim() || undefined,
      leadValue,
      leadStartupMin: m !== undefined && Number.isFinite(m) ? m : undefined,
      goals: goals.filter((g) => g.label.trim()).map((g) => ({ label: g.label.trim(), value: g.value })),
      rested,
      ownExplanation: ownExplanation.trim() || undefined,
      toldSoFar: toldSoFar.trim() || undefined,
      expectation: expectation.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-brand-700 dark:text-brand-300 uppercase tracking-wide">Erstbogen · Teil A von 2</p>
        <p className={sub}>Wie auf dem Papierbogen. Leer lassen, was nicht ausgefüllt ist. Danach folgen die Fragen zu den 5 Bereichen.</p>
      </div>

      <div className={section}>
        <p className={h}>1. Ihre Beschwerden</p>
        <p className={sub}>Seit wann?</p>
        <Choice options={DURATION_OPTIONS} value={duration} onChange={setDuration} />
        <p className={sub}>In den letzten 2 Wochen eher …</p>
        <Choice options={COURSE_OPTIONS} value={course} onChange={setCourse} />
      </div>

      <div className={section}>
        <p className={h}>2. Was stört Sie im Alltag am meisten?</p>
        {suggestions.length > 0 && !lead && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setLead(s)} className="rounded-md px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                {s}
              </button>
            ))}
          </div>
        )}
        <input className={input} value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Situation, z. B. „Erste Schritte morgens“" aria-label="Leitsymptom" />
        <p className={sub}>Schmerz in dieser Situation (0 = keiner, 10 = stärkster)</p>
        <NumberPick value={leadValue} onChange={setLeadValue} label="Schmerz im Leitsymptom" />
        <div className="flex items-center gap-2">
          <span className={sub}>Bis es besser ist, dauert es etwa</span>
          <input type="number" min={0} inputMode="numeric" value={leadMin} onChange={(e) => setLeadMin(e.target.value)} className="w-16 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-slate-900" aria-label="Minuten bis besser" />
          <span className={sub}>Min.</span>
        </div>
      </div>

      <div className={section}>
        <p className={h}>3. Was möchten Sie wieder können?</p>
        <p className={sub}>Bis zu 3 Tätigkeiten. Wie gut geht das heute? 0 = gar nicht, 10 = wie vor den Beschwerden.</p>
        {goals.map((g, i) => (
          <div key={i} className="space-y-1.5">
            <input
              className={input}
              value={g.label}
              onChange={(e) => setGoals((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              placeholder={`Tätigkeit ${i + 1}`}
              aria-label={`Ziel ${i + 1}`}
            />
            {g.label.trim() && (
              <NumberPick value={g.value} onChange={(v) => setGoals((p) => p.map((x, j) => (j === i ? { ...x, value: v } : x)))} label={`Ziel ${i + 1} Bewertung`} />
            )}
          </div>
        ))}
      </div>

      <div className={section}>
        <p className={h}>4. Schlaf</p>
        <p className={sub}>Wie erholt wachen Sie meistens auf? 0 = gar nicht, 10 = voll erholt</p>
        <NumberPick value={rested} onChange={setRested} label="Schlaf" />
      </div>

      <div className={section}>
        <p className={h}>5. Sicherheitsfragen</p>
        <p className={sub}>Ein „Ja“ wird in der Auswertung ganz oben angezeigt.</p>
        {RED_FLAG_QUESTIONS.map((q) => (
          <div key={q.id} className="flex items-start justify-between gap-3">
            <p className="text-sm text-slate-700 dark:text-slate-300">{q.text}</p>
            <div className="flex gap-1 shrink-0">
              {(["Ja", "Nein"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    setRedFlags((p) => {
                      const n = { ...p };
                      if (n[q.id] === v) delete n[q.id];
                      else n[q.id] = v;
                      return n;
                    })
                  }
                  className={`rounded-md px-3 py-1 text-sm border ${
                    redFlags[q.id] === v
                      ? v === "Ja"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-brand-700 text-white border-brand-700"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={section}>
        <p className={h}>6. Ihre Sicht</p>
        <label className={sub} htmlFor="ia-own">Was glauben Sie selbst, woher die Beschwerden kommen?</label>
        <textarea id="ia-own" rows={2} className={input} value={ownExplanation} onChange={(e) => setOwnExplanation(e.target.value)} />
        <label className={sub} htmlFor="ia-told">Was hat man Ihnen bisher dazu gesagt (Arzt, Therapeut, Befund)?</label>
        <textarea id="ia-told" rows={2} className={input} value={toldSoFar} onChange={(e) => setToldSoFar(e.target.value)} />
        <label className={sub} htmlFor="ia-exp">Was erhoffen Sie sich von der Behandlung?</label>
        <textarea id="ia-exp" rows={2} className={input} value={expectation} onChange={(e) => setExpectation(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition">
          Weiter zu Teil B (5 Bereiche)
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 text-sm text-slate-500 dark:text-slate-400">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
