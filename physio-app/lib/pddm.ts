import { PDDMDomainId, PDDMDomainResult, PDDMStatus } from "./types";

export const PDDM_DOMAIN_LABELS: Record<PDDMDomainId, string> = {
  nociceptive: "Nozizeptiv (mechanisch)",
  nervousSystem: "Nervensystem",
  comorbidities: "Komorbiditäten",
  cognitiveEmotional: "Kognitiv-emotional",
  contextual: "Umfeld / Kontext",
};

// Kurze, laienverständliche Erklärung je Domäne – hilft beim Ausfüllen und
// beim Lesen der Auswertung zu verstehen, worum es in dem Bereich überhaupt geht.
export const PDDM_DOMAIN_HINTS: Record<PDDMDomainId, string> = {
  nociceptive: "Wie stark hängt der Schmerz direkt von Bewegung oder Position ab?",
  nervousSystem: "Ist das Nervensystem selbst mitbeteiligt – Ausstrahlung, veränderte Empfindlichkeit?",
  comorbidities: "Andere körperliche oder psychische Belastungen, die nebenbei mitspielen.",
  cognitiveEmotional: "Gedanken, Sorgen und Verhalten rund um den Schmerz.",
  contextual: "Einflüsse aus Arbeit, Familie oder sozialem Umfeld.",
};

export type PDDMQuestionType = "boolean" | "scale3" | "text";

export interface PDDMQuestion {
  id: string;
  domain: PDDMDomainId;
  type: PDDMQuestionType;
  text: string;
  scaleLabels?: [string, string, string]; // aufsteigend nach Auffälligkeit, außer bei reversed
  reversed?: boolean; // erste Stufe ist die auffällige (z. B. wenig Aktivität)
  placeholder?: string; // für type "text"
  optional?: boolean; // nicht Pflicht zum Absenden (Freitextfelder)
}

// Fragen nach dem vom Nutzer bereitgestellten PDDM-Patienten-Anamnesebogen,
// wortgleich übernommen. Ersetzt die bisherigen 10 Ja/Nein-Fragen (2 pro
// Domäne) durch feinere, mehrstufige Fragen.
export const PDDM_QUESTIONS: PDDMQuestion[] = [
  {
    id: "nociceptive.aggravating",
    domain: "nociceptive",
    type: "boolean",
    text: "Gibt es bestimmte Bewegungen oder Haltungen, die Ihren Schmerz sofort provozieren?",
  },
  {
    id: "nociceptive.relief",
    domain: "nociceptive",
    type: "boolean",
    text: "Können Sie eine Position finden, die den Schmerz spürbar lindert?",
  },
  {
    id: "nociceptive.stiffness",
    domain: "nociceptive",
    type: "boolean",
    text: "Fühlt sich die betroffene Region steif an (z. B. Morgensteifigkeit > 30 Minuten)?",
  },
  {
    id: "nociceptive.delayed",
    domain: "nociceptive",
    type: "boolean",
    text: "Reagiert der Schmerz zeitversetzt erst am Tag nach einer Belastung intensiver?",
  },
  {
    id: "nervousSystem.quality",
    domain: "nervousSystem",
    type: "scale3",
    text: "Fühlen sich die Schmerzen brennend, elektrisierend, stechend oder wie Stromschläge an?",
    scaleLabels: ["Nie", "Manchmal", "Oft"],
  },
  {
    id: "nervousSystem.paresthesia",
    domain: "nervousSystem",
    type: "scale3",
    text: "Spüren Sie ein Kribbeln, Taubheitsgefühl oder Ameisenlaufen?",
    scaleLabels: ["Nie", "Manchmal", "Oft"],
  },
  {
    id: "nervousSystem.allodynia",
    domain: "nervousSystem",
    type: "scale3",
    text: "Sind bereits leichte Berührungen (z. B. durch Kleidung) unangenehm?",
    scaleLabels: ["Nie", "Manchmal", "Oft"],
  },
  {
    id: "nervousSystem.spreading",
    domain: "nervousSystem",
    type: "scale3",
    text: "Breitet sich der Schmerz auf andere, unbeteiligte Körperregionen aus?",
    scaleLabels: ["Nie", "Manchmal", "Oft"],
  },
  {
    id: "nervousSystem.hypersensitivity",
    domain: "nervousSystem",
    type: "scale3",
    text: "Reagieren Sie empfindlicher als früher auf Licht, Lärm, Kälte oder Stress?",
    scaleLabels: ["Nie", "Manchmal", "Oft"],
  },
  {
    id: "comorbidities.sleep",
    domain: "comorbidities",
    type: "scale3",
    text: "Wachen Sie nachts wegen Schmerzen auf oder fühlen sich morgens unerholt?",
    scaleLabels: ["Selten", "Manchmal", "Fast immer"],
  },
  {
    id: "comorbidities.stress",
    domain: "comorbidities",
    type: "scale3",
    text: "Fühlen Sie sich im Alltag aktuell stark überfordert oder dauerhaft unter Strom?",
    scaleLabels: ["Gering", "Mäßig", "Hoch"],
  },
  {
    id: "comorbidities.activity",
    domain: "comorbidities",
    type: "scale3",
    text: "Wie viele Tage pro Woche bewegen Sie sich mindestens 30 Minuten?",
    scaleLabels: ["0–1 Tag", "2–3 Tage", "4+ Tage"],
    reversed: true,
  },
  {
    id: "comorbidities.conditions",
    domain: "comorbidities",
    type: "text",
    text: "Liegen weitere Diagnosen vor (z. B. Diabetes, Rheuma, Bluthochdruck, Magen-Darm)?",
    placeholder: "Details (optional)",
    optional: true,
  },
  {
    id: "cognitiveEmotional.kinesiophobia",
    domain: "cognitiveEmotional",
    type: "scale3",
    text: "Ich habe Angst, dass körperliche Aktivität oder Bewegung meine Verletzung/Schmerzen schlimmer macht.",
    scaleLabels: ["Stimmt nicht", "Teils-teils", "Stimmt völlig"],
  },
  {
    id: "cognitiveEmotional.catastrophizing",
    domain: "cognitiveEmotional",
    type: "scale3",
    text: "Wenn die Schmerzen stark sind, befürchte ich oft, dass sie niemals wieder besser werden.",
    scaleLabels: ["Stimmt nicht", "Teils-teils", "Stimmt völlig"],
  },
  {
    id: "cognitiveEmotional.helplessness",
    domain: "cognitiveEmotional",
    type: "scale3",
    text: "Ich habe das Gefühl, dass ich selbst wenig Einfluss darauf habe, meine Schmerzen zu lindern.",
    scaleLabels: ["Stimmt nicht", "Teils-teils", "Stimmt völlig"],
  },
  {
    id: "cognitiveEmotional.hypervigilance",
    domain: "cognitiveEmotional",
    type: "scale3",
    text: "Ich ertappe mich dabei, wie ich meinen Körper ständig auf Schmerzsignale überprüfe (Scannen).",
    scaleLabels: ["Stimmt nicht", "Teils-teils", "Stimmt völlig"],
  },
  {
    id: "contextual.work",
    domain: "contextual",
    type: "scale3",
    text: "Fühlen Sie sich an Ihrem Arbeitsplatz körperlich oder mental stark belastet?",
    scaleLabels: ["Nein", "Mäßig", "Sehr stark"],
  },
  {
    id: "contextual.social",
    domain: "contextual",
    type: "scale3",
    text: "Macht sich Ihr Umfeld (Familie/Partner) große Sorgen oder rät Ihnen von Belastung ab?",
    scaleLabels: ["Nein", "Mäßig", "Sehr stark"],
  },
  {
    id: "contextual.nocebo",
    domain: "contextual",
    type: "boolean",
    text: 'Wurden Ihnen von Fachpersonal Aussagen gemacht, die Ihnen Angst gemacht haben (z. B. "Bandscheibe kaputt", "Knochen auf Knochen")?',
  },
  {
    id: "contextual.noceboDetails",
    domain: "contextual",
    type: "text",
    text: "Details zur Nocebo-Erfahrung",
    placeholder: "Details (optional)",
    optional: true,
  },
];

export const PDDM_DOMAINS: PDDMDomainId[] = [
  "nociceptive",
  "nervousSystem",
  "comorbidities",
  "cognitiveEmotional",
  "contextual",
];

function isYes(v: string | undefined): boolean {
  return v === "Ja";
}

// Bildet die unterschiedlich benannten 3-Stufen-Skalen (Nie/Manchmal/Oft,
// Stimmt nicht/Teils-teils/Stimmt völlig, Gering/Mäßig/Hoch, ...) auf eine
// gemeinsame Auffälligkeits-Stufe ab: 0 = unauffällig, 1 = mäßig, 2 = stark.
function level(v: string | undefined): 0 | 1 | 2 {
  if (v === "Oft" || v === "Stimmt völlig" || v === "Sehr stark" || v === "Fast immer" || v === "Hoch") return 2;
  if (v === "Manchmal" || v === "Teils-teils" || v === "Mäßig") return 1;
  return 0;
}

// "Wie viele Tage pro Woche bewegen Sie sich..." läuft umgekehrt: wenig
// Aktivität ist die auffällige Seite.
function activityLevel(v: string | undefined): 0 | 1 | 2 {
  if (v === "0–1 Tag") return 2;
  if (v === "2–3 Tage") return 1;
  return 0;
}

// Schwellenwerte unterhalb sind eine eigene, transparente Vereinfachung
// (nicht aus einer validierten Quelle abgeleitet) – Grundidee: "stärkstes
// Einzelsignal je Domäne entscheidet", analog zur bestehenden Ampel-Logik
// in lib/trafficLight.ts. Domänenspezifisch angepasst an die inhaltliche
// Bedeutung von A/B in PDDM (siehe domainRecommendation).
function evalNociceptive(a: Record<string, string>): PDDMDomainResult {
  const ids = ["nociceptive.aggravating", "nociceptive.relief", "nociceptive.stiffness", "nociceptive.delayed"];
  if (ids.every((id) => a[id] === undefined)) return { status: "NONE" };
  // Irgendein mechanisch erklärbares Signal (verstärkende Bewegung, lindernde
  // Position, Steifigkeit, verzögerte Reaktion) -> A. Erst wenn alle vier
  // verneint werden, gibt es keinen erkennbaren Bezug zu Bewegung/Position
  // -> B (entspricht der früheren nociceptive.b).
  const anySignal = ids.some((id) => isYes(a[id]));
  return anySignal ? { status: "A" } : { status: "B" };
}

function evalNervousSystem(a: Record<string, string>): PDDMDomainResult {
  const ids = [
    "nervousSystem.quality",
    "nervousSystem.paresthesia",
    "nervousSystem.allodynia",
    "nervousSystem.spreading",
    "nervousSystem.hypersensitivity",
  ];
  if (ids.every((id) => a[id] === undefined)) return { status: "NONE" };
  const centralMax = Math.max(
    level(a["nervousSystem.allodynia"]),
    level(a["nervousSystem.spreading"]),
    level(a["nervousSystem.hypersensitivity"])
  );
  const peripheralMax = Math.max(level(a["nervousSystem.quality"]), level(a["nervousSystem.paresthesia"]));
  if (centralMax === 2) return { status: "B", subtype: "central_sensitization" };
  if (peripheralMax === 2) return { status: "A", subtype: "peripheral" };
  if (centralMax === 1) return { status: "A", subtype: "central_sensitization" };
  if (peripheralMax === 1) return { status: "A", subtype: "peripheral" };
  return { status: "NONE" };
}

function evalComorbidities(a: Record<string, string>): PDDMDomainResult {
  const scaleIds = ["comorbidities.sleep", "comorbidities.stress", "comorbidities.activity"];
  const conditionsText = a["comorbidities.conditions"]?.trim();
  if (scaleIds.every((id) => a[id] === undefined) && !conditionsText) return { status: "NONE" };
  const maxLevel = Math.max(
    level(a["comorbidities.sleep"]),
    level(a["comorbidities.stress"]),
    activityLevel(a["comorbidities.activity"])
  );
  if (maxLevel === 2) return { status: "B" };
  if (maxLevel === 1 || Boolean(conditionsText)) return { status: "A" };
  return { status: "NONE" };
}

function evalCognitiveEmotional(a: Record<string, string>): PDDMDomainResult {
  const ids = [
    "cognitiveEmotional.kinesiophobia",
    "cognitiveEmotional.catastrophizing",
    "cognitiveEmotional.helplessness",
    "cognitiveEmotional.hypervigilance",
  ];
  if (ids.every((id) => a[id] === undefined)) return { status: "NONE" };
  const maxLevel = Math.max(...ids.map((id) => level(a[id])));
  if (maxLevel === 2) return { status: "B" };
  if (maxLevel === 1) return { status: "A" };
  return { status: "NONE" };
}

function evalContextual(a: Record<string, string>): PDDMDomainResult {
  if (a["contextual.work"] === undefined && a["contextual.social"] === undefined && a["contextual.nocebo"] === undefined) {
    return { status: "NONE" };
  }
  const nocebo = isYes(a["contextual.nocebo"]);
  const work = level(a["contextual.work"]);
  const social = level(a["contextual.social"]);
  if (social === 2 || nocebo) return { status: "B" };
  if (work >= 1 || social >= 1) return { status: "A" };
  return { status: "NONE" };
}

// Ist diese konkrete Antwort die auffällige Seite ihrer Frage? Bei
// boolean-Fragen ist "Ja" auffällig (bei Nozizeptiv umgekehrt interpretiert,
// siehe evalNociceptive: dort ist "Ja" gerade das gute/erklärbare Signal –
// hier geht es nur um Transparenz, welche Antwort überhaupt vom neutralen
// Standardfall abweicht, nicht um Wertung).
function isFlaggedAnswer(question: PDDMQuestion, value: string): boolean {
  if (question.type === "boolean") return value === "Ja";
  if (question.type === "scale3" && question.scaleLabels) {
    const benign = question.reversed ? question.scaleLabels[2] : question.scaleLabels[0];
    return value !== benign;
  }
  return false;
}

// Liefert die konkreten Antworten, die den Domänen-Befund ausgelöst haben –
// für die Anzeige "weil: ..." in der Auswertung, damit nachvollziehbar ist,
// worauf sich A/B stützt, statt nur das Label zu zeigen.
export function explainDomain(domain: PDDMDomainId, answers: Record<string, string>): { text: string; value: string }[] {
  const reasons = PDDM_QUESTIONS.filter((q) => q.domain === domain && q.type !== "text")
    .filter((q) => answers[q.id] !== undefined && isFlaggedAnswer(q, answers[q.id]))
    .map((q) => ({ text: q.text, value: answers[q.id] }));

  // Nozizeptiv-B entsteht gerade dadurch, dass keine der vier Fragen mit
  // "Ja" beantwortet wurde – dann ist die Liste sonst leer, obwohl es eine
  // klare Begründung gibt.
  if (reasons.length === 0 && domain === "nociceptive" && answers["nociceptive.aggravating"] !== undefined) {
    return [{ text: "Bewegung/Position beeinflusst den Schmerz nicht erkennbar", value: "alle vier Fragen verneint" }];
  }
  return reasons;
}

export function evaluatePDDM(answers: Record<string, string>): Record<PDDMDomainId, PDDMDomainResult> {
  return {
    nociceptive: evalNociceptive(answers),
    nervousSystem: evalNervousSystem(answers),
    comorbidities: evalComorbidities(answers),
    cognitiveEmotional: evalCognitiveEmotional(answers),
    contextual: evalContextual(answers),
  };
}

const STATUS_LABEL: Record<PDDMStatus, string> = {
  NONE: "Nicht relevant",
  A: "A – einfach zu adressieren",
  B: "B – komplex, ggf. Zuweisung sinnvoll",
};

export function statusLabel(status: PDDMStatus): string {
  return STATUS_LABEL[status];
}

export function domainRecommendation(domain: PDDMDomainId, result: PDDMDomainResult): string | null {
  if (result.status === "NONE") return null;

  if (domain === "nociceptive") {
    return result.status === "A"
      ? "Belastung in die Richtung steigern, die den Schmerz lindert oder unverändert lässt; die Bewegung/Position, die ihn sofort auslöst, vorerst reduzieren oder anpassen (Umfang, Winkel, Tempo)."
      : "Kein klarer Zusammenhang zwischen Bewegung/Position und Schmerz erkennbar – vor weiterer Belastungssteigerung eine ärztliche Abklärung in Betracht ziehen, falls noch nicht erfolgt.";
  }
  if (domain === "nervousSystem") {
    if (result.status === "B") {
      return "Vor intensiven Struktur-Übungen zuerst Schmerzedukation anbieten (Schmerz ist nicht gleich Gewebeschaden) und die Belastung in kleinen, gut tolerierten Schritten statt schnell steigern.";
    }
    return result.subtype === "central_sensitization"
      ? "Noch milde Sensibilisierungszeichen – bei der nächsten Einschätzung erneut abfragen, ob sie zunehmen; einfache Schmerzedukation kann schon jetzt helfen."
      : "Verlauf von Ausstrahlung, Kribbeln oder Taubheit über die nächsten Termine dokumentieren; bei Verschlechterung oder neuen Ausfällen ärztlich abklären lassen.";
  }
  if (domain === "comorbidities") {
    return result.status === "A"
      ? "Diagnosen/Beschwerden bei der Übungsauswahl berücksichtigen (z. B. Kontraindikationen prüfen); Aktivitätsniveau im Auge behalten."
      : "Schlaf, Stresslevel oder Aktivitätsniveau aktiv ansprechen; bei anhaltend starker Belastung Rücksprache mit Hausarzt oder Psychotherapeut anregen, parallel zur Physiotherapie.";
  }
  if (domain === "cognitiveEmotional") {
    return result.status === "A"
      ? "Konkret nachfragen, was genau die Sorge auslöst, und mit verständlicher Information dagegenhalten (Schmerz ist nicht gleich Gewebeschaden)."
      : "Vermeidungs- oder Übertreibungsverhalten aktiv ansprechen; graduelle, gemeinsam geplante Belastungssteigerung statt reiner Ansagen; bei ausgeprägter Symptomatik psychologische Unterstützung vorschlagen.";
  }
  if (domain === "contextual") {
    return result.status === "A"
      ? "Arbeitsbezogene Belastungsspitzen als möglichen Reiz mittracken (z. B. im Notizfeld beim Check-in vermerken)."
      : "Mit dem Patienten besprechen, welche Unterstützung im Umfeld sinnvoll wäre; Erwartungen zwischen Patient und Umfeld aktiv klären, ggf. gemeinsames Gespräch anregen.";
  }
  return null;
}
