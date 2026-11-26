import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as adminGET } from "../app/admin/site/[conceptId]/[[...path]]/route";
import { GET, POST } from "../app/p/[token]/site/[conceptId]/[[...path]]/route";
import { findSiteDir } from "../src/research/previews";
import { parseProfile } from "../src/research/profile";
import { caseStudyDir, runCaseStudy } from "../src/services/caseStudy";
import { buildLawFirmTheme } from "../src/sites/lawFirm/load";
import { db, resetDb } from "./helpers";

const SITE = join(process.cwd(), "case-studies/central-jersey-law/site");
const text = (v: string | Buffer | undefined) => (v === undefined ? "" : v.toString());

describe("law firm site theme", () => {
  for (const design of ["heritage", "modern"] as const) {
    it(`renders the full ${design} site`, () => {
      const t = buildLawFirmTheme(SITE, design, `savo-schalk-${design}`, { agencyName: "Test Agency" });
      expect(t.pages).toHaveLength(40);
      for (const f of ["style.css", "functions.php", "theme.json", "patterns/header.php", "patterns/footer.php", "inc/contact-form.php", "readme.txt", "assets/css/site.css"]) expect(t.files[f], f).toBeDefined();
      expect(() => JSON.parse(text(t.files["theme.json"]))).not.toThrow();
      expect(text(t.files["style.css"])).toMatch(/Theme Name: Savo Schalk/);
      // Links in PHP patterns go through home_url(); page content keeps the installer's tokens.
      expect(text(t.files["patterns/header.php"])).not.toContain("{{HOME}}");
      const home = text(t.files["content/pages/home.html"]);
      expect(home).toContain("{{HOME}}/contact/");
      expect(home).toContain("[ss_contact_form");
      expect(home).not.toMatch(/<script/i);
      // Names with apostrophes are escaped, and no build-time details leak.
      const all = Object.values(t.files).filter((v) => typeof v === "string").join("\n");
      expect(all).toContain("O&#039;Grodnick");
      expect(all).not.toMatch(/claude-|anthropic/i);
      expect(all).not.toContain("127.0.0.1");
    });
  }

  it("reads the site folder from the client profile", () => {
    const profile = parseProfile(require("../case-studies/central-jersey-law/profile.json"));
    expect(profile?.siteContent).toBe("case-studies/central-jersey-law/site");
    expect(parseProfile({ ...require("../case-studies/central-jersey-law/profile.json"), siteContent: "../etc" })).toBeNull();
  });

  it("finds committed site exports and refuses odd slugs", () => {
    expect(findSiteDir("savo-schalk-heritage")).toMatch(/previews\/sites\/savo-schalk-heritage$/);
    expect(findSiteDir("../etc")).toBeUndefined();
  });
});

describe("portal site route", () => {
  beforeEach(async () => {
    await resetDb();
    vi.stubEnv("TEMPLATE_PROVIDER", "fake");
  });

  it("serves the approved concept's pages and assets, nothing else", async () => {
    const r = await runCaseStudy(db, caseStudyDir("central-jersey-law"), { approve: true });
    const token = r.portalUrl!.split("/p/")[1];
    const concept = r.concepts.find((c) => c.name === "Heritage")!;
    const call = (path?: string[], tok = token, conceptId = concept.id) => GET(new Request("http://x"), { params: Promise.resolve({ token: tok, conceptId, path }) });

    const home = await call();
    expect(home.status).toBe(200);
    const html = await home.text();
    expect(html).toContain(`<base href="/p/${token}/site/${concept.id}/">`);
    expect(html).toContain("Savo Schalk");

    const bio = await call(["attorneys", "steven-k-warner"]);
    expect(await bio.text()).toContain(`<base href="/p/${token}/site/${concept.id}/attorneys/steven-k-warner/">`);

    expect((await call(["..", "..", "package.json"])).status).toBe(404);
    expect((await call(["nope"])).status).toBe(404);
    expect((await call(undefined, "bad-token")).status).toBe(404);
    expect((await call(undefined, token, "not-a-concept")).status).toBe(404);

    const post = await POST(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ token, conceptId: concept.id }) });
    expect(post.status).toBe(303);
    expect(post.headers.get("location")).toBe(`/p/${token}/site/${concept.id}/contact/thank-you/`);
  });

  it("lets the owner open a concept's website before it is approved", async () => {
    const r = await runCaseStudy(db, caseStudyDir("central-jersey-law"));
    const concept = r.concepts.find((c) => c.name === "Modern Counsel")!;
    const call = (path?: string[], conceptId = concept.id) => adminGET(new Request("http://x"), { params: Promise.resolve({ conceptId, path }) });
    const home = await call();
    expect(home.status).toBe(200);
    expect(await home.text()).toContain(`<base href="/admin/site/${concept.id}/">`);
    expect((await call(["..", "package.json"])).status).toBe(404);
    expect((await call(undefined, "nope")).status).toBe(404);
  });
});
