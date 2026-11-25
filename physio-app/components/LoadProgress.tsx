"use client";

import { CheckIn } from "@/lib/types";
import { assess } from "@/lib/trafficLight";
import MiniLineChart from "./MiniLineChart";

// Belastungsverlauf je Aktivität: Dauer (Min.) über die Zeit, Punkte in
// Ampelfarbe. Beantwortet die Frage "Wie viel geht inzwischen?" – z. B.
// Schlagzeug von 30 Min. auf 3 Std. Nur Aktivitäten mit mind. 3 Einträgen
// mit Dauer; gleiche Schreibweise wie in "Verlässlichkeit je Aktivität".

const MIN_ENTRIES = 3;

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h} Std.` : `${h} Std. ${rest} Min.`;
}

function niceMax(v: number): number {
  const step = v > 120 ? 60 : v > 40 ? 30 : 10;
  return Math.max(step, Math.ceil(v / step) * step);
}

export default function LoadProgress({ entries }: { entries: CheckIn[] }) {
  const groups = new Map<string, CheckIn[]>();
  for (const e of entries) {
    if (!e.durationMin) continue;
    const key = e.activity.trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const series = Array.from(groups.values())
    .filter((g) => g.length >= MIN_ENTRIES)
    .map((g) => {
      const sorted = [...g].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const first = sorted[0].durationMin!;
      const last = sorted[sorted.length - 1].durationMin!;
      const max = Math.max(...sorted.map((e) => e.durationMin!));
      return { label: sorted[sorted.length - 1].activity, sorted, first, last, max };
    })
    .sort((a, b) => b.sorted.length - a.sorted.length);

  if (series.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Belastungsverlauf je Aktivität</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Dauer pro Einheit über die Zeit, Punkte in Ampelfarbe. Ab {MIN_ENTRIES} Einträgen mit Dauer.
        </p>
      </div>

      {series.map((s) => {
        const change = s.last - s.first;
        const changeStyle =
          change > 0
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
            : change < 0
            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
        const changeLabel =
          change === 0
            ? "unverändert"
            : `${change > 0 ? "+" : "−"}${formatMinutes(Math.abs(change))}${
                s.first > 0 && change > 0 ? ` (×${(s.last / s.first).toLocaleString("de-DE", { maximumFractionDigits: 1 })})` : ""
              }`;
        return (
          <div key={s.label} className="pt-3 border-t border-slate-100 dark:border-slate-800 first:border-t-0 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start {formatMinutes(s.first)} → zuletzt {formatMinutes(s.last)}
                  {s.max > s.last ? ` · Höchstwert ${formatMinutes(s.max)}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${changeStyle}`}>{changeLabel}</span>
            </div>
            <MiniLineChart
              points={s.sorted.map((e) => ({
                date: e.date,
                value: e.durationMin!,
                status: assess(e).overall,
                tooltipValue: formatMinutes(e.durationMin!),
              }))}
              yMax={niceMax(s.max * 1.15)}
              height={110}
            />
          </div>
        );
      })}
    </div>
  );
}
