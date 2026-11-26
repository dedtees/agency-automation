// Real template builder: turns a concept into an installable WordPress block
// theme (see wp/theme.ts), writes the unpacked theme to
// STORAGE_DIR/themes/<slug>/ for previews and QA, and the zip to
// STORAGE_DIR/packages/ for sale. Download links are signed and expire.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getConfig } from "../../core/config";
import { signedDownloadUrl } from "../../services/downloads";
import type { TemplateBuilder } from "./types";
import { renderTheme } from "./wp/theme";
import { createZip } from "./zip";

export const wpBlockThemeBuilder: TemplateBuilder = {
  id: "wp-block-theme",
  async build(concept) {
    const cfg = getConfig();
    const theme = renderTheme(concept, { agencyName: cfg.agencyName });
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
