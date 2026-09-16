"use client";

import { useState } from "react";
import { getRegion } from "@/lib/regions";
import { CheckIn, PlanExercise } from "@/lib/types";
import PainSlider from "./PainSlider";
import ActivityPicker from "./ActivityPicker";

interface Props {
  regionId: string;
  planExercises?: PlanExercise[];
  onSubmit: (entry: Omit<CheckIn, "id" | "createdAt">) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckInForm({ regionId, planExercises, onSubmit }: Props) {
  const region = getRegion(regionId);
  const [date, setDate] = useState(today());
  const [activity, setActivity] = useState("");
  const [durationMin, setDurationMin] = useState<string>("");
  const [painBefore, setPainBefore] = useState(0);
  const [painAfter, setPainAfter] = useState(0);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activity.trim()) return;
    onSubmit({
      regionId,
      date,
      activity: activity.trim(),
      durationMin: durationMin ? Number(durationMin) : undefined,
      painBefore,
      painAfter,
      notes: notes.trim() || undefined,
    });
    setActivity("");
    setDurationMin("");
    setPainBefore(0);
    setPainAfter(0);
    setNotes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg p-5 shadow-sm border border-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Dauer (Min., optional)</label>
          <input
            type="number"
            min={0}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="z. B. 30"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">
          Reiz / Aktivität (Belastung oder Entlastung)
        </label>
        <div className="mb-2">
          <ActivityPicker planExercises={planExercises} onPick={setActivity} />
        </div>
        <input
          type="text"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          list="activity-suggestions"
          placeholder={region.exampleReize[0] ?? "z. B. langes Sitzen"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <datalist id="activity-suggestions">
          {region.exampleReize.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      <div className="space-y-4">
        <PainSlider label="Schmerz davor" value={painBefore} onChange={setPainBefore} />
        <PainSlider label="Schmerz direkt danach" value={painAfter} onChange={setPainAfter} />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Notizen (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Besonderheiten, z. B. ungewohnte Belastung am Vortag"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition"
      >
        Check-in speichern
      </button>
      {saved && (
        <p className="text-sm text-emerald-600 text-center">Gespeichert. Trage den Verlauf nach 24h/48h im Reiter &quot;Verlauf&quot; nach.</p>
      )}
    </form>
  );
}
