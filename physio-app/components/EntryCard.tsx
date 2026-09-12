"use client";

import { useState } from "react";
import { CheckIn } from "@/lib/types";
import { assess } from "@/lib/trafficLight";
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
}: {
  entry: CheckIn;
  onUpdate: (id: string, patch: Partial<CheckIn>) => void;
  onDelete: (id: string) => void;
}) {
  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [pain24h, setPain24h] = useState(entry.pain24h ?? entry.painAfter);
  const [pain48h, setPain48h] = useState(entry.pain48h ?? entry.painAfter);
  const a = assess(entry);

  function saveFollowUp() {
    onUpdate(entry.id, { pain24h, pain48h });
    setEditingFollowUp(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900">{entry.activity}</p>
          <p className="text-xs text-slate-500">
            {formatDate(entry.date)}
            {entry.durationMin ? ` · ${entry.durationMin} Min.` : ""}
          </p>
        </div>
        <TrafficLightBadge light={a.overall} size="lg" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
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

      <p className="text-sm text-slate-700">{a.explanation}</p>
      <p className="text-sm font-medium text-slate-900">→ {a.recommendation}</p>

      {entry.notes && <p className="text-xs text-slate-500 italic">{entry.notes}</p>}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="text-slate-500">
          Schmerz davor {entry.painBefore} · danach {entry.painAfter}
          {entry.pain24h !== undefined && ` · 24h ${entry.pain24h}`}
          {entry.pain48h !== undefined && ` · 48h ${entry.pain48h}`}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEditingFollowUp((v) => !v)} className="text-teal-700 font-medium">
            Verlauf nachtragen
          </button>
          <button onClick={() => onDelete(entry.id)} className="text-slate-400">
            Löschen
          </button>
        </div>
      </div>

      {editingFollowUp && (
        <div className="pt-2 space-y-3">
          <div>
            <label className="text-xs text-slate-600 block mb-1">Schmerz nach 24h: {pain24h}/10</label>
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
            <label className="text-xs text-slate-600 block mb-1">Schmerz nach 48h: {pain48h}/10</label>
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
            className="w-full rounded-lg bg-teal-700 text-white text-sm font-medium py-2"
          >
            Speichern
          </button>
        </div>
      )}
    </div>
  );
}
