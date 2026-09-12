import { getRegion } from "./regions";
import { assess } from "./trafficLight";
import { PDDM_DOMAINS, PDDM_DOMAIN_LABELS, statusLabel } from "./pddm";
import { getAllData } from "./storage";
import { LIGHT_COLORS } from "./trafficLight";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function buildExportText(): string {
  const { checkIns, pddm } = getAllData();

  if (checkIns.length === 0 && pddm.length === 0) {
    return "Reiz-Reaktions-Tracker – Export\n\nNoch keine Daten erfasst.";
  }

  const regionIds = Array.from(
    new Set([...checkIns.map((c) => c.regionId), ...pddm.map((a) => a.regionId)])
  );

  const lines: string[] = [];
  lines.push("Reiz-Reaktions-Tracker – Export");
  lines.push(`Erstellt am: ${formatDate(new Date().toISOString().slice(0, 10))}`);
  lines.push("");

  for (const regionId of regionIds) {
    const region = getRegion(regionId);
    lines.push(`=== ${region.label} ===`);

    const regionPddm = pddm.filter((a) => a.regionId === regionId);
    for (const a of regionPddm) {
      lines.push(`PDDM-Einschätzung vom ${formatDate(a.date)}:`);
      for (const domain of PDDM_DOMAINS) {
        lines.push(`  - ${PDDM_DOMAIN_LABELS[domain]}: ${statusLabel(a.results[domain].status)}`);
      }
    }

    const regionCheckIns = checkIns
      .filter((c) => c.regionId === regionId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    lines.push(`Check-ins (${regionCheckIns.length}):`);
    for (const c of regionCheckIns) {
      const a = assess(c);
      const parts = [
        formatDate(c.date),
        c.activity,
        c.durationMin ? `${c.durationMin} Min.` : null,
        `Schmerz ${c.painBefore}→${c.painAfter}`,
        c.pain24h !== undefined ? `24h: ${c.pain24h}` : "24h: –",
        c.pain48h !== undefined ? `48h: ${c.pain48h}` : "48h: –",
        `Status: ${LIGHT_COLORS[a.overall].label}`,
      ].filter(Boolean);
      lines.push("  " + parts.join(" | "));
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
