import { describe, expect, it } from "vitest";
import { analyzeSnapshot, fetchSnapshot, type SiteSnapshot } from "../src/research/audit";
import { phpStatus } from "../src/research/phpSupport";
import { loadSnapshot } from "../src/research/snapshotFile";

// Real snapshot of the Central Jersey Law homepage, captured 2026-11-26.
const loadCjlSnapshot = (): SiteSnapshot => loadSnapshot("case-studies/central-jersey-law/snapshot");
const today = new Date("2026-11-26T12:00:00Z");

describe("php support table", () => {
  it("classifies versions", () => {
    expect(phpStatus("7.4.33", today)).toMatchObject({ status: "end-of-life", daysPastEol: 1459 });
    expect(phpStatus("8.1.2", today).status).toBe("end-of-life");
    expect(phpStatus("8.2.10", today).status).toBe("security-only");
    expect(phpStatus("8.3.6", today).status).toBe("security-only");
    expect(phpStatus("8.4.1", today).status).toBe("active");
    expect(phpStatus(null).status).toBe("unknown");
  });
});

describe("site audit (Central Jersey Law snapshot)", () => {
  const r = analyzeSnapshot(loadCjlSnapshot(), today);

  it("reads the stack", () => {
    expect(r.stack.php).toMatchObject({ version: "7.4.33", status: "end-of-life" });
    expect(r.stack.wordpress).toBe("6.9.12");
    expect(r.stack.theme).toMatchObject({ slug: "savo-schalk", name: "Savo Schalk", author: "cws", version: "1.0.0", basedOn: "Underscores", kind: "classic" });
    expect(r.stack.libraries).toEqual({ jquery: "1.11.1", bootstrap: "3.3.7" });
    expect(r.stack.plugins).toEqual(expect.arrayContaining(["All in One SEO", "Contact Form 7", "ExactMetrics", "Popup Maker", "Redirection", "Solid Security (iThemes)", "Akismet"]));
  });

  it("produces findings, worst first", () => {
    const ids = r.findings.map((f) => f.id);
    expect(ids[0]).toBe("php-eol");
    expect(ids).toEqual(expect.arrayContaining(["legacy-theme", "old-jquery", "old-bootstrap", "version-leak", "xmlrpc", "dupe-links", "nap-mismatch", "stale-copyright", "stale-pages", "img-alt"]));
    expect(r.content.duplicateLinks).toEqual(expect.arrayContaining(["Construction Litigation", "Workers Compensation", "Government Affairs and Election Law"]));
    expect(r.content.businessNames.length).toBeGreaterThanOrEqual(3);
    expect(r.content.copyrightYear).toBe(2022);
    expect(r.summary.critical).toBe(1);
  });
});

describe("fetchSnapshot", () => {
  it("collects home, REST index, theme header and library banners through the given fetch", async () => {
    const snap = loadCjlSnapshot();
    const seen: string[] = [];
    const fake = async (url: string) => {
      seen.push(url);
      const p = new URL(url).pathname;
      const body =
        p === "/" ? snap.home.body :
        p === "/wp-json/" ? snap.restIndex!.body :
        p.endsWith("/style.css") ? snap.themeStylesheet! :
        snap.assetHeads![p] ?? (p.startsWith("/wp-json/wp/v2/pages") ? JSON.stringify(snap.pages) : p.startsWith("/wp-json/wp/v2/posts") ? `[{"date":"${snap.latestPostDate}"}]` : "");
      return new Response(body, { status: p === "/xmlrpc.php" ? 405 : 200, headers: p === "/" ? snap.home.headers : {} });
    };
    const got = await fetchSnapshot("https://centraljerseylaw.com/", fake as any);
    expect(seen.some((u) => u.endsWith("/js/jquery.js"))).toBe(true);
    const r = analyzeSnapshot(got, today);
    expect(r.stack.libraries.jquery).toBe("1.11.1");
    expect(r.stack.php.version).toBe("7.4.33");
    expect(got.xmlrpcStatus).toBe(405);
  });
});
