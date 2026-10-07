"use client";

import { useTheme } from "@/lib/storage";

// Zeigt an, wohin der Klick wechselt (nicht den aktuellen Zustand) – gleiches
// Prinzip wie bei vielen Theme-Umschaltern: das Symbol ist die Handlung.
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
      className="w-6 h-6 rounded-full border border-brand-100 dark:border-brand-700 text-brand-100 text-xs flex items-center justify-center shrink-0"
    >
      {isDark ? "☀" : "☾"}
    </button>
  );
}
