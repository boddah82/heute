"use client";

import { useState } from "react";
import { PSFSGoal, PSFSRating } from "@/lib/types";

const MAX_GOALS = 5;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function GoalCard({
  goal,
  ratings,
  onRate,
  onDelete,
}: {
  goal: PSFSGoal;
  ratings: PSFSRating[];
  onRate: (value: number) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(5);
  const [showHistory, setShowHistory] = useState(false);

  const sorted = [...ratings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sorted[0];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-900">{goal.label}</p>
        <button onClick={onDelete} className="text-xs text-slate-400 shrink-0">
          Entfernen
        </button>
      </div>

      {latest && (
        <p className="text-sm text-slate-500">
          Letzte Bewertung: <span className="font-semibold text-brand-800">{latest.value}/10</span>{" "}
          ({formatDate(latest.date)})
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-slate-700">
            Wie nah bist Du dran, &quot;{goal.label}&quot; wieder zu können?
          </label>
          <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0 ml-2">{value}/10</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-2 rounded-lg cursor-pointer accent-brand-700"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0 = aktuell gar nicht möglich</span>
          <span>10 = wieder möglich</span>
        </div>
      </div>

      <button
        onClick={() => onRate(value)}
        className="w-full rounded-lg bg-brand-700 text-white font-semibold py-2 text-sm hover:bg-brand-800 transition"
      >
        Bewertung speichern
      </button>

      {sorted.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-medium text-brand-700 underline underline-offset-2"
          >
            {showHistory ? "Verlauf ausblenden" : `Verlauf anzeigen (${sorted.length})`}
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {sorted.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>{formatDate(r.date)}</span>
                  <span className="font-medium">{r.value}/10</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function PSFSPanel({
  goals,
  ratings,
  onAddGoal,
  onDeleteGoal,
  onRate,
}: {
  goals: PSFSGoal[];
  ratings: PSFSRating[];
  onAddGoal: (label: string) => void;
  onDeleteGoal: (id: string) => void;
  onRate: (goalId: string, value: number) => void;
}) {
  const [newLabel, setNewLabel] = useState("");

  function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    onAddGoal(label);
    setNewLabel("");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-slate-900">Deine Ziele</h3>
        <p className="text-sm text-slate-600">
          Nenne 2-5 konkrete Alltags- oder Sportaktivitäten, die Dir wirklich wichtig sind – nicht was
          andere für wichtig halten (z. B. &quot;Schraubglas aufschrauben&quot;, &quot;Bouldern&quot;,
          &quot;mit links eine Tasse halten&quot;). Bewerte dann regelmäßig, wie nah Du daran bist, das
          wieder zu können.
        </p>

        {goals.length < MAX_GOALS ? (
          <form onSubmit={addGoal} className="flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="z. B. Schraubglas aufschrauben"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-medium"
            >
              Hinzufügen
            </button>
          </form>
        ) : (
          <p className="text-xs text-slate-400">
            Maximal {MAX_GOALS} Ziele gleichzeitig – lieber wenige, dafür wirklich bedeutsame.
          </p>
        )}
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Noch keine Ziele für diesen Bereich hinterlegt.
        </p>
      ) : (
        goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            ratings={ratings.filter((r) => r.goalId === goal.id)}
            onRate={(value) => onRate(goal.id, value)}
            onDelete={() => onDeleteGoal(goal.id)}
          />
        ))
      )}
    </div>
  );
}
