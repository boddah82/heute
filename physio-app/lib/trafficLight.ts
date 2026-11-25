import { CheckIn, CheckInAssessment, TrafficLight } from "./types";

function worst(lights: TrafficLight[]): TrafficLight {
  if (lights.includes("RED")) return "RED";
  if (lights.includes("PENDING")) return "PENDING";
  if (lights.includes("YELLOW")) return "YELLOW";
  return "GREEN";
}

// Schmerzregel (Rickys Regel vom 02.11.2026): Während der Belastung darf
// der Schmerz bis ca. 3–4/10 gehen. Verbessert er sich während der
// Aktivität (danach < davor), zählt das unabhängig vom Niveau als Grün
// (Vorlage Gino Lazzaro). Warnzeichen nach Ahura Kap. 6: über 5/10.
export const PAIN_OK_MAX = 4;
export const PAIN_WARN_ABOVE = 5;

function intensityLight(entry: CheckIn): TrafficLight {
  if (entry.painAfter < entry.painBefore) return "GREEN";
  if (entry.painAfter <= PAIN_OK_MAX) return "GREEN";
  if (entry.painAfter <= PAIN_WARN_ABOVE) return "YELLOW";
  return "RED";
}

// Anstieg: Ein Anstieg um mehr als 2 Punkte ist laut Ahura Kap. 6 ein
// Warnzeichen. Solange der Wert danach im erlaubten Bereich bleibt, nur
// "beobachten" (Gelb), kein eigenes Rot – die absolute Grenze und die
// Erholung am nächsten Tag entscheiden.
function spikeLight(spike: number): TrafficLight {
  if (spike <= 2) return "GREEN";
  return "YELLOW";
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
  GREEN: "Passt. Beim nächsten Mal darf eine Stellschraube etwas mehr werden (z. B. ein Satz mehr, 5 Minuten länger, etwas mehr Gewicht) – immer nur eine auf einmal.",
  YELLOW: "Auf diesem Niveau bleiben und noch nicht steigern (stabilisieren). Erst wenn es wieder passt, die nächste Steigerung.",
  RED: "Beim nächsten Mal eine Stellschraube etwas zurücknehmen (weniger Umfang, kleinerer Bewegungsumfang, leichtere Variante) – nicht ganz aufhören.",
  PENDING: "Noch offen – bitte den Schmerz am nächsten Morgen (24 h) und falls nötig nach 48 h nachtragen.",
};

// Gilt unabhängig von der Ampel: neue Beschwerden sind immer ein Anlass,
// mit der Therapeutin/dem Therapeuten zu sprechen (Ahura Kap. 6).
export const WARNING_SIGNS =
  "Neu auftretende Beschwerden (z. B. Schwellung, Taubheit, deutlicher Kraftverlust) immer mit Deinem Therapeuten besprechen.";

export function assess(entry: CheckIn): CheckInAssessment {
  const spikeValue = entry.painAfter - entry.painBefore;
  const intensity = intensityLight(entry);
  const spike = spikeLight(spikeValue);
  const recovery = recoveryLight(entry);
  const overall = worst([intensity, spike, recovery]);

  const parts: string[] = [];
  parts.push(
    entry.painAfter < entry.painBefore
      ? `Der Schmerz ist während der Aktivität gesunken (von ${entry.painBefore} auf ${entry.painAfter}).`
      : intensity === "GREEN"
      ? `Der Schmerz blieb im erlaubten Bereich (bis ${PAIN_OK_MAX} von 10).`
      : intensity === "YELLOW"
      ? `Der Schmerz lag knapp über dem erlaubten Bereich (${PAIN_WARN_ABOVE} von 10).`
      : `Der Schmerz war deutlich erhöht (über ${PAIN_WARN_ABOVE} von 10).`
  );
  parts.push(
    spikeValue <= 0
      ? "Kein Schmerzanstieg durch die Aktivität."
      : spike === "GREEN"
      ? `Leichter Schmerzanstieg um ${spikeValue} Punkt(e).`
      : `Anstieg um ${spikeValue} Punkte – mehr als 2, im Blick behalten.`
  );
  parts.push(
    recovery === "GREEN"
      ? "Am nächsten Tag (24 h) wieder auf dem Ausgangswert."
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
  GREEN: { bg: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", label: "Grün" },
  YELLOW: { bg: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", label: "Gelb" },
  RED: { bg: "bg-red-500", text: "text-red-700 dark:text-red-300", label: "Rot" },
  PENDING: { bg: "bg-slate-400", text: "text-slate-600 dark:text-slate-400", label: "Offen" },
};

// Hex-Äquivalente derselben Ampelfarben für SVG-Charts (Tailwind-Klassen
// wirken dort nicht als fill-Attribut).
export const LIGHT_HEX: Record<TrafficLight, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#ef4444",
  PENDING: "#94a3b8",
};
