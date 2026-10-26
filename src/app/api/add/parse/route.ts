import { parseImport } from "@/lib/add-parse";

const MAX_BYTES = 1_000_000;

/** Read a CSV (a `file` upload or pasted `text`) into review rows for the add dialog. Nothing is saved. */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const text = file instanceof File ? (file.size > MAX_BYTES ? null : await file.text()) : form.get("text");
  if (text === null) return Response.json({ error: "File is too large (1 MB max)" }, { status: 413 });
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "Missing file" }, { status: 400 });
  try {
    return Response.json(await parseImport(text));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
