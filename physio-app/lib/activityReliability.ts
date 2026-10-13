import { CheckIn, TrafficLight } from "./types";
import { assess } from "./trafficLight";

export type ActivityVerdict = "steigerbar" | "uneinheitlich" | "ungeeignet" | "zu_wenig_daten";

export interface ActivityStats {
  activity: string; // Anzeige-Label (letzte verwendete Schreibweise)
  points: { date: string; status: TrafficLight }[]; // chronologisch
  counts: Record<TrafficLight, number>;
  verdict: ActivityVerdict;
}

// Mindestanzahl, ab der ein Muster überhaupt beurteilt wird – pragmatische
// Wahl, kein statistisch hergeleiteter Schwellenwert.
const MIN_ENTRIES = 3;

function verdictFor(counts: Record<TrafficLight, number>): ActivityVerdict {
  // Nur entschiedene Einträge zählen – "Offen" (24h/48h fehlt noch) ist
  // keine Evidenz, weder gute noch schlechte.
  const decided = counts.GREEN + counts.YELLOW + counts.RED;
  if (decided < MIN_ENTRIES) return "zu_wenig_daten";
  if (counts.RED > 0) return "ungeeignet";
  if (counts.YELLOW === 0) return "steigerbar"; // ausschließlich Grün
  return "uneinheitlich"; // Grün + Gelb gemischt, aber kein Rot
}

// Gruppiert Check-ins nach "Art der Belastung" (Freitext, daher nur exakte
// Übereinstimmung nach Trimmen/Kleinschreibung – "Joggen" und "joggen"
// zählen zusammen, "Joggen" und "Laufen" nicht) und beurteilt je Gruppe,
// ob das Muster für eine Belastungssteigerung spricht.
export function groupByActivity(entries: CheckIn[]): ActivityStats[] {
  const groups = new Map<string, CheckIn[]>();
  for (const e of entries) {
    const key = e.activity.trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const stats: ActivityStats[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => (a.date < b.date ? -1 : 1));
    const points = sorted.map((e) => ({ date: e.date, status: assess(e).overall }));
    const counts: Record<TrafficLight, number> = { GREEN: 0, YELLOW: 0, RED: 0, PENDING: 0 };
    points.forEach((p) => counts[p.status]++);

    stats.push({
      activity: sorted[sorted.length - 1].activity,
      points,
      counts,
      verdict: verdictFor(counts),
    });
  }

  return stats.sort((a, b) => b.points.length - a.points.length);
}
