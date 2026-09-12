"use client";

import { useState } from "react";
import RegionSelector from "@/components/RegionSelector";
import CheckInForm from "@/components/CheckInForm";
import EntryCard from "@/components/EntryCard";
import PDDMForm from "@/components/PDDMForm";
import PDDMResultCard from "@/components/PDDMResultCard";
import { useActiveRegion, useCheckIns, usePDDMAssessments } from "@/lib/storage";

type Tab = "heute" | "verlauf" | "pddm";

export default function Home() {
  const { regionId, select } = useActiveRegion("knie");
  const { entries, addEntry, updateEntry, deleteEntry } = useCheckIns(regionId);
  const { assessments, addAssessment, deleteAssessment } = usePDDMAssessments(regionId);
  const [tab, setTab] = useState<Tab>("heute");
  const [showPDDMForm, setShowPDDMForm] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-teal-800 text-white px-4 pt-6 pb-4">
        <h1 className="text-lg font-semibold">Reiz-Reaktions-Tracker</h1>
        <p className="text-sm text-teal-100">Belastbarkeit verstehen statt raten.</p>
      </header>

      <div className="px-4 pt-4">
        <RegionSelector value={regionId} onChange={select} />
      </div>

      <nav className="px-4 mt-2 flex gap-2">
        {[
          { id: "heute" as Tab, label: "Heute" },
          { id: "verlauf" as Tab, label: `Verlauf (${entries.length})` },
          { id: "pddm" as Tab, label: "Bereiche" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
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
        {tab === "heute" && <CheckInForm regionId={regionId} onSubmit={addEntry} />}

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
      </div>
    </main>
  );
}
