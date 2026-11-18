import Link from "next/link";
import { db } from "@/core/db";
import { PIPELINE_STAGES } from "@/core/types";
import { NEEDS_OWNER } from "@/pipeline/stages";
import { addClientAction, importFileAction, runJobsAction } from "./actions";

export default async function AdminHome() {
  const [clients, pendingEmails, queuedJobs, lastImports] = await Promise.all([
    db.client.findMany({ orderBy: { updatedAt: "desc" }, include: { sources: { select: { source: true } } } }),
    db.outboundMessage.count({ where: { status: "PENDING_APPROVAL" } }),
    db.job.count({ where: { status: "QUEUED" } }),
    db.importRun.findMany({ orderBy: { startedAt: "desc" }, take: 3 }),
  ]);
  const byStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, clients.filter((c) => c.stage === s).length]));

  return (
    <>
      <h1>Clients</h1>
      <div className="muted">
        {clients.filter((c) => NEEDS_OWNER.includes(c.stage as any)).length} need you ·{" "}
        <Link href="/admin/outbox">{pendingEmails} emails awaiting approval</Link> · {queuedJobs} queued jobs{" "}
        <form action={runJobsAction} style={{ display: "inline" }}><button>Run jobs now</button></form>
      </div>
      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PIPELINE_STAGES.filter((s) => byStage[s]).map((s) => (
          <span key={s} className={`pill ${NEEDS_OWNER.includes(s) ? "owner" : ""}`}>{s.replaceAll("_", " ").toLowerCase()}: {byStage[s]}</span>
        ))}
      </div>

      <div className="grid">
        <div className="card">
          <h3>Import a spreadsheet</h3>
          <form action={importFileAction}>
            <select name="source" defaultValue="discord_sheet">
              <option value="discord_sheet">Discord spreadsheet</option>
              <option value="quickbooks_csv">QuickBooks customer export</option>
            </select>
            <p><input type="file" name="file" accept=".csv,.xlsx" /></p>
            <button className="primary">Import</button>
          </form>
          {lastImports.map((r) => (
            <div key={r.id} className="muted" style={{ fontSize: 13 }}>
              {r.source}: {r.created} new, {r.updated} updated, {r.skipped} unchanged{Array.isArray(r.errors) && r.errors.length ? `, ${r.errors.length} rejected` : ""}
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Add a client</h3>
          <form action={addClientAction} style={{ display: "grid", gap: 6 }}>
            <input name="businessName" placeholder="Business name *" required />
            <input name="contactName" placeholder="Contact name" />
            <input name="email" type="email" placeholder="Email" />
            <input name="industry" placeholder="Industry" />
            <input name="city" placeholder="City" />
            <button className="primary">Add</button>
          </form>
        </div>
        <div className="card">
          <h3>QuickBooks (API)</h3>
          <p className="muted">Not connected yet. Use the QuickBooks customer export above for now. Run <code>npm run import -- quickbooks_api</code> once credentials are set.</p>
        </div>
      </div>

      <table>
        <thead><tr><th>Business</th><th>Contact</th><th>Stage</th><th>Sources</th></tr></thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/admin/clients/${c.id}`}>{c.businessName}</Link></td>
              <td>{c.contactName ?? ""} <span className="muted">{c.email ?? ""}</span></td>
              <td><span className={`pill ${NEEDS_OWNER.includes(c.stage as any) ? "owner" : ""}`}>{c.stage}</span></td>
              <td className="muted">{[...new Set(c.sources.map((s) => s.source))].join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
