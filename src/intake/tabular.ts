// Shared spreadsheet handling for CSV and XLSX: read rows, then map columns
// to IntakeRecord fields using header aliases (case/space-insensitive).
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { IntakeRecordSchema, type IntakeRecord } from "../core/types";
import type { IntakeInput, IntakeResult } from "./types";

export type Row = Record<string, string>;
export type Aliases = Partial<Record<keyof IntakeRecord, string[]>>;

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function readRows(input: IntakeInput): Promise<Row[]> {
  if (input.data == null) throw new Error("No file data provided");
  const name = (input.fileName ?? "").toLowerCase();
  if (name.endsWith(".xlsx")) return readXlsx(Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data));
  const text = Buffer.isBuffer(input.data) ? input.data.toString("utf8") : input.data;
  return parse(text.replace(/^﻿/, ""), { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
}

async function readXlsx(buf: Buffer): Promise<Row[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as any);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => (headers[i] = String(c.text ?? "").trim()));
  const rows: Row[] = [];
  ws.eachRow((r, n) => {
    if (n === 1) return;
    const row: Row = {};
    r.eachCell({ includeEmpty: true }, (c, i) => { if (headers[i]) row[headers[i]] = String(c.text ?? "").trim(); });
    if (Object.values(row).some(Boolean)) rows.push(row);
  });
  return rows;
}

export function mapRows(
  rows: Row[],
  aliases: Aliases,
  opts: { columnMap?: IntakeInput["columnMap"]; externalId: (r: Row, mapped: Partial<IntakeRecord>, i: number) => string },
): IntakeResult {
  const out: IntakeResult = { records: [], rejected: [] };
  if (!rows.length) return out;
  const headers = Object.keys(rows[0]);
  const byNorm = new Map(headers.map((h) => [norm(h), h]));
  const colFor = (field: keyof IntakeRecord): string | undefined => {
    const override = opts.columnMap?.[field];
    if (override) return byNorm.get(norm(override));
    for (const a of aliases[field] ?? []) { const h = byNorm.get(norm(a)); if (h) return h; }
    return undefined;
  };
  const fields = ["businessName", "contactName", "email", "phone", "website", "industry", "city", "state", "notes"] as const;
  const cols = Object.fromEntries(fields.map((f) => [f, colFor(f)])) as Record<(typeof fields)[number], string | undefined>;

  rows.forEach((r, i) => {
    const m: Partial<IntakeRecord> = {};
    for (const f of fields) { const c = cols[f]; const v = c ? r[c]?.trim() : ""; if (v) (m as any)[f] = v; }
    if (m.email) m.email = m.email.split(/[;,\s]+/)[0].toLowerCase();
    if (!m.businessName && m.contactName) m.businessName = m.contactName;
    const parsed = IntakeRecordSchema.safeParse({ ...m, externalId: opts.externalId(r, m, i), raw: r });
    if (parsed.success) out.records.push(parsed.data);
    else out.rejected.push({ row: i + 2, reason: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "), raw: r });
  });
  return out;
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
