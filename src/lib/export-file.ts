import { getDisplayMoney } from "./currency-pref";
import { exportFilename, holdingRows, parseExportTarget, toCsv } from "./export";
import { listSnapshots, pickSnapshot } from "./snapshots";
import { getDashboard } from "./stats";

/**
 * CSV of holdings in the visitor's display currency for an export query (see `exportHref`): `?scope=portfolio|raw|sealed`
 * for a scope, or `?raw=<entry id>` / `?sealed=<product id>` for one holding. `?snapshot=YYYY-MM-DD` exports as of a
 * snapshot day, else current prices.
 */
export async function buildExport(query: string): Promise<{ filename: string; csv: string }> {
  const params = new URLSearchParams(query);
  const target = parseExportTarget(params);
  if (!target) throw new Error("Unknown export scope");

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
    if (!one) throw new Error("Holding not found");
    what = `holding-${one.name}`;
  }

  const day = asOf ?? snapshots[0]?.day ?? new Date().toISOString().slice(0, 10);
  return { filename: exportFilename(what, day, m), csv: toCsv(holdingRows(raw, sealed, m, d.combined.value, day)) };
}
