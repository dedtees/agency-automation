// GET /downloads?f=<package>.zip&exp=<unix>&sig=<hmac> — purchased theme zips.
import { readFile } from "node:fs/promises";
import { verifyDownload } from "@/services/downloads";

export async function GET(req: Request) {
  const path = verifyDownload(new URL(req.url).searchParams);
  if (!path) return new Response("This download link is invalid or has expired.", { status: 403 });
  try {
    const data = await readFile(path);
    const name = path.split("/").pop()!;
    return new Response(data, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}"`, "cache-control": "private, no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
