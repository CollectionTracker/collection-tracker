"use client";

import Image from "next/image";
import { type ReactNode, createContext, useCallback, useContext, useState } from "react";
import type { AssetDetail } from "@/lib/asset-detail";
import { type Money, money, pct, signedMoney, tone } from "@/lib/format";
import { ExportLink } from "./export-link";
import { InspectDialog } from "./inspect-dialog";
import { MetricTile as Tile } from "./metric-tile";

type Shown = { asset: AssetDetail; m: Money };

const SheetContext = createContext<((shown: Shown) => void) | null>(null);

/** One asset detail sheet for every holding row inside it; rows open it with <AssetButton>. */
export function AssetSheetProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  // Keep the last asset after closing so the sheet does not empty while the browser finishes closing it.
  const [last, setLast] = useState<Shown | null>(null);
  const show = useCallback((next: Shown) => {
    setShown(next);
    setLast(next);
  }, []);
  const view = shown ?? last;
  return (
    <SheetContext value={show}>
      {children}
      <InspectDialog
        open={shown != null}
        title={view?.asset.name ?? ""}
        subtitle={view?.asset.meta.join(" · ")}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-mint motion-safe:animate-pulse" />
            Position telemetry
          </span>
        }
        footer={view?.asset.kind}
        actions={view && <ExportLink href={view.asset.exportHref} />}
        width="sm:max-w-lg"
        onClose={() => setShown(null)}
      >
        {view && <AssetTelemetry a={view.asset} m={view.m} />}
      </InspectDialog>
    </SheetContext>
  );
}

/** Makes a holding row a button that opens its asset detail sheet. */
export function AssetButton({ asset, m, className, children }: { asset: AssetDetail; m: Money; className?: string; children: ReactNode }) {
  const show = useContext(SheetContext);
  if (!show) throw new Error("Wrap asset rows in <AssetSheetProvider>");
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => show({ asset, m })}
      className={`w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function AssetTelemetry({ a, m }: { a: AssetDetail; m: Money }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        {a.image && <Image src={a.image} alt="" width={72} height={100} className="shrink-0 rounded-lg" />}
        <div className="min-w-0">
          <div className="text-[32px] font-bold leading-[38px] tracking-[-0.02em] text-mint tabular-nums">{money(a.range.mid, m)}</div>
          <div className="mt-1 text-xs text-slate-2 tabular-nums">
            {a.quantity} × {money(a.unit, m)}
            {a.sharePct != null && ` · ${a.sharePct.toFixed(1)}% of portfolio`}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Low" value={money(a.range.low, m)} sub="Quick-sale estimate" />
        <Tile label="High" value={money(a.range.high, m)} sub="Patient-sale estimate" />
        <Tile label="Cost basis" value={a.cost == null ? "—" : money(a.cost, m)} sub={a.cost == null ? "No purchase price" : undefined} />
        <Tile
          label="Gain / loss"
          value={a.gain == null ? "—" : signedMoney(a.gain, m)}
          valueTone={a.gain == null ? undefined : tone(a.gain)}
          sub={a.gainPct == null ? undefined : `${pct(a.gainPct)} on cost`}
        />
        {a.change != null && (
          <div className="col-span-2">
            <Tile
              label="Since last snapshot"
              value={signedMoney(a.change, m)}
              valueTone={tone(a.change)}
              sub={a.changePct ? pct(a.changePct) : undefined}
            />
          </div>
        )}
      </div>
      <p className="rounded-lg bg-inset p-3 text-xs leading-relaxed text-slate-2">
        The midpoint is the latest market price for the whole stack; low and high are an estimate around it, not guaranteed sale
        proceeds. Selling fees, taxes and shipping are not deducted.
      </p>
    </div>
  );
}
