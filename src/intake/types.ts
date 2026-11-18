import type { IntakeRecord, IntakeSourceId } from "../core/types";

/** Input handed to a source. File-based sources get bytes; API sources ignore it. */
export interface IntakeInput {
  fileName?: string;
  data?: Buffer | string;
  /** Manual entry / JSON payloads. */
  records?: unknown[];
  /** Optional header overrides: { businessName: "Server Name", email: "Contact Email" } */
  columnMap?: Partial<Record<keyof IntakeRecord, string>>;
}

export interface IntakeResult {
  records: IntakeRecord[];
  rejected: { row: number; reason: string; raw?: unknown }[];
}

export interface IntakeSource {
  id: IntakeSourceId;
  label: string;
  load(input: IntakeInput): Promise<IntakeResult>;
}
