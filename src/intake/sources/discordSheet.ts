// The spreadsheet Eric consolidates from Discord (CSV or XLSX).
// Column names are matched loosely; anything unusual can be mapped with `columnMap`.
import { mapRows, readRows, slug, type Aliases } from "../tabular";
import type { IntakeSource } from "../types";

export const DISCORD_ALIASES: Aliases = {
  businessName: ["business name", "business", "company", "company name", "brand", "server name", "client"],
  contactName: ["contact", "contact name", "name", "owner", "full name"],
  email: ["email", "email address", "contact email", "e-mail"],
  phone: ["phone", "phone number", "mobile", "cell"],
  website: ["website", "site", "url", "current website", "domain"],
  industry: ["industry", "niche", "category", "business type", "type"],
  city: ["city", "town"],
  state: ["state", "st"],
  notes: ["notes", "note", "comments", "what they want", "request", "message"],
};

export const discordSheetSource: IntakeSource = {
  id: "discord_sheet",
  label: "Discord spreadsheet (CSV/XLSX)",
  async load(input) {
    const rows = await readRows(input);
    return mapRows(rows, DISCORD_ALIASES, {
      columnMap: input.columnMap,
      externalId: (r, m, i) => {
        const discordId = Object.entries(r).find(([k]) => /discord.?(user)?.?id/i.test(k))?.[1];
        return `discord:${discordId || slug(m.email || m.businessName || `row-${i}`)}`;
      },
    });
  },
};
