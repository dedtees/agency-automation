import { beforeEach, describe, expect, it, vi } from "vitest";
import { findPreview } from "../src/research/previews";
import { caseStudyDir, runCaseStudy } from "../src/services/caseStudy";
import { db, resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
  vi.stubEnv("CONCEPT_PROVIDER", "library"); // case studies must ignore this and use "researched"
  vi.stubEnv("TEMPLATE_PROVIDER", "fake"); // what a hosted deploy uses
});

describe("bundled case study", () => {
  it("loads Central Jersey Law up to the approval gate, then gives a portal link once approved", async () => {
    const first = await runCaseStudy(db, caseStudyDir("central-jersey-law"), { actor: "owner" });
    expect(first.stage).toBe("CONCEPTS_IN_REVIEW");
    expect(first.concepts.map((c) => c.name)).toEqual(["Heritage", "Modern Counsel"]);
    expect(first.invite).toBeNull();
    expect((first.audit.report as any).summary.critical).toBe(1);

    const again = await runCaseStudy(db, caseStudyDir("central-jersey-law"), { approve: true });
    expect(again.client.id).toBe(first.client.id); // merged, not duplicated
    expect(again.invite?.status).toBe("PENDING_APPROVAL");
    expect(again.portalUrl).toMatch(/\/p\/[\w-]+$/);
  });

  it("rejects unknown case studies", () => {
    expect(() => caseStudyDir("../etc")).toThrow();
  });

  it("finds committed theme screenshots and refuses odd slugs", () => {
    expect(findPreview("savo-schalk-modern-counsel", "desktop-fold")).toMatch(/previews\/savo-schalk-modern-counsel-desktop-fold\.jpg$/);
    expect(findPreview("../etc/passwd", "desktop")).toBeUndefined();
  });
});
