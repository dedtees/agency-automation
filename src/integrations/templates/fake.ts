// Placeholder: the portal renders the concept itself from section data, so the
// "preview" is an in-app route. Real version: generate a WordPress block theme
// (theme.json + patterns per section), zip it, upload to storage, and stand up a
// preview on a staging WordPress install.
import { getConfig } from "../../core/config";
import type { TemplateBuilder } from "./types";

export const fakeTemplateBuilder: TemplateBuilder = {
  id: "fake",
  async build(concept) {
    return {
      previewUrl: `${getConfig().appUrl}/admin/preview/${concept.id}`,
      packagePath: `packages/${concept.id}.zip`,
    };
  },
  async downloadUrl(packagePath) {
    return `${getConfig().appUrl}/downloads/${encodeURIComponent(packagePath)}?stub=1`;
  },
};
