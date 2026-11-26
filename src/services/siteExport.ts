// Serves a concept's exported static site (previews/sites/<slug>/, made by
// scripts/site-preview.ts) page by page under any URL prefix. Pages link
// relative to their own folder, so each page gets a <base> for its prefix.
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".json": "application/json",
};

export const siteNotFound = () => new Response("Not found", { status: 404 });

/** `prefix` is the URL the site root is served at, ending in "/". */
export async function serveSiteFile(root: string, path: string[], prefix: string): Promise<Response> {
  if (path.some((s) => !s || s === "." || s === ".." || s.includes("\\") || s.includes("\0"))) return siteNotFound();
  let file = resolve(root, ...path);
  if (file !== root && !file.startsWith(root + sep)) return siteNotFound();
  const st = await stat(file).catch(() => null);
  if (!st) return siteNotFound();
  const isPage = st.isDirectory();
  if (isPage) file = join(file, "index.html");
  const type = TYPES[extname(file).toLowerCase()];
  if (!type) return siteNotFound();
  const raw = await readFile(file).catch(() => null);
  if (!raw) return siteNotFound();
  let body: BodyInit = new Uint8Array(raw);
  if (isPage) {
    const base = `${prefix}${path.map(encodeURIComponent).join("/")}${path.length ? "/" : ""}`;
    body = raw.toString("utf8").replace(/<head([^>]*)>/i, `<head$1><base href="${base}"><meta name="robots" content="noindex">`);
  }
  return new Response(body, { headers: { "content-type": type, "cache-control": "private, max-age=300", "x-robots-tag": "noindex" } });
}

/** The preview's contact form posts here; land on the thank-you page without sending anything. */
export const siteFormRedirect = (prefix: string) => new Response(null, { status: 303, headers: { location: `${prefix}contact/thank-you/` } });
