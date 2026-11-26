// Screenshot of the concept's real WordPress theme (made by `npm run wp:smoke --
// --shots $STORAGE_DIR/previews`). Only for an approved concept of the client
// whose portal token this is.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getConfig } from "@/core/config";
import { db } from "@/core/db";
import { themeSlug } from "@/integrations/templates/wp/theme";
import { resolvePortal } from "@/services/portal";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; conceptId: string; view: string }> }) {
  const { token, conceptId, view } = await params;
  if (!["desktop", "mobile", "desktop-fold"].includes(view)) return new Response("Not found", { status: 404 });
  try {
    const { clientId } = await resolvePortal(db, token);
    const c = await db.concept.findFirst({ where: { id: conceptId, clientId, status: "APPROVED" }, include: { client: true } });
    if (!c) return new Response("Not found", { status: 404 });
    const img = await readFile(join(getConfig().storageDir, "previews", `${themeSlug(c)}-${view}.jpg`));
    return new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=300" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
