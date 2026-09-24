import { QuestionnaireId } from "./types";

export interface QuestionnaireOption {
  value: number;
  label: string;
}

export interface QuestionnaireItem {
  id: string;
  text: string;
}

export interface QuestionnaireDef {
  id: QuestionnaireId;
  title: string;
  subtitle: string;
  instructions: string;
  items: QuestionnaireItem[];
  options: QuestionnaireOption[];
  scoreRange: [number, number];
  interpret?: (score: number) => string;
  resultNote: string;
  sourceNote: string;
  licenseNote?: string;
}

// Tampa Scale of Kinesiophobia, deutsche validierte Kurzversion (TSK-GV,
// 11 Items). Wortlaut, Skala und Auswertungshinweis unverändert aus der vom
// Nutzer bereitgestellten Quelle übernommen (siehe sourceNote) – keine
// Cut-off-Werte angegeben, deshalb wird hier auch keiner erfunden.
const TSK: QuestionnaireDef = {
  id: "tsk",
  title: "TSK – Tampa Scale of Kinesiophobia",
  subtitle: "Bewegungsangst",
  instructions:
    "Mit den nachfolgenden Fragen möchten wir untersuchen, wie Sie selbst zu Ihren Schmerzen stehen. Bitte geben Sie an, in welchem Maße Sie mit den vorgegebenen Aussagen einverstanden sind.",
  items: [
    { id: "tsk.1", text: "Ich habe Angst davor, dass ich mich möglicherweise verletze, wenn ich Sport treibe." },
    { id: "tsk.2", text: "Wenn ich versuchen würde, mich über die Schmerzen hinweg zu setzen, würden sie noch schlimmer." },
    { id: "tsk.3", text: "Mein Körper sagt mir, dass ich etwas sehr Schlimmes habe." },
    { id: "tsk.4", text: "Mein Gesundheitszustand wird von anderen nicht ernst genug genommen." },
    { id: "tsk.5", text: "Wegen des Schmerzproblems ist mein Körper für den Rest meines Lebens gefährdet." },
    { id: "tsk.6", text: "Schmerz bedeutet immer, dass ich mich verletzt habe." },
    {
      id: "tsk.7",
      text: "Die sicherste Art, zu verhindern, dass meine Schmerzen schlimmer werden, ist einfach darauf zu achten, dass ich keine unnötigen Bewegungen mache.",
    },
    { id: "tsk.8", text: "Ich hätte nicht so viel Schmerzen, wenn nicht etwas Bedenkliches in meinem Körper vor sich ginge." },
    { id: "tsk.9", text: "Meine Schmerzen sagen mir, wann ich mit dem Training aufhören muss, um mich nicht zu verletzen." },
    { id: "tsk.10", text: "Ich kann nicht all die Dinge tun, die gesunde Menschen machen, da ich mich zu leicht verletzen könnte." },
    { id: "tsk.11", text: "Niemand sollte Sport treiben müssen, wenn er/sie Schmerzen hat." },
  ],
  options: [
    { value: 1, label: "Überhaupt nicht einverstanden" },
    { value: 2, label: "Mehr oder weniger nicht einverstanden" },
    { value: 3, label: "Mehr oder weniger einverstanden" },
    { value: 4, label: "Völlig einverstanden" },
  ],
  scoreRange: [11, 44],
  resultNote:
    "Ein hohes Ergebnis steht für eine große Kinesiophobie. Es wird empfohlen, das Gesamtergebnis zu verwenden – einzelne Items sind nicht aussagekräftig. Kein Cut-off-Wert angegeben.",
  sourceNote:
    "Rusu AC, Kreddig N, Hallner D et al. Fear of movement/(Re)injury in low back pain: confirmatory validation of a German version of the Tampa Scale for Kinesiophobia. BMC Musculoskeletal Disorders. 2014; 15: 280.",
  licenseNote: "Lizenz: Creative Commons BY 2.0 (creativecommons.org/licenses/by/2.0/).",
};

// Fragebogen zur Erfassung der schmerzspezifischen Selbstwirksamkeit (FESS),
// deutsche Adaptation des Pain Self-Efficacy Questionnaire. Wortlaut, Skala
// und Interpretationsschlüssel unverändert aus der Quelle übernommen.
const FESS: QuestionnaireDef = {
  id: "fess",
  title: "FESS – Schmerzspezifische Selbstwirksamkeit",
  subtitle: "Selbstwirksamkeit",
  instructions: 'Bitte beantworten Sie jede Frage mit einer Antwort von „0" ("stimme nicht zu") bis „6" ("stimme komplett zu").',
  items: [
    { id: "fess.1", text: "Ich kann trotz der Schmerzen Dinge genießen." },
    { id: "fess.2", text: "Ich kann trotz der Schmerzen die meisten Dinge im Haushalt tun (z. B. aufräumen, abwaschen)." },
    {
      id: "fess.3",
      text: "Ich kann mich trotz der Schmerzen mit meinen Freunden oder Familienangehörigen so oft treffen, wie ich es früher getan habe/wie ich es gewohnt bin.",
    },
    { id: "fess.4", text: "Ich werde mit meinen Schmerzen in den meisten Situationen fertig." },
    {
      id: "fess.5",
      text: 'Ich kann trotz der Schmerzen irgendeine Form von Arbeit ausüben ("Arbeit" beinhaltet dabei Hausarbeit, bezahlte und unbezahlte Arbeit).',
    },
    { id: "fess.6", text: "Ich kann trotz der Schmerzen immer noch viele Dinge tun, die ich gerne mache, wie z. B. Hobbies oder Freizeitaktivitäten." },
    { id: "fess.7", text: "Ich werde mit meinen Schmerzen auch ohne Medikamente fertig." },
    { id: "fess.8", text: "Ich kann trotz der Schmerzen noch die meisten meiner Ziele im Leben erreichen." },
    { id: "fess.9", text: "Ich kann trotz der Schmerzen noch ein normales Leben führen." },
    { id: "fess.10", text: "Ich kann trotz der Schmerzen nach und nach aktiver werden." },
  ],
  options: [0, 1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) })),
  scoreRange: [0, 60],
  interpret: (score: number) => {
    if (score < 20) return "Extreme Einschränkung der Selbstwirksamkeit";
    if (score <= 30) return "Moderate Einschränkung der Selbstwirksamkeit";
    if (score <= 40) return "Geringe Einschränkung der Selbstwirksamkeit";
    return "Minimale/keine Einschränkung der Selbstwirksamkeit";
  },
  resultNote:
    "Interpretation der Einschränkung: <20 extrem · 20–30 moderat · 31–40 gering · >40 minimal/nicht.",
  sourceNote:
    "Mangels, M., Schwarz, S., Sohr, G., Holme, M., & Rief, W. (2009). Der Fragebogen zur Erfassung der schmerzspezifischen Selbstwirksamkeit (FESS) – Eine Adaptation des Pain Self Efficacy Questionnaire für den deutschen Sprachraum. Diagnostica, 55(2), 84–93.",
};

// Örebro passt wegen Mehrfachauswahl (Schmerzstellen) und Kategorie-Items
// nicht in dieses generische Einzelskalen-Schema – siehe lib/oerebro.ts.
export const QUESTIONNAIRES: Record<Exclude<QuestionnaireId, "oerebro">, QuestionnaireDef> = { tsk: TSK, fess: FESS };
export const QUESTIONNAIRE_IDS: Exclude<QuestionnaireId, "oerebro">[] = ["tsk", "fess"];

export function scoreQuestionnaire(def: QuestionnaireDef, answers: Record<string, number>): number {
  return def.items.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
}

export function isComplete(def: QuestionnaireDef, answers: Record<string, number>): boolean {
  return def.items.every((item) => answers[item.id] !== undefined);
}
