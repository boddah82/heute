"use client";

import { useState } from "react";
import { buildExportText } from "@/lib/export";
import { buildHistoryBundle } from "@/lib/storage";
import { buildHistoryLink } from "@/lib/historyLink";

type Mode = "text" | "link";

export default function ExportPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("link");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  function openPanel() {
    setText(buildExportText());
    setLink(buildHistoryLink(buildHistoryBundle()));
    setMode("link");
    setOpen(true);
    setCopied(false);
  }

  const value = mode === "link" ? link : text;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage evtl. nicht erlaubt – Inhalt bleibt zum manuellen Markieren stehen.
    }
  }

  return (
    <>
      <button
        onClick={openPanel}
        className="text-xs font-medium text-brand-100 underline underline-offset-2"
      >
        Verlauf an Therapeut senden
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 space-y-2">
              <h2 className="font-semibold text-slate-900">Verlauf senden</h2>
              <p className="text-xs text-slate-500">
                {mode === "link"
                  ? "Link kopieren und schicken – Deine Therapeutin/Dein Therapeut öffnet ihn im Therapeuten-Bereich, der Verlauf wird dort direkt übernommen."
                  : "Text kopieren und z. B. per WhatsApp oder E-Mail schicken – zum Nachlesen, nicht zum automatischen Import."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("link")}
                  className={`rounded-md px-3 py-1 text-xs font-medium border ${
                    mode === "link"
                      ? "bg-brand-700 text-white border-brand-700"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Link (empfohlen)
                </button>
                <button
                  onClick={() => setMode("text")}
                  className={`rounded-md px-3 py-1 text-xs font-medium border ${
                    mode === "text"
                      ? "bg-brand-700 text-white border-brand-700"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Text
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={value}
              className="flex-1 p-4 text-xs font-mono text-slate-700 resize-none outline-none"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={copy}
                className="flex-1 rounded-lg bg-brand-700 text-white font-semibold py-2.5 text-sm hover:bg-brand-800 transition"
              >
                {copied ? "Kopiert ✓" : "In Zwischenablage kopieren"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg bg-slate-100 text-slate-700 font-medium py-2.5 px-4 text-sm hover:bg-slate-200 transition"
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
