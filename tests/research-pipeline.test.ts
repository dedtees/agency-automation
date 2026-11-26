import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runDueJobs } from "../src/jobs/queue";
import { loadSnapshot } from "../src/research/snapshotFile";
import { approveConcepts, requestConcepts } from "../src/services/concepts";
import { auditClientSite, setClientProfile } from "../src/services/research";
import { db, resetDb } from "./helpers";

const storage = mkdtempSync(join(tmpdir(), "storage-"));
afterAll(() => { rmSync(storage, { recursive: true, force: true }); vi.unstubAllEnvs(); });
beforeEach(async () => {
  await resetDb();
  vi.stubEnv("CONCEPT_PROVIDER", "researched");
  vi.stubEnv("TEMPLATE_PROVIDER", "wp-block-theme");
  vi.stubEnv("CONCEPTS_PER_CLIENT", "2");
  vi.stubEnv("STORAGE_DIR", storage);
});

describe("research → concepts → WordPress packages", () => {
  it("audits, stores the profile, builds two installable themes and stops at the approval gate", async () => {
    const c = await db.client.create({ data: { businessName: "Savo Schalk Corsini Warner Gillespie O'Grodnick & Fisher", email: "info@centraljerseylaw.com", website: "https://centraljerseylaw.com/" } });
    const audit = await auditClientSite(db, c.id, loadSnapshot("case-studies/central-jersey-law/snapshot"));
    expect(audit).toMatchObject({ phpVersion: "7.4.33", critical: 1 });
    await setClientProfile(db, c.id, JSON.parse(readFileSync("case-studies/central-jersey-law/profile.json", "utf8")));

    await requestConcepts(db, c.id);
    await runDueJobs(db);
    const concepts = await db.concept.findMany({ where: { clientId: c.id }, orderBy: { createdAt: "asc" } });
    expect(concepts.map((x) => [x.name, x.generator])).toEqual([["Heritage", "researched"], ["Modern Counsel", "researched"]]);
    for (const x of concepts) expect(existsSync(join(storage, x.packagePath!))).toBe(true);
    expect(existsSync(join(storage, "themes/savo-schalk-heritage/theme.json"))).toBe(true);

    await approveConcepts(db, c.id);
    const msg = await db.outboundMessage.findFirstOrThrow({ where: { clientId: c.id } });
    expect(msg.status).toBe("PENDING_APPROVAL"); // nothing goes to the client without the owner
    const events = (await db.pipelineEvent.findMany({ where: { clientId: c.id } })).map((e) => e.type);
    expect(events).toEqual(expect.arrayContaining(["SITE_AUDITED", "PROFILE_UPDATED"]));
  });
});
