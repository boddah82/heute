import { QuestionnaireDef } from "@/lib/questionnaires";

// Reine Druck-/Papierversion: bewusst OHNE Auswertungsschlüssel (FESS-Quelle
// weist explizit darauf hin, dass die Interpretationsseite Patient:innen
// nicht vorab mitgegeben werden sollte, um die Antworten nicht zu
// beeinflussen – das gilt hier für beide Fragebögen).
export default function QuestionnairePrintable({ def }: { def: QuestionnaireDef }) {
  return (
    <div id="printable-questionnaire" className="p-8 text-black bg-white">
      <h1 className="text-xl font-bold">{def.title}</h1>
      <p className="text-sm mt-2">{def.instructions}</p>

      <div className="flex gap-8 mt-4 text-sm">
        <p>Name: ________________________</p>
        <p>Datum: ________________________</p>
      </div>

      <div className="mt-4 text-xs">
        {def.options.map((o) => (
          <span key={o.value} className="mr-4">
            {o.value} = {o.label}
          </span>
        ))}
      </div>

      <table className="w-full mt-4 text-sm border-collapse">
        <tbody>
          {def.items.map((item, i) => (
            <tr key={item.id} className="border-t border-black/20">
              <td className="py-2 pr-2 align-top w-6">{i + 1}</td>
              <td className="py-2 pr-4 align-top">{item.text}</td>
              <td className="py-2 align-top whitespace-nowrap">
                {def.options.map((o) => (
                  <span key={o.value} className="inline-block w-8 text-center border border-black/40 mr-1">
                    {o.value}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[10px] mt-6 text-black/60">{def.sourceNote}</p>
      {def.licenseNote && <p className="text-[10px] text-black/60">{def.licenseNote}</p>}
    </div>
  );
}
