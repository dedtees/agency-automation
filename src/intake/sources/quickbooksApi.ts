// QuickBooks Online Accounting API: pulls active Customers.
// STUB STATUS: mapping is implemented and tested; the network calls run only once
// QUICKBOOKS_* credentials are set (an Intuit developer app + OAuth refresh token).
import { getConfig } from "../../core/config";
import { IntakeRecordSchema, type IntakeRecord } from "../../core/types";
import type { IntakeResult, IntakeSource } from "../types";

export interface QbCustomer {
  Id: string;
  DisplayName?: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  Active?: boolean;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  WebAddr?: { URI?: string };
  BillAddr?: { City?: string; CountrySubDivisionCode?: string };
  Notes?: string;
}

export function mapQbCustomer(c: QbCustomer): IntakeRecord | null {
  const contact = [c.GivenName, c.FamilyName].filter(Boolean).join(" ") || undefined;
  const p = IntakeRecordSchema.safeParse({
    externalId: `qbo:${c.Id}`,
    businessName: c.CompanyName || c.DisplayName || contact,
    contactName: contact,
    email: c.PrimaryEmailAddr?.Address?.toLowerCase() || undefined,
    phone: c.PrimaryPhone?.FreeFormNumber,
    website: c.WebAddr?.URI,
    city: c.BillAddr?.City,
    state: c.BillAddr?.CountrySubDivisionCode,
    notes: c.Notes,
    raw: c as any,
  });
  return p.success ? p.data : null;
}

async function getAccessToken(): Promise<string> {
  const { quickbooks: q } = getConfig();
  if (!q.clientId || !q.clientSecret || !q.refreshToken) throw new Error("QuickBooks API not configured (QUICKBOOKS_CLIENT_ID/SECRET/REFRESH_TOKEN)");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${q.clientId}:${q.clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: q.refreshToken }),
  });
  if (!res.ok) throw new Error(`QuickBooks token refresh failed: ${res.status}`);
  // TODO: persist the rotated refresh_token (Intuit rotates it) in a settings table.
  return (await res.json()).access_token;
}

export const quickbooksApiSource: IntakeSource = {
  id: "quickbooks_api",
  label: "QuickBooks Online (API)",
  async load(): Promise<IntakeResult> {
    const { quickbooks: q } = getConfig();
    const token = await getAccessToken();
    const base = q.environment === "production" ? "https://quickbooks.api.intuit.com" : "https://sandbox-quickbooks.api.intuit.com";
    const out: IntakeResult = { records: [], rejected: [] };
    for (let start = 1; ; start += 1000) {
      const query = `select * from Customer where Active = true startposition ${start} maxresults 1000`;
      const res = await fetch(`${base}/v3/company/${q.realmId}/query?query=${encodeURIComponent(query)}&minorversion=75`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`QuickBooks query failed: ${res.status}`);
      const customers: QbCustomer[] = (await res.json()).QueryResponse?.Customer ?? [];
      customers.forEach((c, i) => {
        const r = mapQbCustomer(c);
        r ? out.records.push(r) : out.rejected.push({ row: start + i, reason: "missing name", raw: c });
      });
      if (customers.length < 1000) break;
    }
    return out;
  },
};
