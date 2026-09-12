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

// PDDM (Pain and Disability Drivers Management), nach Tousignant-Laflamme &
// Cook. Jede Domäne wird nicht bepunktet, sondern kategorial eingeordnet:
// nicht relevant / A (einfach zu adressieren) / B (komplex, ggf. Zuweisung).
export type PDDMDomainId =
  | "nociceptive"
  | "nervousSystem"
  | "comorbidities"
  | "cognitiveEmotional"
  | "contextual";

export type PDDMStatus = "NONE" | "A" | "B";

export interface PDDMDomainResult {
  status: PDDMStatus;
  // Nur bei nervousSystem genutzt: benennt explizit, ob der B-Befund eher
  // peripher-neuropathisch oder zentral-sensibilisiert/nozizeptiv-plastisch ist.
  subtype?: "peripheral" | "central_sensitization";
}

export interface PDDMAssessment {
  id: string;
  regionId: string;
  date: string; // ISO date (yyyy-mm-dd)
  answers: Record<string, boolean>;
  results: Record<PDDMDomainId, PDDMDomainResult>;
  createdAt: string; // ISO timestamp
}
