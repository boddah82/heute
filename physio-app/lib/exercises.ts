// Übungsauswahl: je Körperbereich eine Stufenleiter von leicht nach schwer,
// dazu bereichsübergreifende Bausteine, Stellschrauben und Auswahlfragen.
//
// Die Übungen sind Beispiele, keine Pflichtübungen und kein validiertes
// Protokoll. Grundgedanken (Sekundärquellen): Ahura Kap. 6 (Komfort- und
// Diskomfortzone, Modifikationsparameter, Fallbeispiele mit Übungsreihen),
// Kurs Gino Lazzaro (Teil 11 Übungsauswahl, Md6 Dosierung): keine
// Übungsform ist klar überlegen, Vorlieben und Bedeutung für den Patienten
// zählen, Zielaktivität so früh wie möglich einbauen.

export type ExercisePurpose = "lindern" | "aufbauen" | "alltag";

export const PURPOSE_LABELS: Record<ExercisePurpose, string> = {
  lindern: "Symptome lindern",
  aufbauen: "Belastbarkeit aufbauen",
  alltag: "Zielaktivität / Alltag",
};

export interface LadderStep {
  label: string;
  purpose: ExercisePurpose;
  hint: string; // Ausführung oder wichtigste Stellschraube
}

export const LADDERS: Record<string, LadderStep[]> = {
  knie: [
    { label: "Wandsitz", purpose: "lindern", hint: "Halten 20–45 s, Kniewinkel so wählen, dass es passt." },
    { label: "Aufstehen vom Stuhl", purpose: "aufbauen", hint: "Sitzhöhe ist die Stellschraube: höher = leichter." },
    { label: "Step-up auf niedrige Stufe", purpose: "aufbauen", hint: "Stufenhöhe langsam steigern." },
    { label: "Kniebeuge mit Gewicht", purpose: "aufbauen", hint: "Tiefe frei wählen, volle Tiefe ist nicht nötig." },
    { label: "Ausfallschritt / Split Squat", purpose: "aufbauen", hint: "Erst am Platz, später im Gehen." },
    { label: "Kleine Sprünge und Landungen", purpose: "alltag", hint: "Wenige Kontakte, Höhe langsam steigern." },
  ],
  ruecken: [
    { label: "Gehen", purpose: "lindern", hint: "Dauer ist die Stellschraube, z. B. +5 Minuten." },
    { label: "Knie zur Brust in Rückenlage", purpose: "lindern", hint: "Rumpf beugen aus schmerzarmer Position." },
    { label: "Rundrücken im Vierfüßlerstand", purpose: "aufbauen", hint: "Näher an der Bückbewegung als in Rückenlage." },
    { label: "Hüftbeuge mit Stab (Hip Hinge)", purpose: "aufbauen", hint: "Erst mit Abstützen, dann frei." },
    { label: "Heben von erhöhter Kiste", purpose: "aufbauen", hint: "Höhe senken oder Gewicht steigern – eins nach dem anderen." },
    { label: "Heben und Tragen wie im Alltag", purpose: "alltag", hint: "Z. B. Getränkekiste vom Auto zur Tür." },
  ],
  schulter: [
    { label: "Arm heben im schmerzarmen Bereich", purpose: "lindern", hint: "Mit Abstützen am Tisch oder Wand-Gleiten." },
    { label: "Außenrotation mit Band", purpose: "aufbauen", hint: "Bandstärke und Bewegungsumfang anpassen." },
    { label: "Seitliches Armheben", purpose: "aufbauen", hint: "Erst bis Schulterhöhe, leichtes Gewicht." },
    { label: "Rudern mit Band oder Kurzhantel", purpose: "aufbauen", hint: "Gut verträglicher Einstieg in Zugübungen." },
    { label: "Drücken über Kopf im Halbkniestand", purpose: "aufbauen", hint: "Gewicht und Höhe schrittweise." },
    { label: "Überkopf-Tätigkeit wie im Alltag/Sport", purpose: "alltag", hint: "Z. B. Gegenstand ins Regal, Wurf." },
  ],
  nacken: [
    { label: "Kopf drehen im angenehmen Bereich", purpose: "lindern", hint: "Langsam, kleiner Bewegungsumfang zuerst." },
    { label: "Kinn zurückziehen", purpose: "lindern", hint: "Im Sitzen oder Liegen." },
    { label: "Halten gegen die eigene Hand", purpose: "aufbauen", hint: "Drehen/Neigen gegen leichten Widerstand." },
    { label: "Rudern / Schulterblatt-Übungen", purpose: "aufbauen", hint: "Oberkörper kräftigen, nicht nur Nacken." },
    { label: "Schulterblick wie beim Autofahren", purpose: "alltag", hint: "Bewegungsumfang langsam erweitern." },
    { label: "Sport mit Kopfbewegung", purpose: "alltag", hint: "Z. B. Ballspiel, schrittweise mehr Spielzeit." },
  ],
  sehne: [
    { label: "Halten (Wadenheben halten / Wandsitz)", purpose: "lindern", hint: "Halten 30–45 s, wird oft gut vertragen." },
    { label: "Wadenheben beidbeinig, langsam", purpose: "aufbauen", hint: "Tempo langsam, Umfang anpassen." },
    { label: "Wadenheben einbeinig", purpose: "aufbauen", hint: "Erst am Boden, dann von der Stufe." },
    { label: "Wadenheben einbeinig mit Gewicht", purpose: "aufbauen", hint: "Gewicht in kleinen Schritten." },
    { label: "Kleine Hüpfer (Pogo)", purpose: "aufbauen", hint: "Wenige Kontakte, Höhe niedrig." },
    { label: "Laufen/Springen aufbauen", purpose: "alltag", hint: "Gehen-Laufen-Wechsel, Laufanteil steigern." },
  ],
  ellbogen: [
    { label: "Halten: Handgelenk gegen Widerstand strecken", purpose: "lindern", hint: "30–45 s halten, Druck so wählen, dass es passt." },
    { label: "Handgelenk strecken mit leichtem Gewicht", purpose: "aufbauen", hint: "Langsam ablassen, Gewicht in kleinen Schritten." },
    { label: "Unterarm drehen mit Hammer oder Stab", purpose: "aufbauen", hint: "Hebel ist die Stellschraube: weiter unten greifen = leichter." },
    { label: "Griffkraft (Ball, Handtrainer)", purpose: "aufbauen", hint: "Erst locker, dann fester." },
    { label: "Tragen (Kurzhantel, Tasche)", purpose: "aufbauen", hint: "Gewicht oder Strecke steigern." },
    { label: "Greifen wie im Alltag/Beruf", purpose: "alltag", hint: "Z. B. Tasse, Werkzeug, Händedruck." },
  ],
  huefte: [
    { label: "Brücke", purpose: "lindern", hint: "Beidbeinig, später einbeinig." },
    { label: "Bein abspreizen in Seitlage", purpose: "aufbauen", hint: "Bewegungsumfang und Gewicht anpassen." },
    { label: "Aufstehen vom Stuhl / Kniebeuge", purpose: "aufbauen", hint: "Sitzhöhe bzw. Tiefe als Stellschraube." },
    { label: "Step-up", purpose: "aufbauen", hint: "Stufenhöhe langsam steigern." },
    { label: "Ausfallschritt", purpose: "aufbauen", hint: "Erst kurz und am Platz." },
    { label: "Gehen, Wandern, Treppen", purpose: "alltag", hint: "Strecke oder Stockwerke steigern." },
  ],
};

// Bereichsübergreifend – passen fast immer und lassen sich mit jeder Leiter
// kombinieren.
export const GENERAL_STEPS: LadderStep[] = [
  { label: "Gehen oder Radfahren", purpose: "aufbauen", hint: "Allgemeine Aktivität, Dauer als Stellschraube." },
  { label: "Ganzkörper-Kraft (andere Körperregionen)", purpose: "aufbauen", hint: "Training schmerzfreier Bereiche hilft oft mit." },
  { label: "Lieblingssport / Lieblingsbewegung", purpose: "alltag", hint: "Anteil langsam steigern, statt ganz zu pausieren." },
  { label: "Selbst lindern: Wärme, Kälte, Bewegung im schmerzarmen Bereich", purpose: "lindern", hint: "Etwas, das der Patient allein anwenden kann." },
  { label: "Atmung / Entspannung", purpose: "lindern", hint: "Z. B. 5 Minuten ruhiges Atmen, vorher/nachher Spannung notieren." },
];

// Ahura Kap. 6: Modifikationsparameter je Bewegung und je Training.
export const ADJUSTERS: { group: string; items: string[] }[] = [
  {
    group: "An der Übung",
    items: [
      "Gewicht / Last",
      "Bewegungsumfang (z. B. nur bis 90°)",
      "Unterstützungsfläche (abstützen, Sitzhöhe)",
      "Fuß/Hand fest oder frei (geschlossene/offene Kette)",
      "Tempo",
      "Störungen / Reaktion (stabil oder wackelig)",
    ],
  },
  {
    group: "Am Training",
    items: ["Sätze", "Wiederholungen", "Anzahl der Übungen", "Pausen", "Trainingstage pro Woche"],
  },
];

// Fragen vor der Auswahl (Kurs Gino Lazzaro, Teil 11 und Md6).
export const SELECTION_QUESTIONS: string[] = [
  "Welches Ziel hat diese Übung genau (lindern, Angst abbauen, belastbarer werden, Leistung)?",
  "Mag der Patient die Übung (Gerät, Kurzhantel, Körpergewicht)? Sonst gleichwertige Alternative wählen.",
  "Steckt die Zielaktivität schon drin – oder kann man sie direkt üben?",
  "Zwei Varianten ausprobieren lassen: Welche fühlt sich besser an?",
  "Erinnert die Übung an die Verletzung oder macht Angst? Dann eine Stufe leichter.",
  "Startstufe: die höchste Stufe, die heute im erlaubten Schmerzbereich geht – im Zweifel die untere.",
];

export function getLadder(regionId: string): LadderStep[] {
  return LADDERS[regionId] ?? [];
}

// Notiz für den Plan: leichter/schwerer aus der Leiter, damit der Patient
// selbst eine Stufe zurück- oder weitergehen kann.
export function stepNote(ladder: LadderStep[], index: number): string {
  const step = ladder[index];
  const easier = ladder[index - 1];
  const harder = ladder[index + 1];
  const parts = [step.hint];
  if (easier) parts.push(`Leichter: ${easier.label}`);
  if (harder) parts.push(`Schwerer: ${harder.label}`);
  return parts.join(" · ");
}
