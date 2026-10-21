import { syncCollectionPrices } from "@/lib/sync";

// Hit daily by a scheduler (Vercel Cron, GitHub Actions, crontab...) with
// `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await syncCollectionPrices());
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
