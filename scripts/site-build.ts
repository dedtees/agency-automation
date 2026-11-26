// Writes the full-site themes for a case study to disk (and zips them).
//   npx tsx scripts/site-build.ts case-studies/central-jersey-law/site out/themes
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildLawFirmTheme } from "../src/sites/lawFirm/load";
import { createZip } from "../src/integrations/templates/zip";
import type { DesignId } from "../src/sites/lawFirm/types";

const [dir = "case-studies/central-jersey-law/site", out = "storage/themes"] = process.argv.slice(2);
const designs: [DesignId, string][] = [["heritage", "savo-schalk-heritage"], ["modern", "savo-schalk-modern-counsel"]];
for (const [design, slug] of designs) {
  const theme = buildLawFirmTheme(dir, design, slug);
  const root = join(out, slug);
  rmSync(root, { recursive: true, force: true });
  for (const [rel, data] of Object.entries(theme.files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), data);
  }
  const zip = createZip(Object.entries(theme.files).map(([rel, data]) => ({ name: `${slug}/${rel}`, data })));
  writeFileSync(join(out, `${slug}.zip`), zip);
  console.log(`${slug}: ${Object.keys(theme.files).length} files, ${theme.pages.length} pages, ${(zip.length / 1e6).toFixed(1)} MB zip`);
}
