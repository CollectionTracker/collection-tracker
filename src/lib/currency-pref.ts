import { BASE_CURRENCY, type Currency, isCurrency } from "./currencies";
import { type Money, moneyFor } from "./format";
import { getFxRates } from "./forex";

/** localStorage key holding the chosen display currency, kept per browser like the collection itself. */
export const CURRENCY_KEY = "currency";

/** The visitor's display currency; USD when unset, unknown or when storage is unavailable. */
export function getCurrency(): Currency {
  try {
    const value = localStorage.getItem(CURRENCY_KEY);
    return value && isCurrency(value) ? value : BASE_CURRENCY;
  } catch {
    return BASE_CURRENCY;
  }
}

/** Remember the display currency in this browser; re-read the page's data afterwards to show it. */
export function setCurrency(code: Currency) {
  try {
    localStorage.setItem(CURRENCY_KEY, code);
  } catch {
    // Storage blocked (private window): the choice lasts until the page reloads.
  }
}

/**
 * The selected currency with the rate for the day being shown: today, or a snapshot day. A page converts every amount
 * (history and comparisons included) at this one rate, so charts show portfolio moves rather than exchange-rate moves.
 */
export async function getDisplayMoney(asOf?: string): Promise<Money> {
  return moneyFor(getCurrency(), await getFxRates(asOf));
}
