// The concept's full website, clickable page by page: a static export of the
// real WordPress theme (made by scripts/site-preview.ts, committed under
// previews/sites/<slug>/). Only for an approved concept of the client whose
// portal token this is. The contact form posts here and lands on the
// thank-you page, so the client can try it without anything being sent.
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { db } from "@/core/db";
import { themeSlug } from "@/integrations/templates/wp/theme";
import { findSiteDir } from "@/research/previews";
import { resolvePortal } from "@/services/portal";

type Params = { params: Promise<{ token: string; conceptId: string; path?: string[] }> };

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".json": "application/json",
};
const notFound = () => new Response("Not found", { status: 404 });

async function siteFor(token: string, conceptId: string) {
  const { clientId } = await resolvePortal(db, token);
  const c = await db.concept.findFirst({ where: { id: conceptId, clientId, status: "APPROVED" }, include: { client: true } });
  return c ? findSiteDir(themeSlug(c)) : undefined;
}

export async function GET(_req: Request, { params }: Params) {
  const { token, conceptId, path = [] } = await params;
  if (path.some((s) => !s || s === "." || s === ".." || s.includes("\\") || s.includes("\0"))) return notFound();
  try {
    const root = await siteFor(token, conceptId);
    if (!root) return notFound();
    let file = resolve(root, ...path);
    if (file !== root && !file.startsWith(root + sep)) return notFound();
    const st = await stat(file).catch(() => null);
    if (!st) return notFound();
    const isPage = st.isDirectory();
    if (isPage) file = join(file, "index.html");
    const type = TYPES[extname(file).toLowerCase()];
    if (!type) return notFound();
    const raw = await readFile(file);
    let body: BodyInit = new Uint8Array(raw);
    if (isPage) {
      // Pages use links relative to their own folder; a <base> keeps them right
      // whether or not the browser kept the trailing slash.
      const base = `/p/${token}/site/${conceptId}/${path.map(encodeURIComponent).join("/")}${path.length ? "/" : ""}`;
      body = raw.toString("utf8").replace(/<head([^>]*)>/i, `<head$1><base href="${base}"><meta name="robots" content="noindex">`);
    }
    return new Response(body, { headers: { "content-type": type, "cache-control": "private, max-age=300", "x-robots-tag": "noindex" } });
  } catch {
    return notFound();
  }
}

export async function POST(_req: Request, { params }: Params) {
  const { token, conceptId } = await params;
  try {
    if (!(await siteFor(token, conceptId))) return notFound();
  } catch {
    return notFound();
  }
  return new Response(null, { status: 303, headers: { location: `/p/${token}/site/${conceptId}/contact/thank-you/` } });
}
