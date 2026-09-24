"use client";

import { PatientRecord } from "@/lib/types";
import { getRegion } from "@/lib/regions";
import { assess } from "@/lib/trafficLight";
import { PDDM_DOMAINS, PDDM_DOMAIN_LABELS, statusLabel } from "@/lib/pddm";
import { QUESTIONNAIRES } from "@/lib/questionnaires";
import TrafficLightBadge from "./TrafficLightBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PatientRecordView({ record }: { record: PatientRecord }) {
  const regionIds = Array.from(
    new Set([
      ...record.checkIns.map((c) => c.regionId),
      ...record.pddm.map((a) => a.regionId),
      ...record.psfsGoals.map((g) => g.regionId),
      ...record.questionnaireResults.map((q) => q.regionId),
    ])
  );

  if (regionIds.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">Noch keine Daten in diesem Verlauf.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-400">Importiert am {formatDateTime(record.importedAt)}</p>

      {regionIds.map((regionId) => {
        const region = getRegion(regionId);
        const checkIns = record.checkIns
          .filter((c) => c.regionId === regionId)
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        const pddm = record.pddm.filter((a) => a.regionId === regionId);
        const goals = record.psfsGoals.filter((g) => g.regionId === regionId);
        const questionnaireResults = record.questionnaireResults
          .filter((q) => q.regionId === regionId)
          .sort((a, b) => (a.date < b.date ? 1 : -1));

        return (
          <div key={regionId} className="space-y-3">
            <h3 className="font-semibold text-slate-900">{region.label}</h3>

            {pddm.map((a) => (
              <div key={a.id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
                <p className="text-xs text-slate-500">Bereichs-Einschätzung vom {formatDate(a.date)}</p>
                <div className="space-y-1">
                  {PDDM_DOMAINS.filter((d) => a.results[d].status !== "NONE").map((d) => (
                    <p key={d} className="text-sm text-slate-700">
                      <span className="font-medium">{PDDM_DOMAIN_LABELS[d]}:</span> {statusLabel(a.results[d].status)}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {questionnaireResults.map((r) => {
              const def = QUESTIONNAIRES[r.questionnaireId];
              return (
                <div key={r.id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-1">
                  <p className="text-xs text-slate-500">
                    {def.title} vom {formatDate(r.date)}
                  </p>
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{r.totalScore}</span> / {def.scoreRange[1]}
                    {def.interpret && <span className="text-slate-600"> · {def.interpret(r.totalScore)}</span>}
                  </p>
                </div>
              );
            })}

            {goals.map((goal) => {
              const ratings = record.psfsRatings
                .filter((r) => r.goalId === goal.id)
                .sort((a, b) => (a.date < b.date ? 1 : -1));
              const latest = ratings[0];
              return (
                <div key={goal.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                  <p className="text-sm text-slate-700">{goal.label}</p>
                  {latest && (
                    <p className="text-sm font-semibold text-brand-800 shrink-0">
                      {latest.value}/10 <span className="font-normal text-slate-400">({formatDate(latest.date)})</span>
                    </p>
                  )}
                </div>
              );
            })}

            {checkIns.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Check-ins.</p>
            ) : (
              checkIns.map((c) => {
                const a = assess(c);
                return (
                  <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{c.activity}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(c.date)}
                          {c.durationMin ? ` · ${c.durationMin} Min.` : ""}
                        </p>
                      </div>
                      <TrafficLightBadge light={a.overall} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500">
                      Schmerz {c.painBefore}→{c.painAfter}
                      {c.pain24h !== undefined && ` · 24h ${c.pain24h}`}
                      {c.pain48h !== undefined && ` · 48h ${c.pain48h}`}
                    </p>
                    {c.notes && <p className="text-xs text-slate-500 italic">{c.notes}</p>}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
