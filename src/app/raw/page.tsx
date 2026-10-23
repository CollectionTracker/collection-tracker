import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
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
    <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
      <header className="border-b border-white/5 pb-5">
        <div className="font-label text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-mint">Raw cards</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] md:text-[40px] md:leading-[48px]">Raw Cards</h1>
      </header>
      <Suspense fallback={<p className="text-slate-2">Loading collection…</p>}>
        <RawCards />
      </Suspense>
    </main>
  );
}

async function RawCards() {
  await connection();
  const [d, m] = await Promise.all([getDashboard(), getDisplayMoney()]);
  return (
    <>
      <RawIntelHeader d={d} m={m} />
      <RawBreakdown d={d} m={m} />
      <RawLeaderboard d={d} m={m} />
      <RawStructure d={d} m={m} />
      <RawHistory d={d} m={m} />
      <RawMovers d={d} m={m} />
      <RawAllCards holdings={d.holdings} sets={d.setProgress} m={m} />
    </>
  );
}
