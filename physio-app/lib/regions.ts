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
