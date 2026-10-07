"use client";

import { useState } from "react";

export default function StabilizationParadox() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Das Stabilisations-Paradoxon</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Bei anhaltenden Schmerzen greifen viele Menschen zu starker, bewusster Anspannung (z. B.
        festes Anspannen der Körpermitte), um sich zu schützen. Das kann sich zunächst richtig
        anfühlen – wirkt aber nicht immer so, wie gedacht.
      </p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-brand-700 dark:text-brand-300 underline underline-offset-2"
      >
        {open ? "Weniger anzeigen" : "Warum das paradox sein kann"}
      </button>

      {open && (
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Dauerhaft hohe Anspannung kann bei manchen Menschen mit anhaltenden Beschwerden die
            Beweglichkeit einschränken und die Körperregion empfindlicher statt belastbarer machen –
            das Gegenteil von dem, was eigentlich erreicht werden soll.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ein möglicher Ansatz ist deshalb nicht &quot;noch fester anspannen&quot;, sondern
            wieder mehr Bewegungsvielfalt und entspannte Kontrolle zu trainieren: verschiedene
            Bewegungswege ausprobieren, Anspannung dosieren statt maximal halten, und Vertrauen in
            die eigene Belastbarkeit Schritt für Schritt aufbauen.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Das betrifft nicht jede Person gleich – ob und wie stark das eine Rolle spielt, lässt
            sich am besten gemeinsam mit einer Therapeutin/einem Therapeuten einschätzen.
          </p>
        </div>
      )}
    </div>
  );
}
