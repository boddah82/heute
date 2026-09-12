export interface RuleOfTenResult {
  currentPain: number;
  maxAllowedRPE: number | null; // null, wenn im roten Bereich (Regression statt Steigerung)
  targetRIR: number | null;
  isOverPainThreshold: boolean; // true, wenn Schmerz > 5
  recommendedAction: string;
}

// "Rule of 10": Max. RPE = 10 - Schmerzlevel (NRS 0-5). RPE 10 = 0 Reps in
// Reserve (RIR), RPE 7 = 3 RIR, d. h. RIR = 10 - RPE. Eiserne Regel: Schmerz
// während der Übung darf nie über 5 liegen.
export function calculateRuleOfTen(pain: number): RuleOfTenResult {
  if (pain > 5) {
    return {
      currentPain: pain,
      maxAllowedRPE: null,
      targetRIR: null,
      isOverPainThreshold: true,
      recommendedAction:
        "Verringere den Bewegungsumfang (z. B. beim Wandsitz etwas höher rutschen) oder wechsle kurzzeitig in eine isometrische Halteübung.",
    };
  }

  const maxAllowedRPE = 10 - pain;
  const targetRIR = pain;

  return {
    currentPain: pain,
    maxAllowedRPE,
    targetRIR,
    isOverPainThreshold: false,
    recommendedAction:
      pain <= 2
        ? "Belastung darf wie geplant weitergeführt oder leicht gesteigert werden."
        : "Belastung auf diesem Niveau halten, RPE nicht weiter ausreizen.",
  };
}
