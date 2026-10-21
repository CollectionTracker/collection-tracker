import { importCsv } from "@/lib/import";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Missing file" }, { status: 400 });
  try {
    return Response.json(await importCsv(await file.text()));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
