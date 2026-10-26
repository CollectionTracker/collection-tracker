import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { type GridCard, ReorderableGrid, ReorderProvider, ReorderToggle } from "@/components/reorderable-grid";
import { RawAllCards } from "@/components/raw-all-cards";
import { RawBreakdown } from "@/components/raw-breakdown";
import { RawLeaderboard } from "@/components/raw-leaderboard";
import { RawIntelHeader } from "@/components/raw-intel-header";
import { RawHistory, RawMovers } from "@/components/raw-movers";
import { RawStructure } from "@/components/raw-structure";
import { getDisplayMoney } from "@/lib/currency-pref";
import { getDashboard } from "@/lib/stats";

export const metadata: Metadata = { title: "Raw Cards · Collection Tracker" };

export default function Page() {
  return (
    <ReorderProvider>
      <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
          <div className="min-w-0">
            <div className="font-label text-label-eyebrow uppercase text-mint">Raw cards</div>
            <h1 className="mt-1 text-headline-xl-mobile md:text-headline-xl">Raw Cards</h1>
          </div>
          <ReorderToggle />
        </header>
        <Suspense fallback={<p className="text-slate-2">Loading collection…</p>}>
          <RawCards />
        </Suspense>
      </main>
    </ReorderProvider>
  );
}

async function RawCards() {
  await connection();
  const [d, m] = await Promise.all([getDashboard(), getDisplayMoney()]);
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
