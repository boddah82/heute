"use client";

import { useState } from "react";

// Ungefähre Werte zu Bandscheibenvorwölbungen (Bulging) bei schmerzfreien
// Personen, gerundet nach Brinjikji et al. 2015 ("Systematic Literature
// Review of Imaging Features of Spinal Degeneration in Asymptomatic
// Populations", American Journal of Neuroradiology). Bewusst als grobe
// Richtwerte gekennzeichnet – für exakte Zahlen empfiehlt sich ein Blick in
// die Originalstudie, bevor sie 1:1 mit Patienten besprochen werden.
const AGE_BANDS = [
  { label: "20er", value: 30 },
  { label: "30er", value: 40 },
  { label: "40er", value: 50 },
  { label: "50er", value: 60 },
  { label: "60er", value: 70 },
  { label: "70er", value: 80 },
  { label: "80er+", value: 84 },
];

export default function MriEducation() {
  const [index, setIndex] = useState(2); // 40er als Startpunkt

  const band = AGE_BANDS[index];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Was zeigt ein MRT wirklich?</h3>
        <p className="text-sm text-slate-600 mt-1">
          Veränderungen im MRT sind auch bei Menschen ohne jegliche Schmerzen sehr häufig – und
          nehmen mit dem Alter normal zu, ähnlich wie graue Haare oder Falten. Ein Befund im Bild
          bedeutet also nicht automatisch, dass er die Ursache für aktuelle Beschwerden ist.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">Altersgruppe wählen</label>
        <input
          type="range"
          min={0}
          max={AGE_BANDS.length - 1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="w-full h-2 rounded-lg cursor-pointer accent-teal-700"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          {AGE_BANDS.map((b) => (
            <span key={b.label}>{b.label}</span>
          ))}
        </div>
      </div>

      <div className="bg-teal-50 rounded-xl p-4 text-center">
        <p className="text-3xl font-bold text-teal-800">ca. {band.value}%</p>
        <p className="text-sm text-teal-900 mt-1">
          der schmerzfreien Personen in ihren {band.label} Lebensjahren zeigen im MRT eine
          Bandscheibenvorwölbung – ganz ohne Beschwerden.
        </p>
      </div>

      <p className="text-xs text-slate-400">
        Grobe Richtwerte, gerundet nach Brinjikji et al. (2015), American Journal of
        Neuroradiology – systematische Übersichtsarbeit zu Bildgebungsbefunden bei
        beschwerdefreien Personen. Für eine konkrete medizinische Einordnung Deines eigenen
        Befundes sprich bitte mit Deiner Ärztin/Deinem Arzt oder Therapeutin/Therapeuten.
      </p>
    </div>
  );
}
