"use client";

import { useState } from "react";
import { HistoryBundle, Patient } from "@/lib/types";

interface Props {
  bundle: HistoryBundle;
  patients: Patient[];
  onCreateAndAssign: (name: string) => void;
  onAssignExisting: (patientId: string) => void;
  onDismiss: () => void;
}

export default function HistoryImportModal({
  bundle,
  patients,
  onCreateAndAssign,
  onAssignExisting,
  onDismiss,
}: Props) {
  const [newName, setNewName] = useState("");

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreateAndAssign(name);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Verlauf empfangen</h2>
          <p className="text-sm text-slate-600 mt-1">
            Ein Patient hat einen Verlauf geschickt ({bundle.checkIns.length} Check-in
            {bundle.checkIns.length === 1 ? "" : "s"}). Welchem Mandanten soll er zugeordnet werden?
          </p>
        </div>

        {patients.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Bestehender Mandant</p>
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => onAssignExisting(p.id)}
                className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submitNew} className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Neuer Mandant</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-medium hover:bg-brand-800 transition"
            >
              Anlegen &amp; zuordnen
            </button>
          </div>
        </form>

        <button onClick={onDismiss} className="w-full rounded-lg bg-slate-100 text-slate-700 font-medium py-2 text-sm">
          Verwerfen
        </button>
      </div>
    </div>
  );
}
