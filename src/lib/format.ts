export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;
export const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
export const tone = (n: number) => (n > 0 ? "text-emerald-400" : n < 0 ? "text-rose-400" : "text-zinc-400");
