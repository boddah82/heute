import { CheckIn, CheckInAssessment, TrafficLight } from "./types";

function worst(lights: TrafficLight[]): TrafficLight {
  if (lights.includes("RED")) return "RED";
  if (lights.includes("PENDING")) return "PENDING";
  if (lights.includes("YELLOW")) return "YELLOW";
  return "GREEN";
}

function intensityLight(painLevel: number): TrafficLight {
  if (painLevel <= 2) return "GREEN";
  if (painLevel <= 5) return "YELLOW";
  return "RED";
}

function spikeLight(spike: number): TrafficLight {
  if (spike <= 0) return "GREEN";
  if (spike <= 2) return "YELLOW";
  return "RED";
}

// Erholung: Rückkehr zum Schmerzniveau von vor der Aktivität (painBefore)
function recoveryLight(entry: CheckIn): TrafficLight {
  const baseline = entry.painBefore;
  if (entry.pain24h !== undefined && entry.pain24h <= baseline) return "GREEN";
  if (entry.pain48h !== undefined && entry.pain48h <= baseline) return "YELLOW";
  if (entry.pain48h !== undefined && entry.pain48h > baseline) return "RED";
  if (entry.pain24h !== undefined && entry.pain24h > baseline) {
    // über 24h hinaus noch erhöht, aber 48h-Wert fehlt noch -> abwarten
    return "PENDING";
  }
  // Noch keine Nachverfolgung eingetragen
  return "PENDING";
}

const RECOMMENDATIONS: Record<TrafficLight, string> = {
  GREEN: "Belastung darf vorsichtig gesteigert werden (z. B. +10–20% Umfang oder Intensität).",
  YELLOW: "Belastung auf diesem Niveau stabilisieren, nicht weiter steigern und im Blick behalten.",
  RED: "Belastungsvariable anpassen: Umfang oder Intensität reduzieren, Bewegungsausmaß verkleinern oder kurzzeitig auf eine ruhigere Variante wechseln.",
  PENDING: "Noch keine ausreichende Datenlage – bitte den Schmerzverlauf nach 24 und 48 Stunden ergänzen.",
};

export function assess(entry: CheckIn): CheckInAssessment {
  const spikeValue = entry.painAfter - entry.painBefore;
  const intensity = intensityLight(Math.max(entry.painBefore, entry.painAfter));
  const spike = spikeLight(spikeValue);
  const recovery = recoveryLight(entry);
  const overall = worst([intensity, spike, recovery]);

  const parts: string[] = [];
  parts.push(
    intensity === "GREEN"
      ? "Der Schmerzlevel war unauffällig (0–2)."
      : intensity === "YELLOW"
      ? "Der Schmerzlevel lag im mittleren Bereich (3–5)."
      : "Der Schmerzlevel war deutlich erhöht (>5)."
  );
  parts.push(
    spikeValue <= 0
      ? "Kein Schmerzanstieg durch die Aktivität."
      : spike === "YELLOW"
      ? `Leichter Schmerzanstieg um ${spikeValue} Punkt(e).`
      : `Deutlicher Schmerzanstieg um ${spikeValue} Punkt(e).`
  );
  parts.push(
    recovery === "GREEN"
      ? "Rückkehr zum Ausgangsniveau innerhalb von 24 Stunden."
      : recovery === "YELLOW"
      ? "Rückkehr zum Ausgangsniveau erst nach 24–48 Stunden."
      : recovery === "RED"
      ? "Auch nach 48 Stunden noch nicht zurück auf Ausgangsniveau."
      : "Erholungsverlauf noch offen – trage den Schmerz nach 24h/48h nach."
  );

  return {
    intensity,
    spike,
    recovery,
    overall,
    spikeValue,
    recommendation: RECOMMENDATIONS[overall],
    explanation: parts.join(" "),
  };
}

export const LIGHT_COLORS: Record<TrafficLight, { bg: string; text: string; label: string }> = {
  GREEN: { bg: "bg-emerald-500", text: "text-emerald-700", label: "Grün" },
  YELLOW: { bg: "bg-amber-500", text: "text-amber-700", label: "Gelb" },
  RED: { bg: "bg-red-500", text: "text-red-700", label: "Rot" },
  PENDING: { bg: "bg-slate-400", text: "text-slate-600", label: "Offen" },
};

// Hex-Äquivalente derselben Ampelfarben für SVG-Charts (Tailwind-Klassen
// wirken dort nicht als fill-Attribut).
export const LIGHT_HEX: Record<TrafficLight, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#ef4444",
  PENDING: "#94a3b8",
};
