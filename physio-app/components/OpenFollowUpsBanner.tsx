"use client";

import { CheckIn } from "@/lib/types";
import { getOpenFollowUps } from "@/lib/followUps";
import EntryCard from "./EntryCard";

// Erinnert direkt beim Öffnen des "Heute"-Tabs an fällige 24h/48h-Nachträge,
// statt sich auf den Hinweistext beim Speichern zu verlassen, den man
// leicht wieder vergisst.
export default function OpenFollowUpsBanner({
  entries,
  onUpdate,
  onDelete,
}: {
  entries: CheckIn[];
  onUpdate: (id: string, patch: Partial<CheckIn>) => void;
  onDelete: (id: string) => void;
}) {
  const open = getOpenFollowUps(entries);
  if (open.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-amber-800">
        Offene Nachträge ({open.length}) – Schmerz nach 24h/48h eintragen
      </p>
      {open.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onUpdate={onUpdate} onDelete={onDelete} defaultFollowUpOpen />
      ))}
    </div>
  );
}
