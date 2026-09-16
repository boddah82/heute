"use client";

import { useState } from "react";

export default function StabilizationParadox() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
      <h3 className="font-semibold text-slate-900">Das Stabilisations-Paradoxon</h3>
      <p className="text-sm text-slate-600">
        Bei anhaltenden Schmerzen greifen viele Menschen zu starker, bewusster Anspannung (z. B.
        festes Anspannen der Körpermitte), um sich zu schützen. Das kann sich zunächst richtig
        anfühlen – wirkt aber nicht immer so, wie gedacht.
      </p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-brand-700 underline underline-offset-2"
      >
        {open ? "Weniger anzeigen" : "Warum das paradox sein kann"}
      </button>

      {open && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Dauerhaft hohe Anspannung kann bei manchen Menschen mit anhaltenden Beschwerden die
            Beweglichkeit einschränken und die Körperregion empfindlicher statt belastbarer machen –
            das Gegenteil von dem, was eigentlich erreicht werden soll.
          </p>
          <p className="text-sm text-slate-600">
            Ein möglicher Ansatz ist deshalb nicht &quot;noch fester anspannen&quot;, sondern
            wieder mehr Bewegungsvielfalt und entspannte Kontrolle zu trainieren: verschiedene
            Bewegungswege ausprobieren, Anspannung dosieren statt maximal halten, und Vertrauen in
            die eigene Belastbarkeit Schritt für Schritt aufbauen.
          </p>
          <p className="text-xs text-slate-400">
            Das betrifft nicht jede Person gleich – ob und wie stark das eine Rolle spielt, lässt
            sich am besten gemeinsam mit einer Therapeutin/einem Therapeuten einschätzen.
          </p>
        </div>
      )}
    </div>
  );
}
