import type { IntakeSourceId } from "../core/types";
import { discordSheetSource } from "./sources/discordSheet";
import { manualSource } from "./sources/manual";
import { quickbooksApiSource } from "./sources/quickbooksApi";
import { quickbooksCsvSource } from "./sources/quickbooksCsv";
import type { IntakeSource } from "./types";

export const intakeSources: Record<IntakeSourceId, IntakeSource> = {
  manual: manualSource,
  quickbooks_csv: quickbooksCsvSource,
  quickbooks_api: quickbooksApiSource,
  discord_sheet: discordSheetSource,
};

export function getIntakeSource(id: string): IntakeSource {
  const s = (intakeSources as Record<string, IntakeSource>)[id];
  if (!s) throw new Error(`Unknown intake source: ${id}`);
  return s;
}
