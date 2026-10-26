import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { type GridCard, ReorderableGrid, ReorderProvider, ReorderToggle } from "@/components/reorderable-grid";
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

export const metadata: Metadata = { title: "Sealed Inventory · Collection Tracker" };

export default function Page() {
  return (
    <ReorderProvider>
      <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
          <div className="min-w-0">
            <div className="font-label text-label-eyebrow uppercase text-mint">Sealed products</div>
            <h1 className="mt-1 text-headline-xl-mobile md:text-headline-xl">Sealed Inventory</h1>
          </div>
          <ReorderToggle />
        </header>
        <Suspense fallback={<p className="text-slate-2">Loading sealed inventory…</p>}>
          <SealedInventory />
        </Suspense>
      </main>
    </ReorderProvider>
  );
}

async function SealedInventory() {
  await connection();
  const [d, history, m] = await Promise.all([getDashboard(), getSealedHistory(), getDisplayMoney()]);
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
