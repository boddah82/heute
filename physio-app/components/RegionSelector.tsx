"use client";

import { REGIONS } from "@/lib/regions";

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export default function RegionSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
      {REGIONS.map((region) => {
        const active = region.id === value;
        return (
          <button
            key={region.id}
            onClick={() => onChange(region.id)}
            className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium shrink-0 transition ${
              active
                ? "bg-teal-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="text-xl leading-none">{region.icon}</span>
            {region.label}
          </button>
        );
      })}
    </div>
  );
}
