import { TrafficLight } from "@/lib/types";
import { LIGHT_COLORS } from "@/lib/trafficLight";

export default function TrafficLightBadge({
  light,
  size = "md",
}: {
  light: TrafficLight;
  size?: "sm" | "md" | "lg";
}) {
  const colors = LIGHT_COLORS[light];
  const dotSize = size === "lg" ? "w-4 h-4" : size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  const textSize = size === "lg" ? "text-base" : "text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} font-medium ${colors.text}`}>
      <span className={`${dotSize} rounded-full ${colors.bg}`} />
      {colors.label}
    </span>
  );
}
