"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactUsd } from "@/lib/format";
import { MILESTONE_YEARS, PROJECTION_YEARS, type Scenario } from "@/lib/scenarios";

/** Line colour per scenario id; matches the render (amber conservative, mint moderate, violet high). */
export const SCENARIO_COLORS: Record<string, string> = { conservative: "#f59e0b", moderate: "#2dd4bf", high: "#a855f7" };
const colorOf = (id: string) => SCENARIO_COLORS[id] ?? "#94a3b8";
/** Projections are rough, so whole dollars only. */
const dollars = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Three-line projection over the milestone years; straight segments between milestones, as in the design. */
export function ScenarioChart({ scenarios }: { scenarios: Scenario[] }) {
  const data = MILESTONE_YEARS.map((year) =>
    Object.fromEntries([["year", year], ...scenarios.map((s) => [s.id, s.values[year]])]),
  );
  const summary = scenarios
    .map((s) => `${s.label}: ${s.milestones.map((m) => `Y${m.year} ${dollars(m.value)}`).join(", ")}`)
    .join("; ");
  // Draw the steepest line last so it sits on top, like the render.
  const ordered = [...scenarios].sort((a, b) => a.values[PROJECTION_YEARS] - b.values[PROJECTION_YEARS]);
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-2">
        {scenarios.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(s.id), boxShadow: `0 0 6px ${colorOf(s.id)}` }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div role="img" aria-label={`10-year projection, illustrative. ${summary}`}>
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid stroke="#ffffff0d" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[0, PROJECTION_YEARS]}
              ticks={[...MILESTONE_YEARS]}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickFormatter={(y: number) => `${y}Y`}
            />
            <YAxis width={52} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v: number) => compactUsd(v).replace(".0", "")} domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{ background: "#0d1733", border: "1px solid #ffffff20", borderRadius: 8 }}
              labelFormatter={(y) => (Number(y) === 0 ? "Start" : `Year ${y}`)}
              formatter={(v, id) => [dollars(Number(v)), scenarios.find((s) => s.id === id)?.label ?? id]}
              itemSorter={(item) => -Number(item.value)}
            />
            {ordered.map((s) => (
              <Line
                key={s.id}
                dataKey={s.id}
                stroke={colorOf(s.id)}
                strokeWidth={2.5}
                dot={{ r: 4, fill: colorOf(s.id), strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
