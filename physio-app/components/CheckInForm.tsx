"use client";

import { useState } from "react";
import { getRegion } from "@/lib/regions";
import { CheckIn, PlanExercise } from "@/lib/types";
import PainSlider from "./PainSlider";
import ActivityPicker from "./ActivityPicker";

interface Props {
  regionId: string;
  planExercises?: PlanExercise[];
  otherRegionIds?: string[];
  onSubmit: (entry: Omit<CheckIn, "id" | "createdAt">) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckInForm({ regionId, planExercises, otherRegionIds, onSubmit }: Props) {
  const region = getRegion(regionId);
  const [date, setDate] = useState(today());
  const [activity, setActivity] = useState("");
  const [durationMin, setDurationMin] = useState<string>("");
  const [painBefore, setPainBefore] = useState(0);
  const [painAfter, setPainAfter] = useState(0);
  const [notes, setNotes] = useState("");
  const [relatedRegionId, setRelatedRegionId] = useState("");
  const [saved, setSaved] = useState(false);
  const [showRule, setShowRule] = useState(false);

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
      relatedRegionId: relatedRegionId || undefined,
    });
    setActivity("");
    setDurationMin("");
    setPainBefore(0);
    setPainAfter(0);
    setNotes("");
    setRelatedRegionId("");
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
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Reiz / Aktivität (Belastung oder Entlastung)
          </label>
          <button
            type="button"
            onClick={() => setShowRule((v) => !v)}
            className="text-xs text-brand-700 underline underline-offset-2 mb-1"
          >
            Was trage ich hier ein?
          </button>
        </div>
        {showRule && (
          <div className="mb-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1.5">
            <p>
              <span className="font-medium text-slate-800">Eintragen</span>, wenn Du bewusst etwas belastet hast,
              das mit diesem Bereich zu tun hat (z. B. Training, eine Bewegung, vor der Du Respekt hast) – auch
              wenn&apos;s schmerzfrei blieb. Oder wenn der Schmerz danach anders war als erwartet.
            </p>
            <p>
              <span className="font-medium text-slate-800">Nicht eintragen</span>: normale Alltagsbewegungen ohne
              besonderen Belastungscharakter, oder Schmerz &quot;einfach so&quot;, ohne erkennbaren Auslöser.
            </p>
            <p className="text-slate-500 italic">
              Kurz: ein Belastungs-Tagebuch, kein Schmerz-Tagebuch.
            </p>
          </div>
        )}
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

      {otherRegionIds && otherRegionIds.length > 0 && (
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Hängt das für Dich mit einer anderen Region zusammen? (optional)
          </label>
          <p className="text-xs text-slate-500 mb-1">
            Deine eigene Einschätzung, z. B. wenn der Rücken in den Oberschenkel ausstrahlt – kein automatischer
            Befund.
          </p>
          <select
            value={relatedRegionId}
            onChange={(e) => setRelatedRegionId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Nein / nicht sicher</option>
            {otherRegionIds.map((id) => (
              <option key={id} value={id}>
                {getRegion(id).label}
              </option>
            ))}
          </select>
        </div>
      )}

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
