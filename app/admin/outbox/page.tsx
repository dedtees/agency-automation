import Link from "next/link";
import { db } from "@/core/db";
import { approveMessageAction, rejectMessageAction } from "../actions";

export default async function Outbox() {
  const [pending, recent] = await Promise.all([
    db.outboundMessage.findMany({ where: { status: "PENDING_APPROVAL" }, include: { client: true }, orderBy: { createdAt: "asc" } }),
    db.outboundMessage.findMany({ where: { status: { not: "PENDING_APPROVAL" } }, include: { client: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <>
      <h1>Outbox</h1>
      <p className="muted">Nothing is emailed to a client until you approve it here. Edit the text before approving if you like.</p>
      {pending.length === 0 && <p>No emails waiting.</p>}
      {pending.map((m) => (
        <form key={m.id} action={approveMessageAction.bind(null, m.id)} className="card" style={{ display: "grid", gap: 6 }}>
          <div><strong>{m.kind}</strong> to <Link href={`/admin/clients/${m.clientId}`}>{m.client.businessName}</Link> &lt;{m.toEmail}&gt;</div>
          <input name="subject" defaultValue={m.subject} />
          <textarea name="body" rows={10} defaultValue={m.body} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary">Approve & send</button>
            <button formAction={rejectMessageAction.bind(null, m.id)}>Reject</button>
          </div>
        </form>
      ))}
      <h3>Recent</h3>
      <table><tbody>{recent.map((m) => (
        <tr key={m.id}><td>{m.client.businessName}</td><td>{m.subject}</td><td><span className="pill">{m.status}</span></td><td className="muted">{m.sentAt?.toISOString().slice(0, 16) ?? ""}</td></tr>
      ))}</tbody></table>
    </>
  );
}
