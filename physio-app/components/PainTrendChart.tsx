"use client";

import { useId, useMemo } from "react";
import { CheckIn } from "@/lib/types";
import { assess, LIGHT_HEX, LIGHT_COLORS } from "@/lib/trafficLight";
import { computeTrend, TREND_LABEL, TREND_COLOR } from "@/lib/painTrend";

const WIDTH = 320;
const HEIGHT = 140;
const PADDING_X = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28; // Platz für x-Achsen-Beschriftung, nicht abgeschnitten

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

export default function PainTrendChart({ entries }: { entries: CheckIn[] }) {
  const gradientId = useId();

  const points = useMemo(() => {
    return [...entries]
      .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date < b.date ? -1 : 1))
      .map((entry) => ({
        date: entry.date,
        value: Math.max(entry.painBefore, entry.painAfter),
        status: assess(entry).overall,
      }));
  }, [entries]);

  const trend = useMemo(() => computeTrend(points.map((p) => p.value)), [points]);

  if (points.length < 2) {
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

  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  function xFor(i: number) {
    return PADDING_X + i * stepX;
  }
  function yFor(value: number) {
    return PADDING_TOP + plotHeight * (1 - value / 10);
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value)}`).join(" ");

  const last = points[points.length - 1];
  const labelIndices = new Set([0, points.length - 1]);
  if (points.length > 4) labelIndices.add(Math.floor((points.length - 1) / 2));

  const statuses: (keyof typeof LIGHT_COLORS)[] = ["GREEN", "YELLOW", "RED", "PENDING"];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-slate-900">Schmerzverlauf</h3>
        <p className={`text-sm font-medium ${TREND_COLOR[trend]}`}>{TREND_LABEL[trend]}</p>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Schmerzverlauf über Zeit">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive Gridlines bei 0 / 5 / 10 */}
        {[0, 5, 10].map((v) => (
          <line
            key={v}
            x1={PADDING_X}
            x2={WIDTH - PADDING_X}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}

        {/* Flächenfüllung unter der Linie */}
        <path
          d={`${linePath} L ${xFor(points.length - 1)} ${yFor(0)} L ${xFor(0)} ${yFor(0)} Z`}
          fill={`url(#${gradientId})`}
        />

        {/* Linie */}
        <path d={linePath} fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Punkte, eingefärbt nach Ampel-Status */}
        {points.map((p, i) => (
          <g key={i}>
            {/* größerer, unsichtbarer Hit-Bereich fürs Hover */}
            <circle cx={xFor(i)} cy={yFor(p.value)} r={12} fill="transparent">
              <title>
                {formatShortDate(p.date)}: {p.value}/10 ({LIGHT_COLORS[p.status].label})
              </title>
            </circle>
            <circle
              cx={xFor(i)}
              cy={yFor(p.value)}
              r={5}
              fill={LIGHT_HEX[p.status]}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </g>
        ))}

        {/* Endwert direkt beschriftet (einziger Zahlenwert im Chart) */}
        <text
          x={xFor(points.length - 1)}
          y={yFor(last.value) - 10}
          textAnchor="end"
          className="fill-slate-700"
          fontSize={11}
          fontWeight={600}
        >
          {last.value}/10
        </text>

        {/* x-Achsen-Beschriftung: nur erster, mittlerer, letzter Punkt */}
        {points.map((p, i) =>
          labelIndices.has(i) ? (
            <text
              key={i}
              x={xFor(i)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              className="fill-slate-400"
              fontSize={10}
            >
              {formatShortDate(p.date)}
            </text>
          ) : null
        )}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-100">
        {statuses.map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LIGHT_HEX[s] }} />
            {LIGHT_COLORS[s].label}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Zeigt den höheren Wert aus &quot;Schmerz davor/danach&quot; je Eintrag. Punktfarbe = Ampel-Gesamtstatus dieses Eintrags.
      </p>
    </div>
  );
}
