"use client";

function levelColor(value: number) {
  if (value <= 2) return "accent-emerald-500";
  if (value <= 5) return "accent-amber-500";
  return "accent-red-500";
}

export default function PainSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-semibold text-slate-900 tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-lg cursor-pointer ${levelColor(value)}`}
      />
    </div>
  );
}
