import { cookies } from "next/headers";
import { BASE_CURRENCY, type Currency, isCurrency } from "./currencies";

/** Cookie holding the chosen display currency, so server components render in it without a flash of USD. */
export const CURRENCY_COOKIE = "currency";
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The visitor's display currency; USD when unset or unknown. Reads a cookie, so call it inside a Suspense boundary. */
export async function getCurrency(): Promise<Currency> {
  const value = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return value && isCurrency(value) ? value : BASE_CURRENCY;
}
