"use client";

import { useState } from "react";
import { CheckIn, LeadSymptom, LeadSymptomRating, SleepEntry, TrafficLight } from "@/lib/types";
import { LEAD_SYMPTOM_SUGGESTIONS } from "@/lib/regions";
import { leadTrend, weeklyMeans, sleepCompare, activityCompares, round1, LeadTrend, GroupCompare } from "@/lib/leadSymptom";
import MiniLineChart from "./MiniLineChart";

const TREND_STYLE: Record<LeadTrend, string> = {
  besser: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  stabil: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  schlechter: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  zu_wenig_daten: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
};
const TREND_LABEL: Record<LeadTrend, string> = {
  besser: "Besser",
  stabil: "Stabil",
  schlechter: "Schlechter",
  zu_wenig_daten: "Noch zu wenig Daten",
};

// Farbe eines Wochenmittels: niedrig = grün, mittel = gelb, hoch = rot.
function painLight(v: number): TrafficLight {
  if (v <= 2) return "GREEN";
  if (v <= 5) return "YELLOW";
  return "RED";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ScaleButtons({ value, onPick, disabled }: { value?: number; onPick: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-11 gap-1">
      {Array.from({ length: 11 }, (_, v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => onPick(v)}
          aria-label={`${v} von 10`}
          className={`rounded-md py-1.5 text-xs font-medium border transition ${
            value === v
              ? "bg-brand-700 text-white border-brand-700 dark:border-brand-400"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function CompareLine({ c }: { c: GroupCompare }) {
  return (
    <p className="text-xs text-slate-600 dark:text-slate-300">
      Ø <span className="font-semibold">{round1(c.withMean)}</span> {c.withLabel} ({c.withN} Tage) vs. Ø{" "}
      <span className="font-semibold">{round1(c.withoutMean)}</span> {c.withoutLabel} ({c.withoutN} Tage)
    </p>
  );
}

interface Props {
  regionId: string;
  symptoms: LeadSymptom[];
  ratings: LeadSymptomRating[];
  sleep: SleepEntry[];
  checkIns: CheckIn[];
  readOnly?: boolean;
  onAddSymptom?: (label: string) => void;
  onDeleteSymptom?: (id: string) => void;
  onRate?: (symptomId: string, date: string, value: number, startupMin?: number) => void;
  onRateSleep?: (date: string, rested: number) => void;
}

export default function LeadSymptomPanel({
  regionId,
  symptoms,
  ratings,
  sleep,
  checkIns,
  readOnly = false,
  onAddSymptom,
  onDeleteSymptom,
  onRate,
  onRateSleep,
}: Props) {
  const [date, setDate] = useState(today());
  const [startup, setStartup] = useState<Record<string, string>>({});
  const [newLabel, setNewLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const suggestions = (LEAD_SYMPTOM_SUGGESTIONS[regionId] ?? []).filter((s) => !symptoms.some((x) => x.label === s));
  const sleepToday = sleep.find((s) => s.date === date);
  const sleepSorted = [...sleep].sort((a, b) => (a.date < b.date ? -1 : 1));

  function addSymptom(label: string) {
    const l = label.trim();
    if (!l || !onAddSymptom) return;
    onAddSymptom(l);
    setNewLabel("");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Leitsymptom</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Eine feste Situation, die im Alltag am meisten stört – unabhängig vom Training immer gleich bewertet
          (0 = kein Schmerz, 10 = stärkster). Zeigt über Wochen, ob es besser, stabil oder schlechter wird.
        </p>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <label htmlFor="lead-date" className="text-xs text-slate-600 dark:text-slate-400">
            Datum
          </label>
          <input
            id="lead-date"
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value || today())}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-slate-900"
          />
        </div>
      )}

      {symptoms.map((s) => {
        const own = ratings.filter((r) => r.symptomId === s.id);
        const t = leadTrend(own);
        const weeks = weeklyMeans(own);
        const current = own.find((r) => r.date === date);
        const sc = sleepCompare(own, sleep);
        const ac = activityCompares(own, checkIns).filter((c) => Math.abs(c.withMean - c.withoutMean) >= 1)[0];
        return (
          <div key={s.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{own.length} Bewertungen</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${TREND_STYLE[t.trend]}`}>{TREND_LABEL[t.trend]}</span>
                {!readOnly && onDeleteSymptom &&
                  (confirmDelete === s.id ? (
                    <span className="flex gap-2">
                      <button onClick={() => onDeleteSymptom(s.id)} className="text-[11px] text-red-600 dark:text-red-400">
                        Wirklich löschen
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="text-[11px] text-slate-400">
                        Abbrechen
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(s.id)} className="text-[11px] text-slate-400 dark:text-slate-500">
                      Löschen
                    </button>
                  ))}
              </div>
            </div>

            {!readOnly && onRate && (
              <div className="space-y-2">
                <ScaleButtons
                  value={current?.value}
                  onPick={(v) => {
                    const m = startup[s.id];
                    const n = m !== undefined && m !== "" ? Math.max(0, Math.round(Number(m))) : undefined;
                    onRate(s.id, date, v, Number.isFinite(n) ? n : undefined);
                  }}
                />
                <div className="flex items-center gap-2">
                  <label htmlFor={`startup-${s.id}`} className="text-xs text-slate-600 dark:text-slate-400">
                    Bis es besser / eingelaufen ist (optional):
                  </label>
                  <input
                    id={`startup-${s.id}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={startup[s.id] ?? ""}
                    onChange={(e) => setStartup((p) => ({ ...p, [s.id]: e.target.value }))}
                    className="w-16 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-slate-900"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Min.</span>
                </div>
                {current && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Für dieses Datum gespeichert: {current.value}/10
                    {current.startupMin !== undefined ? ` · ${current.startupMin} Min.` : ""}
                  </p>
                )}
              </div>
            )}

            {weeks.length >= 2 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Wochenmittel</p>
                <MiniLineChart
                  points={weeks.map((w) => ({ date: w.date, value: w.value, status: painLight(w.value), tooltipValue: round1(w.value) }))}
                  yMax={10}
                  height={110}
                />
              </div>
            )}

            {t.startMean !== undefined && t.endMean !== undefined && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Erste 2 Wochen Ø <span className="font-semibold">{round1(t.startMean)}</span> → letzte 2 Wochen Ø{" "}
                <span className="font-semibold">{round1(t.endMean)}</span>
                {t.startStartup !== undefined && t.endStartup !== undefined && (
                  <>
                    {" "}· bis es besser ist: Ø {Math.round(t.startStartup)} → {Math.round(t.endStartup)} Min.
                  </>
                )}
              </p>
            )}

            {(sc || ac) && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Mögliche Zusammenhänge – Hinweis, kein Beweis</p>
                {sc && <CompareLine c={sc} />}
                {ac && <CompareLine c={ac} />}
              </div>
            )}
          </div>
        );
      })}

      {!readOnly && onAddSymptom && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {symptoms.length === 0 ? "Was stört im Alltag am meisten?" : "Weiteres Leitsymptom"}
          </p>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => addSymptom(s)}
                  className="rounded-md px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addSymptom(newLabel);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Eigene Situation, z. B. „Nach 30 Min. Sitzen“"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900"
            />
            <button type="submit" className="rounded-lg bg-brand-700 text-white px-3 py-2 text-sm font-medium">
              Hinzufügen
            </button>
          </form>
        </div>
      )}

      {(!readOnly || sleep.length > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Schlaf: Wie erholt aufgewacht?</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">0 = gar nicht erholt, 10 = voll erholt. Einmal pro Morgen.</p>
          {!readOnly && onRateSleep && (
            <>
              <ScaleButtons value={sleepToday?.rested} onPick={(v) => onRateSleep(date, v)} />
              {sleepToday && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Für dieses Datum gespeichert: {sleepToday.rested}/10</p>
              )}
            </>
          )}
          {sleepSorted.length >= 3 && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {sleepSorted.length} Nächte erfasst · Ø {round1(sleepSorted.reduce((s, x) => s + x.rested, 0) / sleepSorted.length)} von 10
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        Eigene Umsetzung, kein validiertes Instrument: Prinzip Wiedertest-Zeichen + Schmerzskala 0–10. „Besser“ /
        „Schlechter“ ab einer Veränderung von 2 Punkten (oder 30 % und mind. 1 Punkt) zwischen den ersten und den
        letzten 2 Wochen, angelehnt an die übliche Schwelle für relevante Veränderung (Farrar et al. 2001). Ab 4
        Bewertungen je Zeitraum. Tipp: zeitlich begrenzen (z. B. 2–4 Wochen) – wer ständig beobachtet, achtet oft
        noch mehr auf den Schmerz.
      </p>
    </div>
  );
}
