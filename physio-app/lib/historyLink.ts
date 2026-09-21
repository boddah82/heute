import { HistoryBundle } from "./types";

const PARAM = "verlauf";

// Kodiert den kompletten Trackingstand eines Patientengeräts URL-sicher in
// Base64 (kein Server, kein Live-Sync – der Link selbst trägt die Daten).
// Analog zu lib/planLink.ts, nur in die andere Richtung: Patient -> Therapeut.
export function encodeHistory(bundle: HistoryBundle): string {
  const json = JSON.stringify(bundle);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeHistory(encoded: string): HistoryBundle | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.checkIns)) return null;
    return parsed as HistoryBundle;
  } catch {
    return null;
  }
}

export function buildHistoryLink(bundle: HistoryBundle): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(PARAM, encodeHistory(bundle));
  return url.toString();
}

export function readHistoryFromLocation(): HistoryBundle | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(PARAM);
  if (!encoded) return null;
  return decodeHistory(encoded);
}

export function clearHistoryFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  window.history.replaceState(null, "", url.toString());
}
