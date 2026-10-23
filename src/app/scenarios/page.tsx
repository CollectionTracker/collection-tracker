import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ScenarioAssumptions } from "@/components/scenario-assumptions";
import { ScenarioProjection } from "@/components/scenario-projection";
import { ScenarioSummary } from "@/components/scenario-summary";
import { YearTenOutcomes } from "@/components/year-ten-outcomes";
import { getDisplayMoney } from "@/lib/currency-pref";
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
  const [d, m] = await Promise.all([getDashboard(), getDisplayMoney()]);
  const start = d.combined.valuation.mid;
  const scenarios = projectScenarios(start);
  if (start <= 0) return <ScenarioProjection start={start} scenarios={scenarios} m={m} />;
  return (
    <>
      <ScenarioSummary valuation={d.combined.valuation} scenarios={scenarios} m={m} />
      <section className="page-grid">
        <div className="col-span-full lg:col-span-9">
          <ScenarioProjection start={start} scenarios={scenarios} m={m} />
        </div>
        <div className="col-span-full lg:col-span-3">
          <YearTenOutcomes scenarios={scenarios} m={m} />
        </div>
      </section>
      <ScenarioAssumptions />
    </>
  );
}
