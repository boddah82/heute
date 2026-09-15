"use client";

import { useId } from "react";
import { TrafficLight } from "@/lib/types";
import { LIGHT_HEX, LIGHT_COLORS } from "@/lib/trafficLight";

export interface ChartPoint {
  date: string;
  value: number;
  status: TrafficLight;
  tooltipValue?: string; // falls abweichend vom gerundeten/geklemmten Anzeigewert
}

interface Props {
  points: ChartPoint[];
  yMax: number;
  yMin?: number;
  fillColor?: string;
  height?: number;
}

const WIDTH = 320;
const PADDING_LEFT = 22; // Platz für Y-Achsen-Beschriftung
const PADDING_RIGHT = 12;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 26; // Platz für X-Achsen-Beschriftung, nicht abgeschnitten

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

export default function MiniLineChart({ points, yMax, yMin = 0, fillColor = "#0f766e", height = 120 }: Props) {
  const gradientId = useId();

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  function xFor(i: number) {
    return PADDING_LEFT + i * stepX;
  }
  function yFor(value: number) {
    const clamped = Math.min(yMax, Math.max(yMin, value));
    return PADDING_TOP + plotHeight * (1 - (clamped - yMin) / (yMax - yMin));
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value)}`).join(" ");
  const last = points[points.length - 1];
  const labelIndices = new Set([0, points.length - 1]);
  if (points.length > 4) labelIndices.add(Math.floor((points.length - 1) / 2));

  const yTicks = yMin === 0 ? [yMin, (yMin + yMax) / 2, yMax] : [yMin, 0, yMax];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.12" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((v) => (
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
            {Math.round(v)}
          </text>
        </g>
      ))}

      <path
        d={`${linePath} L ${xFor(points.length - 1)} ${yFor(yMin)} L ${xFor(0)} ${yFor(yMin)} Z`}
        fill={`url(#${gradientId})`}
      />

      <path d={linePath} fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xFor(i)} cy={yFor(p.value)} r={12} fill="transparent">
            <title>
              {formatShortDate(p.date)}: {p.tooltipValue ?? p.value} ({LIGHT_COLORS[p.status].label})
            </title>
          </circle>
          <circle cx={xFor(i)} cy={yFor(p.value)} r={5} fill={LIGHT_HEX[p.status]} stroke="#ffffff" strokeWidth={2} />
        </g>
      ))}

      <text
        x={xFor(points.length - 1)}
        y={yFor(last.value) - 10}
        textAnchor="end"
        className="fill-slate-700"
        fontSize={11}
        fontWeight={600}
      >
        {last.tooltipValue ?? last.value}
      </text>

      {points.map((p, i) =>
        labelIndices.has(i) ? (
          <text
            key={i}
            x={xFor(i)}
            y={height - 8}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            className="fill-slate-400"
            fontSize={10}
          >
            {formatShortDate(p.date)}
          </text>
        ) : null
      )}
    </svg>
  );
}
