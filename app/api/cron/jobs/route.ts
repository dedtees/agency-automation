// Vercel Cron calls this every minute (see vercel.json) to run queued jobs,
// since serverless hosting has no always-on worker. Vercel sends
// "Authorization: Bearer $CRON_SECRET" automatically when CRON_SECRET is set.
import { NextResponse } from "next/server";
import { getConfig } from "@/core/config";
import { db } from "@/core/db";
import { runDueJobs } from "@/jobs/queue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = getConfig().cronSecret;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ran = await runDueJobs(db);
  return NextResponse.json({ ran });
}
