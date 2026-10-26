"use client";

import { useData } from "@/components/data-provider";
import { type GridCard, ReorderableGrid } from "@/components/reorderable-grid";
import { ScenarioAssumptions } from "@/components/scenario-assumptions";
import { ScenarioProjection } from "@/components/scenario-projection";
import { ScenarioSummary } from "@/components/scenario-summary";
import { YearTenOutcomes } from "@/components/year-ten-outcomes";
import { getDisplayMoney } from "@/lib/currency-pref";
import { projectScenarios } from "@/lib/scenarios";
import { getDashboard } from "@/lib/stats";

export function Scenarios() {
  const [d, m] = useData(["scenarios"], () => Promise.all([getDashboard(), getDisplayMoney()]));
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
