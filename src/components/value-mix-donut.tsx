"use client";

import { useState } from "react";
import { type Money, money } from "@/lib/format";

export type MixSlice = { label: string; value: number; color: string };

const R = 60;
const C = 2 * Math.PI * R;

export function ValueMixDonut({ slices, m }: { slices: MixSlice[]; m: Money }) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const share = (v: number) => (total ? (v / total) * 100 : 0);
  const shown =
    slices.find((s) => s.label === active) ??
    slices.reduce((a, b) => (b.value > a.value ? b : a), slices[0]);

  const arcs = slices.map((s, i) => ({
    ...s,
    len: (share(s.value) / 100) * C,
    start: slices
      .slice(0, i)
      .reduce((a, p) => a + (share(p.value) / 100) * C, 0),
  }));
  return (
    <div
      className="flex flex-wrap items-center gap-6"
      onMouseLeave={() => setActive(null)}
    >
      <div className="relative size-40 shrink-0">
        <svg
          viewBox="0 0 160 160"
          className="size-full -rotate-90"
          role="img"
          aria-label="Sealed versus raw value mix"
        >
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            strokeWidth="20"
            className="stroke-track"
          />
          {arcs.map((s) => (
            <circle
              key={s.label}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.label ? 24 : 20}
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.start}
              opacity={active && active !== s.label ? 0.35 : 1}
              className="transition-all"
              onMouseEnter={() => setActive(s.label)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-xl font-bold tracking-[-0.015em]">
              {share(shown.value).toFixed(1)}%
            </div>
            <div className="font-label text-[10px] uppercase tracking-wider text-slate-2">
              {shown.label}
            </div>
          </div>
        </div>
      </div>
      <ul className="min-w-48 flex-1 space-y-2">
        {slices.map((s) => (
          <li
            key={s.label}
            onMouseEnter={() => setActive(s.label)}
            className={`flex items-center gap-3 rounded-lg border bg-inset px-3 py-2 text-sm transition-colors ${
              active === s.label ? "border-white/20" : "border-white/5"
            }`}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="flex-1 truncate text-slate-2">{s.label}</span>
            <span className="text-xs tabular-nums text-slate-2">
              {share(s.value).toFixed(1)}%
            </span>
            <span className="font-bold tabular-nums">{money(s.value, m)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
