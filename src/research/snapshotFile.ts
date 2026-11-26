// Save/load a SiteSnapshot as a folder (meta.json + home.html) so an audit can
// be re-run offline, attached to a case study, or used as a test fixture.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SiteSnapshot } from "./audit";

export function saveSnapshot(dir: string, s: SiteSnapshot) {
  mkdirSync(dir, { recursive: true });
  let restIndex: unknown = null;
  try { const j = s.restIndex ? JSON.parse(s.restIndex.body) : null; restIndex = j && { name: j.name, description: j.description, namespaces: j.namespaces }; } catch { /* not JSON */ }
  writeFileSync(join(dir, "home.html"), s.home.body);
  writeFileSync(join(dir, "meta.json"), JSON.stringify({
    url: s.url, fetchedAt: s.fetchedAt, homeStatus: s.home.status, homeHeaders: s.home.headers, restIndex,
    themeStylesheet: s.themeStylesheet, assetHeads: s.assetHeads, pages: s.pages, latestPostDate: s.latestPostDate, xmlrpcStatus: s.xmlrpcStatus,
  }, null, 2));
}

export function loadSnapshot(dir: string): SiteSnapshot {
  const m = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  return {
    url: m.url, fetchedAt: m.fetchedAt,
    home: { status: m.homeStatus, headers: m.homeHeaders, body: readFileSync(join(dir, "home.html"), "utf8") },
    restIndex: m.restIndex ? { status: 200, headers: {}, body: JSON.stringify(m.restIndex) } : null,
    themeStylesheet: m.themeStylesheet, assetHeads: m.assetHeads, pages: m.pages, latestPostDate: m.latestPostDate, xmlrpcStatus: m.xmlrpcStatus,
  };
}
