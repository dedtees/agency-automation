// Content for a complete law-firm website (case-studies/<slug>/site/content.json,
// made by build_content.py from the firm's current site).

export interface Practice {
  slug: string;
  name: string;
  audience: "business" | "individual";
  icon: string;
  image: string; // relative to the site assets dir, e.g. photos/x.jpg
  blurb: string;
  intro: string[];
  handles: string[];
  sections: { title: string; paragraphs: string[]; bullets: string[] }[];
  attorneys: string[];
  source: string[];
}

export interface Attorney {
  slug: string;
  name: string;
  role: string;
  email: string;
  bio: string[];
  facts: Partial<Record<"education" | "admissions" | "memberships" | "appointments" | "matters", string[]>>;
  photo: string | null;
  practices: string[];
}

export interface Result { figure: string; label: string; practice: string; attorneys: string[]; summary: string; source: string }
export interface Testimonial { author: string; matter: string; attorney: string; quote: string; story: string[] }
export interface Photo { file: string; title: string; artist: string; license: string; source: string; placeholder: boolean }

export interface SiteContent {
  firm: {
    legalName: string;
    shortName: string;
    tagline: string;
    summary: string;
    phone: string;
    fax?: string;
    email: string;
    address: { street: string; city: string; state: string; zip: string; note?: string; mapsQuery?: string };
    serviceArea?: string;
    languages: string[];
    about: string[];
    stats: { value: string; label: string }[];
    payments?: { label: string; url: string; note?: string };
    social: { label: string; href: string }[];
    disclaimer: string;
    hours: string | null;
  };
  practices: Practice[];
  attorneys: Attorney[];
  results: Result[];
  recognition: { title: string; detail: string }[];
  testimonials: Testimonial[];
  decisions: string[];
  photos: Photo[];
  copyEdits: string[];
  toConfirm: string[];
}

export type DesignId = "heritage" | "modern";
