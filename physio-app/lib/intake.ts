import { IntakeData, PDDMAssessment, PDDMDomainId, PDDMStatus } from "./types";
import { PDDM_DOMAIN_LABELS, PDDM_QUESTIONS, domainRecommendation } from "./pddm";

// Erstbogen: Sicherheitsfragen (Teil A) und eine Regel, die aus Erstbogen +
// PDDM eine Arbeitshypothese formuliert. Beides ist eine EIGENE, nicht
// validierte Zusammenstellung – sie ersetzt keine ärztliche Abklärung und
// keine klinische Untersuchung, sondern strukturiert den ersten Termin.

// Gängige Warnzeichen aus Screening-Listen, in Alltagssprache. Keine
// vollständige Liste und keine Diagnostik: Ein "Ja" heißt nur "im Termin
// ansprechen / ggf. ärztlich abklären".
export const RED_FLAG_QUESTIONS: { id: string; text: string }[] = [
  { id: "trauma", text: "Haben die Beschwerden nach einem Unfall oder Sturz begonnen?" },
  { id: "fever", text: "Haben Sie Fieber oder fühlen Sie sich allgemein krank?" },
  { id: "weightLoss", text: "Haben Sie ohne Absicht deutlich abgenommen (z. B. mehrere Kilo in wenigen Monaten)?" },
  { id: "nightPain", text: "Ist der Schmerz nachts dauerhaft da – ganz egal, wie Sie liegen?" },
  { id: "neuroDeficit", text: "Haben Sie Taubheit oder Kraftverlust, der zunimmt?" },
  { id: "bladderBowel", text: "Haben Sie neue Probleme mit Blase oder Darm oder Taubheit im Intimbereich?" },
  { id: "cancer", text: "Hatten Sie schon einmal eine Krebserkrankung?" },
  { id: "dizziness", text: "Haben Sie seit den Beschwerden Schwindel, Doppelbilder, Sprech- oder Schluckprobleme?" },
];

export const DURATION_OPTIONS = ["unter 6 Wochen", "6 Wochen bis 3 Monate", "über 3 Monate"] as const;
export const COURSE_OPTIONS = ["besser", "gleich", "schlechter", "wechselnd"] as const;

// ---------------------------------------------------------------------------
// Arbeitshypothese
// ---------------------------------------------------------------------------

function level(v: string | undefined): number {
  if (v === "Oft" || v === "Stimmt völlig" || v === "Sehr stark" || v === "Fast immer" || v === "Hoch" || v === "0–1 Tag") return 2;
  if (v === "Manchmal" || v === "Teils-teils" || v === "Mäßig" || v === "2–3 Tage") return 1;
  return 0;
}

// Anteil der auffälligen Antworten einer Domäne (0..1), stark = 2, mäßig = 1.
// Dient nur zur Reihenfolge zwischen Domänen mit gleichem Status.
export function domainScore(domain: PDDMDomainId, answers: Record<string, string>): number {
  const qs = PDDM_QUESTIONS.filter((q) => q.domain === domain && q.type !== "text");
  if (domain === "nociceptive") {
    const yes = qs.filter((q) => answers[q.id] === "Ja").length;
    return yes / qs.length;
  }
  let sum = 0;
  let max = 0;
  for (const q of qs) {
    if (q.type === "boolean") {
      sum += answers[q.id] === "Ja" ? 2 : 0;
    } else {
      sum += level(answers[q.id]);
    }
    max += 2;
  }
  return max ? sum / max : 0;
}

// Bei Gleichstand: zuerst, was in der Physio direkt beeinflussbar ist und die
// Einschränkung am stärksten aufrechterhält (eigene Festlegung).
const TIE_ORDER: PDDMDomainId[] = ["cognitiveEmotional", "comorbidities", "contextual", "nervousSystem"];

const STATUS_RANK: Record<PDDMStatus, number> = { B: 2, A: 1, NONE: 0 };

export interface Hypothesis {
  safetyFlags: string[];
  painDrivers: string[]; // was den Schmerz wahrscheinlich antreibt
  mainDriver?: PDDMDomainId; // Haupttreiber der Einschränkung
  amplifiers: PDDMDomainId[]; // max. 2 Verstärker
  approach: string; // Kernidee in einem Satz
  nextSteps: { domain: PDDMDomainId; text: string }[];
  checkInSession: string[]; // im Termin prüfen / nachfragen
  patientSentence?: string; // Venn-Satz: Leitsymptom + Ziel
  notes: string[];
}

export function buildHypothesis(a: PDDMAssessment): Hypothesis {
  const ans = a.answers;
  const res = a.results;
  const intake: IntakeData | undefined = a.intake;
  const notes = a.notes ?? {};

  // 1) Sicherheit
  const safetyFlags = RED_FLAG_QUESTIONS.filter((q) => intake?.redFlags[q.id] === "Ja").map((q) => q.text);

  // 2) Schmerztreiber
  const painDrivers: string[] = [];
  if (res.nociceptive.status === "A") {
    const provokes = ans["nociceptive.aggravating"] === "Ja";
    const relieves = ans["nociceptive.relief"] === "Ja";
    painDrivers.push(
      provokes && relieves
        ? "Mechanisch: bestimmte Haltungen/Bewegungen lösen aus, andere lindern – klarer Ansatzpunkt über Belastung und Position."
        : "Mechanisch: Schmerz hängt erkennbar von Belastung oder Position ab."
    );
  }
  if (res.nociceptive.status === "B") {
    painDrivers.push("Kein erkennbarer Bezug zu Bewegung oder Position – ärztliche Abklärung erwägen, falls noch nicht erfolgt.");
  }
  const peripheral = Math.max(level(ans["nervousSystem.quality"]), level(ans["nervousSystem.paresthesia"]));
  const central = Math.max(level(ans["nervousSystem.allodynia"]), level(ans["nervousSystem.spreading"]), level(ans["nervousSystem.hypersensitivity"]));
  if (peripheral >= 1) painDrivers.push("Mögliche Nervenbeteiligung (Brennen/Kribbeln/Taubheit) – nur ein Hinweis, Neuro-Status klärt es.");
  if (central === 2) painDrivers.push("Mögliche Sensibilisierung (Berührung, Ausbreitung, Licht/Lärm) – erst klinisch bestätigen, z. B. Allodynie testen.");

  // 3) Haupttreiber der Einschränkung + Verstärker (ohne Nozizeptiv; das ist der Ansatzpunkt)
  const candidates = TIE_ORDER.filter((d) => res[d].status !== "NONE").sort((x, y) => {
    const s = STATUS_RANK[res[y].status] - STATUS_RANK[res[x].status];
    if (s !== 0) return s;
    const sc = domainScore(y, ans) - domainScore(x, ans);
    if (Math.abs(sc) > 0.001) return sc;
    return TIE_ORDER.indexOf(x) - TIE_ORDER.indexOf(y);
  });
  const mainDriver = candidates.find((d) => res[d].status === "B");
  const amplifiers = candidates.filter((d) => d !== mainDriver).slice(0, 2);

  // 4) Kernidee
  let approach: string;
  const mech = res.nociceptive.status === "A";
  if (mainDriver === "cognitiveEmotional" && mech) {
    approach =
      "Den mechanischen Ansatzpunkt nutzen, um Angst und Hilflosigkeit abzubauen: Der Patient erlebt selbst, dass er den Schmerz über Position und Dosierung beeinflussen kann.";
  } else if (mainDriver === "cognitiveEmotional") {
    approach = "Zuerst eine verständliche, nicht bedrohliche Erklärung und gemeinsam geplante, kleine Belastungsschritte – Erfahrung vor Erklärung.";
  } else if (mainDriver === "comorbidities") {
    approach = "Schlaf, Stress oder Aktivitätsniveau als Verstärker mitbehandeln bzw. mit Arzt/Team abstimmen – nur Übungen zu ändern wird wahrscheinlich nicht reichen.";
  } else if (mainDriver === "contextual") {
    approach = "Umfeld und Arbeit einbeziehen (Erwartungen klären, Belastung anpassen) – die Einschränkung entsteht nicht nur im Körper.";
  } else if (mainDriver === "nervousSystem") {
    approach = "Sensibilisierung ernst nehmen: Edukation (Schmerz ≠ Schaden) und Belastung in kleinen, gut tolerierten Schritten statt schneller Steigerung.";
  } else if (mech) {
    approach = "Belastung und Belastbarkeit stehen im Vordergrund: Dosierung finden, die gut vertragen wird, und schrittweise steigern.";
  } else {
    approach = "Kein klarer Treiber erkennbar – im Termin gezielt nachfragen und untersuchen, bevor ein Plan steht.";
  }

  // 5) Nächste Schritte
  const stepDomains: PDDMDomainId[] = [...(mainDriver ? [mainDriver] : []), ...(mech || res.nociceptive.status === "B" ? (["nociceptive"] as PDDMDomainId[]) : []), ...amplifiers];
  const nextSteps = stepDomains
    .map((d) => ({ domain: d, text: domainRecommendation(d, res[d]) ?? "" }))
    .filter((s) => s.text);

  // 6) Im Termin prüfen
  const checkInSession: string[] = [];
  if (safetyFlags.length) checkInSession.push("Sicherheitsfragen mit „Ja“ zuerst klären (siehe oben).");
  if (peripheral >= 1) checkInSession.push("Neuro-Status: Sensibilität, Kraft, Reflexe.");
  if (central >= 1) checkInSession.push("Allodynie und Druckschmerz an entfernter Stelle testen, bevor von Sensibilisierung gesprochen wird.");
  if (level(ans["nervousSystem.hypersensitivity"]) === 2 && (a.regionId === "nacken" || intake?.leadSymptom?.toLowerCase().includes("kopf"))) {
    checkInSession.push("Licht-/Lärmempfindlichkeit bei Kopfschmerz: auch an Migräne denken, Kopfschmerz-Typ klären.");
  }
  if (ans["nervousSystem.spreading"] === "Nie" && notes["nervousSystem.spreading"]) {
    checkInSession.push(`Widerspruch klären: Ausbreitung „Nie“, aber Anmerkung „${notes["nervousSystem.spreading"]}“.`);
  }
  if (ans["contextual.nocebo"] === "Ja") {
    checkInSession.push(
      ans["contextual.noceboDetails"]
        ? `Angstmachende Aussage aufgreifen, ohne den Behandler schlechtzumachen: „${ans["contextual.noceboDetails"]}“`
        : "Nachfragen, welche Aussage Angst gemacht hat, und sie einordnen."
    );
  }
  if (ans["comorbidities.conditions"]?.trim()) {
    checkInSession.push(`Weitere Diagnosen bei der Dosierung berücksichtigen: ${ans["comorbidities.conditions"].trim()}`);
  }
  if (intake?.ownExplanation) checkInSession.push(`Eigene Erklärung des Patienten aufgreifen: „${intake.ownExplanation}“`);
  if (intake?.toldSoFar) checkInSession.push(`Bisheriges Label prüfen: Passt „${intake.toldSoFar}“ zu Befund und Tests?`);

  // 7) Satz für den Patienten (Leitsymptom + wichtigstes Ziel)
  const goal = intake?.goals.find((g) => g.label.trim());
  let patientSentence: string | undefined;
  if (intake?.leadSymptom || goal) {
    const parts: string[] = [];
    if (intake?.leadSymptom) {
      parts.push(`Am meisten stört Sie: ${intake.leadSymptom}${intake.leadValue !== undefined ? ` (Schmerz ${intake.leadValue}/10)` : ""}.`);
    }
    if (goal) {
      parts.push(`Ihr wichtigstes Ziel: „${goal.label}“${goal.value !== undefined ? ` – das geht heute mit ${goal.value} von 10` : ""}. Genau daran arbeiten wir.`);
    }
    patientSentence = parts.join(" ");
  }

  // 8) Hinweise
  const hints: string[] = [];
  if (intake?.duration === "über 3 Monate" && (mainDriver === "cognitiveEmotional" || mainDriver === "nervousSystem")) {
    hints.push("Beschwerden über 3 Monate: Gewebe allein erklärt selten den ganzen Verlauf – Einschränkung und Schmerz getrennt betrachten.");
  }
  if (intake?.duration === "unter 6 Wochen" && mech) {
    hints.push("Frische Beschwerden: Heilung und Schutz haben anfangs mehr Gewicht, Steigerung vorsichtiger.");
  }
  if (intake?.course === "schlechter") hints.push("Verlauf laut Patient zunehmend – Ursache erfragen (Belastung, Schlaf, Stress, neue Symptome?).");

  return { safetyFlags, painDrivers, mainDriver, amplifiers, approach, nextSteps, checkInSession, patientSentence, notes: hints };
}

export function domainLabel(d: PDDMDomainId) {
  return PDDM_DOMAIN_LABELS[d];
}
