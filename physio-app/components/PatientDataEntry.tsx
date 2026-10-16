"use client";

import { useState } from "react";
import {
  usePatientCheckIns,
  usePatientOtherRegionsWithEntries,
  usePatientPDDMAssessments,
  usePatientPSFSGoals,
  usePatientPSFSRatings,
  usePatientQuestionnaireResults,
} from "@/lib/storage";
import RegionSelector from "./RegionSelector";
import CheckInForm from "./CheckInForm";
import EntryCard from "./EntryCard";
import OpenFollowUpsBanner from "./OpenFollowUpsBanner";
import PDDMForm from "./PDDMForm";
import PDDMResultCard from "./PDDMResultCard";
import PSFSPanel from "./PSFSPanel";
import GoalActionSummary from "./GoalActionSummary";
import QuestionnairePanel from "./QuestionnairePanel";
import ActivityReliability from "./ActivityReliability";

type DataTab = "heute" | "verlauf" | "pddm" | "ziele" | "fragebogen";

// Direkte Dateneingabe für einen Mandanten durch die Therapeutin/den
// Therapeuten (z. B. Erstanamnese im Termin) – schreibt direkt in den
// Mandanten-Datensatz (siehe usePatientCheckIns & Co. in lib/storage.ts),
// unabhängig vom eigenen Tracking-Stand dieses Geräts.
export default function PatientDataEntry({ patientId }: { patientId: string }) {
  const [regionId, setRegionId] = useState("knie");
  const [pddmMode, setPddmMode] = useState<null | "live" | "paper">(null);

  const { entries, updateEntry, deleteEntry, addEntry } = usePatientCheckIns(patientId, regionId);
  const otherRegionIds = usePatientOtherRegionsWithEntries(patientId, regionId);
  const { assessments, addAssessment, deleteAssessment } = usePatientPDDMAssessments(patientId, regionId);
  // Nach Ausfülldatum sortiert (neueste zuerst) – ein nachträglich
  // übertragener Papierbogen kann älter sein als eine schon erfasste Einschätzung.
  const sortedAssessments = [...assessments].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const { goals, addGoal, deleteGoal } = usePatientPSFSGoals(patientId, regionId);
  const { ratings, addRating } = usePatientPSFSRatings(patientId, regionId);
  const { results, addResult, deleteResult } = usePatientQuestionnaireResults(patientId, regionId);

  // Sanfte Führung: erst Bestandsaufnahme (Bereiche), dann Ziele, erst
  // danach das laufende Tracking – frei änderbar, sobald einmal geladen.
  const [tab, setTab] = useState<DataTab>(() => {
    if (assessments.length === 0) return "pddm";
    if (goals.length === 0) return "ziele";
    return "heute";
  });

  return (
    <div className="space-y-3">
      <RegionSelector value={regionId} onChange={setRegionId} />

      <nav className="flex gap-2 overflow-x-auto">
        {[
          { id: "pddm" as DataTab, label: "Bereiche" },
          { id: "ziele" as DataTab, label: "Ziele" },
          { id: "heute" as DataTab, label: "Heute" },
          { id: "verlauf" as DataTab, label: `Verlauf (${entries.length})` },
          { id: "fragebogen" as DataTab, label: "Fragebögen" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium shrink-0 border ${
              tab === t.id ? "bg-brand-700 text-white border-brand-700 dark:border-brand-400" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "heute" && (
        <div className="space-y-2">
          {entries.length === 0 && assessments.length > 0 && goals.length > 0 && (
            <p className="text-xs font-medium text-brand-700 dark:text-brand-300 uppercase tracking-wide">
              Schritt 3 von 3 – Laufendes Tracking
            </p>
          )}
          <OpenFollowUpsBanner entries={entries} onUpdate={updateEntry} onDelete={deleteEntry} />
          <CheckInForm regionId={regionId} otherRegionIds={otherRegionIds} onSubmit={addEntry} />
        </div>
      )}

      {tab === "verlauf" &&
        (entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Noch keine Check-ins für diesen Bereich.</p>
        ) : (
          <div className="space-y-3">
            <ActivityReliability entries={entries} />
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onUpdate={updateEntry} onDelete={deleteEntry} />
            ))}
          </div>
        ))}

      {tab === "pddm" &&
        (pddmMode ? (
          <PDDMForm
            key={pddmMode}
            regionId={regionId}
            transcribe={pddmMode === "paper"}
            onSubmit={(a) => {
              addAssessment(a);
              setPddmMode(null);
            }}
            onDone={() => setPddmMode(null)}
          />
        ) : (
          <div className="space-y-3">
            {assessments.length === 0 && (
              <p className="text-xs font-medium text-brand-700 dark:text-brand-300 uppercase tracking-wide">
                Schritt 1 von 3 – Bestandsaufnahme
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPddmMode("live")}
                className="rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition"
              >
                Im Termin ausfüllen
              </button>
              <button
                onClick={() => setPddmMode("paper")}
                className="rounded-lg border border-brand-700 dark:border-brand-400 text-brand-700 dark:text-brand-300 bg-white dark:bg-slate-800 font-semibold py-2.5 text-sm hover:bg-brand-50 dark:hover:bg-slate-700 transition"
              >
                Papierbogen übertragen
              </button>
            </div>
            {assessments.length > 0 && goals.length === 0 && (
              <div className="bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-700 rounded-lg p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-brand-900 dark:text-brand-100">
                  Nächster Schritt: Ziele festlegen – damit werden die Empfehlungen oben konkreter.
                </p>
                <button
                  onClick={() => setTab("ziele")}
                  className="shrink-0 rounded-md bg-brand-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-800 transition"
                >
                  Zu den Zielen
                </button>
              </div>
            )}
            {sortedAssessments.map((a) => (
              <PDDMResultCard key={a.id} assessment={a} onDelete={deleteAssessment} />
            ))}
          </div>
        ))}

      {tab === "ziele" && (
        <div className="space-y-2">
          {goals.length === 0 && (
            <p className="text-xs font-medium text-brand-700 dark:text-brand-300 uppercase tracking-wide">
              Schritt 2 von 3 – Ziele festlegen
            </p>
          )}
          <GoalActionSummary latestAssessment={sortedAssessments[0]} goals={goals} />
          <PSFSPanel goals={goals} ratings={ratings} onAddGoal={addGoal} onDeleteGoal={deleteGoal} onRate={addRating} />
        </div>
      )}

      {tab === "fragebogen" && (
        <QuestionnairePanel regionId={regionId} results={results} onSubmit={addResult} onDelete={deleteResult} />
      )}
    </div>
  );
}
