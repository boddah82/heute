import { TrainingPlan } from "./types";

const PARAM = "plan";

// Kodiert einen Plan URL-sicher in Base64 (ohne Server, kein Live-Sync –
// der Link selbst trägt die Daten).
export function encodePlan(plan: TrainingPlan): string {
  const json = JSON.stringify(plan);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePlan(encoded: string): TrainingPlan | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.exercises)) return null;
    return parsed as TrainingPlan;
  } catch {
    return null;
  }
}

export function buildPlanLink(plan: TrainingPlan): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(PARAM, encodePlan(plan));
  return url.toString();
}

export function readPlanFromLocation(): TrainingPlan | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(PARAM);
  if (!encoded) return null;
  return decodePlan(encoded);
}

export function clearPlanFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  window.history.replaceState(null, "", url.toString());
}
