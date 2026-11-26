// Screenshots of a concept's real WordPress theme, made by `npm run wp:smoke -- --shots`.
// Looked up first in $STORAGE_DIR/previews (generated locally), then in the
// committed previews/ folder, which ships with the app so hosted deploys
// (Vercel has no persistent disk) can show them too.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getConfig } from "../core/config";

export const PREVIEW_VIEWS = ["desktop", "desktop-fold", "mobile"] as const;
export type PreviewView = (typeof PREVIEW_VIEWS)[number];

export function previewDirs() {
  return [join(getConfig().storageDir, "previews"), join(process.cwd(), "previews")];
}

export function findPreview(slug: string, view: PreviewView): string | undefined {
  if (!/^[a-z0-9-]+$/.test(slug)) return undefined;
  return previewDirs().map((d) => join(d, `${slug}-${view}.jpg`)).find((f) => existsSync(f));
}

/** Folder of a concept's full static site (index.html + pages), exported by scripts/site-preview.ts. */
export function findSiteDir(slug: string): string | undefined {
  if (!/^[a-z0-9-]+$/.test(slug)) return undefined;
  return previewDirs().map((d) => join(d, "sites", slug)).find((d) => existsSync(join(d, "index.html")));
}
