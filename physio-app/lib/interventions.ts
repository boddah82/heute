import { PDDMAssessment, PSFSGoal, QuestionnaireResult } from "./types";
import { OEREBRO_CUTOFF } from "./oerebro";

// Interventionsauswahl: leitet aus der letzten PDDM-Einschätzung, den
// Fragebögen und den Zielen (inkl. Motivations-Lineal) eine geordnete
// Liste von Behandlungsbausteinen ab.
//
// Grundlagen (Sekundärquellen, Studien darin noch nicht einzeln geprüft):
// - PDDM (Tousignant-Laflamme et al.): Treiber finden, A = selbst gut
//   beeinflussbar, B = komplexer / Team nötig; beim größten Treiber
//   anfangen, der sich jetzt verändern lässt.
// - Kurs Gino Lazzaro, Md5 "akute und chronische Schmerzen behandeln":
//   belastungsabhängiger vs. -unabhängiger Schmerz; "Calm it down, build it
//   back up" (Greg Lehman).
// - Ahura (Kap. 5.3): Praxisableitungen (Aufklärung, progressive Bewegung,
//   Ängste abbauen, Selbstwirksamkeit, Entspannung, Lebensstil).
// - Fit for Purpose (Moseley-Gruppe): glauben -> fühlen -> belastbar sein ->
//   stabilisieren.
// Die Schwellen unten sind eine eigene, transparente Vereinfachung und
// ersetzen nicht das klinische Reasoning.

export type InterventionWho = "selbst" | "team";

export interface InterventionItem {
  id: string;
  title: string;
  who: InterventionWho;
  reason: string; // warum dieser Baustein (welcher Befund)
  actions: string[]; // konkret in der Therapie
  rehaNote?: string; // Zusatz für die Sucht-Reha
}

export interface InterventionInput {
  pddm?: PDDMAssessment;
  questionnaires: QuestionnaireResult[];
  goals: PSFSGoal[];
}

function latestOf(results: QuestionnaireResult[], id: QuestionnaireResult["questionnaireId"]) {
  return [...results].filter((r) => r.questionnaireId === id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

export function buildInterventions({ pddm, questionnaires, goals }: InterventionInput): InterventionItem[] {
  const items: InterventionItem[] = [];
  const r = pddm?.results;
  const a = pddm?.answers ?? {};
  const pain = pddm?.painBaseline;

  // 1. Motivation zuerst: ohne Wichtigkeit/Zuversicht greift keine Übung.
  const lowImportance = goals.filter((g) => g.importance !== undefined && g.importance < 5);
  const lowConfidence = goals.filter((g) => g.confidence !== undefined && g.confidence < 5);
  if (lowImportance.length > 0) {
    items.push({
      id: "mi-wichtigkeit",
      title: "Ziel klären, bevor geübt wird",
      who: "selbst",
      reason: `Wichtigkeit unter 5 bei: ${lowImportance.map((g) => g.label).join(", ")}.`,
      actions: [
        "Fragen, was dem Patienten stattdessen wirklich wichtig ist – ggf. Ziel ändern.",
        "Offene Fragen statt Ratschläge (motivierende Gesprächsführung): „Was würde sich in Ihrem Alltag ändern, wenn …?“",
      ],
    });
  }
  if (lowConfidence.length > 0) {
    items.push({
      id: "mi-zuversicht",
      title: "Kleinsten machbaren Schritt finden",
      who: "selbst",
      reason: `Zuversicht unter 5 bei: ${lowConfidence.map((g) => g.label).join(", ")}.`,
      actions: [
        "Einstieg so leicht wählen, dass er sicher gelingt (Basislevel).",
        "Erfolge ausdrücklich benennen – auch Dranbleiben ist ein Fortschritt.",
        "Fragen: „Was bräuchten Sie, damit die Zahl einen Punkt höher ist?“",
      ],
    });
  }

  // 2. Schmerzverständnis: immer Grundbaustein.
  items.push({
    id: "edukation",
    title: "Schmerz verstehen",
    who: "selbst",
    reason: "Grundbaustein bei jedem Patienten.",
    actions: [
      "Schmerz ist echt und ein Schutzsignal, kein Schadensmesser.",
      "Befunde einordnen: Veränderungen im Bild sind ab 40 auch ohne Schmerz häufig.",
      "Kurz und im Gespräch, nicht als Vortrag – an den Fragen des Patienten ansetzen.",
    ],
    rehaNote: "Passt zur Schmerz-Gruppe (Einheit 1 „Schmerz ist ein Schutzsignal“).",
  });

  if (!r) return items;

  // 3. Gewebe / Belastung
  const highPainNow = pain !== undefined && pain.current >= 7;
  if (r.nociceptive.status === "A") {
    if (highPainNow) {
      items.push({
        id: "beruhigen",
        title: "Erst beruhigen, dann aufbauen",
        who: "selbst",
        reason: `Schmerz aktuell ${pain!.current}/10 und belastungsabhängig.`,
        actions: [
          "Symptome lindern, möglichst mit etwas, das der Patient selbst anwenden kann (Wärme/Kälte, Bewegung im schmerzarmen Bereich, Entspannung).",
          "Belastende Tätigkeit nicht streichen, sondern anpassen (Umfang, Winkel, Tempo).",
          "Danach Belastung schrittweise aufbauen.",
        ],
      });
    }
    items.push({
      id: "belastung",
      title: "Belastung dosiert aufbauen",
      who: "selbst",
      reason: "Schmerz hängt von Bewegung oder Position ab.",
      actions: [
        "Basislevel finden, das die Beschwerden nicht verstärkt – Sicherheitsnetz für schlechte Tage.",
        "In die Richtung steigern, die den Schmerz lindert oder nicht verändert; Auslöser-Bewegung anpassen statt meiden.",
        "Schmerz-Monitoring: während bis ca. 4/10, am nächsten Morgen zurück auf den Ausgangswert.",
        "Eine Stellschraube pro Änderung; nach einer Steigerung erst stabilisieren.",
      ],
    });
  } else if (r.nociceptive.status === "B") {
    items.push({
      id: "lebensstil",
      title: "Lebensstil statt Gewebe-Fokus",
      who: "selbst",
      reason: "Kein klarer Zusammenhang zwischen Bewegung/Position und Schmerz.",
      actions: [
        "Ärztliche Abklärung, falls noch nicht erfolgt.",
        "Allgemeine Aktivität steigern (Gehen, Rad, Kraft – was der Patient gern macht).",
        "Schlaf, Stress und Tagesstruktur ansprechen.",
      ],
    });
  }

  // 4. Nervensystem
  if (r.nervousSystem.status !== "NONE") {
    const central = r.nervousSystem.subtype === "central_sensitization";
    items.push({
      id: "nervensystem",
      title: central ? "Empfindliches Schutzsystem: klein und regelmäßig" : "Nervenzeichen beobachten",
      who: r.nervousSystem.status === "B" ? "team" : "selbst",
      reason: central
        ? "Hinweise auf ein empfindlicheres Nervensystem (z. B. Berührung unangenehm, Schmerz breitet sich aus)."
        : "Brennen, Kribbeln oder Taubheit angegeben.",
      actions: central
        ? [
            "Schmerzverständnis vor intensiver Belastung.",
            "Kleine, gut verträgliche Schritte; eher allgemeine Aktivität als Fokus auf die Schmerzstelle.",
            "Bei Bedarf: Entspannung, Achtsamkeit, Körperwahrnehmung (z. B. sensorisches Training).",
            "Bei starker Ausprägung ärztlich/psychologisch mitbetreuen lassen.",
          ]
        : [
            "Verlauf von Kribbeln/Taubheit dokumentieren.",
            "Bei neuen oder zunehmenden Ausfällen (Kraft, Gefühl) ärztlich abklären.",
          ],
    });
  }

  // 5. Begleiterkrankungen, Schlaf, Stress, Aktivität
  if (r.comorbidities.status !== "NONE") {
    const sleepHigh = a["comorbidities.sleep"] === "Fast immer";
    const stressHigh = a["comorbidities.stress"] === "Hoch";
    const inactive = a["comorbidities.activity"] === "0–1 Tag";
    const found = [sleepHigh && "Schlaf", stressHigh && "Stress", inactive && "wenig Bewegung"].filter(Boolean).join(", ");
    items.push({
      id: "begleit",
      title: "Schlaf, Stress und Begleiterkrankungen",
      who: r.comorbidities.status === "B" ? "team" : "selbst",
      reason: found ? `Auffällig: ${found}.` : "Weitere Diagnosen oder mäßige Belastung angegeben.",
      actions: [
        inactive ? "Allgemeine Aktivität aufbauen – Bewegung, die Spaß macht, zählt." : "Diagnosen bei der Übungsauswahl berücksichtigen.",
        sleepHigh ? "Schlaf ansprechen; Schlaf und Schmerz beeinflussen sich gegenseitig." : "Aktivitätsniveau im Blick behalten.",
        "Bei starker Belastung Arzt bzw. Psychotherapie einbeziehen.",
      ],
      rehaNote: "Entzug, Medikamente, Suchtdruck und Schlafprobleme mit Ärzten und Psychotherapie abstimmen.",
    });
  }

  // 6. Gedanken und Gefühle
  if (r.cognitiveEmotional.status !== "NONE") {
    const fear = ["Teils-teils", "Stimmt völlig"].includes(a["cognitiveEmotional.kinesiophobia"] ?? "");
    items.push({
      id: "gedanken",
      title: fear ? "Bewegungsangst abbauen" : "Sorgen und Umgang mit Schmerz",
      who: r.cognitiveEmotional.status === "B" ? "team" : "selbst",
      reason: fear
        ? "Angst, dass Bewegung schadet."
        : "Sorgen, Hilflosigkeit oder ständiges Prüfen des Körpers angegeben.",
      actions: [
        "Konkret fragen, was genau die Sorge auslöst.",
        fear
          ? "Bewegungsexperiment: gefürchtete Bewegung, Vorhersage notieren, kleinste Stufe ausführen, Ergebnis vergleichen."
          : "Eigene Strategien für Schmerzschübe erarbeiten (Kontrolle zurückgeben).",
        "Vermeider: Bewegung schrittweise erweitern. Durchhalter: mehr ist nicht automatisch besser, Pausen einplanen.",
        "Bei ausgeprägten Sorgen psychologische Mitbetreuung.",
      ],
      rehaNote: "Passt zu Schmerz-Gruppe Einheit 3 (Angst/Vermeidung) und 5 (Gedanken).",
    });
  }

  // 7. Umfeld
  if (r.contextual.status !== "NONE") {
    const nocebo = a["contextual.nocebo"] === "Ja";
    items.push({
      id: "umfeld",
      title: nocebo ? "Angstmachende Aussagen einordnen" : "Umfeld einbeziehen",
      who: r.contextual.status === "B" ? "team" : "selbst",
      reason: nocebo ? "Aussagen von Fachpersonal haben Angst gemacht." : "Belastung durch Arbeit oder Umfeld.",
      actions: [
        nocebo
          ? "Gehörte Sätze aufgreifen und ehrlich umformulieren (z. B. „Verschleiß“ → „normale Veränderungen“)."
          : "Fragen, wie das Umfeld mit den Schmerzen umgeht.",
        "Was lässt sich jetzt ändern, was erst später? Bei nicht veränderbaren Faktoren mit dem nächsten Treiber weitermachen.",
      ],
      rehaNote: "Soziale Situation, Arbeit und Nachsorge mit Sozialdienst und Bezugstherapeut abstimmen.",
    });
  }

  // 8. Risiko für einen langen Verlauf
  const oerebro = latestOf(questionnaires, "oerebro");
  if (oerebro && oerebro.totalScore > OEREBRO_CUTOFF) {
    items.push({
      id: "risiko",
      title: "Erhöhtes Risiko für einen langen Verlauf",
      who: "team",
      reason: `Örebro ${oerebro.totalScore} (über ${OEREBRO_CUTOFF}).`,
      actions: [
        "Mehr Gewicht auf Beziehung, Ziele und Umgang mit Schmerz als auf einzelne Übungen.",
        "Fallbesprechung im Team anregen.",
      ],
    });
  }

  return items;
}
