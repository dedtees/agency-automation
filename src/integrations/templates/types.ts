// Turns an approved concept into something viewable and sellable:
// a preview URL for the portal and a WordPress theme package (.zip).
export interface BuiltTemplate {
  previewUrl: string;
  packagePath: string; // local path or object-storage key of the theme zip
}

export interface ConceptForBuild {
  id: string;
  name: string;
  templateKey: string;
  palette: unknown;
  sections: { kind: string; title: string; position: number; content: unknown }[];
  client: { businessName: string };
}

export interface TemplateBuilder {
  id: string;
  build(concept: ConceptForBuild): Promise<BuiltTemplate>;
  /** Short-lived download link for a purchased template. */
  downloadUrl(packagePath: string, ttlSeconds: number): Promise<string>;
}
