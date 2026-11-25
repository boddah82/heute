import { BodyRegion } from "./types";

export const REGIONS: BodyRegion[] = [
  {
    id: "knie",
    label: "Knie",
    exampleReize: [
      "Treppen steigen",
      "Kniebeuge / Squat",
      "Joggen",
      "Langes Sitzen",
      "Radfahren",
    ],
  },
  {
    id: "ruecken",
    label: "Rücken",
    exampleReize: [
      "Langes Sitzen",
      "Heben / Tragen",
      "Bücken",
      "Langes Stehen",
      "Krafttraining Rumpf",
    ],
  },
  {
    id: "schulter",
    label: "Schulter",
    exampleReize: [
      "Überkopfarbeit",
      "Schlafposition auf der Seite",
      "Bankdrücken / Drücken",
      "Tragen einer Tasche",
    ],
  },
  {
    id: "nacken",
    label: "Nacken",
    exampleReize: [
      "Bildschirmzeit",
      "Autofahren",
      "Handynutzung",
      "Stress / Verspannung",
    ],
  },
  {
    id: "sehne",
    label: "Sehne (Achilles / Patella)",
    exampleReize: [
      "Laufen",
      "Springen",
      "Treppen steigen",
      "Wadenheben",
    ],
  },
  {
    id: "ellbogen",
    label: "Ellbogen (Tennis- / Golferellbogen)",
    exampleReize: [
      "Greifen / Tragen",
      "Tastatur / Maus",
      "Instrument spielen",
      "Handgelenk-Übungen",
    ],
  },
  {
    id: "huefte",
    label: "Hüfte",
    exampleReize: [
      "Gehen / Wandern",
      "Langes Sitzen",
      "Treppen steigen",
      "Ausfallschritte",
    ],
  },
  {
    id: "individuell",
    label: "Individuell",
    exampleReize: [],
  },
];

export function getRegion(id: string): BodyRegion {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

// Vorschläge für ein Leitsymptom je Region (frei änderbar). Typische
// Situationen, die Patienten oft am meisten stören – entscheidend ist aber
// immer, was DIESEN Patienten stört.
export const LEAD_SYMPTOM_SUGGESTIONS: Record<string, string[]> = {
  knie: ["Erste Schritte morgens", "Treppe abwärts", "Aufstehen nach langem Sitzen"],
  ruecken: ["Nach dem Aufstehen (Steifigkeit)", "Nach längerem Sitzen", "Bücken (z. B. Socken anziehen)"],
  schulter: ["Arm über Kopf heben", "Nachts auf der Seite liegen", "Jacke anziehen"],
  nacken: ["Nach längerem Sitzen", "Nach dem Aufwachen", "Kopfschmerz am Abend"],
  sehne: ["Erste Schritte morgens", "Anlaufschmerz nach Pause"],
  ellbogen: ["Morgens beim ersten Greifen (Tasse)", "Greifen / Türklinke", "Händedruck"],
  huefte: ["Anlaufschmerz morgens", "Aufstehen nach Sitzen", "Auf der Seite liegen"],
  individuell: ["Nach dem Aufstehen", "Am Abend"],
};
