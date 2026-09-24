import { CheckIn, PDDMAssessment, PDDMPainBaseline } from "./types";
import { evaluatePDDM } from "./pddm";

// Simulierte Test-Patienten für den Bereich "Sehne" (patellare Tendinopathie),
// zur Demonstration des Trackers über unterschiedlich lange Zeiträume.
// Alle Werte sind synthetisch generiert, keine echten Patientendaten.

export interface DemoPatientDefinition {
  id: "patientA" | "patientB" | "patientC";
  label: string;
  description: string;
  days: number;
}

export const DEMO_PATIENTS: DemoPatientDefinition[] = [
  {
    id: "patientA",
    label: "Patient A – 2 Wochen",
    description: "Frisch begonnen, Belastung noch reaktiv, Schmerz schwankt stark.",
    days: 14,
  },
  {
    id: "patientB",
    label: "Patient B – 6 Wochen",
    description: "Belastung wird langsam gesteigert, erste stabile Phasen.",
    days: 42,
  },
  {
    id: "patientC",
    label: "Patient C – 12 Wochen",
    description: "Weit fortgeschritten, Rückkehr zu höheren Belastungen.",
    days: 84,
  },
];

// Einfacher deterministischer Zufallsgenerator (mulberry32), damit die
// Demo-Daten bei jedem Laden gleich aussehen.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const LOW_LOAD_ACTIVITIES = ["Fahrrad fahren", "Wadenheben", "Quadrizeps-Krafttraining (exzentrisch)"];
const HIGH_LOAD_ACTIVITIES = ["Joggen", "Treppen steigen", "Springen (Plyo-Training)"];

function pickActivity(rng: () => number, severity: number): string {
  // Je geringer die Schwere (severity ~0), desto eher höhere Belastungen.
  const pool = severity > 0.5 ? LOW_LOAD_ACTIVITIES : [...LOW_LOAD_ACTIVITIES, ...HIGH_LOAD_ACTIVITIES];
  return pool[Math.floor(rng() * pool.length)];
}

function generateCheckIns(regionId: string, days: number, seed: number): Omit<CheckIn, "id" | "createdAt">[] {
  const rng = mulberry32(seed);
  const intervalDays = 3;
  const entries: Omit<CheckIn, "id" | "createdAt">[] = [];

  for (let daysAgo = days; daysAgo >= 0; daysAgo -= intervalDays) {
    const progress = 1 - daysAgo / days; // 0 = Start, 1 = heute
    const severity = clamp(1 - progress + (rng() - 0.5) * 0.25, 0, 1); // 1 = schlecht, 0 = gut

    const activity = pickActivity(rng, severity);
    const durationMin = Math.round(15 + (1 - severity) * 30 + rng() * 5);
    const painBefore = clamp(Math.round(1 + severity * 3 + rng()), 0, 10);
    const spike = clamp(Math.round(1 + severity * 4 + rng() * 1.5), 0, 10 - painBefore);
    const painAfter = clamp(painBefore + spike, 0, 10);

    const recoveryFactor = clamp(1 - severity + rng() * 0.2, 0, 1); // wie schnell Erholung
    const pain24h = clamp(Math.round(painAfter - (painAfter - painBefore) * recoveryFactor), 0, 10);
    const pain48h = clamp(Math.round(painBefore + (pain24h - painBefore) * 0.4), 0, 10);

    const isLastEntry = daysAgo === 0 || daysAgo < intervalDays;
    const isSecondLastEntry = !isLastEntry && daysAgo < intervalDays * 2;

    entries.push({
      regionId,
      date: isoDaysAgo(daysAgo),
      activity,
      durationMin,
      painBefore,
      painAfter,
      pain24h: isLastEntry ? undefined : pain24h,
      pain48h: isLastEntry || isSecondLastEntry ? undefined : pain48h,
    });
  }

  return entries;
}

function pddmAnswersFor(patientId: DemoPatientDefinition["id"]): Record<string, string> {
  // Nozizeptiv + Kontext sind bei Tendinopathie typischerweise durchgehend
  // relevant (belastungsabhängiger Schmerz, sportliche Belastung als Trigger).
  const base: Record<string, string> = {
    "nociceptive.aggravating": "Ja",
    "nociceptive.relief": "Ja",
    "contextual.work": "Mäßig",
  };

  if (patientId === "patientA") {
    // Früh in der Reha: Sorge, dass etwas beschädigt sein könnte.
    return { ...base, "cognitiveEmotional.catastrophizing": "Teils-teils" };
  }
  if (patientId === "patientB") {
    // Sorgen durch Aufklärung schon reduziert, Fokus bleibt auf Belastungssteuerung.
    return base;
  }
  // patientC: gut etabliert, keine zusätzlichen Treiber mehr auffällig.
  return { ...base, "contextual.work": "Nein" };
}

function painBaselineFor(patientId: DemoPatientDefinition["id"]): PDDMPainBaseline {
  if (patientId === "patientA") return { current: 6, avg4Weeks: 7, maxLoad: 9 };
  if (patientId === "patientB") return { current: 3, avg4Weeks: 4, maxLoad: 6 };
  return { current: 1, avg4Weeks: 2, maxLoad: 3 };
}

export function buildDemoPatientData(
  patient: DemoPatientDefinition,
  regionId: string
): { checkIns: Omit<CheckIn, "id" | "createdAt">[]; pddm: Omit<PDDMAssessment, "id" | "createdAt"> } {
  const seed = patient.id === "patientA" ? 1 : patient.id === "patientB" ? 2 : 3;
  const checkIns = generateCheckIns(regionId, patient.days, seed);
  const answers = pddmAnswersFor(patient.id);
  const results = evaluatePDDM(answers);

  return {
    checkIns,
    pddm: {
      regionId,
      date: isoDaysAgo(0),
      answers,
      results,
      painBaseline: painBaselineFor(patient.id),
    },
  };
}
