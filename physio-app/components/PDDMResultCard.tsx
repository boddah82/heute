"use client";

import { PDDMAssessment, PDDMDomainId, PDDMStatus } from "@/lib/types";
import { PDDM_DOMAINS, PDDM_DOMAIN_LABELS, domainRecommendation, statusLabel } from "@/lib/pddm";

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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-xs text-slate-500">{formatDate(assessment.date)}</p>
        {onDelete && (
          <button onClick={() => onDelete(assessment.id)} className="text-xs text-slate-400">
            Löschen
          </button>
        )}
      </div>

      <div className="space-y-2">
        {PDDM_DOMAINS.map((domain) => {
          const result = assessment.results[domain];
          const sub = subtypeLabel(domain, result.subtype);
          return (
            <div key={domain} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{PDDM_DOMAIN_LABELS[domain]}</p>
                {sub && <p className="text-xs text-slate-500">{sub}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[result.status]}`}>
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
