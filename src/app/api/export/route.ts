import type { NextRequest } from "next/server";
import { getDisplayMoney } from "@/lib/currency-pref";
import { exportFilename, holdingRows, parseExportTarget, toCsv } from "@/lib/export";
import { listSnapshots, pickSnapshot } from "@/lib/snapshots";
import { getDashboard } from "@/lib/stats";

/**
 * CSV of holdings in the visitor's display currency: `?scope=portfolio|raw|sealed` for a scope, or `?raw=<entry id>` /
 * `?sealed=<product id>` for one holding. `?snapshot=YYYY-MM-DD` exports as of a snapshot day, else current prices.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const target = parseExportTarget(params);
  if (!target) return Response.json({ error: "Unknown export scope" }, { status: 400 });

  const snapshots = await listSnapshots();
  const asOf = pickSnapshot(params.get("snapshot") ?? undefined, snapshots);
  const [d, m] = await Promise.all([getDashboard(asOf), getDisplayMoney(asOf ?? undefined)]);

  let raw = d.holdings;
  let sealed = d.sealed.holdings;
  let what: string;
  if ("scope" in target) {
    if (target.scope === "raw") sealed = [];
    if (target.scope === "sealed") raw = [];
    what = target.scope;
  } else {
    raw = "raw" in target ? raw.filter((h) => h.id === target.raw) : [];
    sealed = "sealed" in target ? sealed.filter((h) => h.id === target.sealed) : [];
    const one = raw[0] ?? sealed[0];
    if (!one) return Response.json({ error: "Holding not found" }, { status: 404 });
    what = `holding-${one.name}`;
  }

  const day = asOf ?? snapshots[0]?.day ?? new Date().toISOString().slice(0, 10);
  return new Response(toCsv(holdingRows(raw, sealed, m, d.combined.value, day)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(what, day, m)}"`,
      "Cache-Control": "no-store",
    },
  });
}
