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
import QuestionnairePanel from "./QuestionnairePanel";

type DataTab = "heute" | "verlauf" | "pddm" | "ziele" | "fragebogen";

// Direkte Dateneingabe für einen Mandanten durch die Therapeutin/den
// Therapeuten (z. B. Erstanamnese im Termin) – schreibt direkt in den
// Mandanten-Datensatz (siehe usePatientCheckIns & Co. in lib/storage.ts),
// unabhängig vom eigenen Tracking-Stand dieses Geräts.
export default function PatientDataEntry({ patientId }: { patientId: string }) {
  const [regionId, setRegionId] = useState("knie");
  const [tab, setTab] = useState<DataTab>("heute");
  const [showPDDMForm, setShowPDDMForm] = useState(false);

  const { entries, updateEntry, deleteEntry, addEntry } = usePatientCheckIns(patientId, regionId);
  const { assessments, addAssessment, deleteAssessment } = usePatientPDDMAssessments(patientId, regionId);
  const { goals, addGoal, deleteGoal } = usePatientPSFSGoals(patientId, regionId);
  const { ratings, addRating } = usePatientPSFSRatings(patientId, regionId);
  const { results, addResult, deleteResult } = usePatientQuestionnaireResults(patientId, regionId);

  return (
    <div className="space-y-3">
      <RegionSelector value={regionId} onChange={setRegionId} />

      <nav className="flex gap-2 overflow-x-auto">
        {[
          { id: "heute" as DataTab, label: "Heute" },
          { id: "verlauf" as DataTab, label: `Verlauf (${entries.length})` },
          { id: "pddm" as DataTab, label: "Bereiche" },
          { id: "ziele" as DataTab, label: "Ziele" },
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

      {tab === "heute" && <CheckInForm regionId={regionId} onSubmit={addEntry} />}

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
            <button
              onClick={() => setShowPDDMForm(true)}
              className="w-full rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition"
            >
              Neue Einschätzung starten
            </button>
            {assessments.map((a) => (
              <PDDMResultCard key={a.id} assessment={a} onDelete={deleteAssessment} />
            ))}
          </div>
        ))}

      {tab === "ziele" && (
        <PSFSPanel goals={goals} ratings={ratings} onAddGoal={addGoal} onDeleteGoal={deleteGoal} onRate={addRating} />
      )}

      {tab === "fragebogen" && (
        <QuestionnairePanel regionId={regionId} results={results} onSubmit={addResult} onDelete={deleteResult} />
      )}
    </div>
  );
}
