import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/core/db";
import { feedbackSummary } from "@/services/portal";
import { approveConceptsAction, holdClientAction, requestConceptsAction } from "../../actions";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    include: {
      concepts: { where: { status: { not: "ARCHIVED" } }, include: { sections: { orderBy: { position: "asc" } } } },
      events: { orderBy: { createdAt: "desc" }, take: 30 },
      orders: { include: { deployment: true, delivery: true } },
      messages: { orderBy: { createdAt: "desc" } },
      sources: true,
    },
  });
  if (!client) notFound();
  const summary = await feedbackSummary(db, id);
  const drafts = client.concepts.filter((c) => c.status === "DRAFT");

  return (
    <>
      <p><Link href="/admin">← Clients</Link></p>
      <h1>{client.businessName} <span className="pill">{client.stage}</span></h1>
      <p className="muted">{[client.contactName, client.email, client.phone, client.industry, [client.city, client.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>

      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["NEW", "CONCEPTS_IN_REVIEW"].includes(client.stage) && (
          <form action={requestConceptsAction.bind(null, id)}><button className="primary">{client.stage === "NEW" ? "Generate concepts" : "Regenerate concepts"}</button></form>
        )}
        <form action={holdClientAction.bind(null, id)}><button>Put on hold</button></form>
      </div>

      {drafts.length > 0 && (
        <form action={approveConceptsAction.bind(null, id)} className="card">
          <h3>Concepts waiting for your approval</h3>
          <p className="muted">Approved concepts become visible in the client's portal and an invite email is drafted for your review.</p>
          {drafts.map((c) => (
            <label key={c.id} style={{ display: "block" }}>
              <input type="checkbox" name="conceptId" value={c.id} defaultChecked style={{ width: "auto" }} /> {c.name}{" "}
              <a href={`/admin/preview/${c.id}`} target="_blank">preview</a> <span className="muted">{c.styleDirection}</span>
            </label>
          ))}
          <p><button className="primary">Approve selected</button></p>
        </form>
      )}

      {summary.length > 0 && (
        <div className="card">
          <h3>Client feedback</h3>
          {summary.map((c) => (
            <div key={c.concept} style={{ marginBottom: 12 }}>
              <strong>{c.concept}</strong>{client.favoriteConceptId && client.concepts.find((x) => x.id === client.favoriteConceptId)?.name === c.concept ? " ★ favorite" : ""}
              {c.overall && <div className="muted">Overall: {c.overall.rating ?? "-"}/5 {c.overall.comment}</div>}
              <table><tbody>{c.sections.map((s) => (
                <tr key={s.section}><td>{s.section}</td><td>{s.rating ? `${s.rating}/5` : "-"}</td><td>{s.comment ?? ""}</td></tr>
              ))}</tbody></table>
            </div>
          ))}
        </div>
      )}

      {client.orders.length > 0 && (
        <div className="card">
          <h3>Orders</h3>
          {client.orders.map((o) => (
            <div key={o.id}>{o.offer} · {o.status} · ${(o.oneTimeCents / 100).toFixed(2)}{o.monthlyCents ? ` + $${(o.monthlyCents / 100).toFixed(2)}/mo` : ""}
              {o.deployment?.siteUrl && <> · <a href={o.deployment.siteUrl}>{o.deployment.siteUrl}</a></>}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>History</h3>
        {client.events.map((e) => (
          <div key={e.id} style={{ fontSize: 13 }}><span className="muted">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span> {e.type}{e.toStage ? ` → ${e.toStage}` : ""} <span className="muted">({e.actor})</span></div>
        ))}
      </div>
    </>
  );
}
