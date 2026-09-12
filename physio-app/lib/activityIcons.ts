export interface ActivityIcon {
  id: string;
  label: string;
  icon: string;
}

// Generische Aktivitäts-Kacheln für die Schnellauswahl. Antippen füllt das
// Freitextfeld (weiterhin änderbar) – ersetzt den Freitext nicht, sondern
// beschleunigt den häufigen Fall.
export const ACTIVITY_ICONS: ActivityIcon[] = [
  { id: "laufen", label: "Laufen", icon: "🏃" },
  { id: "springen", label: "Springen", icon: "🤸" },
  { id: "treppe", label: "Treppen steigen", icon: "🪜" },
  { id: "rad", label: "Radfahren", icon: "🚴" },
  { id: "kraft", label: "Krafttraining", icon: "🏋️" },
  { id: "dehnen", label: "Dehnen / Mobilisation", icon: "🧘" },
  { id: "sitzen", label: "Langes Sitzen", icon: "🪑" },
  { id: "gehen", label: "Gehen / Wandern", icon: "🚶" },
  { id: "schwimmen", label: "Schwimmen", icon: "🏊" },
];
