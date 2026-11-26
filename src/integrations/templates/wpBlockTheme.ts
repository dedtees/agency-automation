// Real template builder: turns a concept into an installable WordPress block
// theme (see wp/theme.ts), writes the unpacked theme to
// STORAGE_DIR/themes/<slug>/ for previews and QA, and the zip to
// STORAGE_DIR/packages/ for sale. Clients with a researched site folder get
// the full multi-page law firm site (src/sites/lawFirm) instead. Download links are signed and expire.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getConfig } from "../../core/config";
import { signedDownloadUrl } from "../../services/downloads";
import type { TemplateBuilder } from "./types";
import { parseProfile } from "../../research/profile";
import { buildLawFirmTheme, hasSiteContent } from "../../sites/lawFirm/load";
import { renderTheme, themeSlug } from "./wp/theme";
import { createZip } from "./zip";

export const wpBlockThemeBuilder: TemplateBuilder = {
  id: "wp-block-theme",
  async build(concept) {
    const cfg = getConfig();
    // A client with a researched full site (real pages, photos, attorneys, form)
    // gets that; everyone else gets the section-based starter theme.
    const siteDir = parseProfile(concept.client.profile)?.siteContent;
    const full = hasSiteContent(siteDir && join(process.cwd(), siteDir)) && /heritage|modern/.test(concept.templateKey);
    const theme = full
      ? buildLawFirmTheme(join(process.cwd(), siteDir!), concept.templateKey.includes("heritage") ? "heritage" : "modern", themeSlug(concept), { agencyName: cfg.agencyName })
      : renderTheme(concept, { agencyName: cfg.agencyName });
    const themeDir = join(cfg.storageDir, "themes", theme.slug);
    await rm(themeDir, { recursive: true, force: true });
    for (const [rel, content] of Object.entries(theme.files)) {
      await mkdir(dirname(join(themeDir, rel)), { recursive: true });
      await writeFile(join(themeDir, rel), content);
    }
    const zipName = `${theme.slug}-${concept.id.slice(-8)}.zip`;
    await mkdir(join(cfg.storageDir, "packages"), { recursive: true });
    await writeFile(join(cfg.storageDir, "packages", zipName), createZip(Object.entries(theme.files).map(([rel, data]) => ({ name: `${theme.slug}/${rel}`, data }))));
    return { previewUrl: `${cfg.appUrl}/admin/preview/${concept.id}`, packagePath: `packages/${zipName}` };
  },
  async downloadUrl(packagePath, ttlSeconds) {
    return signedDownloadUrl(packagePath, ttlSeconds);
  },
};
