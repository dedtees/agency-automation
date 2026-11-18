import type { SectionKind } from "../../core/types";

export interface ClientBrief {
  businessName: string;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  notes?: string | null;
}

export interface SectionDraft {
  kind: SectionKind;
  title: string;
  content: Record<string, unknown>; // headline, body, bullets, image prompts...
}

export interface ConceptDraft {
  name: string;
  templateKey: string;
  styleDirection: string;
  palette: { primary: string; secondary: string; accent: string; background: string; text: string };
  sections: SectionDraft[];
}

/** Produces N distinct website concepts for a client. */
export interface ConceptGenerator {
  id: string;
  generate(brief: ClientBrief, count: number): Promise<ConceptDraft[]>;
}
