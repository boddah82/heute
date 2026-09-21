import { PDDMDomainId, PDDMDomainResult, PDDMStatus } from "./types";

export interface PDDMQuestion {
  id: string; // eindeutig, z.B. "nociceptive.a"
  domain: PDDMDomainId;
  level: "A" | "B";
  text: string;
  subtype?: "peripheral" | "central_sensitization";
}

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

export const PDDM_QUESTIONS: PDDMQuestion[] = [
  {
    id: "nociceptive.a",
    domain: "nociceptive",
    level: "A",
    text: "Verändert sich Dein Schmerz klar, wenn Du bestimmte Bewegungen oder Positionen einnimmst – z. B. wird er durch eine Bewegung deutlich besser und durch eine andere deutlich schlechter?",
  },
  {
    id: "nociceptive.b",
    domain: "nociceptive",
    level: "B",
    text: "Bleibt Dein Schmerz unabhängig von Bewegung oder Position meist ähnlich, ohne dass Du eine klare Erleichterung findest?",
  },
  {
    id: "nervousSystem.a",
    domain: "nervousSystem",
    level: "A",
    subtype: "peripheral",
    text: "Strahlt der Schmerz in einem klaren Streifen in Arm oder Bein aus, evtl. zusammen mit Kribbeln oder Taubheit entlang einer Linie?",
  },
  {
    id: "nervousSystem.b",
    domain: "nervousSystem",
    level: "B",
    subtype: "central_sensitization",
    text: "Reagierst Du mittlerweile auch auf Reize, die früher keine Rolle gespielt haben (z. B. leichte Berührung, Wetter, Stress), oder ist der Schmerz schwer vorhersehbar und breitet sich aus?",
  },
  {
    id: "comorbidities.a",
    domain: "comorbidities",
    level: "A",
    text: "Hast Du noch andere schmerzhafte körperliche Beschwerden (z. B. an anderen Gelenken), die Dich zusätzlich einschränken?",
  },
  {
    id: "comorbidities.b",
    domain: "comorbidities",
    level: "B",
    text: "Fühlst Du Dich in letzter Zeit häufiger niedergeschlagen, ängstlich oder antriebslos?",
  },
  {
    id: "cognitiveEmotional.a",
    domain: "cognitiveEmotional",
    level: "A",
    text: "Denkst Du oft, dass mit Deinem Körper etwas Ernstes nicht stimmt, oder macht Dir der Schmerz selbst starke Sorgen?",
  },
  {
    id: "cognitiveEmotional.b",
    domain: "cognitiveEmotional",
    level: "B",
    text: "Vermeidest Du deswegen bestimmte Bewegungen komplett – oder machst Du im Gegenteil oft mehr, als guttut, ohne auf Warnsignale zu achten?",
  },
  {
    id: "contextual.a",
    domain: "contextual",
    level: "A",
    text: "Beeinflusst Deine Arbeit oder Ausbildung Deine Beschwerden (z. B. durch Belastung, langes Sitzen/Stehen, Stress)?",
  },
  {
    id: "contextual.b",
    domain: "contextual",
    level: "B",
    text: "Gibt es andere Einflüsse aus Deinem Umfeld (Familie, soziale Situation, laufendes Verfahren), die die Situation zusätzlich erschweren?",
  },
];

export const PDDM_DOMAINS: PDDMDomainId[] = [
  "nociceptive",
  "nervousSystem",
  "comorbidities",
  "cognitiveEmotional",
  "contextual",
];

export function evaluatePDDM(answers: Record<string, boolean>): Record<PDDMDomainId, PDDMDomainResult> {
  const results = {} as Record<PDDMDomainId, PDDMDomainResult>;

  for (const domain of PDDM_DOMAINS) {
    const questions = PDDM_QUESTIONS.filter((q) => q.domain === domain);
    const bHit = questions.find((q) => q.level === "B" && answers[q.id]);
    const aHit = questions.find((q) => q.level === "A" && answers[q.id]);

    let status: PDDMStatus = "NONE";
    let subtype: PDDMDomainResult["subtype"];

    if (bHit) {
      status = "B";
      subtype = bHit.subtype;
    } else if (aHit) {
      status = "A";
      subtype = aHit.subtype;
    }

    results[domain] = { status, subtype };
  }

  return results;
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
      ? "Übungen gezielt in die Richtung wählen, die Erleichterung bringt."
      : "Schmerz lässt sich nicht eindeutig über Bewegung steuern – ärztliche Abklärung in Betracht ziehen, falls noch nicht erfolgt.";
  }
  if (domain === "nervousSystem") {
    return result.status === "A"
      ? "Hinweise auf eine periphere Nervenbeteiligung – Verlauf der Ausstrahlung/Sensibilität im Blick behalten."
      : "Hinweise auf ein sensibilisiertes Nervensystem (zentrale Sensibilisierung / nozizeptiv-plastischer Schmerz) – Schmerzedukation und behutsame, graduelle Belastungssteigerung sind hier oft hilfreicher als reine Struktur-Übungen.";
  }
  if (domain === "comorbidities") {
    return result.status === "A"
      ? "Andere körperliche Beschwerden bei der Trainingsplanung mitdenken."
      : "Psychische Belastung erkennbar – ein Gespräch mit Arzt oder Psychotherapeut kann den Reha-Verlauf unterstützen.";
  }
  if (domain === "cognitiveEmotional") {
    return result.status === "A"
      ? "Offene Fragen oder Sorgen zum Schmerz ansprechen und Informationen dazu einholen."
      : "Das Verhalten (Vermeidung oder Übertreiben) beeinflusst den Verlauf – gezieltes, schrittweises Belastungsmanagement und ggf. psychologische Unterstützung sind sinnvoll.";
  }
  if (domain === "contextual") {
    return result.status === "A"
      ? "Arbeitsbezogene Belastung als möglichen Reiz mittracken."
      : "Umfeldfaktoren jenseits der Arbeit spielen eine Rolle – ggf. zusätzliche Unterstützung (Beratung, Angehörige einbeziehen) sinnvoll.";
  }
  return null;
}
