import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ScenarioProjection } from "@/components/scenario-projection";
import { projectScenarios } from "@/lib/scenarios";
import { getDashboard } from "@/lib/stats";

export const metadata: Metadata = { title: "Scenarios & Growth · Collection Tracker" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
      <header className="border-b border-white/5 pb-5">
        <div className="font-label text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-mint">Scenarios</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] md:text-[40px] md:leading-[48px]">Scenarios &amp; Growth</h1>
      </header>
      <Suspense fallback={<p className="text-slate-2">Loading projections…</p>}>
        <Scenarios />
      </Suspense>
    </main>
  );
}

async function Scenarios() {
  await connection();
  const d = await getDashboard();
  const start = d.combined.valuation.mid;
  return <ScenarioProjection start={start} scenarios={projectScenarios(start)} />;
}
