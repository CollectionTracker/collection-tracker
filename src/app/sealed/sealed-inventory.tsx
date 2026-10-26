"use client";

import { useData } from "@/components/data-provider";
import { type GridCard, ReorderableGrid } from "@/components/reorderable-grid";
import { SealedAllProducts } from "@/components/sealed-all-products";
import {
  SealedBreakdown,
  SealedHistory,
  SealedIntelHeader,
  SealedLeaderboard,
  SealedMovers,
  SealedStructure,
} from "@/components/sealed-panels";
import { getDisplayMoney } from "@/lib/currency-pref";
import { getSealedHistory } from "@/lib/sealed-stats";
import { getDashboard } from "@/lib/stats";

export function SealedInventory() {
  const [d, history, m] = useData(["sealed"], () => Promise.all([getDashboard(), getSealedHistory(), getDisplayMoney()]));
  const today = new Date().toISOString().slice(0, 10);
  const full = "col-span-full";
  const cards: GridCard[] = [
    { id: "intel", label: "Sealed intelligence", span: full, node: <SealedIntelHeader d={d} m={m} /> },
    { id: "breakdown", label: "Value by type and set group", span: full, node: <SealedBreakdown d={d} m={m} /> },
    { id: "leaderboard", label: "Top 8 sealed holdings", span: full, node: <SealedLeaderboard d={d} m={m} /> },
    { id: "structure", label: "Return and price coverage", span: full, node: <SealedStructure d={d} m={m} today={today} /> },
    { id: "history", label: "Sealed value over time", span: full, node: <SealedHistory history={history} m={m} /> },
    { id: "movers", label: "Top movers", span: full, node: <SealedMovers d={d} m={m} /> },
    { id: "all-products", label: "All sealed products", span: full, node: <SealedAllProducts holdings={d.sealed.holdings} m={m} /> },
  ];
  return <ReorderableGrid cards={cards} storageKey="sealed-card-order" />;
}
