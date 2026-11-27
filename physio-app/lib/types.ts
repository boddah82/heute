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
  // Eigene Einschätzung der Person, ob dieser Eintrag mit einer anderen
  // Region zusammenhängt (z. B. Rücken strahlt in den Oberschenkel aus).
  // Bewusst subjektiv erfasst, nicht aus Zeitstempeln hergeleitet.
  relatedRegionId?: string;
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

// Periodische Schmerz-Baseline (unabhängig vom aktivitätsgebundenen
// Check-in): aktueller Schmerz, Schmerz bei maximaler Belastung, Schmerz
// danach (klingt er ab oder bleibt er?). Teil der PDDM-Anamnese, da im
// selben Bogen erhoben. Der Verlauf über mehrere Einschätzungen (siehe
// PDDMPainTrendChart) übernimmt die Rolle eines Durchschnitts – bewusst
// keine Schätzung eines Mittelwerts aus dem Gedächtnis.
export interface PDDMPainBaseline {
  current: number; // 0-10
  maxLoad: number; // 0-10
  afterMaxLoad: number; // 0-10
}

export interface PDDMAssessment {
  id: string;
  regionId: string;
  date: string; // ISO date (yyyy-mm-dd)
  answers: Record<string, string>;
  results: Record<PDDMDomainId, PDDMDomainResult>;
  painBaseline?: PDDMPainBaseline;
  // "paper": vom ausgehändigten Papierbogen nachträglich übertragen (Datum =
  // Ausfülldatum des Bogens, nicht Eingabedatum). Fehlt bei Eingabe in der App.
  source?: "paper";
  // Zusatzangaben aus dem Erstbogen (Teil A), falls über "Erstbogen
  // übertragen" erfasst. Fehlt bei reinen PDDM-Einschätzungen.
  intake?: IntakeData;
  // Freie Anmerkungen des Patienten je Frage (Schlüssel = Frage-ID), z. B.
  // handschriftliche Randnotizen auf dem Papierbogen. Fließen bewusst nicht
  // in die A/B-Einordnung ein, werden nur zur Einordnung angezeigt.
  // Schlüssel PDDM_GENERAL_NOTE_ID = Anmerkung ohne Bezug zu einer Frage.
  notes?: Record<string, string>;
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
  // Motivations-Lineal aus der motivierenden Gesprächsführung (MI): Wie
  // wichtig ist dem Patienten das Ziel, und wie zuversichtlich ist er, es
  // zu schaffen (je 0-10)? Optional, ältere Ziele haben die Felder nicht.
  importance?: number;
  confidence?: number;
  motivationDate?: string; // ISO date (yyyy-mm-dd) der letzten Einschätzung
}

export interface PSFSRating {
  id: string;
  regionId: string;
  goalId: string;
  date: string; // ISO date (yyyy-mm-dd)
  value: number; // 0-10
  createdAt: string; // ISO timestamp
}

// Validierte Screening-Fragebögen (siehe lib/questionnaires.ts für Items,
// Skala und Quellenangabe). Bewusst getrennt von PDDM: PDDM ist eine
// kategoriale Grobeinschätzung durch die Therapeutin/den Therapeuten, diese
// Fragebögen sind standardisierte Selbstauskunfts-Instrumente mit eigener
// Auswertungslogik.
export type QuestionnaireId = "tsk" | "fess" | "oerebro";

export interface QuestionnaireResult {
  id: string;
  regionId: string;
  questionnaireId: QuestionnaireId;
  date: string; // ISO date (yyyy-mm-dd)
  // Item-ID -> gewählter Rohwert. null nur bei Örebro-Items mit
  // "nicht berufstätig"-Option (zählt nicht in die Gesamtpunktzahl).
  answers: Record<string, number | null>;
  totalScore: number;
  createdAt: string; // ISO timestamp
}

// Mandant/Patient im Therapeuten-Bereich. Enthält selbst keine Trackingdaten –
// die kommen ausschließlich per Verlauf-Link vom Patientengerät (siehe
// PatientRecord). Getrennt vom eigenen Tracker-Gebrauch des Therapeuten.
export interface Patient {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
}

// Ein per Verlauf-Link importierter Datenstand eines Patienten. Ein neuer
// Import ersetzt den bisherigen Stand für diesen Patienten komplett (kein
// Merge über mehrere Links hinweg).
export interface PatientRecord {
  patientId: string;
  checkIns: CheckIn[];
  pddm: PDDMAssessment[];
  psfsGoals: PSFSGoal[];
  psfsRatings: PSFSRating[];
  questionnaireResults: QuestionnaireResult[];
  // Optional, damit ältere Datensätze/Links ohne diese Felder gültig bleiben.
  leadSymptoms?: LeadSymptom[];
  leadRatings?: LeadSymptomRating[];
  sleep?: SleepEntry[];
  importedAt: string; // ISO timestamp
}

// Bündel aller Trackingdaten eines Patientengeräts, wie es per Verlauf-Link
// exportiert wird (siehe lib/historyLink.ts).
export interface HistoryBundle {
  checkIns: CheckIn[];
  pddm: PDDMAssessment[];
  psfsGoals: PSFSGoal[];
  psfsRatings: PSFSRating[];
  questionnaireResults: QuestionnaireResult[];
  leadSymptoms?: LeadSymptom[];
  leadRatings?: LeadSymptomRating[];
  sleep?: SleepEntry[];
  exportedAt: string; // ISO timestamp
}

// Leitsymptom (eigene Umsetzung nach dem Prinzip Wiedertest-/Asterisk-Zeichen
// + NPRS 0–10): eine feste Situation, die den Patienten am meisten stört
// (z. B. "Erste Schritte morgens"), unabhängig von einer Aktivität immer
// gleich bewertet. Zeigt, ob sich das Leitsymptom über Wochen verändert.
export interface LeadSymptom {
  id: string;
  regionId: string;
  label: string;
  createdAt: string; // ISO timestamp
}

export interface LeadSymptomRating {
  id: string;
  regionId: string;
  symptomId: string;
  date: string; // ISO date (yyyy-mm-dd)
  value: number; // 0-10
  startupMin?: number; // optional: Minuten, bis es "eingelaufen"/besser ist
  createdAt: string; // ISO timestamp
}

// Schlaf: eine Frage pro Morgen, unabhängig von der Region.
export interface SleepEntry {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
  rested: number; // 0 = gar nicht erholt, 10 = voll erholt
  createdAt: string; // ISO timestamp
}

// Erstbogen Teil A: Angaben vor den PDDM-Fragen. Leitsymptom, Ziele und
// Schlaf werden zusätzlich als normale Einträge angelegt (Leitsymptom-,
// Ziele- und Schlaf-Verlauf); hier bleibt der Stand vom Erstbogen erhalten.
export type IntakeDuration = "unter 6 Wochen" | "6 Wochen bis 3 Monate" | "über 3 Monate";
export type IntakeCourse = "besser" | "gleich" | "schlechter" | "wechselnd";

export interface IntakeData {
  duration?: IntakeDuration;
  course?: IntakeCourse;
  redFlags: Record<string, "Ja" | "Nein">;
  leadSymptom?: string;
  leadValue?: number;
  leadStartupMin?: number;
  goals: { label: string; value?: number }[];
  rested?: number;
  ownExplanation?: string; // "Was glauben Sie selbst, woher die Beschwerden kommen?"
  toldSoFar?: string; // "Was hat man Ihnen bisher dazu gesagt?"
  expectation?: string; // "Was erhoffen Sie sich von der Behandlung?"
}
