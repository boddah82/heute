"use client";

import { useState } from "react";
import { CheckIn } from "@/lib/types";
import { assess } from "@/lib/trafficLight";
import { getRegion } from "@/lib/regions";
import TrafficLightBadge from "./TrafficLightBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function EntryCard({
  entry,
  onUpdate,
  onDelete,
  defaultFollowUpOpen,
}: {
  entry: CheckIn;
  onUpdate: (id: string, patch: Partial<CheckIn>) => void;
  onDelete: (id: string) => void;
  defaultFollowUpOpen?: boolean;
}) {
  const [editingFollowUp, setEditingFollowUp] = useState(!!defaultFollowUpOpen);
  const [pain24h, setPain24h] = useState(entry.pain24h ?? entry.painAfter);
  const [pain48h, setPain48h] = useState(entry.pain48h ?? entry.painAfter);
  const a = assess(entry);

  function saveFollowUp() {
    onUpdate(entry.id, { pain24h, pain48h });
    setEditingFollowUp(false);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.activity}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(entry.date)}
            {entry.durationMin ? ` · ${entry.durationMin} Min.` : ""}
          </p>
        </div>
        <TrafficLightBadge light={a.overall} size="lg" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-col gap-0.5">
          <span>Intensität</span>
          <TrafficLightBadge light={a.intensity} size="sm" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span>Anstieg</span>
          <TrafficLightBadge light={a.spike} size="sm" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span>Erholung</span>
          <TrafficLightBadge light={a.recovery} size="sm" />
        </div>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-300">{a.explanation}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">→ {a.recommendation}</p>

      {entry.notes && <p className="text-xs text-slate-500 dark:text-slate-400 italic">{entry.notes}</p>}

      {entry.relatedRegionId && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mögliche Verbindung (eigene Einschätzung): {getRegion(entry.relatedRegionId).label}
        </p>
      )}

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="text-slate-500 dark:text-slate-400">
          Schmerz davor {entry.painBefore} · danach {entry.painAfter}
          {entry.pain24h !== undefined && ` · 24h ${entry.pain24h}`}
          {entry.pain48h !== undefined && ` · 48h ${entry.pain48h}`}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEditingFollowUp((v) => !v)} className="text-brand-700 dark:text-brand-300 font-medium">
            Verlauf nachtragen
          </button>
          <button onClick={() => onDelete(entry.id)} className="text-slate-400 dark:text-slate-500">
            Löschen
          </button>
        </div>
      </div>

      {editingFollowUp && (
        <div className="pt-2 space-y-3">
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Schmerz nach 24h: {pain24h}/10</label>
            <input
              type="range"
              min={0}
              max={10}
              value={pain24h}
              onChange={(e) => setPain24h(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Schmerz nach 48h: {pain48h}/10</label>
            <input
              type="range"
              min={0}
              max={10}
              value={pain48h}
              onChange={(e) => setPain48h(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <button
            onClick={saveFollowUp}
            className="w-full rounded-lg bg-brand-700 text-white text-sm font-medium py-2"
          >
            Speichern
          </button>
        </div>
      )}
    </div>
  );
}
