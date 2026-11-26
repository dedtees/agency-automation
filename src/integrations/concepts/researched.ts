// Concept generator that writes from the client's researched profile (their
// real services, team, results, reviews and contact details) instead of
// placeholder copy. Falls back to the starter library when no profile exists.
//
// Each "direction" is a different design AND a different information
// architecture, so the client compares two real options rather than two
// colour swaps of one page.
import { parseProfile, type ClientProfile } from "../../research/profile";
import { libraryGenerator } from "./library";
import type { ConceptDraft, ConceptGenerator, SectionDraft } from "./types";

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
const maps = (p: ClientProfile) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address.mapsQuery ?? `${p.address.street}, ${p.address.city}, ${p.address.state} ${p.address.zip}`)}`;
const initials = (name: string) => name.replace(/,.*$/, "").split(/\s+/).filter((w) => /^[A-Z]/.test(w) && !/^(Jr|Sr|II|III)\.?$/.test(w)).map((w) => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join("");

function common(p: ClientProfile) {
  const all = p.serviceGroups.flatMap((g) => g.groups.map((x) => x.name));
  return {
    contact: {
      heading: "Talk to an attorney",
      intro: "Free initial consultation. Call, email, or stop by the office.",
      phone: p.phone, phoneHref: tel(p.phone), fax: p.fax, email: p.email,
      address: `${p.address.street}, ${p.address.city}, ${p.address.state} ${p.address.zip}`,
      addressNote: p.address.note, mapsUrl: maps(p),
      languages: p.languages.length > 1 ? `Se habla español` : undefined,
      payment: p.payments, disclaimer: p.disclaimer,
      form: ["Name", "Email", "Phone", "How can we help?"],
    },
    footer: {
      legalName: p.legalName, address: `${p.address.street}, ${p.address.city}, ${p.address.state} ${p.address.zip}`,
      phone: p.phone, email: p.email, serviceArea: p.serviceArea, disclaimer: p.disclaimer, social: p.social,
      links: [{ label: "Practice areas", href: "#practice-areas" }, { label: "Attorneys", href: "#attorneys" }, { label: "Results", href: "#results" }, { label: "Contact", href: "#contact" }],
    },
    practiceCount: all.length,
  };
}

function heritage(p: ClientProfile): ConceptDraft {
  const c = common(p);
  const sections: SectionDraft[] = [
    { kind: "HERO", title: "Hero", content: {
      eyebrow: `${p.address.city}, ${p.address.state} · ${p.serviceArea ?? ""}`.replace(/ · $/, ""),
      headline: p.tagline ?? p.shortName, subhead: p.summary,
      primaryCta: { label: `Free consultation: ${p.phone}`, href: tel(p.phone) },
      secondaryCta: p.payments ? { label: p.payments.label, href: p.payments.url } : undefined,
    } },
    { kind: "RESULTS", title: "Results", content: { heading: "Recent results", items: p.results.slice(0, 4), disclaimer: "Prior results do not guarantee a similar outcome." } },
    { kind: "SERVICES", title: "Practice areas", content: {
      heading: "Practice areas", intro: `${c.practiceCount} practice groups, one firm. Every matter is handled by attorneys who focus on that area.`,
      groups: p.serviceGroups.map((g) => ({ audience: g.audience, items: g.groups.map((x) => ({ name: x.name, blurb: x.blurb })) })),
    } },
    { kind: "ABOUT", title: "About the firm", content: { heading: "About the firm", paragraphs: p.about, stats: p.stats } },
    { kind: "TEAM", title: "Attorneys", content: { heading: "Our attorneys", members: p.team.map((m) => ({ ...m, initials: initials(m.name) })) } },
    { kind: "TESTIMONIALS", title: "Client testimonials", content: { heading: "What clients say", quotes: p.testimonials } },
    { kind: "CONTACT", title: "Contact", content: c.contact },
    { kind: "FOOTER", title: "Footer", content: c.footer },
  ];
  return {
    name: "Heritage", templateKey: "law-heritage",
    styleDirection: "Traditional and authoritative: navy and brass, serif headlines, results up front. Feels like the courthouse across the street.",
    palette: { primary: "#1D3557", secondary: "#14213D", accent: "#C9A86A", background: "#FFFFFF", text: "#1B1F2A" },
    sections,
  };
}

function modern(p: ClientProfile): ConceptDraft {
  const c = common(p);
  const sections: SectionDraft[] = [
    { kind: "HERO", title: "Hero", content: {
      eyebrow: p.shortName,
      headline: "How can we help?",
      subhead: `${p.industry === "Law firm" ? "Attorneys" : "Advisors"} for businesses, municipalities and families across ${p.serviceArea ? p.serviceArea[0].toLowerCase() + p.serviceArea.slice(1) : "the region"}. Free first consultation.`,
      primaryCta: { label: `Call ${p.phone}`, href: tel(p.phone) },
      secondaryCta: { label: "Email us", href: `mailto:${p.email ?? ""}` },
      audienceLinks: p.serviceGroups.map((g) => ({ label: g.audience, href: "#practice-areas", blurb: g.groups.slice(0, 3).map((x) => x.name).join(" · ") })),
    } },
    { kind: "SERVICES", title: "Practice areas", content: {
      heading: "Find the right attorney", intro: "Choose the area closest to your situation. Not sure? Call and we'll point you to the right person.",
      groups: p.serviceGroups.map((g) => ({ audience: g.audience, items: g.groups.map((x) => ({ name: x.name, blurb: x.blurb })) })),
    } },
    { kind: "RESULTS", title: "Results", content: { heading: "Serious results in serious cases", items: p.results.slice(0, 6), disclaimer: "Prior results do not guarantee a similar outcome." } },
    { kind: "TESTIMONIALS", title: "Client testimonials", content: { heading: "Clients in their own words", quotes: p.testimonials } },
    { kind: "TEAM", title: "Attorneys", content: { heading: `${p.team.length} attorneys, one team`, members: p.team.map((m) => ({ ...m, initials: initials(m.name) })) } },
    { kind: "ABOUT", title: "About the firm", content: { heading: `Why ${p.shortName}`, paragraphs: p.about.slice(0, 2), stats: p.stats } },
    { kind: "CONTACT", title: "Contact", content: { ...c.contact, heading: "Get a free consultation" } },
    { kind: "FOOTER", title: "Footer", content: c.footer },
  ];
  return {
    name: "Modern Counsel", templateKey: "law-modern",
    styleDirection: "Clean and task-first: deep teal with an amber call button, plain-English headings, practice-area finder at the top. Built for people on their phone looking for help today.",
    palette: { primary: "#0B4F5C", secondary: "#0F172A", accent: "#F2A93B", background: "#FFFFFF", text: "#0F172A" },
    sections,
  };
}

const DIRECTIONS = [heritage, modern];

export const researchedGenerator: ConceptGenerator = {
  id: "researched",
  async generate(brief, count) {
    const profile = parseProfile(brief.profile);
    if (!profile) return libraryGenerator.generate(brief, count);
    return DIRECTIONS.slice(0, Math.max(1, Math.min(count, DIRECTIONS.length))).map((d) => d(profile));
  },
};
