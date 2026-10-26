"use client";

import { useEffect } from "react";
import { useRefresh } from "@/components/data-provider";
import { SYNC_LOCK, syncCollectionPrices } from "@/lib/sync";
import { getSyncStatus } from "@/lib/sync-status";

/**
 * There is no server job to sync prices, so the app does it when opened: once per page load, when the last sync is
 * stale, failed or never ran. One tab syncs at a time; others opened meanwhile skip it.
 */
export function AutoSync() {
  const refresh = useRefresh();
  useEffect(() => {
    void navigator.locks.request(SYNC_LOCK, { ifAvailable: true }, async (lock) => {
      if (!lock) return;
      const { state } = await getSyncStatus();
      if (state === "verified" || state === "running") return;
      await syncCollectionPrices().catch((e) => console.warn("Automatic price sync failed:", e));
      refresh();
    });
  }, [refresh]);
  return null;
}
