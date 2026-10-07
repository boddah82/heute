import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reiz-Reaktions-Tracker",
  description:
    "Belastbarkeit verstehen statt raten: Reize und Schmerzreaktion tracken, mit Ampel-Feedback für die Physiotherapie.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1f3a50",
};

// Läuft blockierend vor dem ersten Paint, damit beim Laden nicht kurz das
// falsche Theme aufblitzt (Logik gespiegelt zu lib/storage.ts useTheme()).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem("rrt.theme.v1");
    var theme = raw ? JSON.parse(raw) : null;
    var isDark = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
