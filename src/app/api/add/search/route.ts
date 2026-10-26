import { recentAdds, suggest } from "@/lib/add-search";
import type { SuggestionKind } from "@/lib/add-types";

const KINDS: SuggestionKind[] = ["all", "card", "sealed"];

/** Autocomplete for the add dialog: `?q=<text>&kind=all|card|sealed`; an empty `q` returns the last items added. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const kind = KINDS.find((k) => k === params.get("kind")) ?? "all";
  try {
    return Response.json({ suggestions: q ? await suggest(q, kind) : await recentAdds(), recent: !q });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
