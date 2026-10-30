"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactMoney, converted, type Money, wholeMoney } from "@/lib/format";
import { MILESTONE_YEARS, PROJECTION_YEARS, type Scenario, scenarioColor as colorOf } from "@/lib/scenarios";
import type { Band } from "@/lib/simulation";

// Neutral, so the range reads as uncertainty and the hues stay with the scenarios.
const BAND_COLOR = "#94a3b8";
const MEDIAN_COLOR = "#e2e8f0";
const SIMULATED = { outer: "Middle 80%", inner: "Middle 50%", median: "Simulated median" } as const;

/** Fan of simulated outcomes with the three scenarios drawn over it, yearly. */
/** Values are converted into the display currency before plotting, so axis ticks are round in that currency. */
export function ScenarioChart({ scenarios, bands, m }: { scenarios: Scenario[]; bands: Band[]; m: Money }) {
  const unit = converted(m);
  const data = bands.map((b) => ({
    year: b.year,
    outer: [b.p10 * m.rate, b.p90 * m.rate],
    inner: [b.p25 * m.rate, b.p75 * m.rate],
    median: b.p50 * m.rate,
    ...Object.fromEntries(scenarios.map((s) => [s.id, s.values[b.year] * m.rate])),
  }));
  const last = bands[PROJECTION_YEARS];
  const summary = [
    `Simulated year ${PROJECTION_YEARS}: median ${wholeMoney(last.p50, m)}, 80% between ${wholeMoney(last.p10, m)} and ${wholeMoney(last.p90, m)}`,
    ...scenarios.map((s) => `${s.label}: ${s.milestones.map((ms) => `Y${ms.year} ${wholeMoney(ms.value, m)}`).join(", ")}`),
  ].join("; ");
  const labelOf = (id: string) => SIMULATED[id as keyof typeof SIMULATED] ?? scenarios.find((s) => s.id === id)?.label ?? id;
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-2">
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: MEDIAN_COLOR }} />
          {SIMULATED.median}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm" style={{ background: BAND_COLOR, opacity: 0.55 }} />
          Middle 50%
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm" style={{ background: BAND_COLOR, opacity: 0.25 }} />
          Middle 80%
        </li>
        {scenarios.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(s.id), boxShadow: `0 0 6px ${colorOf(s.id)}` }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div role="img" aria-label={`10-year projection, illustrative. ${summary}`} className="h-48 md:h-64 lg:h-[23rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid stroke="#ffffff0d" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[0, PROJECTION_YEARS]}
              ticks={[...MILESTONE_YEARS]}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickFormatter={(y: number) => `${y}Y`}
            />
            <YAxis width={52} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v: number) => compactMoney(v, unit).replace(".0", "")} domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{ background: "#0d1733", border: "1px solid #ffffff20", borderRadius: 8 }}
              labelFormatter={(y) => (Number(y) === 0 ? "Start" : `Year ${y}`)}
              formatter={(v, id) => [
                Array.isArray(v) ? `${wholeMoney(Number(v[0]), unit)} – ${wholeMoney(Number(v[1]), unit)}` : wholeMoney(Number(v), unit),
                labelOf(String(id)),
              ]}
              itemSorter={(item) => -(Array.isArray(item.value) ? Number(item.value[1]) : Number(item.value))}
            />
            <Area dataKey="outer" stroke="none" fill={BAND_COLOR} fillOpacity={0.14} isAnimationActive={false} activeDot={false} />
            <Area dataKey="inner" stroke="none" fill={BAND_COLOR} fillOpacity={0.22} isAnimationActive={false} activeDot={false} />
            {scenarios.map((s) => (
              <Line key={s.id} dataKey={s.id} stroke={colorOf(s.id)} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            ))}
            <Line dataKey="median" stroke={MEDIAN_COLOR} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
