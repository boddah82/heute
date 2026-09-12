"use client";

import { useState } from "react";
import { buildExportText } from "@/lib/export";

export default function ExportPanel() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  function openPanel() {
    setText(buildExportText());
    setOpen(true);
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage evtl. nicht erlaubt – Text bleibt zum manuellen Markieren stehen.
    }
  }

  return (
    <>
      <button
        onClick={openPanel}
        className="text-xs font-medium text-teal-100 underline underline-offset-2"
      >
        Daten exportieren
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Daten exportieren</h2>
              <p className="text-xs text-slate-500 mt-1">
                Text kopieren und z. B. per WhatsApp oder E-Mail an Deine Therapeutin/Deinen Therapeuten schicken.
              </p>
            </div>
            <textarea
              readOnly
              value={text}
              className="flex-1 p-4 text-xs font-mono text-slate-700 resize-none outline-none"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={copy}
                className="flex-1 rounded-xl bg-teal-700 text-white font-semibold py-2.5 text-sm hover:bg-teal-800 transition"
              >
                {copied ? "Kopiert ✓" : "In Zwischenablage kopieren"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl bg-slate-100 text-slate-700 font-medium py-2.5 px-4 text-sm hover:bg-slate-200 transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
