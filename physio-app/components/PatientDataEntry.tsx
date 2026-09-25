"use client";

import { useState } from "react";
import {
  usePatientCheckIns,
  usePatientPDDMAssessments,
  usePatientPSFSGoals,
  usePatientPSFSRatings,
  usePatientQuestionnaireResults,
} from "@/lib/storage";
import RegionSelector from "./RegionSelector";
import CheckInForm from "./CheckInForm";
import EntryCard from "./EntryCard";
import PDDMForm from "./PDDMForm";
import PDDMResultCard from "./PDDMResultCard";
import PSFSPanel from "./PSFSPanel";
import GoalActionSummary from "./GoalActionSummary";
import QuestionnairePanel from "./QuestionnairePanel";

type DataTab = "heute" | "verlauf" | "pddm" | "ziele" | "fragebogen";

// Direkte Dateneingabe für einen Mandanten durch die Therapeutin/den
// Therapeuten (z. B. Erstanamnese im Termin) – schreibt direkt in den
// Mandanten-Datensatz (siehe usePatientCheckIns & Co. in lib/storage.ts),
// unabhängig vom eigenen Tracking-Stand dieses Geräts.
export default function PatientDataEntry({ patientId }: { patientId: string }) {
  const [regionId, setRegionId] = useState("knie");
  const [showPDDMForm, setShowPDDMForm] = useState(false);

  const { entries, updateEntry, deleteEntry, addEntry } = usePatientCheckIns(patientId, regionId);
  const { assessments, addAssessment, deleteAssessment } = usePatientPDDMAssessments(patientId, regionId);
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
              tab === t.id ? "bg-brand-700 text-white border-brand-700" : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "heute" && (
        <div className="space-y-2">
          {entries.length === 0 && assessments.length > 0 && goals.length > 0 && (
            <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">
              Schritt 3 von 3 – Laufendes Tracking
            </p>
          )}
          <CheckInForm regionId={regionId} onSubmit={addEntry} />
        </div>
      )}

      {tab === "verlauf" &&
        (entries.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Noch keine Check-ins für diesen Bereich.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onUpdate={updateEntry} onDelete={deleteEntry} />
            ))}
          </div>
        ))}

      {tab === "pddm" &&
        (showPDDMForm ? (
          <PDDMForm
            regionId={regionId}
            onSubmit={(a) => {
              addAssessment(a);
              setShowPDDMForm(false);
            }}
            onDone={() => setShowPDDMForm(false)}
          />
        ) : (
          <div className="space-y-3">
            {assessments.length === 0 && (
              <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">
                Schritt 1 von 3 – Bestandsaufnahme
              </p>
            )}
            <button
              onClick={() => setShowPDDMForm(true)}
              className="w-full rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition"
            >
              Neue Einschätzung starten
            </button>
            {assessments.length > 0 && goals.length === 0 && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-brand-900">
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
            {assessments.map((a) => (
              <PDDMResultCard key={a.id} assessment={a} onDelete={deleteAssessment} />
            ))}
          </div>
        ))}

      {tab === "ziele" && (
        <div className="space-y-2">
          {goals.length === 0 && (
            <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">
              Schritt 2 von 3 – Ziele festlegen
            </p>
          )}
          <GoalActionSummary latestAssessment={assessments[0]} goals={goals} />
          <PSFSPanel goals={goals} ratings={ratings} onAddGoal={addGoal} onDeleteGoal={deleteGoal} onRate={addRating} />
        </div>
      )}

      {tab === "fragebogen" && (
        <QuestionnairePanel regionId={regionId} results={results} onSubmit={addResult} onDelete={deleteResult} />
      )}
    </div>
  );
}
