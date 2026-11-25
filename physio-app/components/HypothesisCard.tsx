"use client";

import { PDDMAssessment } from "@/lib/types";
import { buildHypothesis, domainLabel } from "@/lib/intake";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Arbeitshypothese für die Therapeutin/den Therapeuten (nicht für die
// Patientenansicht gedacht – Begriffe wie "Sensibilisierung" sind Fachsprache).
export default function HypothesisCard({ assessment }: { assessment: PDDMAssessment }) {
  const h = buildHypothesis(assessment);
  const box = "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3";
  const label = "text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide";
  const text = "text-sm text-slate-800 dark:text-slate-200";

  return (
    <div className={box}>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Arbeitshypothese</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Aus {assessment.intake ? "Erstbogen und " : ""}PDDM vom {formatDate(assessment.date)} · Vorschlag zum Prüfen im Termin
        </p>
      </div>

      {h.safetyFlags.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">Zuerst klären: Sicherheitsfrage(n) mit „Ja“</p>
          {h.safetyFlags.map((f) => (
            <p key={f} className="text-xs text-red-800 dark:text-red-300">• {f}</p>
          ))}
          <p className="text-xs text-red-700 dark:text-red-400">
            Ein „Ja“ ist kein Befund – aber vor dem Belastungsplan nachfragen und ggf. ärztlich abklären lassen.
          </p>
        </div>
      )}

      <div className="rounded-lg bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 p-3">
        <p className={label}>Kernidee</p>
        <p className={`${text} mt-1`}>{h.approach}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className={label}>Haupttreiber der Einschränkung</p>
          <p className={`${text} mt-1 font-medium`}>{h.mainDriver ? domainLabel(h.mainDriver) : "Kein Bereich mit B"}</p>
        </div>
        <div>
          <p className={label}>Verstärker (max. 2)</p>
          <p className={`${text} mt-1`}>{h.amplifiers.length ? h.amplifiers.map(domainLabel).join(", ") : "–"}</p>
        </div>
      </div>

      {h.painDrivers.length > 0 && (
        <div>
          <p className={label}>Was den Schmerz wahrscheinlich antreibt</p>
          {h.painDrivers.map((p) => (
            <p key={p} className={`${text} mt-1`}>• {p}</p>
          ))}
        </div>
      )}

      {h.notes.length > 0 && (
        <div>
          {h.notes.map((n) => (
            <p key={n} className="text-xs text-amber-800 dark:text-amber-300">Hinweis: {n}</p>
          ))}
        </div>
      )}

      {h.checkInSession.length > 0 && (
        <div>
          <p className={label}>Im Termin prüfen / nachfragen</p>
          {h.checkInSession.map((c) => (
            <p key={c} className={`${text} mt-1`}>☐ {c}</p>
          ))}
        </div>
      )}

      {h.nextSteps.length > 0 && (
        <div>
          <p className={label}>Mögliche nächste Schritte</p>
          {h.nextSteps.map((s) => (
            <p key={s.domain} className={`${text} mt-1`}>
              <span className="font-medium">{domainLabel(s.domain)}:</span> {s.text}
            </p>
          ))}
        </div>
      )}

      {h.patientSentence && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className={label}>Satz für den Patienten (Leitsymptom + Ziel)</p>
          <p className={`${text} mt-1 italic`}>„{h.patientSentence}“</p>
        </div>
      )}

      {assessment.intake?.expectation && (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium">Erwartung des Patienten:</span> „{assessment.intake.expectation}“
        </p>
      )}

      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        Eigene Regel, nicht validiert: Haupttreiber = Bereich mit B und dem höchsten Anteil auffälliger Antworten
        (bei Gleichstand: kognitiv-emotional, Komorbiditäten, Umfeld, Nervensystem); Nozizeptiv gilt als
        Ansatzpunkt, nicht als Haupttreiber. Ersetzt keine Untersuchung und keine ärztliche Abklärung.
      </p>
    </div>
  );
}
