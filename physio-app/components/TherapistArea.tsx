"use client";

import { useState } from "react";
import { Patient } from "@/lib/types";
import { usePlan, usePatientRecord, buildHistoryBundle, importPatientRecord } from "@/lib/storage";
import RegionSelector from "./RegionSelector";
import PlanBuilder from "./PlanBuilder";
import PatientRecordView from "./PatientRecordView";
import PatientDataEntry from "./PatientDataEntry";
import DemoPatientPicker from "./DemoPatientPicker";

type SubTab = "mandanten" | "plan" | "vorschau";
type MandantView = "eingabe" | "uebersicht";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function PlanSection() {
  const [regionId, setRegionId] = useState("knie");
  const { plan, setPlan } = usePlan(regionId);
  return (
    <div className="space-y-4">
      <RegionSelector value={regionId} onChange={setRegionId} />
      <PlanBuilder regionId={regionId} plan={plan} onSave={setPlan} />
    </div>
  );
}

export default function TherapistArea({
  patients,
  activePatientId,
  onSelectPatient,
  onAddPatient,
  onDeletePatient,
  onDemoLoaded,
}: {
  patients: Patient[];
  activePatientId: string | null;
  onSelectPatient: (id: string) => void;
  onAddPatient: (name: string) => void;
  onDeletePatient: (id: string) => void;
  onDemoLoaded: (regionId: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("mandanten");
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [mandantView, setMandantView] = useState<MandantView>("eingabe");

  function importOwnDeviceData(patientId: string) {
    importPatientRecord(patientId, buildHistoryBundle());
    setImported(true);
    setTimeout(() => setImported(false), 2000);
  }

  function addPatient(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onAddPatient(name);
    setNewName("");
  }

  const activePatient = patients.find((p) => p.id === activePatientId);
  const { record: activeRecord } = usePatientRecord(activePatientId);

  return (
    <div className="space-y-4">
      <nav className="flex gap-2">
        {[
          { id: "mandanten" as SubTab, label: "Mandanten" },
          { id: "plan" as SubTab, label: "Plan erstellen" },
          { id: "vorschau" as SubTab, label: "Testvorschau" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium border ${
              subTab === t.id
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {subTab === "mandanten" && (
        <div className="space-y-4">
          <form onSubmit={addPatient} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name des neuen Mandanten"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-medium hover:bg-brand-800 transition">
              Anlegen
            </button>
          </form>

          {patients.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Noch keine Mandanten angelegt. Ein Mandant entsteht auch automatisch, wenn Du einen Verlauf-Link öffnest.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPatient(p.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium border ${
                    activePatientId === p.id
                      ? "bg-brand-50 border-brand-200 text-brand-900"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {activePatient && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{activePatient.name}</h3>
                  <p className="text-xs text-slate-400">Angelegt am {formatDate(activePatient.createdAt)}</p>
                </div>
                {confirmDeleteId === activePatient.id ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onDeletePatient(activePatient.id);
                        setConfirmDeleteId(null);
                      }}
                      className="text-xs font-medium text-red-600"
                    >
                      Wirklich löschen
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-400">
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(activePatient.id)} className="text-xs text-slate-400 shrink-0">
                    Mandant löschen
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {[
                  { id: "eingabe" as MandantView, label: "Daten eingeben" },
                  { id: "uebersicht" as MandantView, label: "Übersicht" },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setMandantView(v.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium border ${
                      mandantView === v.id
                        ? "bg-brand-700 text-white border-brand-700"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {mandantView === "eingabe" ? (
                <PatientDataEntry patientId={activePatient.id} />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => importOwnDeviceData(activePatient.id)}
                      className="text-xs font-medium text-brand-700 underline underline-offset-2"
                    >
                      Eigene Testdaten dieses Geräts übernehmen
                    </button>
                    {imported && <span className="text-xs text-emerald-700">Importiert ✓</span>}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Nur zum Testen: übernimmt Deinen eigenen Tracking-Stand (Heute/Bereiche/Ziele/Fragebögen auf
                    diesem Gerät) direkt in diesen Mandanten, ohne Link – ersetzt einen evtl. vorhandenen echten
                    Verlauf.
                  </p>

                  {activeRecord ? (
                    <PatientRecordView record={activeRecord} />
                  ) : (
                    <p className="text-sm text-slate-500">
                      Noch keine Daten. Trage sie unter &quot;Daten eingeben&quot; direkt ein, oder der Patient
                      schickt Dir per &quot;Verlauf an Therapeut senden&quot; einen Link zum Importieren.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {subTab === "plan" && <PlanSection />}

      {subTab === "vorschau" && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
          <p className="text-sm text-slate-600">
            Lädt Testdaten in die Patientenansicht dieses Geräts, um sie auszuprobieren – nicht für echte Mandanten gedacht.
          </p>
          <DemoPatientPicker onLoaded={onDemoLoaded} variant="onLight" />
        </div>
      )}
    </div>
  );
}
