// TCGCSV doesn't allow cross-origin requests, so the browser's price sync reaches it through here. Only paths under the
// Pokémon category are forwarded, and nothing is stored: the server keeps no data of its own.
const UPSTREAM = "https://tcgcsv.com/tcgplayer/3";
const USER_AGENT = "collection-tracker (+https://github.com/JakeDeFord/collection-tracker)";
const SEGMENT = /^[A-Za-z0-9_-]+$/;

export async function GET(_req: Request, ctx: RouteContext<"/api/tcgcsv/[...path]">) {
  const { path } = await ctx.params;
  if (!path.length || path.length > 3 || !path.every((s) => SEGMENT.test(s))) {
    return Response.json({ success: false, errors: ["Invalid path"], results: [] }, { status: 400 });
  }
  try {
    const res = await fetch(`${UPSTREAM}/${path.join("/")}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    return new Response(res.body, {
      status: res.status,
      // TCGCSV refreshes once a day; let the browser reuse a response for an hour.
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return Response.json({ success: false, errors: [String(e)], results: [] }, { status: 502 });
  }
}
