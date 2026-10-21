"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ValueChart({ data }: { data: { day: string; value: number }[] }) {
  if (data.length < 2)
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        History builds up as daily price snapshots are collected.
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#ffffff10" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis
          width={56}
          tick={{ fill: "#71717a", fontSize: 12 }}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #ffffff20", borderRadius: 8 }}
          formatter={(v) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Value"]}
        />
        <Area dataKey="value" stroke="#34d399" strokeWidth={2} fill="url(#v)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
