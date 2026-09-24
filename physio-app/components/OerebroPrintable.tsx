import { OEREBRO_PAIN_SITES, OEREBRO_QUESTIONS, OEREBRO_SOURCE_NOTE } from "@/lib/oerebro";

// Druck-/Papierversion, ohne Auswertungsschlüssel (siehe QuestionnairePrintable.tsx
// für die gleiche Begründung bei TSK/FESS).
export default function OerebroPrintable() {
  return (
    <div id="printable-questionnaire" className="p-8 text-black bg-white">
      <h1 className="text-xl font-bold">Örebro Musculoskeletal Pain Screening Questionnaire</h1>
      <div className="flex gap-8 mt-4 text-sm">
        <p>Name: ________________________</p>
        <p>Date: ________________________</p>
      </div>

      <p className="text-sm mt-4">5. Where do you have pain? Check the appropriate sites.</p>
      <div className="flex gap-4 text-sm mt-1">
        {OEREBRO_PAIN_SITES.map((s) => (
          <span key={s.id}>☐ {s.label}</span>
        ))}
      </div>

      <table className="w-full mt-4 text-sm border-collapse">
        <tbody>
          {OEREBRO_QUESTIONS.map((q) => (
            <tr key={q.id} className="border-t border-black/20">
              <td className="py-2 pr-2 align-top w-6">{q.number}</td>
              <td className="py-2 pr-4 align-top">{q.text}</td>
              <td className="py-2 align-top whitespace-nowrap">
                {q.choices.map((c, i) => (
                  <span key={i} className="inline-block min-w-6 px-1 text-center border border-black/40 mr-1 text-xs">
                    {c.label}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[10px] mt-6 text-black/60">{OEREBRO_SOURCE_NOTE}</p>
    </div>
  );
}
