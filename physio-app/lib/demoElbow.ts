import { CheckIn, HistoryBundle, LeadSymptom, LeadSymptomRating, PDDMAssessment, PDDMPainBaseline, PSFSGoal, PSFSRating, SleepEntry } from "./types";
import { evaluatePDDM } from "./pddm";

// Zwei erfundene Demo-Mandanten für die Region "Ellbogen", beide wollen
// wieder Schlagzeug spielen. Handgebaute (nicht zufällige) Verläufe über
// 12 Wochen, damit der Unterschied auf einen Blick sichtbar ist:
//  - Fortschritt: Schlagzeug 30 Min. -> 3 Std., Ampeln werden grün,
//    PSFS-Ziel steigt, PDDM-Treiber verschwinden.
//  - Kein Fortschritt: trotz regelmäßiger Übungen und Tagebuch bleibt es bei
//    ca. 30 Min., Ampeln gelb/rot – Schlaf, Stress, Arbeit und Sorgen
//    (PDDM) bleiben unverändert auffällig.
// Keine echten Patientendaten.

const REGION = "ellbogen";
const DAYS = 84;

export interface ElbowDemo {
  name: string;
  description: string;
  bundle: Omit<HistoryBundle, "exportedAt">;
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

let counter = 0;
function id(prefix: string) {
  counter += 1;
  return `demo-${prefix}-${counter}`;
}

type Pain = [before: number, after: number, h24: number, h48: number];

function checkIn(daysAgo: number, activity: string, durationMin: number, pain: Pain, notes?: string): CheckIn {
  return {
    id: id("c"),
    regionId: REGION,
    date: isoDaysAgo(daysAgo),
    activity,
    durationMin,
    painBefore: pain[0],
    painAfter: pain[1],
    pain24h: pain[2],
    pain48h: pain[3],
    ...(notes ? { notes } : {}),
    createdAt: new Date().toISOString(),
  };
}

function pddm(daysAgo: number, answers: Record<string, string>, painBaseline: PDDMPainBaseline): PDDMAssessment {
  return {
    id: id("p"),
    regionId: REGION,
    date: isoDaysAgo(daysAgo),
    answers,
    results: evaluatePDDM(answers),
    painBaseline,
    createdAt: new Date().toISOString(),
  };
}

function goalWithRatings(label: string, values: [daysAgo: number, value: number][]): { goal: PSFSGoal; ratings: PSFSRating[] } {
  const goal: PSFSGoal = { id: id("g"), regionId: REGION, label, createdAt: new Date().toISOString() };
  const ratings = values.map(([daysAgo, value]) => ({
    id: id("r"),
    regionId: REGION,
    goalId: goal.id,
    date: isoDaysAgo(daysAgo),
    value,
    createdAt: new Date().toISOString(),
  }));
  return { goal, ratings };
}


// Deterministischer Zufall, damit die Demo bei jedem Laden gleich aussieht.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function clamp(v: number) {
  return Math.max(0, Math.min(10, Math.round(v)));
}

// Leitsymptom + Schlaf für ca. 5 von 7 Tagen über 12 Wochen.
// level(t, sleep, afterDrums) liefert den Schmerzwert (t = 0..1 Zeitfortschritt).
function leadSeries(
  label: string,
  seed: number,
  drumDays: Set<number>,
  sleepFor: (t: number, r: () => number) => number,
  level: (t: number, sleep: number, afterDrums: boolean, r: () => number) => number,
  startup?: (t: number, value: number) => number
): { symptom: LeadSymptom; ratings: LeadSymptomRating[]; sleep: SleepEntry[] } {
  const r = rng(seed);
  const symptom: LeadSymptom = { id: id("l"), regionId: REGION, label, createdAt: new Date().toISOString() };
  const ratings: LeadSymptomRating[] = [];
  const sleep: SleepEntry[] = [];
  for (let d = 0; d <= DAYS - 1; d++) {
    if (r() < 0.25) continue; // nicht jeden Tag eingetragen
    const t = d / DAYS;
    const rested = clamp(sleepFor(t, r));
    const value = clamp(level(t, rested, drumDays.has(d - 1), r));
    const date = isoDaysAgo(DAYS - d);
    sleep.push({ id: id("s"), date, rested, createdAt: new Date().toISOString() });
    ratings.push({
      id: id("lr"),
      regionId: REGION,
      symptomId: symptom.id,
      date,
      value,
      ...(startup ? { startupMin: Math.max(0, Math.round(startup(t, value))) } : {}),
      createdAt: new Date().toISOString(),
    });
  }
  return { symptom, ratings, sleep };
}

const DRUMS = "Schlagzeug spielen";

// ---------------------------------------------------------------------------
// Demo 1: Tennisellbogen mit Fortschritt
// ---------------------------------------------------------------------------
function progressDemo(): ElbowDemo {
  // [Tage seit Start, Dauer, Schmerz vorher/nachher/24h/48h, Notiz]
  const drums: [number, number, Pain, string?][] = [
    [0, 30, [3, 4, 3, 3], "Start: nach 30 Min. Ziehen außen am Ellbogen"],
    [4, 30, [3, 4, 3, 3]],
    [8, 30, [3, 3, 3, 2]],
    [12, 30, [2, 2, 2, 2]],
    [16, 45, [2, 3, 3, 2], "Erste Steigerung auf 45 Min."],
    [20, 45, [2, 2, 2, 2]],
    [24, 45, [2, 2, 1, 1]],
    [28, 60, [2, 3, 2, 2], "1 Std. – Sticks lockerer gehalten"],
    [32, 60, [2, 2, 1, 1]],
    [36, 60, [1, 1, 1, 1]],
    [40, 90, [1, 2, 2, 1], "Erste komplette Bandprobe"],
    [44, 90, [1, 1, 1, 1]],
    [48, 90, [1, 1, 1, 1]],
    [52, 120, [1, 2, 2, 1], "2 Std. Probe, am nächsten Tag leicht spürbar"],
    [56, 120, [1, 1, 1, 1]],
    [60, 120, [1, 1, 1, 0]],
    [64, 150, [1, 1, 1, 1]],
    [68, 150, [1, 1, 0, 0]],
    [72, 150, [0, 0, 0, 0]],
    [76, 180, [1, 1, 1, 0], "Auftritt 3 Std. – danach nur müde, kein Ziehen"],
    [80, 180, [0, 0, 0, 0]],
  ];
  const exercises: [number, string, number, Pain][] = [
    [1, "Handgelenk-Strecker isometrisch", 10, [3, 3, 3, 3]],
    [5, "Handgelenk-Strecker isometrisch", 10, [3, 3, 2, 2]],
    [10, "Handgelenk-Strecker isometrisch", 10, [2, 2, 2, 2]],
    [15, "Handgelenk-Strecker exzentrisch (Kurzhantel)", 15, [2, 3, 2, 2]],
    [22, "Handgelenk-Strecker exzentrisch (Kurzhantel)", 15, [2, 2, 2, 1]],
    [30, "Handgelenk-Strecker exzentrisch (Kurzhantel)", 15, [1, 1, 1, 1]],
    [38, "Handgelenk-Strecker exzentrisch (Kurzhantel)", 15, [1, 1, 1, 1]],
    [50, "Handgelenk-Strecker exzentrisch (Kurzhantel)", 20, [1, 1, 1, 0]],
    [62, "Handgelenk-Strecker exzentrisch (Kurzhantel)", 20, [0, 0, 0, 0]],
    [74, "Handgelenk-Strecker exzentrisch (Kurzhantel)", 20, [0, 0, 0, 0]],
  ];
  const daily: [number, number, Pain][] = [
    [6, 20, [3, 4, 3, 3]],
    [26, 30, [2, 2, 2, 2]],
    [46, 30, [1, 1, 1, 1]],
    [66, 40, [0, 0, 0, 0]],
  ];

  const checkIns: CheckIn[] = [
    ...drums.map(([d, min, pain, note]) => checkIn(DAYS - d, DRUMS, min, pain, note)),
    ...exercises.map(([d, act, min, pain]) => checkIn(DAYS - d, act, min, pain)),
    ...daily.map(([d, min, pain]) => checkIn(DAYS - d, "Einkauf tragen", min, pain)),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const start = pddm(
    DAYS,
    {
      "nociceptive.aggravating": "Ja",
      "nociceptive.relief": "Ja",
      "nociceptive.stiffness": "Nein",
      "nociceptive.delayed": "Ja",
      "nervousSystem.quality": "Nie",
      "nervousSystem.paresthesia": "Nie",
      "nervousSystem.allodynia": "Nie",
      "nervousSystem.spreading": "Nie",
      "nervousSystem.hypersensitivity": "Nie",
      "comorbidities.sleep": "Selten",
      "comorbidities.stress": "Mäßig",
      "comorbidities.activity": "2–3 Tage",
      "cognitiveEmotional.kinesiophobia": "Stimmt völlig",
      "cognitiveEmotional.catastrophizing": "Teils-teils",
      "cognitiveEmotional.helplessness": "Teils-teils",
      "cognitiveEmotional.hypervigilance": "Teils-teils",
      "contextual.work": "Nein",
      "contextual.social": "Nein",
      "contextual.nocebo": "Ja",
      "contextual.noceboDetails": "„Die Sehne ist ausgefranst, am besten nicht mehr spielen.“",
    },
    { current: 3, maxLoad: 6, afterMaxLoad: 4 }
  );
  const end = pddm(
    2,
    {
      "nociceptive.aggravating": "Ja",
      "nociceptive.relief": "Ja",
      "nociceptive.stiffness": "Nein",
      "nociceptive.delayed": "Nein",
      "nervousSystem.quality": "Nie",
      "nervousSystem.paresthesia": "Nie",
      "nervousSystem.allodynia": "Nie",
      "nervousSystem.spreading": "Nie",
      "nervousSystem.hypersensitivity": "Nie",
      "comorbidities.sleep": "Selten",
      "comorbidities.stress": "Gering",
      "comorbidities.activity": "4+ Tage",
      "cognitiveEmotional.kinesiophobia": "Stimmt nicht",
      "cognitiveEmotional.catastrophizing": "Stimmt nicht",
      "cognitiveEmotional.helplessness": "Stimmt nicht",
      "cognitiveEmotional.hypervigilance": "Stimmt nicht",
      "contextual.work": "Nein",
      "contextual.social": "Nein",
      "contextual.nocebo": "Nein",
    },
    { current: 0, maxLoad: 2, afterMaxLoad: 1 }
  );

  const g1 = goalWithRatings("Schlagzeug spielen (Probe / Auftritt)", [
    [84, 2], [70, 3], [56, 5], [42, 6], [28, 7], [14, 8], [2, 9],
  ]);
  const g2 = goalWithRatings("Einkaufstasche tragen", [
    [84, 5], [56, 7], [28, 8], [2, 10],
  ]);

  const lead = leadSeries(
    "Morgens beim ersten Greifen (Tasse)",
    11,
    new Set(drums.map(([d]) => d)),
    (_t, r) => 6.5 + r() * 2.5,
    (t, _s, afterDrums, r) => 5.2 - 4 * t + (afterDrums && t < 0.5 ? 1 : 0) + (r() - 0.5) * 1.6,
    (t, v) => 3 + v * 3.5 - 10 * t
  );

  return {
    name: "Demo: Tennisellbogen – Fortschritt",
    description: "Schlagzeuger, 12 Wochen: von 30 Min. auf 3 Std. Spielzeit.",
    bundle: {
      checkIns,
      pddm: [end, start],
      psfsGoals: [g1.goal, g2.goal],
      psfsRatings: [...g1.ratings, ...g2.ratings],
      questionnaireResults: [],
      leadSymptoms: [lead.symptom],
      leadRatings: lead.ratings,
      sleep: lead.sleep,
    },
  };
}

// ---------------------------------------------------------------------------
// Demo 2: Golferellbogen ohne Fortschritt
// ---------------------------------------------------------------------------
function stuckDemo(): ElbowDemo {
  const drums: [number, number, Pain, string?][] = [
    [0, 30, [4, 6, 5, 4], "Start: nach 30 Min. Stechen innen am Ellbogen"],
    [4, 30, [4, 5, 5, 4]],
    [8, 30, [4, 5, 4, 4]],
    [12, 45, [4, 7, 6, 5], "Versuch 45 Min. – 2 Tage schlechter"],
    [16, 20, [5, 6, 5, 5]],
    [20, 30, [4, 5, 5, 4], "Schlecht geschlafen"],
    [24, 30, [4, 5, 4, 4]],
    [28, 40, [4, 6, 6, 5], "Stressige Woche im Lager"],
    [32, 30, [5, 6, 5, 5]],
    [36, 30, [4, 5, 5, 4]],
    [40, 30, [4, 5, 4, 4]],
    [44, 45, [4, 7, 6, 5], "Wieder 45 Min. versucht – Rückfall"],
    [48, 20, [5, 6, 6, 5]],
    [52, 30, [4, 5, 5, 4]],
    [56, 30, [4, 5, 4, 4]],
    [60, 30, [5, 6, 5, 5], "Kaum geschlafen"],
    [64, 30, [4, 5, 5, 4]],
    [68, 40, [4, 6, 6, 5]],
    [72, 30, [4, 5, 4, 4]],
    [76, 30, [5, 6, 5, 5]],
    [80, 30, [4, 5, 5, 4], "„Wird das überhaupt noch was?“"],
  ];
  const exercises: [number, string, number, Pain][] = [
    [1, "Handgelenk-Beuger isometrisch", 10, [4, 5, 4, 4]],
    [5, "Handgelenk-Beuger isometrisch", 10, [4, 5, 4, 4]],
    [10, "Handgelenk-Beuger isometrisch", 10, [4, 4, 4, 4]],
    [15, "Handgelenk-Beuger exzentrisch (Kurzhantel)", 15, [4, 5, 5, 4]],
    [22, "Handgelenk-Beuger exzentrisch (Kurzhantel)", 15, [4, 5, 4, 4]],
    [30, "Handgelenk-Beuger exzentrisch (Kurzhantel)", 15, [5, 6, 5, 5]],
    [38, "Handgelenk-Beuger exzentrisch (Kurzhantel)", 15, [4, 5, 4, 4]],
    [50, "Handgelenk-Beuger exzentrisch (Kurzhantel)", 15, [4, 5, 5, 4]],
    [62, "Handgelenk-Beuger exzentrisch (Kurzhantel)", 15, [4, 5, 4, 4]],
    [74, "Handgelenk-Beuger exzentrisch (Kurzhantel)", 15, [4, 5, 5, 4]],
  ];
  const work: [number, number, Pain][] = [
    [3, 480, [4, 6, 5, 5]],
    [17, 480, [4, 6, 6, 5]],
    [31, 480, [5, 7, 6, 5]],
    [45, 480, [4, 6, 5, 5]],
    [59, 480, [5, 6, 6, 5]],
    [73, 480, [4, 6, 5, 5]],
  ];

  const checkIns: CheckIn[] = [
    ...drums.map(([d, min, pain, note]) => checkIn(DAYS - d, DRUMS, min, pain, note)),
    ...exercises.map(([d, act, min, pain]) => checkIn(DAYS - d, act, min, pain)),
    ...work.map(([d, min, pain]) => checkIn(DAYS - d, "Arbeit im Lager (Heben / Greifen)", min, pain)),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const answers = {
    "nociceptive.aggravating": "Ja",
    "nociceptive.relief": "Nein",
    "nociceptive.stiffness": "Ja",
    "nociceptive.delayed": "Ja",
    "nervousSystem.quality": "Manchmal",
    "nervousSystem.paresthesia": "Nie",
    "nervousSystem.allodynia": "Manchmal",
    "nervousSystem.spreading": "Manchmal",
    "nervousSystem.hypersensitivity": "Manchmal",
    "comorbidities.sleep": "Fast immer",
    "comorbidities.stress": "Hoch",
    "comorbidities.activity": "0–1 Tag",
    "cognitiveEmotional.kinesiophobia": "Teils-teils",
    "cognitiveEmotional.catastrophizing": "Stimmt völlig",
    "cognitiveEmotional.helplessness": "Stimmt völlig",
    "cognitiveEmotional.hypervigilance": "Stimmt völlig",
    "contextual.work": "Sehr stark",
    "contextual.social": "Mäßig",
    "contextual.nocebo": "Nein",
  };
  const start = pddm(DAYS, answers, { current: 4, maxLoad: 7, afterMaxLoad: 6 });
  const end = pddm(2, answers, { current: 4, maxLoad: 7, afterMaxLoad: 6 });

  const g1 = goalWithRatings("Schlagzeug spielen (Probe / Auftritt)", [
    [84, 3], [70, 3], [56, 2], [42, 4], [28, 3], [14, 3], [2, 3],
  ]);
  const g2 = goalWithRatings("Arbeitstag im Lager ohne Pause wegen Schmerz", [
    [84, 4], [56, 3], [28, 4], [2, 4],
  ]);

  const lead = leadSeries(
    "Greifen / Türklinke",
    23,
    new Set(drums.map(([d]) => d)),
    (_t, r) => (r() < 0.45 ? 2 + r() * 2.5 : 5 + r() * 3),
    (_t, rested, afterDrums, r) => 4.6 + (rested <= 4 ? 1.8 : 0) + (afterDrums ? 1 : 0) + (r() - 0.5) * 1.4
  );

  return {
    name: "Demo: Golferellbogen – kein Fortschritt",
    description: "Schlagzeuger, 12 Wochen: macht brav Übungen, bleibt aber bei ca. 30 Min.",
    bundle: {
      checkIns,
      pddm: [end, start],
      psfsGoals: [g1.goal, g2.goal],
      psfsRatings: [...g1.ratings, ...g2.ratings],
      questionnaireResults: [],
      leadSymptoms: [lead.symptom],
      leadRatings: lead.ratings,
      sleep: lead.sleep,
    },
  };
}

export function buildElbowDemos(): ElbowDemo[] {
  return [progressDemo(), stuckDemo()];
}
