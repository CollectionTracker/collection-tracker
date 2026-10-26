"use client";

import { useData } from "@/components/data-provider";
import { type GridCard, ReorderableGrid } from "@/components/reorderable-grid";
import { RawAllCards } from "@/components/raw-all-cards";
import { RawBreakdown } from "@/components/raw-breakdown";
import { RawLeaderboard } from "@/components/raw-leaderboard";
import { RawIntelHeader } from "@/components/raw-intel-header";
import { RawHistory, RawMovers } from "@/components/raw-movers";
import { RawStructure } from "@/components/raw-structure";
import { getDisplayMoney } from "@/lib/currency-pref";
import { getDashboard } from "@/lib/stats";

export function RawCards() {
  const [d, m] = useData(["raw"], () => Promise.all([getDashboard(), getDisplayMoney()]));
  const full = "col-span-full";
  const cards: GridCard[] = [
    { id: "intel", label: "Raw intelligence", span: full, node: <RawIntelHeader d={d} m={m} /> },
    { id: "breakdown", label: "Value by set and rarity", span: full, node: <RawBreakdown d={d} m={m} /> },
    { id: "leaderboard", label: "Top 8 raw holdings", span: full, node: <RawLeaderboard d={d} m={m} /> },
    { id: "structure", label: "Collection structure", span: full, node: <RawStructure d={d} m={m} /> },
    { id: "history", label: "Raw value over time", span: full, node: <RawHistory d={d} m={m} /> },
    { id: "movers", label: "Top movers", span: full, node: <RawMovers d={d} m={m} /> },
    { id: "all-cards", label: "All raw cards", span: full, node: <RawAllCards holdings={d.holdings} sets={d.setProgress} m={m} /> },
  ];
  return <ReorderableGrid cards={cards} storageKey="raw-card-order" />;
}
