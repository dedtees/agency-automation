// Renders a concept into the files of an installable WordPress block theme:
// style.css, theme.json, functions.php, templates/, parts/ and one pattern per
// section. Pure function, no I/O, so it is easy to test.
//
// Design choices that matter for clients coming off old PHP sites:
//  - No custom PHP beyond registering a pattern category (nothing to break on PHP upgrades).
//  - No jQuery, no page builder, no external fonts or scripts: system font stacks and core blocks.
//  - Content is escaped when written, so client text can never become markup or PHP.
import { slug as slugify } from "../../../intake/tabular";
import type { ConceptForBuild } from "../types";
import { block, buttons, columns, esc, group, h, link, list, p, quote, safeUrl, type Btn } from "./blocks";

type Palette = { primary: string; secondary: string; accent: string; background: string; text: string };
type Section = ConceptForBuild["sections"][number];
type Ctx = { slug: string; name: string; business: string; variant: Variant; palette: Palette };
type Variant = "heritage" | "modern" | "starter";

export interface RenderedTheme { slug: string; name: string; files: Record<string, string> }

const TARGET = { requiresWp: "6.6", testedWp: "6.9", requiresPhp: "8.1" };

export function themeSlug(c: Pick<ConceptForBuild, "name" | "client">) {
  const words = slugify(c.client.businessName).split("-").filter(Boolean).slice(0, 2).join("-");
  return slugify(`${words} ${c.name}`).slice(0, 40) || "agency-theme";
}

const variantOf = (templateKey: string): Variant => (templateKey.includes("heritage") ? "heritage" : templateKey.includes("modern") ? "modern" : "starter");

// --- section renderers --------------------------------------------------------

const anchorFor: Record<string, string> = { SERVICES: "practice-areas", TEAM: "attorneys", RESULTS: "results", ABOUT: "about", TESTIMONIALS: "testimonials", CONTACT: "contact" };
const section = (kind: string, inner: string, extra?: string) =>
  group(inner, { tag: "section", anchor: anchorFor[kind], align: "full", className: `aa-section aa-${kind.toLowerCase()}${extra ? " " + extra : ""}` });

const text = (v: unknown) => (typeof v === "string" ? v : "");
const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function hero(c: any, ctx: Ctx) {
  const btns: Btn[] = [];
  if (c.primaryCta?.label) btns.push({ label: c.primaryCta.label, href: c.primaryCta.href ?? "#contact" });
  else if (c.cta) btns.push({ label: c.cta, href: "#contact" });
  if (c.secondaryCta?.label) btns.push({ label: c.secondaryCta.label, href: c.secondaryCta.href, outline: true });
  const audience = arr(c.audienceLinks);
  const inner = [
    c.eyebrow ? p(esc(c.eyebrow), "aa-eyebrow") : "",
    h(1, text(c.headline) || ctx.business, "aa-hero-title"),
    c.subhead ? p(esc(c.subhead), "aa-lede") : "",
    btns.length ? buttons(btns, "aa-hero-actions") : "",
    audience.length
      ? group(audience.map((a: any) => group(h(3, a.label) + p(esc(a.blurb ?? "")) + p(link("See practice areas →", a.href ?? "#practice-areas"), "aa-more"), { className: "aa-card aa-audience" })).join("\n"),
          { className: "aa-audiences", layout: { type: "grid", minimumColumnWidth: "18rem" } })
      : "",
  ].join("\n");
  return group(inner, { tag: "section", align: "full", className: "aa-hero" });
}

function services(c: any) {
  const groups = arr(c.groups);
  let body: string;
  if (groups.length) {
    body = groups.map((g: any) =>
      group(
        (g.audience ? h(3, g.audience, "aa-audience-title") : "") +
        group(arr(g.items).map((it: any) => typeof it === "string"
          ? group(h(4, it), { className: "aa-card aa-practice" })
          : group(h(4, it.name) + (it.blurb ? p(esc(it.blurb)) : ""), { className: "aa-card aa-practice" })).join("\n"),
        { layout: { type: "grid", minimumColumnWidth: "16rem" }, className: "aa-practice-grid" }),
        { className: "aa-practice-group" })).join("\n");
  } else {
    body = group(arr<string>(c.items).map((i) => group(h(4, i), { className: "aa-card aa-practice" })).join("\n"), { layout: { type: "grid", minimumColumnWidth: "16rem" } });
  }
  return section("SERVICES", [h(2, text(c.heading) || "Services"), c.intro ? p(esc(c.intro), "aa-lede") : "", body].join("\n"));
}

function results(c: any) {
  const items = arr(c.items).map((r: any) => group(p(esc(r.title), "aa-result-title") + (r.detail ? p(esc(r.detail), "aa-result-detail") : ""), { className: "aa-card aa-result" }));
  return section("RESULTS", [h(2, text(c.heading) || "Results"), group(items.join("\n"), { layout: { type: "grid", minimumColumnWidth: "17rem" } }), c.disclaimer ? p(esc(c.disclaimer), "aa-fineprint") : ""].join("\n"));
}

function about(c: any) {
  const paras = arr<string>(c.paragraphs).length ? arr<string>(c.paragraphs) : [text(c.body)];
  const stats = arr(c.stats);
  return section("ABOUT", [
    h(2, text(c.heading) || "About"),
    columns([
      paras.filter(Boolean).map((x) => p(esc(x))).join("\n"),
      stats.length ? stats.map((s: any) => p(`<strong>${esc(s.value)}</strong> ${esc(s.label)}`, "aa-stat")).join("\n") : "",
    ].filter(Boolean), "aa-about-cols"),
  ].join("\n"));
}

function team(c: any) {
  const members = arr(c.members).map((m: any) =>
    group(p(esc(m.initials ?? m.name?.[0] ?? ""), "aa-avatar") + p(`<strong>${esc(m.name)}</strong>`, "aa-member-name") + p(esc(m.role ?? ""), "aa-member-role"), { className: "aa-member" }));
  return section("TEAM", [h(2, text(c.heading) || "Our team"), group(members.join("\n"), { layout: { type: "grid", minimumColumnWidth: "11rem" }, className: "aa-team-grid" })].join("\n"));
}

function testimonials(c: any) {
  const qs = arr(c.quotes).map((q: any) => (typeof q === "string" ? { quote: q, author: "" } : q));
  return section("TESTIMONIALS", [h(2, text(c.heading) || "Testimonials"),
    group(qs.map((q) => quote(q.quote, q.author ? `— ${q.author}` : "", "aa-quote")).join("\n"), { layout: { type: "grid", minimumColumnWidth: "18rem" } })].join("\n"));
}

function contact(c: any, ctx: Ctx) {
  const lines = [
    c.address ? p(`<strong>Office</strong><br>${esc(c.address)}${c.addressNote ? `<br><span class="aa-muted">${esc(c.addressNote)}</span>` : ""}`) : "",
    c.phone ? p(`<strong>Phone</strong><br>${link(c.phone, c.phoneHref ?? `tel:${c.phone}`)}${c.fax ? `<br><span class="aa-muted">Fax ${esc(c.fax)}</span>` : ""}`) : "",
    c.email ? p(`<strong>Email</strong><br>${link(c.email, `mailto:${c.email}`)}`) : "",
    c.languages ? p(esc(c.languages), "aa-badge") : "",
  ].join("\n");
  const btns: Btn[] = [];
  if (c.phone) btns.push({ label: `Call ${c.phone}`, href: c.phoneHref ?? `tel:${c.phone}` });
  if (c.mapsUrl) btns.push({ label: "Directions", href: c.mapsUrl, outline: true });
  const side = [
    h(3, "Free consultation"),
    p(esc(text(c.intro) || "Tell us briefly what's going on and the best way to reach you.")),
    buttons(btns),
    c.payment ? group(h(4, c.payment.label) + (c.payment.note ? p(esc(c.payment.note), "aa-muted") : "") + buttons([{ label: "Pay an invoice securely", href: c.payment.url, outline: true }]), { className: "aa-card aa-pay" }) : "",
    // The firm's existing contact form plugin drops in here at launch (see readme.txt).
    p(esc("Contact form goes here (your existing form plugin keeps working)."), "aa-form-slot"),
  ].join("\n");
  return section("CONTACT", [h(2, text(c.heading) || "Contact"), columns([lines, group(side, { className: "aa-card aa-contact-card" })], "aa-contact-cols"), c.disclaimer ? p(esc(c.disclaimer), "aa-fineprint") : ""].join("\n"));
}

function footer(c: any, ctx: Ctx) {
  const links = arr(c.links).map((l: any) => link(l.label, l.href)).join(" · ");
  const social = arr(c.social).map((l: any) => link(l.label, l.href)).join(" · ");
  return group([
    columns([
      p(`<strong>${esc(c.legalName ?? ctx.business)}</strong><br>${esc(c.address ?? "")}${c.phone ? `<br>${link(c.phone, `tel:${String(c.phone).replace(/[^\d+]/g, "")}`)}` : ""}${c.email ? ` · ${link(c.email, `mailto:${c.email}`)}` : ""}`),
      [links ? p(links) : "", c.serviceArea ? p(`Serving ${esc(c.serviceArea)}`, "aa-muted") : "", social ? p(social) : ""].join("\n"),
    ]),
    c.disclaimer ? p(esc(c.disclaimer), "aa-fineprint") : "",
    p(`© ${new Date().getFullYear()} ${esc(c.legalName ?? ctx.business)}`, "aa-fineprint"),
  ].join("\n"), { align: "full", className: "aa-footer" });
}

function generic(s: Section) {
  const c: any = s.content ?? {};
  const body = c.body ? p(esc(c.body)) : c.images ? p(esc(`${c.images}-photo gallery`)) : Array.isArray(c.form) ? p(esc(`Form: ${c.form.join(", ")}`)) : "";
  return section(s.kind, h(2, s.title) + "\n" + body);
}

function renderSection(s: Section, ctx: Ctx): string {
  const c: any = s.content ?? {};
  switch (s.kind) {
    case "HERO": return hero(c, ctx);
    case "SERVICES": return services(c);
    case "RESULTS": return results(c);
    case "ABOUT": return about(c);
    case "TEAM": return team(c);
    case "TESTIMONIALS": return testimonials(c);
    case "CONTACT": return c.address || c.phone ? contact(c, ctx) : generic(s);
    case "FOOTER": return footer(c, ctx);
    default: return generic(s);
  }
}

// --- theme.json & CSS -----------------------------------------------------------

const FONTS = {
  serif: `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`,
  sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
};

function css(v: Variant) {
  const base = `
html{scroll-behavior:smooth}
.wp-site-blocks>*,main.wp-block-group>*,.aa-hero,.aa-section,.aa-footer{margin-block-start:0!important}
.aa-hero-title,.aa-section h2{text-wrap:balance}
:where(section[id]){scroll-margin-top:84px}
.aa-header{position:sticky;top:0;z-index:20;background:var(--wp--preset--color--base);border-bottom:1px solid var(--wp--preset--color--border)}
.aa-header-inner{padding-block:12px}
.aa-header .wp-block-site-title{font-family:var(--wp--preset--font-family--heading);font-weight:700;font-size:1.25rem;margin:0}
.aa-header .wp-block-site-title a{text-decoration:none;color:var(--wp--preset--color--secondary)}
.aa-header .wp-block-navigation{font-size:.95rem}
.aa-header .wp-block-navigation a{text-decoration:none}
.aa-section{padding-block:clamp(48px,8vw,96px)}
.aa-section>.wp-block-heading:first-child{margin-top:0}
.aa-eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.8rem;font-weight:600;margin:0}
.aa-lede{font-size:var(--wp--preset--font-size--large)}
.aa-card{background:var(--wp--preset--color--base);border:1px solid var(--wp--preset--color--border);border-radius:var(--aa-radius);padding:1.25rem 1.4rem}
.aa-card h3,.aa-card h4{margin:0 0 .35rem}
.aa-card p{margin:0}
.aa-practice-group+.aa-practice-group{margin-top:2.5rem}
.aa-audience-title{font-size:1rem;text-transform:uppercase;letter-spacing:.1em;color:var(--wp--preset--color--primary)}
.aa-practice h4{font-size:1.05rem}
.aa-practice p{font-size:.95rem;color:var(--wp--preset--color--muted-text)}
.aa-result-title{font-weight:700;font-size:1.1rem;font-family:var(--wp--preset--font-family--heading)}
.aa-result-detail{margin-top:.5rem!important;font-size:.95rem;color:var(--wp--preset--color--muted-text)}
.aa-fineprint{font-size:.8rem;color:var(--wp--preset--color--muted-text);margin-top:1.5rem}
.aa-muted{color:var(--wp--preset--color--muted-text)}
.aa-stat{font-size:1.05rem;border-left:3px solid var(--wp--preset--color--accent);padding-left:.9rem}
.aa-stat strong{display:block;font-size:2rem;line-height:1.1;font-family:var(--wp--preset--font-family--heading);color:var(--wp--preset--color--primary)}
.aa-team-grid{gap:1.5rem}
.aa-member{text-align:center}
.aa-member p{margin:0}
.aa-avatar{width:84px;height:84px;margin:0 auto .6rem!important;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--wp--preset--font-family--heading);font-size:1.6rem;background:var(--wp--preset--color--soft);color:var(--wp--preset--color--primary);border:2px solid var(--wp--preset--color--accent)}
.aa-member-role{font-size:.9rem;color:var(--wp--preset--color--muted-text)}
.aa-quote{margin:0;border:0;padding:1.5rem;background:var(--wp--preset--color--base);border-radius:var(--aa-radius);border:1px solid var(--wp--preset--color--border)}
.aa-quote p{font-size:1.05rem;font-style:italic}
.aa-quote cite{display:block;margin-top:.75rem;font-style:normal;font-weight:600;font-size:.9rem}
.aa-badge{display:inline-block;padding:.25rem .75rem;border-radius:999px;background:var(--wp--preset--color--soft);font-weight:600;font-size:.9rem}
.aa-contact-card{background:var(--wp--preset--color--soft)}
.aa-pay{margin-top:1.25rem}
.aa-form-slot{margin-top:1.25rem!important;padding:1rem;border:1px dashed var(--wp--preset--color--border);border-radius:var(--aa-radius);font-size:.9rem;color:var(--wp--preset--color--muted-text)}
.aa-footer{padding-block:48px 32px;background:var(--wp--preset--color--secondary);color:#E9EDF5}
.aa-footer a{color:#fff}
.aa-footer .aa-fineprint,.aa-footer .aa-muted{color:#B9C2D3}
.aa-more{margin-top:.75rem!important;font-weight:600}
@media (max-width:781px){.aa-header .wp-block-buttons{display:none}}
`;
  const heritage = `
:root{--aa-radius:2px}
.aa-hero{padding-block:clamp(64px,12vw,140px);color:#fff;background:linear-gradient(90deg,rgba(255,255,255,.035) 0 2px,transparent 2px 56px),linear-gradient(160deg,var(--wp--preset--color--secondary),var(--wp--preset--color--primary))}
.aa-hero .aa-eyebrow{color:var(--wp--preset--color--accent)}
.aa-hero .aa-eyebrow::after{content:"";display:block;width:56px;height:2px;background:var(--wp--preset--color--accent);margin-top:14px}
.aa-hero-title{color:#fff;font-size:clamp(2.6rem,6vw,4.4rem)}
.aa-hero .aa-lede{color:#DCE3EE}
.aa-hero .wp-block-button__link{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--secondary)}
.aa-hero .is-style-outline .wp-block-button__link{background:transparent;color:#fff;border-color:rgba(255,255,255,.6)}
.aa-results{background:var(--wp--preset--color--soft)}
.aa-result{border-top:3px solid var(--wp--preset--color--accent)}
.aa-section>.wp-block-heading{position:relative;padding-bottom:.6rem}
.aa-section>h2.wp-block-heading::after{content:"";position:absolute;left:0;bottom:0;width:48px;height:2px;background:var(--wp--preset--color--accent)}
.aa-testimonials{background:var(--wp--preset--color--secondary)}
.aa-testimonials>h2.wp-block-heading{color:#fff}
.aa-team{background:var(--wp--preset--color--base)}
`;
  const modern = `
:root{--aa-radius:14px}
.aa-hero{padding-block:clamp(56px,10vw,120px);background:radial-gradient(1200px 400px at 85% -10%,rgba(242,169,59,.18),transparent 60%),var(--wp--preset--color--soft)}
.aa-hero .aa-eyebrow{color:var(--wp--preset--color--primary)}
.aa-hero-title{font-size:clamp(2.8rem,7vw,5rem);letter-spacing:-.03em}
.aa-hero .wp-block-button__link{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--secondary);font-weight:700}
.aa-hero .is-style-outline .wp-block-button__link{background:transparent;color:var(--wp--preset--color--secondary);border-color:var(--wp--preset--color--secondary)}
.aa-audiences{margin-top:2.5rem!important;gap:1rem}
.aa-audience{box-shadow:0 1px 2px rgba(15,23,42,.06),0 8px 24px rgba(15,23,42,.06)}
.aa-practice{transition:border-color .15s}
.aa-practice:hover{border-color:var(--wp--preset--color--primary)}
.aa-results{background:var(--wp--preset--color--primary);color:#fff}
.aa-results>h2.wp-block-heading{color:#fff}
.aa-results .aa-card{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#fff}
.aa-results .aa-result-detail,.aa-results .aa-fineprint{color:#CFE3E7}
.aa-testimonials{background:var(--wp--preset--color--soft)}
.aa-avatar{border-color:var(--wp--preset--color--primary)}
`;
  const starter = `:root{--aa-radius:10px}.aa-hero{padding-block:96px;background:var(--wp--preset--color--secondary);color:#fff}.aa-hero-title{color:#fff}`;
  return (base + (v === "heritage" ? heritage : v === "modern" ? modern : starter)).replace(/\n/g, "");
}

function themeJson(ctx: Ctx) {
  const { palette: pl, variant } = ctx;
  const heading = variant === "heritage" ? FONTS.serif : FONTS.sans;
  return {
    $schema: "https://schemas.wp.org/wp/6.6/theme.json",
    version: 3,
    settings: {
      appearanceTools: true,
      useRootPaddingAwareAlignments: true,
      layout: { contentSize: "760px", wideSize: "1180px" },
      color: {
        defaultPalette: false, defaultGradients: false, defaultDuotone: false,
        palette: [
          { slug: "base", name: "Base", color: pl.background },
          { slug: "contrast", name: "Contrast", color: pl.text },
          { slug: "primary", name: "Primary", color: pl.primary },
          { slug: "secondary", name: "Secondary", color: pl.secondary },
          { slug: "accent", name: "Accent", color: pl.accent },
          { slug: "soft", name: "Soft background", color: variant === "heritage" ? "#F5F1E8" : "#F1F5F7" },
          { slug: "border", name: "Border", color: variant === "heritage" ? "#E4DCCB" : "#DCE4E8" },
          { slug: "muted-text", name: "Muted text", color: "#4B5563" },
        ],
      },
      typography: {
        defaultFontSizes: false,
        fontFamilies: [
          { slug: "heading", name: "Headings", fontFamily: heading },
          { slug: "body", name: "Body", fontFamily: FONTS.sans },
        ],
        fontSizes: [
          { slug: "small", name: "Small", size: "0.9rem" },
          { slug: "medium", name: "Medium", size: "1.0625rem" },
          { slug: "large", name: "Large", size: "1.25rem", fluid: { min: "1.125rem", max: "1.3rem" } },
          { slug: "x-large", name: "Extra large", size: "2rem", fluid: { min: "1.6rem", max: "2.25rem" } },
          { slug: "xx-large", name: "Huge", size: "3.5rem", fluid: { min: "2.4rem", max: "4rem" } },
        ],
      },
      spacing: { units: ["px", "em", "rem", "%", "vw"] },
    },
    styles: {
      color: { background: "var(--wp--preset--color--base)", text: "var(--wp--preset--color--contrast)" },
      typography: { fontFamily: "var(--wp--preset--font-family--body)", fontSize: "var(--wp--preset--font-size--medium)", lineHeight: "1.65" },
      spacing: { padding: { left: "clamp(16px, 4vw, 40px)", right: "clamp(16px, 4vw, 40px)" }, blockGap: "1.1rem" },
      elements: {
        heading: { typography: { fontFamily: "var(--wp--preset--font-family--heading)", fontWeight: variant === "heritage" ? "600" : "750", lineHeight: "1.15" }, color: { text: "var(--wp--preset--color--secondary)" } },
        h2: { typography: { fontSize: "var(--wp--preset--font-size--x-large)" } },
        link: { color: { text: "var(--wp--preset--color--primary)" }, ":hover": { typography: { textDecoration: "none" } } },
        button: {
          color: { background: "var(--wp--preset--color--primary)", text: "#ffffff" },
          border: { radius: variant === "heritage" ? "2px" : "999px" },
          typography: { fontWeight: "600", fontSize: "1rem" },
          spacing: { padding: { top: "0.85em", bottom: "0.85em", left: "1.4em", right: "1.4em" } },
        },
      },
      css: css(variant),
    },
    templateParts: [
      { name: "header", area: "header", title: "Header" },
      { name: "footer", area: "footer", title: "Footer" },
    ],
  };
}

// --- assembly ----------------------------------------------------------------

function patternFile(ctx: Ctx, key: string, title: string, markup: string) {
  // Header comment only; the markup itself is static and fully escaped.
  return `<?php\n/**\n * Title: ${title.replace(/\*\//g, "")}\n * Slug: ${ctx.slug}/${key}\n * Categories: ${ctx.slug}\n * Inserter: yes\n */\n?>\n${markup}\n`;
}

export function renderTheme(concept: ConceptForBuild, opts: { agencyName?: string } = {}): RenderedTheme {
  const slug = themeSlug(concept);
  const variant = variantOf(concept.templateKey);
  const palette = (concept.palette ?? {}) as Palette;
  const ctx: Ctx = { slug, name: `${concept.client.businessName} — ${concept.name}`, business: concept.client.businessName, variant, palette };
  const sections = [...concept.sections].sort((a, b) => a.position - b.position);
  const body = sections.filter((s) => s.kind !== "FOOTER");
  const foot = sections.find((s) => s.kind === "FOOTER");

  const files: Record<string, string> = {};
  const keys: string[] = [];
  const used = new Set<string>();
  for (const s of body) {
    let key = s.kind.toLowerCase();
    for (let i = 2; used.has(key); i++) key = `${s.kind.toLowerCase()}-${i}`;
    used.add(key);
    keys.push(key);
    files[`patterns/${key}.php`] = patternFile(ctx, key, s.title, renderSection(s, ctx));
  }
  files["patterns/footer.php"] = patternFile(ctx, "footer", "Footer", foot ? renderSection(foot, ctx) : footer({}, ctx));

  const navTargets = body.filter((s) => anchorFor[s.kind] && s.kind !== "CONTACT").slice(0, 4);
  const contact: any = body.find((s) => s.kind === "CONTACT")?.content ?? {};
  const header = group(
    group(
      block("site-title", { level: 0 }) + "\n" +
      group(
        block("navigation", { overlayMenu: "mobile", layout: { type: "flex", justifyContent: "right" } },
          [...navTargets.map((s) => block("navigation-link", { label: s.title, url: `#${anchorFor[s.kind]}`, kind: "custom", isTopLevelLink: true })),
            block("navigation-link", { label: "Contact", url: "#contact", kind: "custom", isTopLevelLink: true })].join("\n")) + "\n" +
        (contact.phone ? buttons([{ label: contact.phone, href: contact.phoneHref ?? `tel:${contact.phone}` }]) : ""),
        { layout: { type: "flex", flexWrap: "nowrap", justifyContent: "right" } }),
      { align: "wide", className: "aa-header-inner", layout: { type: "flex", flexWrap: "nowrap", justifyContent: "space-between" } }),
    { align: "full", className: "aa-header" },
  );

  const wrapMain = (inner: string) => `${block("template-part", { slug: "header", tagName: "header" })}\n${block("group", { tagName: "main", layout: { type: "default" } }, `<main class="wp-block-group">${inner}</main>`)}\n${block("template-part", { slug: "footer", tagName: "footer" })}\n`;
  const pageBody = (title: string) => group(`${title}\n${block("post-content", { layout: { type: "constrained" } })}`, { tag: "div", className: "aa-section" });

  files["templates/front-page.html"] = wrapMain(keys.map((k) => block("pattern", { slug: `${ctx.slug}/${k}` })).join("\n"));
  files["templates/page.html"] = wrapMain(pageBody(block("post-title", { level: 1 })));
  files["templates/single.html"] = wrapMain(pageBody(block("post-title", { level: 1 }) + "\n" + block("post-date")));
  files["templates/index.html"] = wrapMain(group(
    h(1, "News") + "\n" +
    block("query", { queryId: 1, query: { perPage: 10, pages: 0, offset: 0, postType: "post", order: "desc", orderBy: "date", inherit: true } },
      `<div class="wp-block-query">${block("post-template", {}, `${block("post-title", { isLink: true, level: 2 })}\n${block("post-date")}\n${block("post-excerpt")}`)}\n${block("query-pagination", {}, `${block("query-pagination-previous")}\n${block("query-pagination-next")}`)}</div>`),
    { className: "aa-section" }));
  files["templates/404.html"] = wrapMain(group(h(1, "Page not found") + "\n" + p(`Try the ${link("home page", "/")} or call us.`), { className: "aa-section" }));
  files["parts/header.html"] = header + "\n";
  files["parts/footer.html"] = block("pattern", { slug: `${ctx.slug}/footer` }) + "\n";

  files["theme.json"] = JSON.stringify(themeJson(ctx), null, 2) + "\n";
  files["style.css"] = `/*
Theme Name: ${ctx.name.replace(/\*\//g, "")}
Author: ${(opts.agencyName ?? "Agency").replace(/\*\//g, "")}
Description: ${(concept.styleDirection ?? concept.name).replace(/\*\//g, "")} Block theme generated for ${ctx.business.replace(/\*\//g, "")}.
Requires at least: ${TARGET.requiresWp}
Tested up to: ${TARGET.testedWp}
Requires PHP: ${TARGET.requiresPhp}
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${slug}
*/
`;
  files["functions.php"] = `<?php
/**
 * ${ctx.name.replace(/\*\//g, "")}
 *
 * Block theme: styles live in theme.json, layout in templates/ and parts/,
 * content in patterns/. This file only registers the pattern category, so
 * there is no custom PHP to break on future PHP upgrades.
 */

declare(strict_types=1);

add_action(
	'init',
	static function (): void {
		register_block_pattern_category( ${JSON.stringify(slug)}, array( 'label' => ${phpString(`${ctx.business} sections`)} ) );
	}
);
`;
  files["readme.txt"] = `=== ${ctx.name} ===
Requires at least: ${TARGET.requiresWp}
Tested up to: ${TARGET.testedWp}
Requires PHP: ${TARGET.requiresPhp}
License: GPLv2 or later

${concept.styleDirection ?? ""}

== Install ==
Appearance > Themes > Add New > Upload Theme, choose this zip, Activate.
The home page is built from the patterns in /patterns; edit any section in
Appearance > Editor. No plugins are required.

== Before launch ==
* Replace the initials in the team section with photos (Image block).
* Drop your existing contact form (e.g. Contact Form 7 shortcode) into the "Contact form goes here" slot.
* Check the copy, results and testimonials with the client.
`;
  return { slug, name: ctx.name, files };
}

const phpString = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
