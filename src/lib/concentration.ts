/** A single holding above this share of the portfolio is flagged as a concentration risk. */
export const CONCENTRATION_WARNING_PCT = 25;

export type Largest = {
  name: string;
  kind: "Raw card" | "Sealed";
  value: number;
  pct: number;
};

/** The most valuable single holding (a whole stack) across raw cards and sealed, as a share of `total`. */
export function largestHolding(
  raw: { name: string; value: number }[],
  sealed: { name: string; value: number }[],
  total: number,
): Largest | null {
  const all = [
    ...raw.map((h) => ({ ...h, kind: "Raw card" as const })),
    ...sealed.map((h) => ({ ...h, kind: "Sealed" as const })),
  ];
  const top = all.reduce<(typeof all)[number] | null>(
    (a, h) => (!a || h.value > a.value ? h : a),
    null,
  );
  if (!top || top.value <= 0 || total <= 0) return null;
  return {
    name: top.name,
    kind: top.kind,
    value: top.value,
    pct: (top.value / total) * 100,
  };
}
