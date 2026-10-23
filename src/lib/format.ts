import { CURRENCY_INFO, type Currency, type FxRates } from "./currencies";

/** Display currency and its rate (units per 1 USD). Every money helper takes a USD amount and converts it. */
export type Money = { currency: Currency; rate: number };
export const USD: Money = { currency: "USD", rate: 1 };
export const moneyFor = (currency: Currency, fx: Pick<FxRates, "rates">): Money => ({ currency, rate: fx.rates[currency] });

/** Symbol, sign and digits; never "-$0.00" for an amount that rounds to zero. */
function fmt(usdAmount: number, m: Money, digits: number) {
  const n = usdAmount * m.rate;
  const abs = Number(Math.abs(n).toFixed(digits));
  const body = abs.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 && abs > 0 ? "-" : ""}${CURRENCY_INFO[m.currency].symbol}${body}`;
}

/** Full amount with the currency's decimals: $1,234.50, ¥190,722. */
export const money = (n: number, m: Money = USD) => fmt(n, m, CURRENCY_INFO[m.currency].decimals);
/** Whole units, for rough figures such as projections: $36,234. */
export const wholeMoney = (n: number, m: Money = USD) => fmt(n, m, 0);
/** Short amount for tight spaces and chart axes: $229, $16.8k, ¥2.6M. */
export function compactMoney(n: number, m: Money = USD) {
  const v = n * m.rate;
  const abs = Math.abs(v);
  const sign = v < 0 && Math.round(abs) > 0 ? "-" : "";
  const sym = CURRENCY_INFO[m.currency].symbol;
  if (abs >= 999_950) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 999.5) return `${sign}${sym}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${sym}${Math.round(abs)}`;
}
/** Change with an explicit sign: +$12.00, −€3.40. */
export const signedMoney = (n: number, m: Money = USD) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n), m)}`;

// USD-only names kept until every view takes the selected currency (#42).
export const usd = (n: number) => money(n);
export const wholeUsd = (n: number) => wholeMoney(n);
export const signed = (n: number) => signedMoney(n);
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
export const compactUsd = (n: number) => compactMoney(n);
