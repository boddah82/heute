import { calculateRuleOfTen, RuleOfTenResult } from "./ruleOfTen";

export type TrainingGoal = "kraft" | "hypertrophie" | "athletik";

export const TRAINING_GOALS: { id: TrainingGoal; label: string; hint: string }[] = [
  { id: "kraft", label: "Kraft", hint: "Wenige Wiederholungen, hohe Last, nah am Muskelversagen." },
  { id: "hypertrophie", label: "Hypertrophie", hint: "Moderate Wiederholungen, submaximale Last." },
  { id: "athletik", label: "Athletik / Sprünge", hint: "Sprünge, Antritte, plyometrische Übungen." },
];

export interface GoalGuidance {
  ruleOfTen?: RuleOfTenResult; // nur bei Kraft/Hypertrophie
  leavesGoalRange: boolean;
  primaryLever: string;
  alternativeLevers: string[];
  explanation: string;
}

// Grobe, praxisnahe Faustregel (keine validierte Formel): Im Hypertrophie-
// Training gilt meist RIR 0-4 als sinnvolles Fenster. Steigt das schmerz-
// bedingte Ziel-RIR darüber, wird eher das Gewicht reduziert als die
// Anstrengung weiter gesenkt, um im Zielbereich zu bleiben.
const HYPERTROPHY_RIR_CEILING = 4;

export function getGoalGuidance(goal: TrainingGoal, pain: number): GoalGuidance {
  if (goal === "athletik") {
    if (pain <= 2) {
      return {
        leavesGoalRange: false,
        primaryLever: "Wie geplant fortführen.",
        alternativeLevers: [],
        explanation: "Schmerz ist niedrig – die geplante Sprung-/Antrittsbelastung kann beibehalten werden.",
      };
    }
    if (pain <= 5) {
      return {
        leavesGoalRange: false,
        primaryLever: "Sprungvolumen oder -höhe reduzieren (z. B. weniger Kontakte, niedrigere Hindernisse).",
        alternativeLevers: ["Auf eine submaximale Variante wechseln (z. B. Pogo-Hops statt Tiefsprünge)."],
        explanation: "Schmerz ist moderat erhöht – die Intensität der Sprungbelastung reduzieren, statt komplett zu pausieren.",
      };
    }
    return {
      leavesGoalRange: false,
      primaryLever: "Auf eine Vorbereitungsübung regredieren (z. B. isometrische Halteübung, Technikarbeit ohne Sprung).",
      alternativeLevers: ["Die sprungspezifische Belastung für diese Einheit aussetzen."],
      explanation: "Schmerz liegt im roten Bereich – statt der Sprungübung selbst eine vorbereitende, weniger belastende Variante wählen.",
    };
  }

  const rot = calculateRuleOfTen(pain);

  if (rot.isOverPainThreshold) {
    return {
      ruleOfTen: rot,
      leavesGoalRange: true,
      primaryLever: "Gewicht reduzieren.",
      alternativeLevers: [
        "Bewegungsumfang (ROM) verringern.",
        goal === "hypertrophie"
          ? "Übung wechseln (gleicher Muskel, andere Bewegungsrichtung)."
          : "Auf eine isometrische Halteübung wechseln.",
      ],
      explanation: "Schmerz liegt im roten Bereich (>5) – die Belastung sollte jetzt angepasst werden.",
    };
  }

  if (goal === "hypertrophie" && rot.targetRIR !== null && rot.targetRIR > HYPERTROPHY_RIR_CEILING) {
    return {
      ruleOfTen: rot,
      leavesGoalRange: true,
      primaryLever: "Gewicht reduzieren, statt die Anstrengung weiter zu senken.",
      alternativeLevers: ["Übung wechseln (gleicher Muskel, andere Bewegungsrichtung)."],
      explanation: `Bei RIR ${rot.targetRIR} würdest Du den Hypertrophie-Bereich (RIR 0–${HYPERTROPHY_RIR_CEILING}) verlassen. Reduziere lieber das Gewicht, um im Zielbereich zu bleiben.`,
    };
  }

  return {
    ruleOfTen: rot,
    leavesGoalRange: false,
    primaryLever: `Belastung wie berechnet fortführen (RPE ${rot.maxAllowedRPE}, RIR ${rot.targetRIR}).`,
    alternativeLevers: [],
    explanation: rot.recommendedAction,
  };
}
