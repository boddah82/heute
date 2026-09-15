"use client";

const WIDTH = 320;
const HEIGHT = 130;
const PADDING_LEFT = 22;
const PADDING_RIGHT = 12;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 26;

const BEFORE_COLOR = "#94a3b8"; // slate-400
const AFTER_COLOR = "#0f766e"; // teal-700

interface Point {
  date: string;
  before: number;
  after: number;
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

export default function BeforeAfterChart({ points }: { points: Point[] }) {
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  function xFor(i: number) {
    return PADDING_LEFT + i * stepX;
  }
  function yFor(value: number) {
    return PADDING_TOP + plotHeight * (1 - value / 10);
  }

  function pathFor(key: "before" | "after") {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p[key])}`).join(" ");
  }

  const last = points[points.length - 1];
  const labelIndices = new Set([0, points.length - 1]);
  if (points.length > 4) labelIndices.add(Math.floor((points.length - 1) / 2));

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={PADDING_LEFT - 5} y={yFor(v) + 3} textAnchor="end" className="fill-slate-400" fontSize={9}>
              {v}
            </text>
          </g>
        ))}

        <path d={pathFor("before")} fill="none" stroke={BEFORE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor("after")} fill="none" stroke={AFTER_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xFor(i)} cy={yFor(p.before)} r={3.5} fill={BEFORE_COLOR} stroke="#fff" strokeWidth={1.5}>
              <title>{formatShortDate(p.date)}: davor {p.before}/10</title>
            </circle>
            <circle cx={xFor(i)} cy={yFor(p.after)} r={3.5} fill={AFTER_COLOR} stroke="#fff" strokeWidth={1.5}>
              <title>{formatShortDate(p.date)}: danach {p.after}/10</title>
            </circle>
          </g>
        ))}

        <text x={xFor(points.length - 1)} y={yFor(last.before) + 12} textAnchor="end" className="fill-slate-400" fontSize={10}>
          {last.before}
        </text>
        <text x={xFor(points.length - 1)} y={yFor(last.after) - 8} textAnchor="end" className="fill-teal-800" fontSize={11} fontWeight={600}>
          {last.after}
        </text>

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

      <div className="flex gap-4 mt-1">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: BEFORE_COLOR }} />
          Schmerz davor
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: AFTER_COLOR }} />
          Schmerz danach
        </span>
      </div>
    </div>
  );
}
