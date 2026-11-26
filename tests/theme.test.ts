import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { researchedGenerator } from "../src/integrations/concepts/researched";
import { renderTheme } from "../src/integrations/templates/wp/theme";
import { createZip } from "../src/integrations/templates/zip";
import { signedDownloadUrl, verifyDownload } from "../src/services/downloads";

const profile = JSON.parse(readFileSync("case-studies/central-jersey-law/profile.json", "utf8"));
const client = { businessName: "Savo Schalk Corsini Warner Gillespie O'Grodnick & Fisher", profile };
const tmp = mkdtempSync(join(tmpdir(), "theme-test-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const asBuild = (d: any, i: number) => ({ id: `concept${i}xxxxxxxx`, name: d.name, templateKey: d.templateKey, palette: d.palette, styleDirection: d.styleDirection, client,
  sections: d.sections.map((s: any, position: number) => ({ ...s, position })) });

describe("researched concepts", () => {
  it("writes two different concepts from the profile, with no placeholder copy", async () => {
    const drafts = await researchedGenerator.generate({ businessName: client.businessName, profile }, 3);
    expect(drafts.map((d) => d.name)).toEqual(["Heritage", "Modern Counsel"]);
    expect(drafts[0].sections.map((s) => s.kind)).not.toEqual(drafts[1].sections.map((s) => s.kind));
    const all = JSON.stringify(drafts);
    expect(all).not.toMatch(/\[Replace|\[Customer quote|Service one/);
    expect(all).toContain("Land Use, Zoning & Environmental");
    expect(all).toContain("Kelly M. Carey");
  });
  it("falls back to the starter library without a profile", async () => {
    const drafts = await researchedGenerator.generate({ businessName: "Bergen Plumbing" }, 2);
    expect(drafts[0].templateKey).toMatch(/^starter-/);
  });
});

describe("WordPress block theme", async () => {
  const drafts = await researchedGenerator.generate({ businessName: client.businessName, profile }, 2);
  const themes = drafts.map((d, i) => renderTheme(asBuild(d, i) as any, { agencyName: "Test Agency" }));

  it("has the files WordPress needs", () => {
    for (const t of themes) {
      for (const f of ["style.css", "theme.json", "functions.php", "templates/index.html", "templates/front-page.html", "parts/header.html", "parts/footer.html", "patterns/hero.php"])
        expect(Object.keys(t.files)).toContain(f);
      expect(t.files["style.css"]).toMatch(/Theme Name: .+\nAuthor: Test Agency/);
      expect(t.files["style.css"]).toContain("Requires PHP: 8.1");
      const tj = JSON.parse(t.files["theme.json"]);
      expect(tj.version).toBe(3);
      expect(tj.settings.color.palette.map((c: any) => c.slug)).toEqual(expect.arrayContaining(["primary", "accent", "base"]));
    }
    expect(themes.map((t) => t.slug)).toEqual(["savo-schalk-heritage", "savo-schalk-modern-counsel"]);
  });

  it("front page references every section pattern, and block comments are balanced", () => {
    for (const t of themes) {
      const front = t.files["templates/front-page.html"];
      for (const f of Object.keys(t.files).filter((f) => f.startsWith("patterns/") && f !== "patterns/footer.php"))
        expect(front).toContain(`"slug":"${t.slug}/${f.slice(9, -4)}"`);
      for (const [f, src] of Object.entries(t.files).filter(([f]) => /\.(html|php)$/.test(f))) {
        const opens = [...src.matchAll(/<!-- wp:([a-z0-9/-]+)(?: \{.*?\})? -->/g)].map((m) => m[1]);
        const closes = [...src.matchAll(/<!-- \/wp:([a-z0-9/-]+) -->/g)].map((m) => m[1]);
        expect(closes.sort(), f).toEqual(opens.sort());
      }
    }
  });

  it("escapes client text so it can't inject HTML or PHP", () => {
    const evil = asBuild({ ...drafts[0], sections: [{ kind: "HERO", title: "Hero", content: { headline: "<?php system('id'); ?><script>x</script>", primaryCta: { label: "Go", href: "javascript:alert(1)" } } }] }, 9);
    const t = renderTheme(evil as any);
    const hero = t.files["patterns/hero.php"];
    expect(hero).not.toContain("<?php system");
    expect(hero).not.toContain("<script>");
    expect(hero).not.toContain("javascript:");
    expect(hero).toContain("&lt;?php");
  });

  it("PHP files lint clean on the installed PHP", () => {
    let php = true;
    try { execFileSync("php", ["-v"], { stdio: "ignore" }); } catch { php = false; }
    if (!php) return;
    for (const t of themes) for (const [f, src] of Object.entries(t.files).filter(([f]) => f.endsWith(".php"))) {
      const path = join(tmp, `${t.slug}-${f.replace(/\//g, "_")}`);
      writeFileSync(path, src);
      expect(execFileSync("php", ["-l", path]).toString()).toContain("No syntax errors");
    }
  });

  it("zips into an archive that unzip accepts", () => {
    const zip = createZip(Object.entries(themes[0].files).map(([n, d]) => ({ name: `${themes[0].slug}/${n}`, data: d })));
    const path = join(tmp, "t.zip");
    writeFileSync(path, zip);
    let unzip = true;
    try { execFileSync("unzip", ["-v"], { stdio: "ignore" }); } catch { unzip = false; }
    if (!unzip) return expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    const out = execFileSync("unzip", ["-t", path]).toString();
    expect(out).toContain("No errors detected");
    expect(out).toContain(`${themes[0].slug}/theme.json`);
  });
});

describe("signed download links", () => {
  it("accepts a fresh link and rejects tampered, expired or path-escaping ones", () => {
    const url = new URL(signedDownloadUrl("packages/savo-schalk-heritage-abc.zip", 60));
    expect(verifyDownload(url.searchParams)).toMatch(/storage\/packages\/savo-schalk-heritage-abc\.zip$/);
    const bad = new URLSearchParams(url.searchParams); bad.set("f", "other.zip");
    expect(verifyDownload(bad)).toBeNull();
    expect(verifyDownload(url.searchParams, Date.now() + 120_000)).toBeNull();
    const esc = new URLSearchParams(url.searchParams); esc.set("f", "../.env");
    expect(verifyDownload(esc)).toBeNull();
  });
});
