export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
/** Whole dollars, for rough figures such as projections: $36,234. */
export const wholeUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;
export const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
export const tone = (n: number) => (n > 0 ? "text-mint" : n < 0 ? "text-rose-400" : "text-slate-2");
export function ago(then: Date, now = new Date()) {
  const mins = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}
/** Short dollar amount for tight spaces: $229, $3.1k, $1.2M. */
export const compactUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;
