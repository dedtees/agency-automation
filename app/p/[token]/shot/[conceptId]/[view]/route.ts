// Screenshot of the concept's real WordPress theme (made by `npm run wp:smoke --
// --shots $STORAGE_DIR/previews`, or committed under previews/). Only for an approved concept of the client
// whose portal token this is.
import { readFile } from "node:fs/promises";
import { db } from "@/core/db";
import { themeSlug } from "@/integrations/templates/wp/theme";
import { findPreview, PREVIEW_VIEWS } from "@/research/previews";
import { resolvePortal } from "@/services/portal";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; conceptId: string; view: string }> }) {
  const { token, conceptId, view } = await params;
  if (!(PREVIEW_VIEWS as readonly string[]).includes(view)) return new Response("Not found", { status: 404 });
  try {
    const { clientId } = await resolvePortal(db, token);
    const c = await db.concept.findFirst({ where: { id: conceptId, clientId, status: "APPROVED" }, include: { client: true } });
    if (!c) return new Response("Not found", { status: 404 });
    const file = findPreview(themeSlug(c), view as (typeof PREVIEW_VIEWS)[number]);
    if (!file) return new Response("Not found", { status: 404 });
    const img = await readFile(file);
    return new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=300" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
