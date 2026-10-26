export const tileLabel = "font-label text-label-eyebrow uppercase text-slate-2";

/** One labelled figure on an inset tile, as used by the detail inspection and asset sheets. */
export function MetricTile({ label, value, sub, valueTone }: { label: string; value: string; sub?: string; valueTone?: string }) {
  return (
    <div className="inset-well rounded-xl p-4">
      <div className={tileLabel}>{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${valueTone ?? ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-body-sm text-slate-2">{sub}</div>}
    </div>
  );
}
