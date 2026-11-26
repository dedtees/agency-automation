// Site audit: looks at a client's current website from the outside and turns
// what it finds into a list of findings we can show in a pitch or case study.
//
// Two halves so the logic is testable without the network:
//   fetchSnapshot(url)   -> raw responses (HTML, headers, WP REST index, theme files)
//   analyzeSnapshot(s)   -> structured report + findings
// Only public URLs are requested, the same ones any browser loads.
import { phpStatus, TARGET_PHP, type PhpStatus } from "./phpSupport";

export interface HttpResult { status: number; headers: Record<string, string>; body: string }

export interface SiteSnapshot {
  url: string;
  fetchedAt: string;
  home: HttpResult;
  restIndex?: HttpResult | null;     // /wp-json/
  themeStylesheet?: string | null;   // first part of the active theme's style.css
  assetHeads?: Record<string, string>; // first bytes of bundled JS/CSS (version banners)
  pages?: { slug: string; modified: string }[] | null;
  latestPostDate?: string | null;
  xmlrpcStatus?: number | null;
}

export type Severity = "critical" | "high" | "medium" | "low";
export type Area = "platform" | "security" | "seo" | "accessibility" | "content" | "conversion";

export interface Finding { id: string; severity: Severity; area: Area; title: string; detail: string; fix: string }

export interface AuditReport {
  url: string;
  auditedAt: string;
  stack: {
    server: string | null;
    php: { version: string | null; status: PhpStatus; eolDate?: string; daysPastEol?: number; target: string };
    wordpress: string | null;
    theme: { slug: string | null; name?: string; author?: string; version?: string; basedOn?: string; kind: "classic" | "block" | "unknown" };
    plugins: string[];
    libraries: Record<string, string>;
  };
  content: {
    title: string | null;
    metaDescription: string | null;
    h1: string[];
    images: number;
    imagesMissingAlt: number;
    copyrightYear: number | null;
    duplicateLinks: string[];
    businessNames: string[];
    stalePages: { slug: string; modified: string }[];
    latestPostDate: string | null;
  };
  findings: Finding[];
  summary: { critical: number; high: number; medium: number; low: number };
}

// --- fetching -------------------------------------------------------------

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
const UA = "Mozilla/5.0 (compatible; SiteAudit/1.0)";

async function get(f: FetchLike, url: string, max = 400_000): Promise<HttpResult | null> {
  try {
    const r = await f(url, { headers: { "user-agent": UA }, redirect: "follow" });
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    return { status: r.status, headers, body: (await r.text()).slice(0, max) };
  } catch {
    return null;
  }
}

export async function fetchSnapshot(url: string, f: FetchLike = fetch): Promise<SiteSnapshot> {
  const base = new URL(url);
  const abs = (p: string) => new URL(p, base).href;
  const home = await get(f, base.href);
  if (!home) throw new Error(`Could not reach ${base.href}`);
  const snap: SiteSnapshot = { url: base.href, fetchedAt: new Date().toISOString(), home };

  snap.restIndex = await get(f, abs("/wp-json/"), 50_000);
  const theme = themeSlug(home.body);
  if (theme) snap.themeStylesheet = (await get(f, abs(`/wp-content/themes/${theme}/style.css`), 2_000))?.body ?? null;

  // Version banners of libraries the theme bundles itself (WordPress core's own copies are kept current).
  snap.assetHeads = {};
  for (const src of assetUrls(home.body).filter((u) => /\/wp-content\/themes\//.test(u) && /(jquery|bootstrap)[^/]*\.(js|css)/i.test(u)).slice(0, 6)) {
    const r = await get(f, abs(src), 400);
    if (r?.status === 200) snap.assetHeads[new URL(abs(src)).pathname] = r.body;
  }

  const pages = await get(f, abs("/wp-json/wp/v2/pages?per_page=100&_fields=slug,modified"));
  try { snap.pages = pages?.status === 200 ? JSON.parse(pages.body) : null; } catch { snap.pages = null; }
  const posts = await get(f, abs("/wp-json/wp/v2/posts?per_page=1&_fields=date"));
  try { snap.latestPostDate = posts?.status === 200 ? JSON.parse(posts.body)[0]?.date ?? null : null; } catch { snap.latestPostDate = null; }
  snap.xmlrpcStatus = (await get(f, abs("/xmlrpc.php"), 200))?.status ?? null;
  return snap;
}

// --- parsing helpers --------------------------------------------------------

const decode = (s: string) =>
  s.replace(/&#0?39;|&#8217;|&rsquo;/g, "'").replace(/&amp;/g, "&").replace(/&#8211;|&ndash;/g, "–").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, " "));

export function themeSlug(html: string): string | null {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/\/wp-content\/themes\/([a-z0-9_.-]+)\//gi)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function assetUrls(html: string): string[] {
  return [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map((m) => m[1]);
}

function themeHeader(css: string | null | undefined) {
  if (!css) return {};
  const field = (k: string) => css.match(new RegExp(`^\\s*${k}\\s*:\\s*(.+)$`, "mi"))?.[1].trim();
  const basedOn = css.match(/based on (\w[\w .-]*?)(?:\s+https?:|\.|,|\n)/i)?.[1];
  return { name: field("Theme Name"), author: field("Author"), version: field("Version"), basedOn };
}

const NAMESPACE_PLUGINS: Record<string, string> = {
  "ithemes-security": "Solid Security (iThemes)", akismet: "Akismet", aioseo: "All in One SEO", "contact-form-7": "Contact Form 7",
  redirection: "Redirection", "popup-maker": "Popup Maker", pum: "Popup Maker", exactmetrics: "ExactMetrics", yoast: "Yoast SEO",
  wc: "WooCommerce", elementor: "Elementor", jetpack: "Jetpack", wordfence: "Wordfence", gf: "Gravity Forms", "rankmath": "Rank Math",
  wpforms: "WPForms", "monsterinsights": "MonsterInsights", "litespeed": "LiteSpeed Cache", "wp-rocket": "WP Rocket",
};

function plugins(html: string, restBody?: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/\/wp-content\/plugins\/([a-z0-9_-]+)\//gi)) out.add(NAMESPACE_PLUGINS[m[1]] ?? m[1]);
  for (const m of html.matchAll(/<!--\s*([^-]{3,60}?)\s+(?:\d[\d.]*\s*)?-\s*[a-z0-9-]+\.(?:com|org)/gi)) out.add(m[1].trim());
  try {
    const ns: string[] = restBody ? JSON.parse(restBody).namespaces ?? [] : [];
    for (const n of ns) {
      const key = n.split("/")[0];
      if (NAMESPACE_PLUGINS[key]) out.add(NAMESPACE_PLUGINS[key]);
    }
  } catch { /* not JSON */ }
  // Normalise duplicates like "All in One SEO 4.9" vs "All in One SEO".
  const names = [...out].map((p) => p.replace(/\s+\d+\.\d[\d.]*$/, ""));
  return [...new Set(names)].sort();
}

function libraries(assetHeads: Record<string, string> = {}): Record<string, string> {
  const libs: Record<string, string> = {};
  for (const head of Object.values(assetHeads)) {
    const jq = head.match(/jQuery (?:JavaScript Library )?v?(\d+\.\d+\.\d+)/i);
    if (jq) libs.jquery = jq[1];
    const bs = head.match(/Bootstrap v(\d+\.\d+\.\d+)/i);
    if (bs) libs.bootstrap = bs[1];
  }
  return libs;
}

const semverLt = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
};

function businessNames(html: string): string[] {
  const names = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: any) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(walk);
        const t = [].concat(n["@type"] ?? []).join(",");
        if (/Organization|Attorney|LegalService|LocalBusiness/.test(t) && typeof n.name === "string") names.add(decode(n.name));
        Object.values(n).forEach(walk);
      };
      walk(JSON.parse(m[1]));
    } catch { /* invalid JSON-LD is itself worth knowing, but skip */ }
  }
  // Logo images (class="custom-logo" or a file named *logo.png) usually carry the name in their alt text.
  for (const m of html.matchAll(/<img[^>]+alt=["']([^"']{12,})["'][^>]*>/gi))
    if (/class=["'][^"']*\blogo\b|src=["'][^"']*logo\.(?:png|svg|jpe?g|webp)["']/i.test(m[0])) names.add(decode(m[1]));
  const copy = html.match(/Copyright\s*(?:&copy;|©)\s*\d{4},?\s*([^<]+)/i)?.[1];
  if (copy) names.add(decode(copy).replace(/\.$/, ""));
  // Treat names that differ only in punctuation/case as the same.
  const key = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const seen = new Map<string, string>();
  for (const n of names) if (!seen.has(key(n))) seen.set(key(n), n);
  return [...seen.values()];
}

function duplicateLinks(html: string): string[] {
  const byText = new Map<string, Set<string>>();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = stripTags(m[2]);
    if (text.length < 4) continue;
    const set = byText.get(text) ?? new Set<string>();
    set.add(m[1].replace(/\/$/, ""));
    byText.set(text, set);
  }
  return [...byText.entries()].filter(([, urls]) => urls.size > 1).map(([t]) => t);
}

// --- analysis ---------------------------------------------------------------

export function analyzeSnapshot(s: SiteSnapshot, today = new Date()): AuditReport {
  const html = s.home.body;
  const h = s.home.headers;
  const phpVersion = h["x-powered-by"]?.match(/PHP\/([\d.]+)/i)?.[1] ?? null;
  const php = phpStatus(phpVersion, today);
  const wp = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']WordPress ([\d.]+)/i)?.[1] ?? null;
  const slug = themeSlug(html);
  const th = themeHeader(s.themeStylesheet);
  const isBlock = /wp-block-template-part|wp-site-blocks/.test(html);
  const libs = libraries(s.assetHeads);
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  // No alt, empty alt on a non-decorative image, or placeholder alt like "#".
  const missingAlt = imgs.filter((t) => !/\balt=["'][^"'#][^"']*["']/i.test(t)).length;
  const copyrightYear = Number(html.match(/Copyright\s*(?:&copy;|©)\s*(\d{4})/i)?.[1]) || null;
  const names = businessNames(html);
  const dupes = duplicateLinks(html);
  const cutoff = new Date(+today - 3 * 365 * 86_400_000);
  const stale = (s.pages ?? []).filter((p) => new Date(p.modified) < cutoff).sort((a, b) => a.modified.localeCompare(b.modified));
  const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? null;

  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  if (php.status === "end-of-life") {
    add({
      id: "php-eol", severity: "critical", area: "platform",
      title: `Server runs PHP ${phpVersion}, which stopped getting security fixes ${php.branch?.securityUntil ?? "years ago"}`,
      detail: `PHP ${php.branch?.branch ?? phpVersion} has been end-of-life for ${php.daysPastEol ?? "many"} days. Hosts are retiring it, and WordPress, plugins and themes increasingly require PHP 8.`,
      fix: `Move the site to PHP ${TARGET_PHP}+ with a theme and plugins tested on it.`,
    });
  } else if (php.status === "security-only") {
    add({ id: "php-security-only", severity: "medium", area: "platform", title: `PHP ${phpVersion} only gets security fixes until ${php.branch?.securityUntil}`, detail: "Plan the upgrade before it reaches end of life.", fix: `Test on PHP ${TARGET_PHP} and switch.` });
  }

  if (slug && !isBlock) {
    const custom = !th.author || !/wordpress\.org|automattic|the wordpress team/i.test(th.author);
    add({
      id: "legacy-theme", severity: php.status === "end-of-life" ? "high" : "medium", area: "platform",
      title: `Custom classic theme "${th.name ?? slug}"${th.version ? ` v${th.version}` : ""}${th.basedOn ? ` (built on ${th.basedOn})` : ""}`,
      detail: `${custom ? `A one-off theme${th.author ? ` by ${th.author}` : ""} that nobody maintains. ` : ""}Classic PHP themes of this age commonly use functions removed or made stricter in PHP 8 (each(), create_function(), count() on non-arrays, required-after-optional parameters), which turn into fatal errors after a PHP upgrade. Its PHP source isn't public, so the exact breakages can only be confirmed with server access.`,
      fix: "Replace it with a block theme (theme.json + patterns) that has no custom PHP beyond a few lines, tested on PHP 8.3.",
    });
  }

  if (libs.jquery && semverLt(libs.jquery, "3.5.0")) {
    add({ id: "old-jquery", severity: "high", area: "security", title: `Theme ships its own jQuery ${libs.jquery}`, detail: "jQuery before 3.5.0 has known cross-site-scripting flaws (CVE-2020-11022, CVE-2020-11023), and this copy bypasses the up-to-date jQuery that WordPress provides.", fix: "Drop the bundled copy; a block theme needs no jQuery at all." });
  }
  if (libs.bootstrap && semverLt(libs.bootstrap, "4.0.0")) {
    add({ id: "old-bootstrap", severity: "medium", area: "security", title: `Bootstrap ${libs.bootstrap} (end of life since 2019)`, detail: semverLt(libs.bootstrap, "3.4.1") ? "Versions before 3.4.1 have known XSS issues (CVE-2018-14040/14041/14042, CVE-2019-8331)." : "No longer maintained.", fix: "Replace with theme.json layout and core blocks." });
  }
  if (h["x-powered-by"]) add({ id: "version-leak", severity: "low", area: "security", title: "Server announces its PHP version to everyone", detail: `Every response carries "X-Powered-By: ${h["x-powered-by"]}", which tells attackers exactly which unpatched version to target.`, fix: "Turn off expose_php on the new host." });
  if (!h["strict-transport-security"]) add({ id: "no-hsts", severity: "low", area: "security", title: "No HSTS header", detail: "Browsers aren't told to always use HTTPS.", fix: "Enable HSTS on the new host." });
  if (s.xmlrpcStatus === 405 || s.xmlrpcStatus === 200) add({ id: "xmlrpc", severity: "low", area: "security", title: "XML-RPC endpoint is open", detail: "xmlrpc.php is a common brute-force target and is rarely needed.", fix: "Disable XML-RPC unless the Jetpack app or a publishing tool needs it." });

  if (missingAlt > 0) add({ id: "img-alt", severity: missingAlt > 5 ? "medium" : "low", area: "accessibility", title: `${missingAlt} of ${imgs.length} homepage images have no alt text`, detail: "Screen-reader users hear nothing for these, and ADA-related website demand letters often cite missing alt text.", fix: "Give every meaningful image alt text; mark decorative ones as such." });
  if (!metaDescription) add({ id: "meta-desc", severity: "medium", area: "seo", title: "No meta description on the homepage", detail: "Search results show an arbitrary snippet instead.", fix: "Write one per page." });
  if (dupes.length) add({ id: "dupe-links", severity: "medium", area: "content", title: `${dupes.length} link labels point to two different pages`, detail: `For example: ${dupes.slice(0, 4).map((d) => `"${d}"`).join(", ")}. Visitors and search engines see duplicate, competing pages.`, fix: "Merge the duplicates and redirect the old URLs." });
  if (names.length > 1) add({ id: "nap-mismatch", severity: "medium", area: "seo", title: `The firm's name appears ${names.length} different ways in the site's own data`, detail: names.map((n) => `"${n}"`).join(" vs "), fix: "Use one exact legal name everywhere (schema.org, footer, logo alt, directory listings) for local search." });
  if (copyrightYear && copyrightYear < today.getUTCFullYear()) add({ id: "stale-copyright", severity: "low", area: "content", title: `Footer says © ${copyrightYear}`, detail: "Signals an unmaintained site to visitors.", fix: "Generate the year automatically." });
  if (stale.length) add({ id: "stale-pages", severity: "low", area: "content", title: `${stale.length} pages untouched for 3+ years`, detail: stale.slice(0, 6).map((p) => `${p.slug} (${p.modified.slice(0, 10)})`).join(", "), fix: "Review and refresh during the migration." });

  const order: Severity[] = ["critical", "high", "medium", "low"];
  findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const count = (sev: Severity) => findings.filter((f) => f.severity === sev).length;

  return {
    url: s.url,
    auditedAt: s.fetchedAt,
    stack: {
      server: h["server"] ?? null,
      php: { version: phpVersion, status: php.status, eolDate: php.branch?.securityUntil, daysPastEol: php.daysPastEol, target: TARGET_PHP },
      wordpress: wp,
      theme: { slug, ...th, kind: slug ? (isBlock ? "block" : "classic") : "unknown" },
      plugins: plugins(html, s.restIndex?.body),
      libraries: libs,
    },
    content: {
      title: decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "") || null,
      metaDescription: metaDescription ? decode(metaDescription) : null,
      h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])),
      images: imgs.length,
      imagesMissingAlt: missingAlt,
      copyrightYear,
      duplicateLinks: dupes,
      businessNames: names,
      stalePages: stale,
      latestPostDate: s.latestPostDate ?? null,
    },
    findings,
    summary: { critical: count("critical"), high: count("high"), medium: count("medium"), low: count("low") },
  };
}

export async function auditSite(url: string, f: FetchLike = fetch) {
  const snapshot = await fetchSnapshot(url, f);
  return { snapshot, report: analyzeSnapshot(snapshot) };
}
