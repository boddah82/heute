export type TrafficLight = "GREEN" | "YELLOW" | "RED" | "PENDING";

export interface BodyRegion {
  id: string;
  label: string;
  icon: string;
  exampleReize: string[];
}

export interface CheckIn {
  id: string;
  regionId: string;
  date: string; // ISO date (yyyy-mm-dd)
  activity: string; // Reiz / Belastung oder Entlastung
  durationMin?: number;
  notes?: string;
  painBefore: number; // 0-10
  painAfter: number; // 0-10
  pain24h?: number; // 0-10, optional, nachgetragen
  pain48h?: number; // 0-10, optional, nachgetragen
  createdAt: string; // ISO timestamp
}

export interface CheckInAssessment {
  intensity: TrafficLight; // Ampel 1: max(painBefore, painAfter)
  spike: TrafficLight; // Ampel 2: painAfter - painBefore
  recovery: TrafficLight; // Ampel 3: Rückkehr zum Ausgangsniveau
  overall: TrafficLight;
  spikeValue: number;
  recommendation: string;
  explanation: string;
}
