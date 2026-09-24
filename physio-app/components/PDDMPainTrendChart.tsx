"use client";

import { PDDMAssessment } from "@/lib/types";

const WIDTH = 320;
const HEIGHT = 130;
const PADDING_LEFT = 22;
const PADDING_RIGHT = 12;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 26;

const SERIES = [
  { key: "current" as const, label: "Aktuell", color: "#2c4a63" }, // brand-700
  { key: "avg4Weeks" as const, label: "Ø 4 Wochen", color: "#94a3b8" }, // slate-400
  { key: "maxLoad" as const, label: "Max. Belastung", color: "#16293a" }, // brand-900
];

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

// Zeigt den Verlauf der PDDM-Schmerz-Baseline über mehrere Einschätzungen
// hinweg (nicht die aktivitätsgebundenen Check-ins – siehe PainTrendChart
// dafür). Alle drei Werte teilen dieselbe 0-10-Skala, deshalb eine
// gemeinsame Achse (siehe BeforeAfterChart für dasselbe Prinzip).
export default function PDDMPainTrendChart({ assessments }: { assessments: PDDMAssessment[] }) {
  const points = assessments
    .filter((a) => a.painBaseline)
    .map((a) => ({ date: a.date, ...a.painBaseline! }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (points.length < 2) return null;

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const stepX = plotWidth / (points.length - 1);

  function xFor(i: number) {
    return PADDING_LEFT + i * stepX;
  }
  function yFor(value: number) {
    return PADDING_TOP + plotHeight * (1 - value / 10);
  }

  function pathFor(key: (typeof SERIES)[number]["key"]) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p[key])}`).join(" ");
  }

  const labelIndices = new Set([0, points.length - 1]);
  if (points.length > 4) labelIndices.add(Math.floor((points.length - 1) / 2));

  return (
    <div>
      <p className="text-sm font-semibold text-slate-900 mb-1">Schmerz-Baseline im Verlauf</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={PADDING_LEFT} x2={WIDTH - PADDING_RIGHT} y1={yFor(v)} y2={yFor(v)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PADDING_LEFT - 5} y={yFor(v) + 3} textAnchor="end" className="fill-slate-400" fontSize={9}>
              {v}
            </text>
          </g>
        ))}

        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {points.map((p, i) => (
          <g key={i}>
            {SERIES.map((s) => (
              <circle key={s.key} cx={xFor(i)} cy={yFor(p[s.key])} r={3} fill={s.color} stroke="#fff" strokeWidth={1.5}>
                <title>
                  {formatShortDate(p.date)}: {s.label} {p[s.key]}/10
                </title>
              </circle>
            ))}
          </g>
        ))}

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

      <div className="flex gap-4 mt-1 flex-wrap">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
