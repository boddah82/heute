"use client";

import { ACTIVITY_ICONS } from "@/lib/activityIcons";
import { PlanExercise } from "@/lib/types";

interface Props {
  planExercises?: PlanExercise[];
  onPick: (label: string) => void;
}

export default function ActivityPicker({ planExercises, onPick }: Props) {
  return (
    <div className="space-y-2">
      {planExercises && planExercises.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Dein Plan</p>
          <div className="flex flex-wrap gap-2">
            {planExercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex.label)}
                title={ex.notes}
                className="flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1.5 text-sm text-teal-900"
              >
                <span>{ex.icon}</span>
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">
          {planExercises && planExercises.length > 0 ? "Weitere Aktivitäten" : "Schnellauswahl"}
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_ICONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a.label)}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              <span>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
