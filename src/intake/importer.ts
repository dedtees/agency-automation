// Merges records from any source into the Client table.
// Match order: same source+externalId -> same email -> same normalized business name.
// Existing values are never overwritten with blanks; empty fields get filled in.
import type { Db } from "../core/db";
import type { IntakeRecord } from "../core/types";
import { logEvent } from "../pipeline/engine";
import { norm } from "./tabular";
import { getIntakeSource } from "./registry";
import type { IntakeInput } from "./types";

const FIELDS = ["businessName", "contactName", "email", "phone", "website", "industry", "city", "state", "notes"] as const;

export async function runImport(db: Db, sourceId: string, input: IntakeInput) {
  const source = getIntakeSource(sourceId);
  const run = await db.importRun.create({ data: { source: source.id } });
  const { records, rejected } = await source.load(input);
  let created = 0, updated = 0, skipped = 0;

  for (const rec of records) {
    const existing = await findMatch(db, source.id, rec);
    if (!existing) {
      const c = await db.client.create({
        data: {
          ...pick(rec),
          sources: { create: { source: source.id, externalId: rec.externalId, raw: rec.raw as any, importRunId: run.id } },
        },
      });
      await logEvent(db, c.id, "IMPORTED", { source: source.id, importRunId: run.id });
      created++;
      continue;
    }
    const fill: Record<string, string> = {};
    for (const f of FIELDS) if (!(existing as any)[f] && rec[f]) fill[f] = rec[f]!;
    await db.clientSource.upsert({
      where: { source_externalId: { source: source.id, externalId: rec.externalId } },
      create: { clientId: existing.id, source: source.id, externalId: rec.externalId, raw: rec.raw as any, importRunId: run.id },
      update: { raw: rec.raw as any, importRunId: run.id },
    });
    if (Object.keys(fill).length) {
      await db.client.update({ where: { id: existing.id }, data: fill });
      updated++;
    } else skipped++;
  }

  return db.importRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), created, updated, skipped, errors: rejected.length ? (rejected as any) : undefined },
  });
}

async function findMatch(db: Db, source: string, rec: IntakeRecord) {
  const link = await db.clientSource.findUnique({ where: { source_externalId: { source, externalId: rec.externalId } }, include: { client: true } });
  if (link) return link.client;
  if (rec.email) {
    const byEmail = await db.client.findFirst({ where: { email: rec.email } });
    if (byEmail) return byEmail;
  }
  // Name match: fine for a few hundred clients; move to a normalized column if this grows.
  const key = norm(rec.businessName);
  const candidates = await db.client.findMany({ select: { id: true, businessName: true } });
  const hit = candidates.find((c) => norm(c.businessName) === key);
  return hit ? db.client.findUnique({ where: { id: hit.id } }) : null;
}

const pick = (r: IntakeRecord) => Object.fromEntries(FIELDS.filter((f) => r[f]).map((f) => [f, r[f]])) as any;
