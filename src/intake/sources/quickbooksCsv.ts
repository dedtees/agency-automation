// QuickBooks Online "Customer Contact List" export (Reports > Customer Contact List > Export to Excel/CSV).
// Works today with no API credentials.
import { mapRows, readRows, slug, type Aliases } from "../tabular";
import type { IntakeSource } from "../types";

export const QB_CSV_ALIASES: Aliases = {
  businessName: ["company name", "company", "customer", "customer name", "display name", "customer full name"],
  contactName: ["full name", "contact", "name", "primary contact"],
  email: ["email", "email address", "main email"],
  phone: ["phone", "phone numbers", "phone number", "main phone", "mobile"],
  website: ["website", "web site", "web address"],
  city: ["billing city", "city", "bill city"],
  state: ["billing state", "state", "bill state"],
  notes: ["notes", "note"],
};

export const quickbooksCsvSource: IntakeSource = {
  id: "quickbooks_csv",
  label: "QuickBooks export (CSV/XLSX)",
  async load(input) {
    const rows = await readRows(input);
    return mapRows(rows, QB_CSV_ALIASES, {
      columnMap: input.columnMap,
      externalId: (r, m, i) => `qb:${slug(r["Customer"] || m.businessName || m.email || `row-${i}`)}`,
    });
  },
};
