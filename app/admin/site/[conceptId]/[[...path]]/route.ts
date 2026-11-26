// Owner view of a concept's full website, before or after approval (admin is
// behind basic auth in middleware.ts). Same export the client portal serves.
import { db } from "@/core/db";
import { themeSlug } from "@/integrations/templates/wp/theme";
import { findSiteDir } from "@/research/previews";
import { serveSiteFile, siteFormRedirect, siteNotFound } from "@/services/siteExport";

type Params = { params: Promise<{ conceptId: string; path?: string[] }> };

async function siteFor(conceptId: string) {
  const c = await db.concept.findUnique({ where: { id: conceptId }, include: { client: true } });
  return c ? findSiteDir(themeSlug(c)) : undefined;
}

export async function GET(_req: Request, { params }: Params) {
  const { conceptId, path = [] } = await params;
  const root = await siteFor(conceptId).catch(() => undefined);
  return root ? serveSiteFile(root, path, `/admin/site/${conceptId}/`) : siteNotFound();
}

export async function POST(_req: Request, { params }: Params) {
  const { conceptId } = await params;
  return (await siteFor(conceptId).catch(() => undefined)) ? siteFormRedirect(`/admin/site/${conceptId}/`) : siteNotFound();
}
