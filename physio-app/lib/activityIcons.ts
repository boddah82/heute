export interface ActivityIcon {
  id: string;
  label: string;
}

// Generische Aktivitäts-Kacheln für die Schnellauswahl. Antippen füllt das
// Freitextfeld (weiterhin änderbar) – ersetzt den Freitext nicht, sondern
// beschleunigt den häufigen Fall.
export const ACTIVITY_ICONS: ActivityIcon[] = [
  { id: "laufen", label: "Laufen" },
  { id: "springen", label: "Springen" },
  { id: "treppe", label: "Treppen steigen" },
  { id: "rad", label: "Radfahren" },
  { id: "kraft", label: "Krafttraining" },
  { id: "dehnen", label: "Dehnen / Mobilisation" },
  { id: "sitzen", label: "Langes Sitzen" },
  { id: "gehen", label: "Gehen / Wandern" },
  { id: "schwimmen", label: "Schwimmen" },
];
