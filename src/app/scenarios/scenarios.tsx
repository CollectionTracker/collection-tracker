"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/data-provider";
import { type GridCard, ReorderableGrid } from "@/components/reorderable-grid";
import { ScenarioAssumptions } from "@/components/scenario-assumptions";
import { ScenarioProjection } from "@/components/scenario-projection";
import { ScenarioRisk } from "@/components/scenario-risk";
import { ScenarioSummary } from "@/components/scenario-summary";
import { YearTenOutcomes } from "@/components/year-ten-outcomes";
import { getDisplayMoney } from "@/lib/currency-pref";
import { DEFAULT_BASIS, projectScenarios, scenarioOnBasis } from "@/lib/scenarios";
import { bandsOnBasis, herfindahl, simulate } from "@/lib/simulation";
import { getDashboard } from "@/lib/stats";

export function Scenarios() {
  const [d, m] = useData(["scenarios"], () => Promise.all([getDashboard(), getDisplayMoney()]));
  const [basis, setBasis] = useState(DEFAULT_BASIS);
  const start = d.combined.valuation.mid;
  const { scenarios, simulation } = useMemo(() => {
    const segments = { raw: d.rawValuation.mid, sealed: d.sealed.valuation.mid };
    const concentration = {
      raw: herfindahl(d.holdings.map((h) => h.value)),
      sealed: herfindahl(d.sealed.holdings.map((h) => h.value)),
    };
    return { scenarios: projectScenarios(segments), simulation: simulate(segments, concentration) };
  }, [d]);
  const shown = scenarios.map((s) => scenarioOnBasis(s, start, basis));
  const bands = bandsOnBasis(simulation.bands, basis);
  const projection = <ScenarioProjection start={start} scenarios={shown} bands={bands} basis={basis} onBasisChange={setBasis} m={m} />;
  if (start <= 0) return projection;
  // Only holdings with a known cost have a gain, so break-even scales their cost up to the whole portfolio.
  const { costBasis, gain } = d.combined;
  const pricedValue = costBasis === null || gain === null ? 0 : costBasis + gain;
  const breakeven = costBasis !== null && pricedValue > 0 ? (start * costBasis) / pricedValue : null;
  const cards: GridCard[] = [
    { id: "summary", label: "Valuation summary", span: "col-span-full", node: <ScenarioSummary valuation={d.combined.valuation} bands={bands} basis={basis} m={m} /> },
    { id: "projection", label: "Projection", span: "col-span-full lg:col-span-9", node: projection },
    { id: "year-ten", label: "Year 10 stress tests", span: "col-span-full lg:col-span-3", node: <YearTenOutcomes scenarios={shown} m={m} /> },
    { id: "risk", label: "Simulated chances", span: "col-span-full", node: <ScenarioRisk simulation={simulation} start={start} breakeven={breakeven} basis={basis} /> },
    { id: "assumptions", label: "Valuation context & assumptions", span: "col-span-full", node: <ScenarioAssumptions /> },
  ];
  return <ReorderableGrid cards={cards} storageKey="scenarios-card-order" />;
}
