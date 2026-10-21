"use server";

import { syncCollectionPrices } from "@/lib/sync";

export async function syncNow() {
  try {
    return { ok: true as const, ...(await syncCollectionPrices()) };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}
