"use server";

import { cookies } from "next/headers";
import { isCurrency } from "@/lib/currencies";
import { CURRENCY_COOKIE, CURRENCY_COOKIE_MAX_AGE } from "@/lib/currency-pref";
import { type SealedPriceInput, setSealedPrice } from "@/lib/sealed-prices";
import { type SnapshotLabelInput, setSnapshotLabel } from "@/lib/snapshots";
import { syncCollectionPrices } from "@/lib/sync";

export async function syncNow() {
  try {
    return { ok: true as const, ...(await syncCollectionPrices()) };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}

export async function setSealedPriceAction(input: SealedPriceInput) {
  try {
    return { ok: true as const, price: await setSealedPrice(input) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setSnapshotLabelAction(input: SnapshotLabelInput) {
  try {
    return { ok: true as const, snapshot: await setSnapshotLabel(input) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Remember the display currency for a year; the response re-renders the page in it. */
export async function setCurrencyAction(code: string) {
  if (!isCurrency(code)) return { ok: false as const, error: `Unsupported currency: ${code}` };
  (await cookies()).set(CURRENCY_COOKIE, code, { maxAge: CURRENCY_COOKIE_MAX_AGE, sameSite: "lax", path: "/" });
  return { ok: true as const, currency: code };
}
