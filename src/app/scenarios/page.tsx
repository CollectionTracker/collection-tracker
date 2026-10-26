import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { type GridCard, ReorderableGrid, ReorderProvider, ReorderToggle } from "@/components/reorderable-grid";
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
    <ReorderProvider>
      <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
          <div className="min-w-0">
            <div className="font-label text-label-eyebrow uppercase text-mint">Scenarios</div>
            <h1 className="mt-1 text-headline-xl-mobile md:text-headline-xl">Scenarios &amp; Growth</h1>
          </div>
          <ReorderToggle />
        </header>
        <Suspense fallback={<p className="text-slate-2">Loading projections…</p>}>
          <Scenarios />
        </Suspense>
      </main>
    </ReorderProvider>
  );
}

async function Scenarios() {
  await connection();
  const [d, m] = await Promise.all([getDashboard(), getDisplayMoney()]);
  const start = d.combined.valuation.mid;
  const scenarios = projectScenarios(start);
  if (start <= 0) return <ScenarioProjection start={start} scenarios={scenarios} m={m} />;
  const cards: GridCard[] = [
    { id: "summary", label: "Valuation summary", span: "col-span-full", node: <ScenarioSummary valuation={d.combined.valuation} scenarios={scenarios} m={m} /> },
    { id: "projection", label: "Projection", span: "col-span-full lg:col-span-9", node: <ScenarioProjection start={start} scenarios={scenarios} m={m} /> },
    { id: "year-ten", label: "Year 10 outcomes", span: "col-span-full lg:col-span-3", node: <YearTenOutcomes scenarios={scenarios} m={m} /> },
    { id: "assumptions", label: "Valuation context & assumptions", span: "col-span-full", node: <ScenarioAssumptions /> },
  ];
  return <ReorderableGrid cards={cards} storageKey="scenarios-card-order" />;
}
