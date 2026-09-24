"use client";

import { useState, useEffect } from "react";
import RegionSelector from "@/components/RegionSelector";
import CheckInForm from "@/components/CheckInForm";
import EntryCard from "@/components/EntryCard";
import PDDMForm from "@/components/PDDMForm";
import PDDMResultCard from "@/components/PDDMResultCard";
import ExportPanel from "@/components/ExportPanel";
import HelpPanel from "@/components/HelpPanel";
import PainMixer from "@/components/PainMixer";
import MriEducation from "@/components/MriEducation";
import StabilizationParadox from "@/components/StabilizationParadox";
import RuleOfTenCalculator from "@/components/RuleOfTenCalculator";
import PlanImportModal from "@/components/PlanImportModal";
import HistoryImportModal from "@/components/HistoryImportModal";
import TherapistArea from "@/components/TherapistArea";
import PSFSPanel from "@/components/PSFSPanel";
import GoalActionSummary from "@/components/GoalActionSummary";
import PainTrendChart from "@/components/PainTrendChart";
import PDDMPainTrendChart from "@/components/PDDMPainTrendChart";
import QuestionnairePanel from "@/components/QuestionnairePanel";
import {
  useActiveRegion,
  useCheckIns,
  usePDDMAssessments,
  usePlan,
  importPlan,
  usePSFSGoals,
  usePSFSRatings,
  useQuestionnaireResults,
  usePatients,
  importPatientRecord,
} from "@/lib/storage";
import { readPlanFromLocation, clearPlanFromUrl } from "@/lib/planLink";
import { readHistoryFromLocation, clearHistoryFromUrl } from "@/lib/historyLink";
import { TrainingPlan, HistoryBundle } from "@/lib/types";

type Tab = "heute" | "rechner" | "verlauf" | "pddm" | "wissen" | "ziele" | "fragebogen";
type Mode = "patient" | "therapist";

// Liest einen evtl. im Link enthaltenen Plan/Verlauf synchron beim ersten
// Rendern (kein Effekt nötig für den Lesevorgang selbst). Der statische
// Export liefert HTML ohne Query-Parameter aus – ein sofortiges Löschen des
// Parameters HIER würde bei einem Hydration-Mismatch (Server-HTML kennt kein
// Modal, Client will eins zeigen) dazu führen, dass React den ersten
// Render verwirft und die Initializer beim Neu-Mount erneut laufen, dann
// aber ohne Parameter – das Modal verschwindet. Deshalb wird der Parameter
// erst per useEffect NACH dem (ggf. wiederholten) Mount entfernt.
// Der native window.confirm()-Dialog wird in der Artifact-Vorschau teils
// stillschweigend unterdrückt – deshalb eigene Bestätigungs-Fenster
// (PlanImportModal, HistoryImportModal) statt confirm().
function readPendingPlan(): TrainingPlan | null {
  return readPlanFromLocation();
}

function readPendingHistory(): HistoryBundle | null {
  return readHistoryFromLocation();
}

export default function Home() {
  const { regionId, select } = useActiveRegion("knie");
  const { entries, addEntry, updateEntry, deleteEntry } = useCheckIns(regionId);
  const { assessments, addAssessment, deleteAssessment } = usePDDMAssessments(regionId);
  const { plan } = usePlan(regionId);
  const { goals, addGoal, deleteGoal } = usePSFSGoals(regionId);
  const { ratings, addRating } = usePSFSRatings(regionId);
  const { results: questionnaireResults, addResult: addQuestionnaireResult, deleteResult: deleteQuestionnaireResult } = useQuestionnaireResults(regionId);
  const { patients, addPatient, deletePatient } = usePatients();
  // Sanfte Führung beim Einstieg: erst Bestandsaufnahme (Bereiche), dann
  // Ziele, erst danach das laufende Tracking – aber frei änderbar, sobald
  // die App einmal geladen ist.
  const [tab, setTab] = useState<Tab>(() => {
    if (assessments.length === 0) return "pddm";
    if (goals.length === 0) return "ziele";
    return "heute";
  });
  const [mode, setMode] = useState<Mode>("patient");
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [showPDDMForm, setShowPDDMForm] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<TrainingPlan | null>(readPendingPlan);
  const [pendingHistory, setPendingHistory] = useState<HistoryBundle | null>(readPendingHistory);

  // Erst nach dem (ggf. durch einen Hydration-Mismatch wiederholten) Mount
  // aus der URL entfernen, siehe Kommentar bei readPendingPlan/-History oben.
  useEffect(() => {
    if (pendingPlan) clearPlanFromUrl();
    if (pendingHistory) clearHistoryFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- einmalig beim Mount, unabhängig von späteren State-Änderungen
  }, []);

  function confirmPlanImport() {
    if (!pendingPlan) return;
    importPlan(pendingPlan);
    select(pendingPlan.regionId);
    setTab("heute");
    setPendingPlan(null);
  }

  function assignHistoryToNewPatient(name: string) {
    if (!pendingHistory) return;
    const patient = addPatient(name);
    importPatientRecord(patient.id, pendingHistory);
    setActivePatientId(patient.id);
    setMode("therapist");
    setPendingHistory(null);
  }

  function assignHistoryToExistingPatient(patientId: string) {
    if (!pendingHistory) return;
    importPatientRecord(patientId, pendingHistory);
    setActivePatientId(patientId);
    setMode("therapist");
    setPendingHistory(null);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-brand-800 text-white px-4 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Reiz-Reaktions-Tracker</h1>
            {mode === "patient" && <HelpPanel />}
          </div>
          <p className="text-sm text-brand-100">
            {mode === "patient" ? "Belastbarkeit verstehen statt raten." : "Therapeuten-Bereich"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {mode === "patient" ? (
            <>
              <ExportPanel />
              <button
                onClick={() => setMode("therapist")}
                className="text-xs font-medium text-brand-100 underline underline-offset-2"
              >
                Therapeuten-Bereich
              </button>
            </>
          ) : (
            <button
              onClick={() => setMode("patient")}
              className="text-xs font-medium text-brand-100 underline underline-offset-2"
            >
              Zurück zur Patientenansicht
            </button>
          )}
        </div>
      </header>

      {mode === "patient" && (
        <div className="px-4 pt-4">
          <RegionSelector value={regionId} onChange={select} />
        </div>
      )}

      {mode === "patient" && (
        <nav className="px-4 mt-2 flex gap-2 overflow-x-auto">
          {[
            { id: "pddm" as Tab, label: "Bereiche" },
            { id: "ziele" as Tab, label: "Ziele" },
            { id: "heute" as Tab, label: "Heute" },
            { id: "verlauf" as Tab, label: `Verlauf (${entries.length})` },
            { id: "rechner" as Tab, label: "Rechner" },
            { id: "fragebogen" as Tab, label: "Fragebögen" },
            { id: "wissen" as Tab, label: "Wissen" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium shrink-0 ${
                tab === t.id
                  ? "bg-white text-brand-800 border-b-2 border-brand-700"
                  : "text-slate-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <div className="px-4 py-4 max-w-xl mx-auto space-y-4 pb-12">
        {mode === "therapist" ? (
          <TherapistArea
            patients={patients}
            activePatientId={activePatientId}
            onSelectPatient={setActivePatientId}
            onAddPatient={(name) => {
              addPatient(name);
            }}
            onDeletePatient={(id) => {
              deletePatient(id);
              if (activePatientId === id) setActivePatientId(null);
            }}
            onDemoLoaded={(loadedRegion) => {
              select(loadedRegion);
              setTab("verlauf");
              setMode("patient");
            }}
          />
        ) : (
          <>
            {tab === "heute" && (
              <div className="space-y-2">
                {entries.length === 0 && assessments.length > 0 && goals.length > 0 && (
                  <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">
                    Schritt 3 von 3 – Laufendes Tracking
                  </p>
                )}
                <CheckInForm regionId={regionId} planExercises={plan?.exercises} onSubmit={addEntry} />
              </div>
            )}

            {tab === "rechner" && <RuleOfTenCalculator />}

            {tab === "verlauf" &&
              (entries.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">
                  Noch keine Einträge für diesen Bereich. Starte im Reiter &quot;Heute&quot; mit Deinem ersten Check-in.
                </p>
              ) : (
                <>
                  <PainTrendChart entries={entries} />
                  {entries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} onUpdate={updateEntry} onDelete={deleteEntry} />
                  ))}
                </>
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
                  {assessments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                      Noch keine Einschätzung für diesen Bereich. Eine Wiederholung alle ca. 4 Wochen reicht aus.
                    </p>
                  ) : (
                    <>
                      <PDDMPainTrendChart assessments={assessments} />
                      {assessments.map((a) => (
                        <PDDMResultCard key={a.id} assessment={a} onDelete={deleteAssessment} />
                      ))}
                    </>
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

            {tab === "ziele" && (
              <div className="space-y-2">
                {goals.length === 0 && (
                  <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">
                    Schritt 2 von 3 – Deine Ziele festlegen
                  </p>
                )}
                <GoalActionSummary latestAssessment={assessments[0]} goals={goals} />
                <PSFSPanel
                  goals={goals}
                  ratings={ratings}
                  onAddGoal={addGoal}
                  onDeleteGoal={deleteGoal}
                  onRate={addRating}
                />
              </div>
            )}

            {tab === "fragebogen" && (
              <QuestionnairePanel
                regionId={regionId}
                results={questionnaireResults}
                onSubmit={addQuestionnaireResult}
                onDelete={deleteQuestionnaireResult}
              />
            )}
          </>
        )}
      </div>

      {pendingPlan && (
        <PlanImportModal
          plan={pendingPlan}
          onConfirm={confirmPlanImport}
          onDismiss={() => setPendingPlan(null)}
        />
      )}

      {pendingHistory && (
        <HistoryImportModal
          bundle={pendingHistory}
          patients={patients}
          onCreateAndAssign={assignHistoryToNewPatient}
          onAssignExisting={assignHistoryToExistingPatient}
          onDismiss={() => setPendingHistory(null)}
        />
      )}
    </main>
  );
}
