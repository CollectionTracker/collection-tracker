import { cookies } from "next/headers";
import { BASE_CURRENCY, type Currency, isCurrency } from "./currencies";
import { type Money, moneyFor } from "./format";
import { getFxRates } from "./forex";

/** Cookie holding the chosen display currency, so server components render in it without a flash of USD. */
export const CURRENCY_COOKIE = "currency";
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The visitor's display currency; USD when unset or unknown. Reads a cookie, so call it inside a Suspense boundary. */
export async function getCurrency(): Promise<Currency> {
  const value = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return value && isCurrency(value) ? value : BASE_CURRENCY;
}

/**
 * The selected currency with the rate for the day being shown: today, or a snapshot day. A page converts every amount
 * (history and comparisons included) at this one rate, so charts show portfolio moves rather than exchange-rate moves.
 */
export async function getDisplayMoney(asOf?: string): Promise<Money> {
  const [currency, fx] = await Promise.all([getCurrency(), getFxRates(asOf)]);
  return moneyFor(currency, fx);
}
