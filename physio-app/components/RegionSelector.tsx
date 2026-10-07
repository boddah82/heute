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
                ? "bg-brand-700 text-white border-brand-700 dark:border-brand-400"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-900"
            }`}
          >
            {region.label}
          </button>
        );
      })}
    </div>
  );
}
