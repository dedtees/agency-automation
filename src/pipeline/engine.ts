import type { Db } from "../core/db";
import type { PipelineStage } from "../core/types";
import { nextStage, type PipelineEventType } from "./stages";

export class InvalidTransitionError extends Error {
  constructor(public clientId: string, public from: string, public event: string) {
    super(`Client ${clientId}: cannot apply ${event} in stage ${from}`);
  }
}

/** Move a client to the next stage, recording an audit event. Idempotent when already there. */
export async function transition(
  db: Db,
  clientId: string,
  event: PipelineEventType,
  opts: { actor?: string; data?: Record<string, unknown>; allowNoop?: boolean } = {},
): Promise<PipelineStage> {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const from = client.stage as PipelineStage;
  const to = nextStage(from, event);
  if (!to) {
    if (opts.allowNoop) return from;
    throw new InvalidTransitionError(clientId, from, event);
  }
  await db.$transaction([
    db.client.update({ where: { id: clientId }, data: { stage: to } }),
    db.pipelineEvent.create({
      data: {
        clientId, type: event, fromStage: from, toStage: to,
        actor: opts.actor ?? "system", data: (opts.data ?? undefined) as any,
      },
    }),
  ]);
  return to;
}

export async function logEvent(db: Db, clientId: string, type: string, data?: Record<string, unknown>, actor = "system") {
  await db.pipelineEvent.create({ data: { clientId, type, actor, data: data as any } });
}
