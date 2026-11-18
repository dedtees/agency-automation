// Deterministic generator: picks from a small library of starter layouts and
// fills placeholder copy. Good enough to exercise the whole pipeline.
// Replace/augment with an AI generator (e.g. Claude writing copy per section).
import type { ConceptDraft, ConceptGenerator, SectionDraft, ClientBrief } from "./types";

const STARTERS: Omit<ConceptDraft, "sections">[] = [
  { name: "Clean & Local", templateKey: "starter-clean", styleDirection: "Bright, lots of white space, friendly local-business tone",
    palette: { primary: "#1F6FEB", secondary: "#0B2545", accent: "#F4A259", background: "#FFFFFF", text: "#1B1B1B" } },
  { name: "Bold & Modern", templateKey: "starter-bold", styleDirection: "Dark hero, big type, confident tone",
    palette: { primary: "#E63946", secondary: "#111111", accent: "#F1FAEE", background: "#FAFAFA", text: "#111111" } },
  { name: "Warm & Trusted", templateKey: "starter-warm", styleDirection: "Earthy palette, photography-led, testimonials up front",
    palette: { primary: "#6B705C", secondary: "#3F4238", accent: "#CB997E", background: "#FFF8F0", text: "#2B2B2B" } },
  { name: "Minimal Pro", templateKey: "starter-minimal", styleDirection: "Monochrome, editorial, services-first",
    palette: { primary: "#222222", secondary: "#555555", accent: "#00A896", background: "#FFFFFF", text: "#222222" } },
];

function sections(b: ClientBrief, variant: number): SectionDraft[] {
  const where = [b.city, b.state].filter(Boolean).join(", ") || "your area";
  const what = b.industry || "services";
  const base: SectionDraft[] = [
    { kind: "HERO", title: "Hero", content: { headline: `${b.businessName}`, subhead: `Trusted ${what} in ${where}`, cta: "Get a quote" } },
    { kind: "SERVICES", title: "Services", content: { intro: `What ${b.businessName} offers`, items: ["Service one", "Service two", "Service three"] } },
    { kind: "ABOUT", title: "About", content: { body: `${b.businessName} has served ${where} for years. [Replace with real story]` } },
    { kind: "TESTIMONIALS", title: "Testimonials", content: { quotes: ["[Customer quote]", "[Customer quote]"] } },
    { kind: "CONTACT", title: "Contact", content: { form: ["name", "email", "phone", "message"], showMap: true } },
  ];
  // Vary order a little so concepts differ structurally, not just in color.
  if (variant % 3 === 2) [base[1], base[3]] = [base[3], base[1]];
  if (variant % 2 === 1) base.splice(3, 0, { kind: "GALLERY", title: "Gallery", content: { images: 6 } });
  return base;
}

export const libraryGenerator: ConceptGenerator = {
  id: "library",
  async generate(brief, count) {
    return STARTERS.slice(0, Math.min(count, STARTERS.length)).map((s, i) => ({ ...s, sections: sections(brief, i) }));
  },
};
