"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Money, compactMoney, converted, money, wholeMoney } from "@/lib/format";

/** USD history drawn in the display currency; data is converted first so axis ticks are round in that currency. */
export function ValueChart({ data: usdData, m }: { data: { day: string; value: number }[]; m: Money }) {
  if (usdData.length < 2)
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-2">
        History builds up as daily price snapshots are collected.
      </div>
    );
  const data = usdData.map((p) => ({ ...p, value: p.value * m.rate }));
  const unit = converted(m);
  // Pad the range so a flat history still gets distinct ticks (equal min and max repeat a tick).
  const values = data.map((p) => p.value);
  // Large figures (e.g. yen) would not fit the axis in full: ¥791.2k rather than ¥791,234.
  const tick = Math.max(...values) >= 100_000 ? compactMoney : wholeMoney;
  const domain = [Math.floor(Math.min(...values) * 0.98), Math.ceil(Math.max(...values) * 1.02)];
  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#ffffff0d" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis
          width={56}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickFormatter={(v: number) => tick(v, unit)}
          domain={domain}
        />
        <Tooltip
          contentStyle={{ background: "#0d1733", border: "1px solid #ffffff20", borderRadius: 8 }}
          formatter={(v) => [money(Number(v), unit), "Value"]}
        />
        <Area dataKey="value" stroke="#2dd4bf" strokeWidth={2} fill="url(#v)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
