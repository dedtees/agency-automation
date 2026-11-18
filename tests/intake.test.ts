import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { runImport } from "../src/intake/importer";
import { discordSheetSource } from "../src/intake/sources/discordSheet";
import { mapQbCustomer } from "../src/intake/sources/quickbooksApi";
import { quickbooksCsvSource } from "../src/intake/sources/quickbooksCsv";
import { db, resetDb } from "./helpers";

const fx = (f: string) => readFileSync(`tests/fixtures/${f}`);

describe("intake sources", () => {
  it("parses the Discord CSV with loose headers and skips blank rows", async () => {
    const r = await discordSheetSource.load({ fileName: "d.csv", data: fx("discord-sample.csv") });
    expect(r.records.map((x) => x.businessName)).toEqual(["Bergen Plumbing Co", "Sweet Sarah's Bakery", "Shore Auto Detail"]);
    expect(r.records[1].email).toBe("sarah@sweetsarahs.test");
    expect(r.records[0].externalId).toBe("discord:111");
    expect(r.records[0].industry).toBe("Plumbing");
    expect(r.records[0].notes).toMatch(/booking/);
  });

  it("parses the Discord sheet as XLSX too", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Clients");
    ws.addRow(["Server Name", "Contact Email", "Owner"]);
    ws.addRow(["Jersey Fit Gym", "hi@jerseyfit.test", "Dee"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const r = await discordSheetSource.load({ fileName: "d.xlsx", data: buf });
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({ businessName: "Jersey Fit Gym", email: "hi@jerseyfit.test", contactName: "Dee" });
  });

  it("honors a manual column map", async () => {
    const csv = "Shop,Mail\nAcme,a@acme.test\n";
    const r = await discordSheetSource.load({ fileName: "x.csv", data: csv, columnMap: { businessName: "Shop", email: "Mail" } });
    expect(r.records[0]).toMatchObject({ businessName: "Acme", email: "a@acme.test" });
  });

  it("parses a QuickBooks customer export", async () => {
    const r = await quickbooksCsvSource.load({ fileName: "qb.csv", data: fx("quickbooks-customers.csv") });
    expect(r.records).toHaveLength(2);
    expect(r.records[0]).toMatchObject({ businessName: "Bergen Plumbing Co", contactName: "Mike Bianchi", city: "Hackensack" });
  });

  it("maps a QuickBooks API customer", () => {
    const r = mapQbCustomer({ Id: "58", DisplayName: "Ana Ruiz", CompanyName: "Garden State Landscaping LLC", GivenName: "Ana", FamilyName: "Ruiz", PrimaryEmailAddr: { Address: "Ana@GSLandscaping.test" }, BillAddr: { City: "Newark", CountrySubDivisionCode: "NJ" } });
    expect(r).toMatchObject({ externalId: "qbo:58", businessName: "Garden State Landscaping LLC", email: "ana@gslandscaping.test", state: "NJ" });
  });
});

describe("importer merge", () => {
  beforeEach(resetDb);

  it("de-duplicates across sources by email and fills blanks without overwriting", async () => {
    const a = await runImport(db, "discord_sheet", { fileName: "d.csv", data: fx("discord-sample.csv") });
    expect(a).toMatchObject({ created: 3 });
    const b = await runImport(db, "quickbooks_csv", { fileName: "qb.csv", data: fx("quickbooks-customers.csv") });
    expect(b).toMatchObject({ created: 1, updated: 1 }); // Bergen merged (website/contact filled), Garden State new
    const bergen = await db.client.findFirstOrThrow({ where: { email: "mike@bergenplumbing.test" }, include: { sources: true } });
    expect(bergen.sources.map((s) => s.source).sort()).toEqual(["discord_sheet", "quickbooks_csv"]);
    expect(bergen.website).toBe("bergenplumbing.test");
    expect(bergen.industry).toBe("Plumbing");
    expect(await db.client.count()).toBe(4);

    const again = await runImport(db, "discord_sheet", { fileName: "d.csv", data: fx("discord-sample.csv") });
    expect(again).toMatchObject({ created: 0 });
    expect(await db.client.count()).toBe(4);
  });

  it("accepts manual entries and matches by business name", async () => {
    await runImport(db, "manual", { records: [{ businessName: "Shore Auto Detail", phone: "732-555-0199" }] });
    await runImport(db, "discord_sheet", { fileName: "d.csv", data: fx("discord-sample.csv") });
    expect(await db.client.count({ where: { businessName: "Shore Auto Detail" } })).toBe(1);
  });
});
