"use client";

import { useState } from "react";
import RegionSelector from "@/components/RegionSelector";
import CheckInForm from "@/components/CheckInForm";
import EntryCard from "@/components/EntryCard";
import PDDMForm from "@/components/PDDMForm";
import PDDMResultCard from "@/components/PDDMResultCard";
import DemoPatientPicker from "@/components/DemoPatientPicker";
import ExportPanel from "@/components/ExportPanel";
import HelpPanel from "@/components/HelpPanel";
import PainMixer from "@/components/PainMixer";
import MriEducation from "@/components/MriEducation";
import StabilizationParadox from "@/components/StabilizationParadox";
import RuleOfTenCalculator from "@/components/RuleOfTenCalculator";
import PlanBuilder from "@/components/PlanBuilder";
import PlanImportModal from "@/components/PlanImportModal";
import PSFSPanel from "@/components/PSFSPanel";
import {
  useActiveRegion,
  useCheckIns,
  usePDDMAssessments,
  usePlan,
  importPlan,
  usePSFSGoals,
  usePSFSRatings,
} from "@/lib/storage";
import { readPlanFromLocation, clearPlanFromUrl } from "@/lib/planLink";
import { TrainingPlan } from "@/lib/types";

type Tab = "heute" | "rechner" | "verlauf" | "pddm" | "wissen" | "plan" | "ziele";

// Liest einen evtl. im Link enthaltenen Plan synchron beim ersten Rendern
// (kein Effekt nötig) und räumt den Link sofort auf, damit ein Reload nicht
// erneut fragt. Der native window.confirm()-Dialog wird in der
// Artifact-Vorschau teils stillschweigend unterdrückt – deshalb ein eigenes
// Bestätigungs-Fenster (PlanImportModal) statt confirm().
function readAndClearPendingPlan(): TrainingPlan | null {
  const incoming = readPlanFromLocation();
  if (incoming) clearPlanFromUrl();
  return incoming;
}

export default function Home() {
  const { regionId, select } = useActiveRegion("knie");
  const { entries, addEntry, updateEntry, deleteEntry } = useCheckIns(regionId);
  const { assessments, addAssessment, deleteAssessment } = usePDDMAssessments(regionId);
  const { plan, setPlan } = usePlan(regionId);
  const { goals, addGoal, deleteGoal } = usePSFSGoals(regionId);
  const { ratings, addRating } = usePSFSRatings(regionId);
  const [tab, setTab] = useState<Tab>("heute");
  const [showPDDMForm, setShowPDDMForm] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<TrainingPlan | null>(readAndClearPendingPlan);

  function confirmPlanImport() {
    if (!pendingPlan) return;
    importPlan(pendingPlan);
    select(pendingPlan.regionId);
    setTab("heute");
    setPendingPlan(null);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-teal-800 text-white px-4 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Reiz-Reaktions-Tracker</h1>
            <HelpPanel />
          </div>
          <p className="text-sm text-teal-100">Belastbarkeit verstehen statt raten.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <ExportPanel />
          <DemoPatientPicker
            onLoaded={(loadedRegion) => {
              select(loadedRegion);
              setTab("verlauf");
            }}
          />
        </div>
      </header>

      <div className="px-4 pt-4">
        <RegionSelector value={regionId} onChange={select} />
      </div>

      <nav className="px-4 mt-2 flex gap-2 overflow-x-auto">
        {[
          { id: "heute" as Tab, label: "Heute" },
          { id: "rechner" as Tab, label: "Rechner" },
          { id: "verlauf" as Tab, label: `Verlauf (${entries.length})` },
          { id: "pddm" as Tab, label: "Bereiche" },
          { id: "wissen" as Tab, label: "Wissen" },
          { id: "plan" as Tab, label: "Plan" },
          { id: "ziele" as Tab, label: "Ziele" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium shrink-0 ${
              tab === t.id
                ? "bg-white text-teal-800 border-b-2 border-teal-700"
                : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 max-w-xl mx-auto space-y-4 pb-12">
        {tab === "heute" && (
          <CheckInForm regionId={regionId} planExercises={plan?.exercises} onSubmit={addEntry} />
        )}

        {tab === "rechner" && <RuleOfTenCalculator />}

        {tab === "verlauf" &&
          (entries.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              Noch keine Einträge für diesen Bereich. Starte im Reiter &quot;Heute&quot; mit Deinem ersten Check-in.
            </p>
          ) : (
            entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onUpdate={updateEntry} onDelete={deleteEntry} />
            ))
          ))}

        {tab === "pddm" &&
          (showPDDMForm ? (
            <PDDMForm
              regionId={regionId}
              onSubmit={addAssessment}
              onDone={() => setShowPDDMForm(false)}
            />
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowPDDMForm(true)}
                className="w-full rounded-xl bg-teal-700 text-white font-semibold py-2.5 text-sm hover:bg-teal-800 transition"
              >
                Neue Einschätzung starten
              </button>
              {assessments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  Noch keine Einschätzung für diesen Bereich. Eine Wiederholung alle ca. 4 Wochen reicht aus.
                </p>
              ) : (
                assessments.map((a) => (
                  <PDDMResultCard key={a.id} assessment={a} onDelete={deleteAssessment} />
                ))
              )}
            </div>
          ))}

        {tab === "wissen" && (
          <div className="space-y-4">
            <PainMixer />
            <MriEducation />
            <StabilizationParadox />
          </div>
        )}

        {tab === "plan" && <PlanBuilder regionId={regionId} plan={plan} onSave={setPlan} />}

        {tab === "ziele" && (
          <PSFSPanel
            goals={goals}
            ratings={ratings}
            onAddGoal={addGoal}
            onDeleteGoal={deleteGoal}
            onRate={addRating}
          />
        )}
      </div>

      {pendingPlan && (
        <PlanImportModal
          plan={pendingPlan}
          onConfirm={confirmPlanImport}
          onDismiss={() => setPendingPlan(null)}
        />
      )}
    </main>
  );
}
