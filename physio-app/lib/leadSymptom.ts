import { CheckIn, LeadSymptomRating, SleepEntry } from "./types";

// Auswertung des Leitsymptoms. Eigene Umsetzung, keine validierte Regel:
// Prinzip Wiedertest-/Asterisk-Zeichen + NPRS 0–10. Schwelle für eine
// relevante Veränderung angelehnt an Farrar et al. 2001 (ca. 2 Punkte bzw.
// 30 % auf der 0–10-Skala).

export type LeadTrend = "besser" | "stabil" | "schlechter" | "zu_wenig_daten";

export const WINDOW_DAYS = 14;
const MIN_PER_WINDOW = 4;
const MIN_PER_GROUP = 3;
// Für Aktivitäten strenger: bei wenigen Tagen entstehen sonst Schein-Zusammenhänge.
const MIN_ACTIVITY_DAYS = 6;

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function round1(x: number): string {
  return x.toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export interface TrendResult {
  trend: LeadTrend;
  startMean?: number;
  endMean?: number;
  startStartup?: number;
  endStartup?: number;
}

// Vergleicht die ersten 14 Tage mit den letzten 14 Tagen der Aufzeichnung.
// "Besser": Mittelwert mind. 2 Punkte niedriger, oder mind. 30 % und mind.
// 1 Punkt niedriger (damit 2 -> 1,4 nicht schon als Besserung zählt).
export function leadTrend(ratings: LeadSymptomRating[]): TrendResult {
  const sorted = [...ratings].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sorted.length === 0) return { trend: "zu_wenig_daten" };
  const firstDate = sorted[0].date;
  const lastDate = sorted[sorted.length - 1].date;
  if (daysBetween(firstDate, lastDate) < WINDOW_DAYS * 2 - 1) return { trend: "zu_wenig_daten" };

  const start = sorted.filter((r) => daysBetween(firstDate, r.date) < WINDOW_DAYS);
  const end = sorted.filter((r) => daysBetween(r.date, lastDate) < WINDOW_DAYS);
  if (start.length < MIN_PER_WINDOW || end.length < MIN_PER_WINDOW) return { trend: "zu_wenig_daten" };

  const startMean = mean(start.map((r) => r.value));
  const endMean = mean(end.map((r) => r.value));
  const diff = endMean - startMean;
  const rel = startMean > 0 ? diff / startMean : 0;

  const startStartupVals = start.filter((r) => r.startupMin !== undefined).map((r) => r.startupMin!);
  const endStartupVals = end.filter((r) => r.startupMin !== undefined).map((r) => r.startupMin!);

  let trend: LeadTrend = "stabil";
  if (diff <= -2 || (diff <= -1 && rel <= -0.3)) trend = "besser";
  else if (diff >= 2 || (diff >= 1 && rel >= 0.3)) trend = "schlechter";

  return {
    trend,
    startMean,
    endMean,
    startStartup: startStartupVals.length ? mean(startStartupVals) : undefined,
    endStartup: endStartupVals.length ? mean(endStartupVals) : undefined,
  };
}

// Wochenmittel für das Diagramm (gleicht gute und schlechte Tage aus).
export function weeklyMeans(ratings: LeadSymptomRating[]): { date: string; value: number }[] {
  const sorted = [...ratings].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sorted.length === 0) return [];
  const first = sorted[0].date;
  const buckets = new Map<number, number[]>();
  for (const r of sorted) {
    const w = Math.floor(daysBetween(first, r.date) / 7);
    if (!buckets.has(w)) buckets.set(w, []);
    buckets.get(w)!.push(r.value);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([w, vals]) => ({ date: addDays(first, w * 7), value: mean(vals) }));
}

export interface GroupCompare {
  label: string;
  withLabel: string;
  withoutLabel: string;
  withMean: number;
  withoutMean: number;
  withN: number;
  withoutN: number;
}

// Schlaf am selben Morgen: schlechte Nacht (Erholung <= 4) gegen gute
// Nacht (>= 6). Nur ab je 3 Tagen, sonst ist es zu zufällig.
export function sleepCompare(ratings: LeadSymptomRating[], sleep: SleepEntry[]): GroupCompare | null {
  const byDate = new Map(sleep.map((s) => [s.date, s.rested]));
  const bad: number[] = [];
  const good: number[] = [];
  for (const r of ratings) {
    const s = byDate.get(r.date);
    if (s === undefined) continue;
    if (s <= 4) bad.push(r.value);
    else if (s >= 6) good.push(r.value);
  }
  if (bad.length < MIN_PER_GROUP || good.length < MIN_PER_GROUP) return null;
  return {
    label: "Schlaf",
    withLabel: "nach schlechten Nächten (Erholung 0–4)",
    withoutLabel: "nach guten Nächten (6–10)",
    withMean: mean(bad),
    withoutMean: mean(good),
    withN: bad.length,
    withoutN: good.length,
  };
}

// Aktivität am Vortag: für jede Aktivität mit genug Daten den Unterschied
// "Tag nach der Aktivität" vs. "andere Tage". Gibt den deutlichsten zurück.
export function activityCompares(ratings: LeadSymptomRating[], checkIns: CheckIn[]): GroupCompare[] {
  const byActivity = new Map<string, { label: string; dates: Set<string> }>();
  for (const c of checkIns) {
    const key = c.activity.trim().toLowerCase();
    if (!key) continue;
    if (!byActivity.has(key)) byActivity.set(key, { label: c.activity, dates: new Set() });
    byActivity.get(key)!.dates.add(c.date);
  }
  const out: GroupCompare[] = [];
  byActivity.forEach(({ label, dates }) => {
    const after: number[] = [];
    const other: number[] = [];
    for (const r of ratings) {
      if (dates.has(addDays(r.date, -1))) after.push(r.value);
      else other.push(r.value);
    }
    if (after.length < MIN_ACTIVITY_DAYS || other.length < MIN_ACTIVITY_DAYS) return;
    out.push({
      label,
      withLabel: `am Tag nach „${label}“`,
      withoutLabel: "an anderen Tagen",
      withMean: mean(after),
      withoutMean: mean(other),
      withN: after.length,
      withoutN: other.length,
    });
  });
  // Aktivitäten mit den meisten Vergleichstagen zuerst (verlässlicher).
  return out.sort((a, b) => b.withN - a.withN);
}
