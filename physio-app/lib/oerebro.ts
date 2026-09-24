// Örebro Musculoskeletal Pain Screening Questionnaire (Full, 25 Items),
// englischer Originalwortlaut (vom Nutzer als PDF bereitgestellte
// Physiotutors-Reproduktion) – bewusst nicht übersetzt, da keine offiziell
// validierte deutsche Fassung vorliegt und eine eigene Übersetzung bei einem
// klinischen Screening-Instrument ein Genauigkeitsrisiko wäre.
//
// Scoring-Regeln vom Nutzer bereitgestellt (Quelle: Linton et al. 2003,
// https://pubmed.ncbi.nlm.nih.gov/12616177/):
// - Item 5: 2 Punkte je angekreuzter Schmerzstelle, max. 10.
// - Items 6/7: Punktzahl = Position der angekreuzten Kategorie (0-9).
// - Items 8,9,10,11,13,14,15,18,19,20: Punktzahl = eingekreiste Zahl (0-10).
// - Items 12,16,17,21,22,23,24,25: Punktzahl = 10 minus eingekreister Zahl.
// - Gesamtscore 1-210, Cut-off >105 = höheres geschätztes Risiko für
//   künftige Arbeitsunfähigkeit (Linton et al. 2003).
// Items 6 und 7 fließen nicht in die "0-10 pro Item"-Logik ein, sondern sind
// Kategorien; "nicht berufstätig" bei Items 8/16/17 ist in der Quelle nicht
// mit einer Punktregel belegt – wird hier bewusst sichtbar von der Summe
// ausgeschlossen statt einen Wert zu erfinden.

export interface OerebroChoice {
  value: number | null; // null = "nicht berufstätig", zählt nicht in die Summe
  label: string;
}

export interface OerebroQuestion {
  id: string;
  number: number;
  text: string;
  reverseScored: boolean;
  choices: OerebroChoice[];
}

export const OEREBRO_PAIN_SITES: { id: string; label: string }[] = [
  { id: "oerebro.5.neck", label: "Neck" },
  { id: "oerebro.5.shoulder", label: "Shoulder" },
  { id: "oerebro.5.upperback", label: "Upper back" },
  { id: "oerebro.5.lowerback", label: "Lower back" },
  { id: "oerebro.5.leg", label: "Leg" },
];

const scale0to10: OerebroChoice[] = Array.from({ length: 11 }, (_, v) => ({ value: v, label: String(v) }));
const NOT_WORKING: OerebroChoice = { value: null, label: "Not working" };

function bins(labels: string[]): OerebroChoice[] {
  return labels.map((label, i) => ({ value: i, label }));
}

export const OEREBRO_QUESTIONS: OerebroQuestion[] = [
  {
    id: "oerebro.6",
    number: 6,
    text: "How many days of work have you missed because of pain during the past 12 months?",
    reverseScored: false,
    choices: bins([
      "0 days", "1-2 days", "3-7 days", "8-14 days", "15-30 days",
      "31-60 days", "61-90 days", "91-180 days", "181-365 days", ">365 days",
    ]),
  },
  {
    id: "oerebro.7",
    number: 7,
    text: "How long have you had your current pain problem?",
    reverseScored: false,
    choices: bins([
      "0-1 weeks", "2-3 weeks", "4-5 weeks", "6-7 weeks", "8-9 weeks",
      "10-11 weeks", "12-23 weeks", "24-35 weeks", "36-52 weeks", ">52 weeks",
    ]),
  },
  {
    id: "oerebro.8",
    number: 8,
    text: "Is your work heavy or monotonous? (0 = not at all, 10 = extremely)",
    reverseScored: false,
    choices: [...scale0to10, NOT_WORKING],
  },
  {
    id: "oerebro.9",
    number: 9,
    text: "How would you rate the pain that you have had during the past week? (0 = no pain, 10 = pain as bad as it could be)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.10",
    number: 10,
    text: "In the past three months, on the average, how intense was your pain on a 0-10 scale? (0 = no pain, 10 = pain as bad as it could be)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.11",
    number: 11,
    text: "How often would you say that you have experienced pain episodes, on the average, during the past three months? (0 = never, 10 = always)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.12",
    number: 12,
    text: "Based on all the things you do to cope, or deal with your pain, on an average day, how much are you able to decrease it? (0 = can't decrease it at all, 10 = can decrease it completely)",
    reverseScored: true,
    choices: scale0to10,
  },
  {
    id: "oerebro.13",
    number: 13,
    text: "How tense or anxious have you felt in the past week? (0 = absolutely calm and relaxed, 10 = as tense and anxious as I've ever felt)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.14",
    number: 14,
    text: "How much have you been bothered by feeling depressed in the past week? (0 = not at all, 10 = extremely)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.15",
    number: 15,
    text: "In your view, how large is the risk that your current pain may become persistent? (0 = no risk, 10 = very large risk)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.16",
    number: 16,
    text: "In your estimation, what are the chances that you will be able to work in six months? (0 = no chance, 10 = very large chance)",
    reverseScored: true,
    choices: [...scale0to10, NOT_WORKING],
  },
  {
    id: "oerebro.17",
    number: 17,
    text: "Considering your work routines, management, salary, promotion possibilities and work mates, how satisfied are you with your job? (0 = not at all satisfied, 10 = completely satisfied)",
    reverseScored: true,
    choices: [...scale0to10, NOT_WORKING],
  },
  {
    id: "oerebro.18",
    number: 18,
    text: "Physical activity makes my pain worse. (0 = completely disagree, 10 = completely agree)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.19",
    number: 19,
    text: "An increase in pain is an indication that I should stop what I am doing until the pain decreases. (0 = completely disagree, 10 = completely agree)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.20",
    number: 20,
    text: "I should not do my normal activities including work with my present pain. (0 = completely disagree, 10 = completely agree)",
    reverseScored: false,
    choices: scale0to10,
  },
  {
    id: "oerebro.21",
    number: 21,
    text: "I can do light work for an hour. (0 = cannot do it because of pain, 10 = can do it without pain being a problem)",
    reverseScored: true,
    choices: scale0to10,
  },
  {
    id: "oerebro.22",
    number: 22,
    text: "I can walk for an hour. (0 = cannot do it because of pain, 10 = can do it without pain being a problem)",
    reverseScored: true,
    choices: scale0to10,
  },
  {
    id: "oerebro.23",
    number: 23,
    text: "I can do ordinary household chores. (0 = cannot do it because of pain, 10 = can do it without pain being a problem)",
    reverseScored: true,
    choices: scale0to10,
  },
  {
    id: "oerebro.24",
    number: 24,
    text: "I can do the weekly shopping. (0 = cannot do it because of pain, 10 = can do it without pain being a problem)",
    reverseScored: true,
    choices: scale0to10,
  },
  {
    id: "oerebro.25",
    number: 25,
    text: "I can sleep at night. (0 = cannot do it because of pain, 10 = can do it without pain being a problem)",
    reverseScored: true,
    choices: scale0to10,
  },
];

export const OEREBRO_SCORE_RANGE: [number, number] = [1, 210];
export const OEREBRO_CUTOFF = 105;
export const OEREBRO_SOURCE_NOTE =
  "Örebro Musculoskeletal Pain Screening Questionnaire (Full). Cut-off 105: Linton SJ, Boersma K. Early identification of patients at risk of developing a persistent back problem: the predictive validity of the Örebro Musculoskeletal Pain Questionnaire. Clin J Pain. 2003;19(2):80-6. (pubmed.ncbi.nlm.nih.gov/12616177)";

export function scoreOerebroPainSites(answers: Record<string, number>): number {
  const count = OEREBRO_PAIN_SITES.reduce((sum, s) => sum + (answers[s.id] ? 1 : 0), 0);
  return Math.min(count * 2, 10);
}

// Summiert alle 21 gewerteten Items. Reverse-Items werden hier aus dem
// gespeicherten Rohwert (der tatsächlich angeklickten Zahl) in die Punktzahl
// umgerechnet (10 - Rohwert), damit die gespeicherten Antworten unverändert
// nachvollziehbar bleiben. "Nicht berufstätig" (null) trägt nichts zur Summe
// bei.
export function scoreOerebro(answers: Record<string, number | null>): number {
  let total = scoreOerebroPainSites(answers as Record<string, number>);
  for (const q of OEREBRO_QUESTIONS) {
    const raw = answers[q.id];
    if (raw === undefined || raw === null) continue;
    total += q.reverseScored ? 10 - raw : raw;
  }
  return total;
}

export function isOerebroComplete(answers: Record<string, number | null>): boolean {
  const anySiteChecked = OEREBRO_PAIN_SITES.some((s) => answers[s.id] !== undefined);
  return anySiteChecked && OEREBRO_QUESTIONS.every((q) => answers[q.id] !== undefined);
}
