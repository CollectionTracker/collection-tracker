import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
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
    <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
      <header className="border-b border-white/5 pb-5">
        <div className="font-label text-label-eyebrow uppercase text-mint">Sealed products</div>
        <h1 className="mt-1 text-headline-xl-mobile md:text-headline-xl">Sealed Inventory</h1>
      </header>
      <Suspense fallback={<p className="text-slate-2">Loading sealed inventory…</p>}>
        <SealedInventory />
      </Suspense>
    </main>
  );
}

async function SealedInventory() {
  await connection();
  const [d, history, m] = await Promise.all([getDashboard(), getSealedHistory(), getDisplayMoney()]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <SealedIntelHeader d={d} m={m} />
      <SealedBreakdown d={d} m={m} />
      <SealedLeaderboard d={d} m={m} />
      <SealedStructure d={d} m={m} today={today} />
      <SealedHistory history={history} m={m} />
      <SealedMovers d={d} m={m} />
      <SealedAllProducts holdings={d.sealed.holdings} m={m} />
    </>
  );
}
