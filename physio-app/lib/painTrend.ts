export type PainTrend = "improving" | "stable" | "worsening" | "insufficient";

const MIN_ENTRIES_FOR_TREND = 4;
const MEANINGFUL_DIFFERENCE = 1; // Punkte auf der 0-10 Schmerzskala

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Erwartet Werte in chronologischer Reihenfolge (älteste zuerst).
export function computeTrend(values: number[]): PainTrend {
  if (values.length < MIN_ENTRIES_FOR_TREND) return "insufficient";

  const mid = Math.floor(values.length / 2);
  const olderAvg = average(values.slice(0, mid));
  const newerAvg = average(values.slice(mid));
  const diff = newerAvg - olderAvg;

  if (diff <= -MEANINGFUL_DIFFERENCE) return "improving";
  if (diff >= MEANINGFUL_DIFFERENCE) return "worsening";
  return "stable";
}

export const TREND_LABEL: Record<PainTrend, string> = {
  improving: "Tendenz: rückläufig",
  stable: "Tendenz: gleichbleibend",
  worsening: "Tendenz: steigend",
  insufficient: "Noch zu wenige Einträge für eine Tendenz",
};

export const TREND_COLOR: Record<PainTrend, string> = {
  improving: "text-emerald-700",
  stable: "text-slate-600",
  worsening: "text-red-700",
  insufficient: "text-slate-400",
};
