"use server";

import { type SealedPriceInput, setSealedPrice } from "@/lib/sealed-prices";
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
