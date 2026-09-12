"use client";

import { useState } from "react";
import { ACTIVITY_ICONS } from "@/lib/activityIcons";
import { PlanExercise, TrainingPlan } from "@/lib/types";
import { buildPlanLink } from "@/lib/planLink";
import { getRegion } from "@/lib/regions";

interface Props {
  regionId: string;
  plan?: TrainingPlan;
  onSave: (plan: TrainingPlan) => void;
}

function newExercise(label: string, icon: string): PlanExercise {
  return { id: crypto.randomUUID(), label, icon };
}

export default function PlanBuilder({ regionId, plan, onSave }: Props) {
  const region = getRegion(regionId);
  const [exercises, setExercises] = useState<PlanExercise[]>(plan?.exercises ?? []);
  const [customLabel, setCustomLabel] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function addFromIcon(label: string, icon: string) {
    if (exercises.some((e) => e.label === label)) return;
    setExercises((prev) => [...prev, newExercise(label, icon)]);
    setLink(null);
  }

  function addCustom() {
    const label = customLabel.trim();
    if (!label) return;
    setExercises((prev) => [...prev, newExercise(label, "✨")]);
    setCustomLabel("");
    setLink(null);
  }

  function updateNotes(id: string, notes: string) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, notes: notes || undefined } : e)));
    setLink(null);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
    setLink(null);
  }

  function generateLink() {
    const newPlan: TrainingPlan = {
      regionId,
      exercises,
      createdAt: new Date().toISOString(),
    };
    onSave(newPlan);
    setLink(buildPlanLink(newPlan));
    setCopied(false);
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage evtl. nicht erlaubt – Link bleibt zum manuellen Kopieren sichtbar.
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900">Trainingsplan für {region.label}</h3>
        <p className="text-sm text-slate-600 mt-1">
          Stell hier die Übungen zusammen, die Du für diesen Bereich vorgibst. Am Ende bekommst Du
          einen Link, den Du dem Patienten schickst – beim Öffnen wird der Plan auf seinem Gerät
          geladen (kein Konto, keine Anmeldung nötig).
        </p>
      </div>

      {exercises.length > 0 && (
        <div className="space-y-2">
          {exercises.map((ex) => (
            <div key={ex.id} className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <span className="text-lg">{ex.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{ex.label}</p>
                <input
                  type="text"
                  value={ex.notes ?? ""}
                  onChange={(e) => updateNotes(ex.id, e.target.value)}
                  placeholder="Notiz, z. B. 3x12, Pause 60s"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => removeExercise(ex.id)}
                className="text-slate-400 text-xs shrink-0"
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">Übung hinzufügen</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_ICONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => addFromIcon(a.label, a.icon)}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              <span>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Eigene Übung eingeben"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-lg bg-slate-100 text-slate-700 px-3 py-2 text-sm font-medium"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={generateLink}
        disabled={exercises.length === 0}
        className="w-full rounded-xl bg-teal-700 text-white font-semibold py-2.5 text-sm hover:bg-teal-800 transition disabled:opacity-40"
      >
        Plan speichern &amp; Link erstellen
      </button>

      {link && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500">Link zum Weitergeben</p>
          <textarea
            readOnly
            value={link}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono resize-none"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={copyLink}
            className="w-full rounded-xl bg-slate-100 text-slate-700 font-medium py-2 text-sm"
          >
            {copied ? "Kopiert ✓" : "Link kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}
