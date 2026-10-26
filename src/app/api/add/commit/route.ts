import { commitInput, commitItems } from "@/lib/add-commit";

/** Save the add dialog's review list to the collection. */
export async function POST(req: Request) {
  const parsed = commitInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid items" }, { status: 400 });
  try {
    return Response.json(await commitItems(parsed.data));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
