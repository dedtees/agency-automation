// Page content for a complete law-firm site: every page is block markup that
// the theme installs as a real, editable WordPress page. Both designs share
// the page set and copy; the layout of the big moments (heroes, practice
// lists, results) differs per design and the rest is styling (designs.ts).
import { a, asset, Btn, buttons, columns, esc, grid, group, h, ht, image, list, p, quote, row, shortcode, t, url } from "./blocks";
import type { Attorney, DesignId, Practice, SiteContent } from "./types";

export interface PageDef { path: string; title: string; content: string; template?: "full-width"; parent?: string; menuOrder?: number; excerpt?: string }

interface Ctx { c: SiteContent; d: DesignId }

// --- small pieces ----------------------------------------------------------------------

const tel = (phone: string) => `tel:+1${phone.replace(/\D/g, "")}`;
const firstName = (n: string) => n.split(" ")[0];
const placeholder = (label: string, text: string) => p(`<strong>${esc(label)}</strong> ${esc(text)}`, "ss-placeholder");
const eyebrow = (s: string) => t(s, "ss-eyebrow");
const section = (inner: string, className: string, o: { anchor?: string; bg?: { url: string; position?: string } } = {}) =>
  group(group(inner, { align: "wide", className: "ss-inner", layout: { type: "default" } }), { tag: "section", align: "full", className: `ss-section ${className}`, anchor: o.anchor, bg: o.bg });
const head = (eb: string, title: string, lede?: string, cls = "") =>
  group([eyebrow(eb), ht(2, title, "ss-title"), lede ? t(lede, "ss-lede") : ""].join("\n"), { className: `ss-head ${cls}`.trim(), layout: { type: "default" } });

function attorneyBySlug(c: SiteContent, s: string) { return c.attorneys.find((x) => x.slug === s); }
function practiceBySlug(c: SiteContent, s: string) { return c.practices.find((x) => x.slug === s); }
export const initials = (n: string) => n.replace(/,.*$/, "").split(" ").filter((w) => /^[A-Z]/.test(w) && !w.endsWith(".")).map((w) => w[0]).join("").slice(0, 2) || n[0];
const headshot = (x: Attorney) => (x.photo ? asset(x.photo) : asset(`people/placeholder-${x.slug}.svg`));

function attorneyCard(x: Attorney, c: SiteContent, o: { practices?: boolean } = {}) {
  const ps = x.practices.slice(0, 2).map((s) => practiceBySlug(c, s)?.name).filter(Boolean) as string[];
  return group([
    image(headshot(x), x.photo ? `${x.name}, ${x.role}` : `Headshot to come: ${x.name}`, { className: `ss-portrait${x.photo ? "" : " ss-portrait-missing"}`, link: url(`attorneys/${x.slug}`) }),
    h(3, a(x.name, url(`attorneys/${x.slug}`)), "ss-person-name"),
    t(x.role, "ss-person-role"),
    o.practices && ps.length ? t(ps.join(" · "), "ss-person-focus") : "",
  ].join("\n"), { className: "ss-person", layout: { type: "default" } });
}

function miniAttorney(x: Attorney) {
  return group([
    image(headshot(x), x.name, { className: "ss-mini-photo", link: url(`attorneys/${x.slug}`) }),
    group(p(`${a(x.name, url(`attorneys/${x.slug}`))}<br><span>${esc(x.role)}</span>`, "ss-mini-text"), { layout: { type: "default" } }),
  ].join("\n"), { className: "ss-mini", layout: { type: "flex", flexWrap: "nowrap" } });
}

function resultCard(r: SiteContent["results"][number], c: SiteContent) {
  const who = r.attorneys.map((s) => attorneyBySlug(c, s)).filter(Boolean) as Attorney[];
  return group([
    t(r.figure, "ss-result-figure"),
    t(r.label, "ss-result-label"),
    t(r.summary, "ss-result-summary"),
    who.length ? p(who.map((x) => a(x.name, url(`attorneys/${x.slug}`))).join(", "), "ss-result-who") : "",
  ].join("\n"), { className: "ss-result", layout: { type: "default" } });
}

const disclaimerLine = (c: SiteContent) => t(`Attorney advertising. Prior results do not guarantee a similar outcome. Each matter depends on its own facts.`, "ss-fineprint");

function contactList(c: SiteContent, o: { hours?: boolean; parking?: boolean } = {}) {
  const f = c.firm;
  const items = [
    `<span class="ss-k">Call</span> ${a(f.phone, tel(f.phone))}`,
    `<span class="ss-k">Email</span> ${a(f.email, `mailto:${f.email}`)}`,
    `<span class="ss-k">Visit</span> ${esc(`${f.address.street}, ${f.address.city}, ${f.address.state} ${f.address.zip}`)}${o.parking && f.address.note ? `<br><small>${esc(f.address.note)}</small>` : ""}`,
    o.hours ? `<span class="ss-k">Hours</span> ${f.hours ? esc(f.hours) : `<mark class="ss-placeholder-inline">Placeholder: add office hours</mark>`}` : "",
    f.fax ? `<span class="ss-k">Fax</span> ${esc(f.fax)}` : "",
  ].filter(Boolean);
  return list(items, "ss-contact-list", true);
}

const mapsUrl = (c: SiteContent) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.firm.address.mapsQuery ?? `${c.firm.address.street}, ${c.firm.address.city}, ${c.firm.address.state} ${c.firm.address.zip}`)}`;

function consultBand({ c, d }: Ctx, title = "Talk to an attorney today") {
  const f = c.firm;
  return section(columns([
    { html: [eyebrow("Free consultation"), ht(2, title, "ss-title"),
      t("Tell us briefly what is going on. An attorney will review it and get back to you, usually within one business day.", "ss-lede"),
      contactList(c, { hours: true }),
      p(`<span class="ss-badge">Se habla español</span>`)].join("\n"), width: "44%" },
    { html: group([ht(3, "Request a consultation", "ss-form-title"), shortcode(`[ss_contact_form compact="1"]`)].join("\n"), { className: "ss-form-card", layout: { type: "default" } }), width: "56%" },
  ], "ss-consult-cols"), `ss-consult ${d === "heritage" ? "is-dark" : "is-brand"}`, { anchor: "consultation" });
}

function pageHero({ c, d }: Ctx, o: { crumbs: [string, string][]; title: string; lede?: string; image?: string; btns?: Btn[]; eb?: string }) {
  const crumbs = p(o.crumbs.map(([label, to]) => a(label, to)).join(` <span aria-hidden="true">/</span> `) + ` <span aria-hidden="true">/</span> <span>${esc(o.title)}</span>`, "ss-crumbs");
  const text = [crumbs, o.eb ? eyebrow(o.eb) : "", ht(1, o.title, "ss-page-title"), o.lede ? t(o.lede, "ss-lede") : "", o.btns ? buttons(o.btns, "ss-hero-actions") : ""].join("\n");
  if (d === "heritage") {
    return group(group(text, { align: "wide", className: "ss-inner", layout: { type: "default" } }),
      { tag: "section", align: "full", className: `ss-page-hero${o.image ? " has-photo" : ""}`, bg: o.image ? { url: asset(o.image), position: "50% 45%" } : undefined });
  }
  return group(group(o.image
    ? columns([{ html: text, width: "58%" }, { html: image(asset(o.image), "", { className: "ss-page-hero-img" }), width: "42%" }], "ss-page-hero-cols")
    : text, { align: "wide", className: "ss-inner", layout: { type: "default" } }), { tag: "section", align: "full", className: `ss-page-hero${o.image ? " has-photo" : ""}` });
}

const consultBtns = (c: SiteContent): Btn[] => [{ label: "Request a consultation", to: url("contact") }, { label: `Call ${c.firm.phone}`, to: tel(c.firm.phone), style: "outline" }];

// --- home ---------------------------------------------------------------------------------

function heroHome(ctx: Ctx) {
  const { c, d } = ctx;
  const f = c.firm;
  if (d === "heritage") {
    const stats = [["23,000+", "clients represented"], ["15", "attorneys"], ["NJ · NY · ME", "admitted to practice"], ["Unanimous", "NJ Supreme Court decision"]];
    return group(group([
      eyebrow("Somerville, New Jersey · Se habla español"),
      ht(1, f.tagline, "ss-hero-title"),
      t("A full-service law firm in historic Somerville, overlooking the Somerset County Courthouse. Our attorneys represent businesses, towns and families throughout New Jersey, New York and Maine.", "ss-lede"),
      buttons([{ label: "Request a consultation", to: url("contact") }, { label: `Call ${f.phone}`, to: tel(f.phone), style: "outline" }], "ss-hero-actions"),
      grid(stats.map(([v, l]) => group(t(v, "ss-stat-value") + "\n" + t(l, "ss-stat-label"), { className: "ss-stat", layout: { type: "default" } })), "10rem", "ss-hero-stats", 4),
    ].join("\n"), { align: "wide", className: "ss-inner", layout: { type: "default" } }),
    { tag: "section", align: "full", className: "ss-hero", bg: { url: asset("photos/old-somerset-county-courthouse-somerville-nj-july-2026-jpg.jpg"), position: "50% 35%" } });
  }
  const left = [
    p(`<span class="ss-pill">Somerville, NJ</span> <span class="ss-pill">Se habla español</span>`, "ss-pills"),
    ht(1, "Clear counsel for businesses, towns and families.", "ss-hero-title"),
    t("Savo Schalk is a full-service firm of fifteen attorneys, across from the Somerset County Courthouse. From zoning boards to jury trials, we've represented more than 23,000 clients.", "ss-lede"),
    buttons([{ label: "Get a free consultation", to: url("contact") }, { label: `Call ${f.phone}`, to: tel(f.phone), style: "outline" }], "ss-hero-actions"),
    list(["Free initial consultation", "15 attorneys, one office", "Admitted in NJ, NY and ME"], "ss-checks"),
  ].join("\n");
  const right = group([
    image(asset("photos/somerset-county-courthouse-somerville-nj-front-view-jpg.jpg"), "The Somerset County Courthouse in Somerville, across from our office", { className: "ss-hero-img" }),
    group([t("Recent result", "ss-float-eyebrow"), t("Unanimous NJ Supreme Court decision", "ss-float-title"), t("Monarch Communities v. Montville Zoning Board of Adjustment, argued by Kelly M. Carey.", "ss-float-text")].join("\n"), { className: "ss-float-card", layout: { type: "default" } }),
  ].join("\n"), { className: "ss-hero-media", layout: { type: "default" } });
  return group(group(columns([{ html: left, width: "54%" }, { html: right, width: "46%" }], "ss-hero-cols"), { align: "wide", className: "ss-inner", layout: { type: "default" } }),
    { tag: "section", align: "full", className: "ss-hero" });
}

function practiceList(ctx: Ctx, audience: Practice["audience"]) {
  return ctx.c.practices.filter((x) => x.audience === audience).map((x) =>
    group([h(3, a(x.name, url(`practice-areas/${x.slug}`)), `ss-practice-name has-icon icon-${x.icon}`), t(x.blurb, "ss-practice-blurb")].join("\n"),
      { className: "ss-practice-row", layout: { type: "default" } }));
}

function home(ctx: Ctx): string {
  const { c, d } = ctx;
  const partners = ["charles-z-schalk", "christopher-corsini", "steven-k-warner", "ellen-m-gillespie", "michael-p-ogrodnick", "alexander-g-fisher", "matthew-r-flynn", "kelly-m-carey"]
    .map((s) => attorneyBySlug(c, s)).filter(Boolean) as Attorney[];
  const topResults = c.results.slice(0, d === "heritage" ? 4 : 6);
  const [t1, t2, t3] = c.testimonials;
  const audiences: [Practice["audience"], string, string][] = [
    ["business", "Businesses, towns & institutions", "Land use approvals, municipal counsel, transactions and the disputes that come with running an organization."],
    ["individual", "Individuals & families", "Injuries, divorce, estates, criminal charges, job and school problems, and buying or keeping a home."],
  ];

  const intro = section(columns([
    { html: image(asset("photos/first-reformed-church-and-somerset-county-courthouse-somervi.jpg"), "Somerville's courthouse green, steps from our office", { className: "ss-framed" }), width: "46%" },
    { html: [eyebrow("The firm"), ht(2, "A Somerset County firm with a statewide reach", "ss-title"), ...c.firm.about.slice(0, 2).map((x) => t(x)),
      buttons([{ label: "About the firm", to: url("about"), style: d === "heritage" ? "link" : "outline" }])].join("\n"), width: "54%" },
  ], "ss-intro-cols"), "ss-intro");

  const practices = d === "heritage"
    ? section([head("Practice areas", "How we can help", "Thirteen practice groups, one team. Choose the area closest to your situation, or simply call and we'll point you to the right attorney."),
        columns(audiences.map(([aud, title]) => ({ html: [ht(3, title, "ss-col-title"), ...practiceList(ctx, aud)].join("\n") })), "ss-practice-cols"),
        buttons([{ label: "All practice areas", to: url("practice-areas") }], "ss-center")].join("\n"), "ss-practices")
    : section([head("How can we help?", "Start with who you are", undefined, "is-center"),
        columns(audiences.map(([aud, title, blurb]) => ({ html: group([
          ht(3, title, `ss-audience-title has-icon icon-${aud === "business" ? "building" : "family"}`), t(blurb, "ss-audience-blurb"),
          list(c.practices.filter((x) => x.audience === aud).map((x) => a(x.name, url(`practice-areas/${x.slug}`))), "ss-chip-list", true),
        ].join("\n"), { className: `ss-audience is-${aud}`, layout: { type: "default" } }) })), "ss-audience-cols")].join("\n"), "ss-practices");

  const why = d === "modern" ? section([
    head("Why Savo Schalk", "Big-firm results. A local team that answers the phone.", undefined, "is-center"),
    grid([
      ["gavel", "Trial-tested", "Million-dollar verdicts and published decisions, from Essex County juries to the New Jersey Supreme Court."],
      ["capitol", "Trusted by towns", "Our attorneys serve as counsel to municipalities and land use boards across Central Jersey."],
      ["pin", "Local and bilingual", "One office across from the Somerset County Courthouse, with service in English and Spanish."],
    ].map(([icon, title, text]) => group([ht(3, title, `has-icon icon-${icon}`), t(text)].join("\n"), { className: "ss-feature", layout: { type: "default" } })), "16rem", "ss-features", 3),
  ].join("\n"), "ss-why") : "";

  const results = section([
    head("Results", d === "heritage" ? "Million-dollar litigators" : "Recent results", d === "heritage" ? "Verdicts, settlements and approvals our clients have trusted us to win." : undefined),
    grid(topResults.map((r) => resultCard(r, c)), "15rem", "ss-results-grid", d === "heritage" ? 4 : 3),
    row([disclaimerLine(c), buttons([{ label: "See all results", to: url("results"), style: "outline" }])].join("\n"), "ss-results-foot"),
  ].join("\n"), `ss-results ${d === "heritage" ? "is-dark" : ""}`);

  const team = section([
    row([head("Attorneys", "Meet the team", "Fifteen attorneys, including former municipal judges, court-approved mediators and past chairs of the State Bar's Land Use Section."),
      buttons([{ label: "All 15 attorneys", to: url("attorneys"), style: "outline" }])].join("\n"), "ss-head-row"),
    grid(partners.map((x) => attorneyCard(x, c)), "13rem", "ss-people", 4),
  ].join("\n"), "ss-team");

  const recognition = section(grid(c.recognition.map((r) => group([t(r.title, "ss-rec-title"), t(r.detail, "ss-rec-detail")].join("\n"), { className: "ss-rec", layout: { type: "default" } })), "14rem", "ss-rec-grid", 4), "ss-recognition");

  const reviews = section([
    head("Client stories", "What our clients say"),
    d === "heritage"
      ? columns([
          { html: quote(esc(t2.quote), `${esc(t2.author)} · ${esc(t2.matter)}`, "ss-quote-feature"), width: "58%" },
          { html: [quote(esc(t3.quote), `${esc(t3.author)} · ${esc(t3.matter)}`, "ss-quote"), quote(esc(t1.quote), `${esc(t1.author)} · ${esc(t1.matter)}`, "ss-quote")].join("\n"), width: "42%" },
        ], "ss-quotes")
      : grid([t2, t1, t3].map((q) => quote(esc(q.quote), `${esc(q.author)} · ${esc(q.matter)}`, "ss-quote")), "16rem", "ss-quote-grid", 3),
    buttons([{ label: "Read client stories", to: url("reviews"), style: "link" }], "ss-center"),
  ].join("\n"), "ss-reviews");

  const steps = d === "modern" ? section([
    head("Getting started", "What happens when you reach out", undefined, "is-center"),
    grid([
      ["1", "Tell us what happened", "Call, or send the short form. Spanish-speaking clients are welcome."],
      ["2", "Talk with an attorney", "We'll review your situation and connect you with the right attorney for it."],
      ["3", "Know your options", "You leave the consultation knowing where you stand and what comes next."],
    ].map(([n, title, text]) => group([t(n, "ss-step-n"), ht(3, title), t(text)].join("\n"), { className: "ss-step", layout: { type: "default" } })), "14rem", "ss-steps", 3),
  ].join("\n"), "ss-process") : "";

  return [heroHome(ctx), d === "heritage" ? intro : "", practices, d === "modern" ? why : "", results, d === "modern" ? intro : "", team,
    d === "heritage" ? recognition : "", reviews, steps, consultBand(ctx)].filter(Boolean).join("\n\n");
}

// --- practice areas -----------------------------------------------------------------------------

function practiceIndex(ctx: Ctx): string {
  const { c } = ctx;
  const card = (x: Practice) => group([
    ht(3, x.name, `has-icon icon-${x.icon}`), t(x.blurb), p(a("Learn more", url(`practice-areas/${x.slug}`), "ss-more"), "ss-more-wrap"),
  ].join("\n"), { className: "ss-card ss-practice-card", layout: { type: "default" } });
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Practice Areas", lede: "Thirteen practice groups serving businesses, municipalities, institutions, individuals and families across New Jersey.", btns: consultBtns(c), image: "photos/courtgavel-jpg.jpg" }),
    section([head("For organizations", "Businesses, towns & institutions"), grid(c.practices.filter((x) => x.audience === "business").map(card), "17rem", "ss-cards", 3)].join("\n"), "ss-practice-index"),
    section([head("For people", "Individuals & families"), grid(c.practices.filter((x) => x.audience === "individual").map(card), "17rem", "ss-cards", 3)].join("\n"), "ss-practice-index is-alt"),
    consultBand(ctx),
  ].join("\n\n");
}

function practicePage(ctx: Ctx, x: Practice): string {
  const { c } = ctx;
  const team = x.attorneys.map((s) => attorneyBySlug(c, s)).filter(Boolean) as Attorney[];
  const related = c.results.filter((r) => r.practice === x.slug);
  const siblings = c.practices.filter((y) => y.audience === x.audience && y.slug !== x.slug);
  const main = [
    ht(2, `${x.name} attorneys in Somerville, NJ`, "ss-title"),
    ...x.intro.map((s) => t(s)),
    x.handles.length ? group([ht(3, "What we handle", "ss-sub"), list(x.handles, "ss-check-grid")].join("\n"), { className: "ss-handles", layout: { type: "default" } }) : "",
    ...x.sections.map((s) => group([ht(3, s.title, "ss-sub"), ...s.paragraphs.map((q) => t(q)), s.bullets.length ? list(s.bullets, "ss-check-grid") : ""].join("\n"), { className: "ss-subsection", layout: { type: "default" } })),
    related.length ? group([ht(3, "Related results", "ss-sub"), grid(related.map((r) => resultCard(r, c)), "14rem", "ss-results-grid is-compact", 2), disclaimerLine(c)].join("\n"), { className: "ss-related", layout: { type: "default" } }) : "",
  ].join("\n");
  const aside = [
    group([ht(3, "Talk to an attorney"), t("Free initial consultation. Tell us what is going on and we will connect you with the right attorney."),
      buttons([{ label: "Request a consultation", to: url("contact") }]), p(`${a(c.firm.phone, tel(c.firm.phone), "ss-big-phone")}`), p(`<span class="ss-badge">Se habla español</span>`)].join("\n"),
      { className: "ss-aside-card is-cta", layout: { type: "default" } }),
    group([ht(3, team.length ? "Attorneys in this practice" : "Your attorney"), team.length ? team.map(miniAttorney).join("\n") : t("Call us and we will match you with the attorney best suited to your matter.")].join("\n"),
      { className: "ss-aside-card", layout: { type: "default" } }),
    group([ht(3, "Related practice areas"), list(siblings.map((y) => a(y.name, url(`practice-areas/${y.slug}`))), "ss-link-list", true)].join("\n"), { className: "ss-aside-card", layout: { type: "default" } }),
  ].join("\n");
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")], ["Practice Areas", url("practice-areas")]], title: x.name, lede: x.blurb, image: x.image, btns: consultBtns(c), eb: x.audience === "business" ? "For businesses, towns & institutions" : "For individuals & families" }),
    section(columns([{ html: main, width: "66%", className: "ss-main" }, { html: aside, width: "34%", className: "ss-aside" }], "ss-body-cols"), "ss-body"),
    consultBand(ctx, `Talk to a ${x.name.split(/[,&]/)[0].trim().toLowerCase()} attorney`),
  ].join("\n\n");
}

// --- attorneys -------------------------------------------------------------------------------------

function attorneysIndex(ctx: Ctx): string {
  const { c } = ctx;
  const groups: [string, (r: string) => boolean][] = [["Partners", (r) => /Partner/.test(r)], ["Associates", (r) => /Associate/.test(r)], ["Of Counsel", (r) => /Counsel/.test(r)]];
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Our Attorneys", lede: "Trial lawyers, municipal and land use counsel, transactional and family lawyers: fifteen attorneys under one roof in Somerville.", btns: consultBtns(c) }),
    ...groups.map(([title, test], i) => section([head(`${c.attorneys.filter((x) => test(x.role)).length} attorneys`, title), grid(c.attorneys.filter((x) => test(x.role)).map((x) => attorneyCard(x, c, { practices: true })), "13rem", "ss-people", 4)].join("\n"), `ss-team${i % 2 ? " is-alt" : ""}`)),
    consultBand(ctx),
  ].join("\n\n");
}

const FACT_TITLES: Record<string, string> = { education: "Education", admissions: "Bar admissions", memberships: "Professional memberships", appointments: "Appointments", matters: "Representative matters" };

function bioPage(ctx: Ctx, x: Attorney): string {
  const { c, d } = ctx;
  const ps = x.practices.map((s) => practiceBySlug(c, s)).filter(Boolean) as Practice[];
  const related = c.results.filter((r) => r.attorneys.includes(x.slug));
  const facts = Object.entries(x.facts).filter(([, v]) => v && v.length);
  const header = group(group(columns([
    { html: image(headshot(x), x.photo ? `${x.name}, ${x.role}` : `Headshot to come: ${x.name}`, { className: `ss-portrait is-large${x.photo ? "" : " ss-portrait-missing"}` }), width: "30%" },
    { html: [
      p(`${a("Home", url("/"))} <span aria-hidden="true">/</span> ${a("Attorneys", url("attorneys"))} <span aria-hidden="true">/</span> <span>${esc(x.name)}</span>`, "ss-crumbs"),
      eyebrow(x.role), ht(1, x.name, "ss-page-title"),
      ps.length ? list(ps.map((y) => a(y.name, url(`practice-areas/${y.slug}`))), "ss-chip-list", true) : "",
      list([`<span class="ss-k">Phone</span> ${a(c.firm.phone, tel(c.firm.phone))}`, `<span class="ss-k">Email</span> ${a(x.email, `mailto:${x.email}`)}`], "ss-contact-list is-inline", true),
      buttons([{ label: `Request a consultation with ${firstName(x.name) === "John" ? x.name.replace(/,.*$/, "") : firstName(x.name)}`, to: url("contact") }]),
      x.photo ? "" : placeholder("Placeholder:", "professional headshot to be added."),
    ].join("\n"), width: "70%" },
  ], "ss-bio-cols"), { align: "wide", className: "ss-inner", layout: { type: "default" } }), { tag: "section", align: "full", className: "ss-page-hero ss-bio-hero" });
  const main = [ht(2, `About ${x.name.replace(/,.*$/, "")}`, "ss-title"), ...x.bio.map((s) => t(s))].join("\n");
  const aside = [
    ...facts.map(([k, v]) => group([ht(3, FACT_TITLES[k] ?? k), list(v!, "ss-fact-list")].join("\n"), { className: "ss-aside-card", layout: { type: "default" } })),
    related.length ? group([ht(3, "Selected results"), ...related.map((r) => p(`<strong>${esc(r.figure)}</strong> ${esc(r.label)}`, "ss-mini-result"))].join("\n"), { className: "ss-aside-card", layout: { type: "default" } }) : "",
    facts.length ? "" : group([ht(3, "Education & admissions"), placeholder("Placeholder:", "add education and bar admissions.")].join("\n"), { className: "ss-aside-card", layout: { type: "default" } }),
  ].join("\n");
  return [header, section(columns([{ html: main, width: "64%", className: "ss-main" }, { html: aside, width: "36%", className: "ss-aside" }], "ss-body-cols"), "ss-body"), consultBand(ctx)].join("\n\n");
}

// --- about, results, reviews ---------------------------------------------------------------

function about(ctx: Ctx): string {
  const { c, d } = ctx;
  const towns = ["Bridgewater Township", "Borough of Middlesex", "Borough of Flemington", "Township of Readington", "Borough of Rocky Hill", "Borough of Sayreville", "Borough of Manville", "Montville Township Zoning Board"];
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")]], title: "About the Firm", lede: c.firm.summary, image: "photos/old-somerset-county-courthouse-somerville-nj-july-2026-jpg.jpg", btns: consultBtns(c) }),
    section(columns([
      { html: [eyebrow("Who we are"), ht(2, "An honor, a privilege and a responsibility", "ss-title"), ...c.firm.about.map((x) => t(x))].join("\n"), width: "56%" },
      { html: grid(c.firm.stats.concat([{ value: "$20M", label: "church property verdict" }]).map((s) => group(t(s.value, "ss-stat-value") + "\n" + t(s.label, "ss-stat-label"), { className: "ss-stat", layout: { type: "default" } })), "9rem", "ss-stat-grid", 2), width: "44%" },
    ], "ss-intro-cols"), "ss-intro"),
    section([head("Our history", "Decades in Somerville"), placeholder("Placeholder: firm history.", "Add the founding year, the founders and key milestones, including the firm's earlier name (Mauro Savo Camerino Grant Schalk) and the move to the Hamon Building.")].join("\n"), "ss-history"),
    section([head("Public service", "Trusted counsel to New Jersey towns", "Our attorneys have served as municipal attorneys, board attorneys, a municipal court judge and a deputy mayor. Current and past appointments include:"),
      list(towns, "ss-check-grid is-3")].join("\n"), "ss-public is-alt"),
    section(grid(c.recognition.map((r) => group([t(r.title, "ss-rec-title"), t(r.detail, "ss-rec-detail")].join("\n"), { className: "ss-rec", layout: { type: "default" } })), "14rem", "ss-rec-grid", 4), "ss-recognition"),
    section(columns([
      { html: image(asset("photos/2018-05-29-19-13-00-view-east-along-new-jersey-state-route-2.jpg"), "Main Street in downtown Somerville", { className: "ss-framed" }), width: "50%" },
      { html: [eyebrow("Visit us"), ht(2, "In the heart of downtown Somerville", "ss-title"), t(c.firm.address.note ?? ""), contactList(c, { hours: true }), buttons([{ label: "Get directions", to: mapsUrl(c), style: "outline" }])].join("\n"), width: "50%" },
    ], "ss-intro-cols"), "ss-visit"),
    consultBand(ctx),
  ].join("\n\n");
}

function results(ctx: Ctx): string {
  const { c } = ctx;
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Results", eb: "Serious results in serious cases", lede: "Examples of verdicts, settlements, decisions and approvals our attorneys have obtained for clients.", image: "photos/courtgavel-jpg.jpg", btns: consultBtns(c) }),
    section([grid(c.results.map((r) => resultCard(r, c)), "16rem", "ss-results-grid", 3), t(c.firm.disclaimer, "ss-fineprint")].join("\n"), "ss-results"),
    section([head("Appellate decisions", "Published and appellate decisions"), list(c.decisions, "ss-decisions"), placeholder("Placeholder:", "link each decision to its PDF (they are on the current site).")].join("\n"), "ss-decisions-sec is-alt"),
    consultBand(ctx),
  ].join("\n\n");
}

function reviews(ctx: Ctx): string {
  const { c } = ctx;
  const [story, ...rest] = c.testimonials;
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Client Stories", lede: "In their own words: clients on working with Savo Schalk.", btns: consultBtns(c) }),
    section(columns([
      { html: [eyebrow(story.matter), ht(2, "“They took on our case when so many other firms rejected us.”", "ss-title"), quote(esc(story.quote), `${esc(story.author)}`, "ss-quote-feature"), ...story.story.map((s) => t(s))].join("\n"), width: "62%" },
      { html: [...rest.map((q) => quote(esc(q.quote), `${esc(q.author)} · ${esc(q.matter)}`, "ss-quote")),
        group([ht(3, "Google reviews"), placeholder("Placeholder:", "connect the firm's Google Business Profile to show live star ratings and recent reviews here.")].join("\n"), { className: "ss-aside-card", layout: { type: "default" } })].join("\n"), width: "38%" },
    ], "ss-body-cols"), "ss-body"),
    consultBand(ctx),
  ].join("\n\n");
}

// --- contact, payment, legal -----------------------------------------------------------------

function contact(ctx: Ctx): string {
  const { c } = ctx;
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Contact Us", lede: "Free initial consultation. Call, email or send the form and an attorney will get back to you. Se habla español." }),
    section(columns([
      { html: group([ht(2, "Request a consultation", "ss-title"), shortcode("[ss_contact_form]")].join("\n"), { className: "ss-form-card is-flat", layout: { type: "default" } }), width: "60%" },
      { html: [
        group([ht(3, "Our office"), contactList(c, { hours: true, parking: true }), buttons([{ label: "Get directions", to: mapsUrl(c) }]), p(`<span class="ss-badge">Se habla español</span>`)].join("\n"), { className: "ss-aside-card is-cta", layout: { type: "default" } }),
        image(asset("photos/2018-05-29-19-13-00-view-east-along-new-jersey-state-route-2.jpg"), "Main Street in downtown Somerville", { className: "ss-framed" }),
        c.firm.payments ? group([ht(3, "Existing clients"), t("Pay an invoice online by card."), buttons([{ label: "Make a payment", to: url("make-a-payment"), style: "outline" }])].join("\n"), { className: "ss-aside-card", layout: { type: "default" } }) : "",
      ].join("\n"), width: "40%", className: "ss-aside" },
    ], "ss-body-cols"), "ss-body"),
  ].join("\n\n");
}

function thankYou(ctx: Ctx): string {
  const { c } = ctx;
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")], ["Contact", url("contact")]], title: "Thank you", lede: "We have your message. An attorney will review it and get back to you, usually within one business day." }),
    section([ht(2, "What happens next", "ss-title"), list(["We review your message and check for conflicts of interest.", "An attorney or our office calls or emails you to set up a consultation.", `If your matter is urgent, call us now at ${c.firm.phone}.`], "ss-check-grid"),
      buttons([{ label: "Back to the home page", to: url("/") }, { label: `Call ${c.firm.phone}`, to: tel(c.firm.phone), style: "outline" }])].join("\n"), "ss-body"),
  ].join("\n\n");
}

function payment(ctx: Ctx): string {
  const { c } = ctx;
  const pay = c.firm.payments!;
  return [
    pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Make a Payment", lede: "Existing clients can pay an invoice securely online." }),
    section(columns([
      { html: [ht(2, "Pay by card", "ss-title"), t(`We accept ${pay.note?.split(".")[0] ?? "major credit cards"}.`), t("Please include your file number and invoice number with your payment so we can apply it to the right account."),
        buttons([{ label: "Pay securely online", to: pay.url }]), t("Payments are processed by our card processor, Clover. You will leave this site to complete the payment.", "ss-fineprint")].join("\n"), width: "60%" },
      { html: group([ht(3, "Questions about a bill?"), contactList(c)].join("\n"), { className: "ss-aside-card", layout: { type: "default" } }), width: "40%" },
    ], "ss-body-cols"), "ss-body"),
  ].join("\n\n");
}

function legal(ctx: Ctx, kind: "disclaimer" | "privacy" | "credits"): string {
  const { c } = ctx;
  if (kind === "credits") {
    return [pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Photo Credits" }),
      section([t("Photographs of Somerville and New Jersey on this site are used under Creative Commons licenses. Photos marked as stock placeholders will be replaced with licensed stock photography before launch."),
        list(c.photos.map((x) => `${esc(x.title)}: ${esc(x.artist || "Unknown")}, ${a(x.license, x.source)}${x.placeholder ? " <em>(stock placeholder)</em>" : ""}`), "ss-credits", true)].join("\n"), "ss-body ss-narrow")].join("\n\n");
  }
  if (kind === "disclaimer") {
    return [pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Disclaimer" }),
      section([t(c.firm.disclaimer), t("This website is attorney advertising. The information on it is general and is not legal advice. Prior results do not guarantee a similar outcome, and each matter depends on its own facts and law."),
        t(`${c.firm.legalName} is responsible for the content of this site. Our office is at ${c.firm.address.street}, ${c.firm.address.city}, ${c.firm.address.state} ${c.firm.address.zip}.`)].join("\n"), "ss-body ss-narrow")].join("\n\n");
  }
  return [pageHero(ctx, { crumbs: [["Home", url("/")]], title: "Privacy Policy" }),
    section([placeholder("Placeholder:", "the firm should review this policy before launch."),
      ht(2, "What we collect", "ss-sub"), t("When you send the contact form we receive your name, contact details and message. We use them only to respond to you and to check for conflicts of interest."),
      ht(2, "How we keep it", "ss-sub"), t("Form messages are stored in this website's private admin area and emailed to our office. We do not sell your information or use it for advertising."),
      ht(2, "Cookies", "ss-sub"), t("This site does not use advertising or analytics cookies."),
      ht(2, "Contact", "ss-sub"), p(`Questions about privacy: ${a(c.firm.email, `mailto:${c.firm.email}`)}.`)].join("\n"), "ss-body ss-narrow")].join("\n\n");
}

// --- page list -----------------------------------------------------------------------------------

export function buildPages(c: SiteContent, d: DesignId): PageDef[] {
  const ctx: Ctx = { c, d };
  const pages: PageDef[] = [
    { path: "home", title: "Home", content: home(ctx), template: "full-width", menuOrder: 0 },
    { path: "practice-areas", title: "Practice Areas", content: practiceIndex(ctx), template: "full-width", menuOrder: 1 },
    ...c.practices.map((x, i) => ({ path: `practice-areas/${x.slug}`, parent: "practice-areas", title: x.name, content: practicePage(ctx, x), template: "full-width" as const, menuOrder: i, excerpt: x.blurb })),
    { path: "attorneys", title: "Attorneys", content: attorneysIndex(ctx), template: "full-width", menuOrder: 2 },
    ...c.attorneys.map((x, i) => ({ path: `attorneys/${x.slug}`, parent: "attorneys", title: x.name, content: bioPage(ctx, x), template: "full-width" as const, menuOrder: i, excerpt: x.role })),
    { path: "results", title: "Results", content: results(ctx), template: "full-width", menuOrder: 3 },
    { path: "about", title: "About", content: about(ctx), template: "full-width", menuOrder: 4 },
    { path: "reviews", title: "Client Stories", content: reviews(ctx), template: "full-width", menuOrder: 5 },
    { path: "contact", title: "Contact", content: contact(ctx), template: "full-width", menuOrder: 6 },
    { path: "contact/thank-you", parent: "contact", title: "Thank You", content: thankYou(ctx), template: "full-width" },
    { path: "make-a-payment", title: "Make a Payment", content: payment(ctx), template: "full-width", menuOrder: 7 },
    { path: "disclaimer", title: "Disclaimer", content: legal(ctx, "disclaimer"), template: "full-width", menuOrder: 8 },
    { path: "privacy-policy", title: "Privacy Policy", content: legal(ctx, "privacy"), template: "full-width", menuOrder: 9 },
    { path: "photo-credits", title: "Photo Credits", content: legal(ctx, "credits"), template: "full-width", menuOrder: 10 },
  ];
  return pages;
}

