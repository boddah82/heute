"use client";

import { useEffect, useState } from "react";
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
import { useActiveRegion, useCheckIns, usePDDMAssessments, usePlan, importPlan } from "@/lib/storage";
import { readPlanFromLocation, clearPlanFromUrl } from "@/lib/planLink";
import { getRegion } from "@/lib/regions";

type Tab = "heute" | "rechner" | "verlauf" | "pddm" | "wissen" | "plan";

export default function Home() {
  const { regionId, select } = useActiveRegion("knie");
  const { entries, addEntry, updateEntry, deleteEntry } = useCheckIns(regionId);
  const { assessments, addAssessment, deleteAssessment } = usePDDMAssessments(regionId);
  const { plan, setPlan } = usePlan(regionId);
  const [tab, setTab] = useState<Tab>("heute");
  const [showPDDMForm, setShowPDDMForm] = useState(false);

  useEffect(() => {
    const incoming = readPlanFromLocation();
    if (!incoming) return;
    const region = getRegion(incoming.regionId);
    const confirmed = window.confirm(
      `Trainingsplan für "${region.label}" von Deiner Therapeutin/Deinem Therapeuten laden? Ein evtl. vorhandener Plan für diesen Bereich wird ersetzt.`
    );
    clearPlanFromUrl();
    if (!confirmed) return;
    importPlan(incoming);
    select(incoming.regionId);
    // Einmaliger Import, ausgelöst durch einen externen Link-Parameter (nicht
    // durch Render-State) – die Auswahl des Tabs ist Teil dieser Aktion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab("heute");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      </div>
    </main>
  );
}
