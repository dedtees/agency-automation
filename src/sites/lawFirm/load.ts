// Reads a site content folder (content.json + assets/) and the bundled fonts,
// and renders the theme. Kept apart from theme.ts so that stays pure.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { DESIGNS } from "./designs";
import { renderLawFirmTheme, type LawFirmTheme } from "./theme";
import type { DesignId, SiteContent } from "./types";

export const FONTS_DIR = join(process.cwd(), "src/sites/lawFirm/fonts");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}

export function loadSiteContent(dir: string): SiteContent {
  return JSON.parse(readFileSync(join(dir, "content.json"), "utf8"));
}

export function hasSiteContent(dir: string | undefined | null): dir is string {
  return !!dir && existsSync(join(dir, "content.json"));
}

export function buildLawFirmTheme(dir: string, design: DesignId, slug: string, opts: { agencyName?: string; version?: string } = {}): LawFirmTheme {
  const content = loadSiteContent(dir);
  const assetsDir = join(dir, "assets");
  const used = new Set([...content.practices.map((p) => p.image), ...content.attorneys.flatMap((a) => (a.photo ? [a.photo] : [])), ...content.photos.map((p) => p.file)]);
  const assets: Record<string, Buffer> = {};
  for (const f of walk(assetsDir)) {
    const rel = relative(assetsDir, f).replace(/\\/g, "/");
    if (used.has(rel) || rel.startsWith("photos/")) assets[rel] = readFileSync(f);
  }
  const fonts: Record<string, Buffer> = {};
  for (const face of DESIGNS[design].fonts.faces) fonts[face.file] = readFileSync(join(FONTS_DIR, face.file));
  return renderLawFirmTheme({ content, design, slug, assets, fonts, ...opts });
}
