// The concept's full website, clickable page by page (see services/siteExport).
// Only for an approved concept of the client whose portal token this is. The
// contact form lands on the thank-you page, so the client can try it without
// anything being sent.
import { db } from "@/core/db";
import { themeSlug } from "@/integrations/templates/wp/theme";
import { findSiteDir } from "@/research/previews";
import { resolvePortal } from "@/services/portal";
import { serveSiteFile, siteFormRedirect, siteNotFound } from "@/services/siteExport";

type Params = { params: Promise<{ token: string; conceptId: string; path?: string[] }> };

async function siteFor(token: string, conceptId: string) {
  const { clientId } = await resolvePortal(db, token);
  const c = await db.concept.findFirst({ where: { id: conceptId, clientId, status: "APPROVED" }, include: { client: true } });
  return c ? findSiteDir(themeSlug(c)) : undefined;
}

export async function GET(_req: Request, { params }: Params) {
  const { token, conceptId, path = [] } = await params;
  try {
    const root = await siteFor(token, conceptId);
    return root ? await serveSiteFile(root, path, `/p/${token}/site/${conceptId}/`) : siteNotFound();
  } catch {
    return siteNotFound();
  }
}

export async function POST(_req: Request, { params }: Params) {
  const { token, conceptId } = await params;
  try {
    return (await siteFor(token, conceptId)) ? siteFormRedirect(`/p/${token}/site/${conceptId}/`) : siteNotFound();
  } catch {
    return siteNotFound();
  }
}
