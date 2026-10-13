"use client";

import { CheckIn } from "@/lib/types";
import { groupByActivity, ActivityVerdict } from "@/lib/activityReliability";
import RecoveryStrip from "./RecoveryStrip";

const VERDICT_STYLE: Record<ActivityVerdict, string> = {
  steigerbar: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  uneinheitlich: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
  ungeeignet: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  zu_wenig_daten: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
};

const VERDICT_LABEL: Record<ActivityVerdict, string> = {
  steigerbar: "Bisher zuverlässig grün – steigerbar",
  uneinheitlich: "Uneinheitlich – noch beobachten",
  ungeeignet: "Mindestens einmal rot – noch nicht steigern",
  zu_wenig_daten: "Noch zu wenig Daten",
};

export default function ActivityReliability({ entries }: { entries: CheckIn[] }) {
  const stats = groupByActivity(entries);
  if (stats.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Verlässlichkeit je Aktivität</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Eigene Einordnung (keine validierte Regel): ab 3 ausgewerteten Einträgen zur selben Aktivität – war sie
          durchgehend grün, spricht das für eine steigerbare Belastung; ein einziges Rot reicht für "noch nicht".
        </p>
      </div>

      <div className="space-y-3">
        {stats.map((s) => (
          <div key={s.activity} className="pt-3 border-t border-slate-100 dark:border-slate-800 first:border-t-0 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.activity}</p>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${VERDICT_STYLE[s.verdict]}`}>
                {VERDICT_LABEL[s.verdict]}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {s.points.length} {s.points.length === 1 ? "Eintrag" : "Einträge"} · {s.counts.GREEN}× Grün,{" "}
              {s.counts.YELLOW}× Gelb, {s.counts.RED}× Rot
              {s.counts.PENDING > 0 ? `, ${s.counts.PENDING}× offen` : ""}
            </p>
            <div className="mt-2">
              <RecoveryStrip points={s.points} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
