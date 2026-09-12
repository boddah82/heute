import { BodyRegion } from "./types";

export const REGIONS: BodyRegion[] = [
  {
    id: "knie",
    label: "Knie",
    icon: "🦵",
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
    icon: "🧍",
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
    icon: "💪",
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
    icon: "🧑",
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
    icon: "🦶",
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
    icon: "🚶",
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
    icon: "✨",
    exampleReize: [],
  },
];

export function getRegion(id: string): BodyRegion {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}
