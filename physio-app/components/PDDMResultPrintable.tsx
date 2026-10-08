import { PDDMAssessment, PDDMDomainId } from "@/lib/types";
import { PDDM_DOMAINS, PDDM_DOMAIN_LABELS, domainRecommendation, statusLabel, explainDomain } from "@/lib/pddm";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function subtypeLabel(domain: PDDMDomainId, subtype?: "peripheral" | "central_sensitization") {
  if (domain !== "nervousSystem" || !subtype) return null;
  return subtype === "peripheral" ? "peripher-neuropathisch" : "zentrale Sensibilisierung / nozizeptiv-plastisch";
}

// Druck-/Mitgabeversion der PDDM-Auswertung für Patientin/Patienten, gleiches
// Prinzip wie QuestionnairePrintable/OerebroPrintable: eigene, auf Papier
// optimierte Darstellung derselben bereits berechneten Ergebnisse.
export default function PDDMResultPrintable({ assessment }: { assessment: PDDMAssessment }) {
  const relevantDomains = PDDM_DOMAINS.filter((d) => assessment.results[d].status !== "NONE");

  return (
    <div id="printable-questionnaire" className="p-8 text-black bg-white">
      <h1 className="text-xl font-bold">PDDM-Bereichs-Einschätzung</h1>
      <div className="flex gap-8 mt-4 text-sm">
        <p>Name: ________________________</p>
        <p>Datum der Einschätzung: {formatDate(assessment.date)}</p>
      </div>

      {assessment.painBaseline && (
        <table className="mt-4 text-sm border-collapse">
          <tbody>
            <tr>
              <td className="pr-4 py-0.5">Schmerz aktuell:</td>
              <td className="font-semibold">{assessment.painBaseline.current}/10</td>
            </tr>
            <tr>
              <td className="pr-4 py-0.5">Schmerz bei maximaler Belastung:</td>
              <td className="font-semibold">{assessment.painBaseline.maxLoad}/10</td>
            </tr>
            <tr>
              <td className="pr-4 py-0.5">Schmerz danach/am Folgetag:</td>
              <td className="font-semibold">{assessment.painBaseline.afterMaxLoad ?? "–"}/10</td>
            </tr>
          </tbody>
        </table>
      )}

      <table className="w-full mt-6 text-sm border-collapse">
        <thead>
          <tr className="border-b border-black/40 text-left">
            <th className="py-1 pr-2">Bereich</th>
            <th className="py-1 pr-2">Status</th>
            <th className="py-1">Begründung</th>
          </tr>
        </thead>
        <tbody>
          {PDDM_DOMAINS.map((domain) => {
            const result = assessment.results[domain];
            const sub = subtypeLabel(domain, result.subtype);
            const reasons = result.status !== "NONE" ? explainDomain(domain, assessment.answers) : [];
            return (
              <tr key={domain} className="border-t border-black/20 align-top">
                <td className="py-2 pr-2 font-medium">{PDDM_DOMAIN_LABELS[domain]}</td>
                <td className="py-2 pr-2 whitespace-nowrap">{statusLabel(result.status)}</td>
                <td className="py-2 text-xs">
                  {sub && <p>{sub}</p>}
                  {reasons.map((r) => (
                    <p key={r.text}>
                      {r.text} → {r.value}
                    </p>
                  ))}
                  {result.status === "NONE" && "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6">
        <p className="text-sm font-bold">Mögliche nächste Schritte</p>
        {relevantDomains.length > 0 ? (
          relevantDomains.map((domain) => (
            <p key={domain} className="text-sm mt-1">
              <span className="font-medium">{PDDM_DOMAIN_LABELS[domain]}:</span>{" "}
              {domainRecommendation(domain, assessment.results[domain])}
            </p>
          ))
        ) : (
          <p className="text-sm mt-1">Aktuell kein Bereich auffällig – der Fokus kann auf der reinen Belastungssteuerung bleiben.</p>
        )}
      </div>

      <p className="text-[10px] mt-6 text-black/60">
        Automatisch erzeugte Einordnung nach dem PDDM-Modell (Pain and Disability Drivers Management), keine
        validierte Testpunktzahl und kein Ersatz für eine ärztliche oder therapeutische Diagnose.
      </p>
    </div>
  );
}
