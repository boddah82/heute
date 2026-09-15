"use client";

import { TrafficLight } from "@/lib/types";
import { LIGHT_HEX, LIGHT_COLORS } from "@/lib/trafficLight";

interface Point {
  date: string;
  status: TrafficLight;
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

export default function RecoveryStrip({ points }: { points: Point[] }) {
  const labelIndices = new Set([0, points.length - 1]);
  if (points.length > 4) labelIndices.add(Math.floor((points.length - 1) / 2));

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {points.map((p, i) => (
          <span
            key={i}
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: LIGHT_HEX[p.status] }}
            title={`${formatShortDate(p.date)}: ${LIGHT_COLORS[p.status].label}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{formatShortDate(points[0].date)}</span>
        {points.length > 2 && <span>{formatShortDate(points[points.length - 1].date)}</span>}
      </div>
    </div>
  );
}
