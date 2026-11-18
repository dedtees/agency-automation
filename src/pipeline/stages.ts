// The pipeline as an explicit state machine. Every stage change goes through
// `transition()` in engine.ts, which checks this table and writes an audit event.
import type { PipelineStage } from "../core/types";

export type PipelineEventType =
  | "REQUEST_CONCEPTS"
  | "CONCEPTS_GENERATED"
  | "CONCEPTS_APPROVED"
  | "INVITE_SENT"
  | "PORTAL_ACTIVITY"
  | "FAVORITE_CHOSEN"
  | "CHECKOUT_CREATED"
  | "PAYMENT_CONFIRMED"
  | "FULFILLMENT_STARTED"
  | "FULFILLMENT_COMPLETE"
  | "HOLD"
  | "MARK_LOST"
  | "REOPEN";

/** event -> allowed source stages -> target stage */
export const TRANSITIONS: Record<PipelineEventType, { from: PipelineStage[] | "*"; to: PipelineStage }> = {
  REQUEST_CONCEPTS:     { from: ["NEW", "CONCEPTS_IN_REVIEW"], to: "CONCEPTS_QUEUED" },
  CONCEPTS_GENERATED:   { from: ["CONCEPTS_QUEUED"], to: "CONCEPTS_IN_REVIEW" },
  CONCEPTS_APPROVED:    { from: ["CONCEPTS_IN_REVIEW"], to: "READY_TO_INVITE" },
  INVITE_SENT:          { from: ["READY_TO_INVITE"], to: "INVITED" },
  PORTAL_ACTIVITY:      { from: ["INVITED"], to: "REVIEWING" },
  FAVORITE_CHOSEN:      { from: ["INVITED", "REVIEWING", "FAVORITE_SELECTED", "CHECKOUT_STARTED"], to: "FAVORITE_SELECTED" },
  CHECKOUT_CREATED:     { from: ["FAVORITE_SELECTED", "CHECKOUT_STARTED"], to: "CHECKOUT_STARTED" },
  PAYMENT_CONFIRMED:    { from: ["CHECKOUT_STARTED"], to: "PAID" },
  FULFILLMENT_STARTED:  { from: ["PAID"], to: "FULFILLING" },
  FULFILLMENT_COMPLETE: { from: ["FULFILLING"], to: "DELIVERED" },
  HOLD:                 { from: "*", to: "ON_HOLD" },
  MARK_LOST:            { from: "*", to: "LOST" },
  REOPEN:               { from: ["ON_HOLD", "LOST"], to: "NEW" },
};

export function nextStage(current: PipelineStage, event: PipelineEventType): PipelineStage | null {
  const t = TRANSITIONS[event];
  if (t.from === "*" || t.from.includes(current)) return t.to;
  return null;
}

/** Stages where the pipeline is waiting on Eric rather than the client or a job. */
export const NEEDS_OWNER: PipelineStage[] = ["NEW", "CONCEPTS_IN_REVIEW", "READY_TO_INVITE"];
