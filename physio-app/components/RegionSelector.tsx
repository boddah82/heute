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
            className={`rounded-md px-4 py-2 text-sm font-medium shrink-0 transition border ${
              active
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {region.label}
          </button>
        );
      })}
    </div>
  );
}
