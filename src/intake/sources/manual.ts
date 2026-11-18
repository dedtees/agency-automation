// Manual entry from the admin form or a JSON payload.
import { IntakeRecordSchema } from "../../core/types";
import { slug } from "../tabular";
import type { IntakeSource } from "../types";

export const manualSource: IntakeSource = {
  id: "manual",
  label: "Manual entry",
  async load({ records = [] }) {
    const out = { records: [] as any[], rejected: [] as any[] };
    records.forEach((r: any, i) => {
      const externalId = r?.externalId ?? `manual:${slug(r?.email || r?.businessName || String(i))}`;
      const p = IntakeRecordSchema.safeParse({ ...r, externalId });
      p.success ? out.records.push(p.data) : out.rejected.push({ row: i + 1, reason: p.error.message, raw: r });
    });
    return out;
  },
};
