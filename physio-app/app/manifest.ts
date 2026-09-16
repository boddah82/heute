import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reiz-Reaktions-Tracker",
    short_name: "RRT",
    description: "Belastbarkeit verstehen: Reize, Schmerzreaktion und Ampel-Feedback für die Physiotherapie.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1f3a50",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
