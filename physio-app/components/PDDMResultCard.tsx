"use client";

import { PDDMAssessment, PDDMDomainId, PDDMStatus } from "@/lib/types";
import { PDDM_DOMAINS, PDDM_DOMAIN_LABELS, PDDM_DOMAIN_HINTS, domainRecommendation, statusLabel, explainDomain } from "@/lib/pddm";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_STYLE: Record<PDDMStatus, string> = {
  NONE: "bg-slate-100 text-slate-500",
  A: "bg-amber-100 text-amber-800",
  B: "bg-red-100 text-red-800",
};

function subtypeLabel(domain: PDDMDomainId, subtype?: "peripheral" | "central_sensitization") {
  if (domain !== "nervousSystem" || !subtype) return null;
  return subtype === "peripheral"
    ? "peripher-neuropathisch"
    : "zentrale Sensibilisierung / nozizeptiv-plastisch";
}

export default function PDDMResultCard({
  assessment,
  onDelete,
}: {
  assessment: PDDMAssessment;
  onDelete?: (id: string) => void;
}) {
  const relevantDomains = PDDM_DOMAINS.filter((d) => assessment.results[d].status !== "NONE");

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-xs text-slate-500">{formatDate(assessment.date)}</p>
        {onDelete && (
          <button onClick={() => onDelete(assessment.id)} className="text-xs text-slate-400">
            Löschen
          </button>
        )}
      </div>

      {assessment.painBaseline && (
        <div className="grid grid-cols-4 gap-2 text-center pb-2 border-b border-slate-100">
          <div>
            <p className="text-lg font-semibold text-slate-900">{assessment.painBaseline.current}</p>
            <p className="text-[11px] text-slate-500">Aktuell</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{assessment.painBaseline.avg4Weeks}</p>
            <p className="text-[11px] text-slate-500">Ø 4 Wochen</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{assessment.painBaseline.maxLoad}</p>
            <p className="text-[11px] text-slate-500">Max. Belastung</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{assessment.painBaseline.afterMaxLoad ?? "–"}</p>
            <p className="text-[11px] text-slate-500">Danach</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {PDDM_DOMAINS.map((domain) => {
          const result = assessment.results[domain];
          const sub = subtypeLabel(domain, result.subtype);
          const reasons = result.status !== "NONE" ? explainDomain(domain, assessment.answers) : [];
          return (
            <div key={domain} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{PDDM_DOMAIN_LABELS[domain]}</p>
                <p className="text-xs text-slate-400">{PDDM_DOMAIN_HINTS[domain]}</p>
                {sub && <p className="text-xs text-slate-500">{sub}</p>}
                {reasons.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {reasons.map((r) => (
                      <li key={r.text} className="text-xs text-slate-500">
                        weil: {r.text} → <span className="font-medium">{r.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[result.status]}`}>
                {statusLabel(result.status)}
              </span>
            </div>
          );
        })}
      </div>

      {relevantDomains.length > 0 ? (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mögliche nächste Schritte</p>
          {relevantDomains.map((domain) => (
            <p key={domain} className="text-sm text-slate-700">
              <span className="font-medium">{PDDM_DOMAIN_LABELS[domain]}:</span>{" "}
              {domainRecommendation(domain, assessment.results[domain])}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 pt-2 border-t border-slate-100">
          Aktuell kein Bereich auffällig – der Fokus kann auf der reinen Belastungssteuerung bleiben.
        </p>
      )}
    </div>
  );
}
