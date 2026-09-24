"use client";

import { PDDMAssessment, PSFSGoal } from "@/lib/types";
import { PDDM_DOMAINS, PDDM_DOMAIN_LABELS, domainRecommendation } from "@/lib/pddm";

// Führt die letzte PDDM-Bestandsaufnahme mit den genannten PSFS-Zielen
// zusammen: keine neue, eigenständige Analyse, sondern die bereits
// vorhandenen Domänen-Empfehlungen im Kontext der Ziele eingeordnet – damit
// klar ist, worauf beim Arbeiten an diesen Zielen zu achten ist.
export default function GoalActionSummary({
  latestAssessment,
  goals,
}: {
  latestAssessment?: PDDMAssessment;
  goals: PSFSGoal[];
}) {
  if (goals.length === 0) return null;

  if (!latestAssessment) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-900">
          Noch keine Bestandsaufnahme im Tab &quot;Bereiche&quot; vorhanden – fülle die zuerst aus, dann kann eine
          fundiertere Handlungsempfehlung für Deine Ziele angezeigt werden.
        </p>
      </div>
    );
  }

  const goalNames = goals.map((g) => g.label).join(", ");
  const relevant = PDDM_DOMAINS.filter((d) => latestAssessment.results[d].status !== "NONE");

  if (relevant.length === 0) {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
        <p className="text-sm font-semibold text-brand-900">Handlungsempfehlung</p>
        <p className="text-sm text-brand-900 mt-1">
          Aus der letzten Bestandsaufnahme ist aktuell nichts auffällig – die Belastung in Richtung Deiner Ziele (
          {goalNames}) kann schrittweise gesteigert werden.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 space-y-1.5">
      <p className="text-sm font-semibold text-brand-900">Handlungsempfehlung für Deine Ziele ({goalNames})</p>
      {relevant.map((d) => (
        <p key={d} className="text-sm text-brand-900">
          <span className="font-medium">{PDDM_DOMAIN_LABELS[d]}:</span>{" "}
          {domainRecommendation(d, latestAssessment.results[d])}
        </p>
      ))}
    </div>
  );
}
