"use server";
// Owner actions from the admin dashboard.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/core/db";
import { runImport } from "@/intake/importer";
import { runDueJobs } from "@/jobs/queue";
import { approveConcepts, requestConcepts } from "@/services/concepts";
import { approveMessage, rejectMessage } from "@/services/outreach";
import { transition } from "@/pipeline/engine";
import { createPortalLink } from "@/services/portal";
import { SAMPLE_DISCORD_CSV, SAMPLE_QUICKBOOKS_CSV } from "@/samples";
import { caseStudyDir, runCaseStudy } from "@/services/caseStudy";

export async function importFileAction(form: FormData) {
  const file = form.get("file") as File | null;
  const source = String(form.get("source"));
  if (!file || !file.size) throw new Error("Choose a file");
  await runImport(db, source, { fileName: file.name, data: Buffer.from(await file.arrayBuffer()) });
  revalidatePath("/admin");
}

export async function addClientAction(form: FormData) {
  const rec = Object.fromEntries([...form.entries()].filter(([, v]) => String(v).trim()).map(([k, v]) => [k, String(v).trim()]));
  await runImport(db, "manual", { records: [rec] });
  revalidatePath("/admin");
}

export async function requestConceptsAction(clientId: string) {
  await requestConcepts(db, clientId);
  await runDueJobs(db); // dev convenience; in production the worker picks it up
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function approveConceptsAction(clientId: string, form: FormData) {
  const ids = form.getAll("conceptId").map(String);
  await approveConcepts(db, clientId, "owner", ids.length ? ids : undefined);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function approveMessageAction(id: string, form: FormData) {
  await approveMessage(db, id, "owner", { subject: String(form.get("subject")), body: String(form.get("body")) });
  await runDueJobs(db);
  revalidatePath("/admin/outbox");
}

export async function rejectMessageAction(id: string) {
  await rejectMessage(db, id);
  revalidatePath("/admin/outbox");
}

export async function holdClientAction(clientId: string) {
  await transition(db, clientId, "HOLD", { actor: "owner" });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function runJobsAction() {
  await runDueJobs(db);
  revalidatePath("/admin");
}

/** Loads a few fictional clients so the prototype has something to click through. */
export async function loadSampleDataAction() {
  await runImport(db, "discord_sheet", { fileName: "sample-discord.csv", data: SAMPLE_DISCORD_CSV });
  await runImport(db, "quickbooks_csv", { fileName: "sample-quickbooks.csv", data: SAMPLE_QUICKBOOKS_CSV });
  revalidatePath("/admin");
}

/** Opens the client's portal as the client sees it, without counting as client activity. */
export async function viewAsClientAction(clientId: string) {
  const { token } = await createPortalLink(db, clientId);
  redirect(`/p/${token}?preview=1`);
}

/** Loads a real client from case-studies/<slug> (intake, audit, profile, concepts) and opens it.
 * Stops at the approval gate: the owner approves the concepts before the client can see them. */
export async function loadCaseStudyAction(slug: string) {
  const { client } = await runCaseStudy(db, caseStudyDir(slug), { actor: "owner" });
  revalidatePath("/admin");
  redirect(`/admin/clients/${client.id}`);
}
