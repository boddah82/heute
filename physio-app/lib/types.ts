export type TrafficLight = "GREEN" | "YELLOW" | "RED" | "PENDING";

export interface BodyRegion {
  id: string;
  label: string;
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

export interface PlanExercise {
  id: string;
  label: string;
  notes?: string; // z. B. "3x12, Pause 60s"
}

// Von der Therapeutin/dem Therapeuten vorgegebener Plan für eine Region,
// per Link übertragen (siehe lib/planLink.ts). Kein Server, kein Live-Sync –
// ein neuer Plan überschreibt beim Import den bisherigen für diese Region.
export interface TrainingPlan {
  regionId: string;
  exercises: PlanExercise[];
  createdAt: string; // ISO timestamp
}

// Patient-Specific Functional Scale (Stratford et al. 1995): der Patient
// benennt selbst die für ihn bedeutsamen Alltags-/Sportaktivitäten und
// bewertet periodisch, wie nah er wieder daran ist, sie wie vor der
// Beschwerde ausführen zu können (0 = nicht möglich, 10 = wie vorher).
export interface PSFSGoal {
  id: string;
  regionId: string;
  label: string;
  createdAt: string; // ISO timestamp
}

export interface PSFSRating {
  id: string;
  regionId: string;
  goalId: string;
  date: string; // ISO date (yyyy-mm-dd)
  value: number; // 0-10
  createdAt: string; // ISO timestamp
}
