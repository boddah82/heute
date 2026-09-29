import { CheckIn } from "./types";

function daysSince(dateIso: string): number {
  const entryDate = new Date(dateIso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - entryDate.getTime()) / 86400000);
}

// Check-ins, bei denen der 24h- oder 48h-Nachtrag fällig, aber noch nicht
// erfasst ist. Nach einigen Tagen wird ein fehlender Nachtrag nicht mehr
// angezeigt – dann ist er ohnehin nicht mehr verlässlich nachholbar.
export function getOpenFollowUps(entries: CheckIn[]): CheckIn[] {
  return entries
    .filter((e) => {
      const d = daysSince(e.date);
      const needs24h = e.pain24h === undefined && d >= 1 && d <= 4;
      const needs48h = e.pain48h === undefined && d >= 2 && d <= 5;
      return needs24h || needs48h;
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
