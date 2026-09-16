"use client";

import { TrainingPlan } from "@/lib/types";
import { getRegion } from "@/lib/regions";

interface Props {
  plan: TrainingPlan;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function PlanImportModal({ plan, onConfirm, onDismiss }: Props) {
  const region = getRegion(plan.regionId);

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Trainingsplan gefunden</h2>
          <p className="text-sm text-slate-600 mt-1">
            Deine Therapeutin/Dein Therapeut hat einen Trainingsplan für &quot;{region.label}&quot; geschickt
            ({plan.exercises.length} Übung{plan.exercises.length === 1 ? "" : "en"}). Ein evtl. vorhandener
            Plan für diesen Bereich wird dabei ersetzt.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition"
          >
            Plan übernehmen
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 rounded-lg bg-slate-100 text-slate-700 font-medium py-2.5 text-sm"
          >
            Verwerfen
          </button>
        </div>
      </div>
    </div>
  );
}
