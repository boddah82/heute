"use client";

import { useMemo } from "react";
import { CheckIn } from "@/lib/types";
import { assess, LIGHT_HEX, LIGHT_COLORS } from "@/lib/trafficLight";
import { computeTrend, TREND_LABEL, TREND_COLOR } from "@/lib/painTrend";
import BeforeAfterChart from "./BeforeAfterChart";
import MiniLineChart from "./MiniLineChart";
import RecoveryStrip from "./RecoveryStrip";

export default function PainTrendChart({ entries }: { entries: CheckIn[] }) {
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date < b.date ? -1 : 1
      ),
    [entries]
  );

  const beforeAfterPoints = useMemo(
    () => sorted.map((e) => ({ date: e.date, before: e.painBefore, after: e.painAfter })),
    [sorted]
  );

  const spikePoints = useMemo(
    () =>
      sorted.map((e) => {
        const a = assess(e);
        return {
          date: e.date,
          value: Math.max(0, a.spikeValue),
          status: a.spike,
          tooltipValue: `${a.spikeValue > 0 ? "+" : ""}${a.spikeValue}`,
        };
      }),
    [sorted]
  );

  const spikeYMax = useMemo(() => {
    const maxSpike = Math.max(0, ...spikePoints.map((p) => p.value));
    return Math.max(2, Math.ceil(maxSpike / 2) * 2);
  }, [spikePoints]);

  const recoveryPoints = useMemo(
    () => sorted.map((e) => ({ date: e.date, status: assess(e).recovery })),
    [sorted]
  );

  const trend = useMemo(
    () => computeTrend(sorted.map((e) => Math.max(e.painBefore, e.painAfter))),
    [sorted]
  );

  const statuses: (keyof typeof LIGHT_COLORS)[] = ["GREEN", "YELLOW", "RED", "PENDING"];

  if (sorted.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-1">Schmerzverlauf</h3>
        <p className="text-sm text-slate-500">
          Ab zwei Check-ins zeigt Dir hier ein Diagramm auf einen Blick, ob sich Dein Schmerz eher
          verbessert oder verschlechtert.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-slate-900">Schmerzverlauf</h3>
        <p className={`text-sm font-medium ${TREND_COLOR[trend]}`}>{TREND_LABEL[trend]}</p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-1">Schmerz davor &amp; danach</p>
        <BeforeAfterChart points={beforeAfterPoints} />
        <p className="text-xs text-slate-400 mt-1">Die genauen Werte, die Du je Check-in eingetragen hast.</p>
      </div>

      <div className="pt-1 border-t border-slate-100">
        <p className="text-sm font-medium text-slate-700 mb-1">Anstieg durch die Aktivität</p>
        <MiniLineChart points={spikePoints} yMax={spikeYMax} fillColor="#b45309" />
        <p className="text-xs text-slate-400 mt-1">
          Differenz &quot;danach minus davor&quot; – andere Skala als oben. 0 = kein Anstieg durch die
          Aktivität, höher = stärkerer Anstieg.
        </p>
      </div>

      <div className="pt-1 border-t border-slate-100">
        <p className="text-sm font-medium text-slate-700 mb-1">Erholung</p>
        <RecoveryStrip points={recoveryPoints} />
        <p className="text-xs text-slate-400 mt-1">
          Wie schnell der Schmerz wieder auf dem Ausgangsniveau war (Grün &lt;24h, Gelb 24–48h, Rot
          weiterhin erhöht, Grau: Nachtrag fehlt noch).
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-slate-100">
        {statuses.map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LIGHT_HEX[s] }} />
            {LIGHT_COLORS[s].label}
          </span>
        ))}
        <span className="text-xs text-slate-400">(Punktfarben bei &quot;Anstieg&quot; und &quot;Erholung&quot;)</span>
      </div>
    </div>
  );
}
