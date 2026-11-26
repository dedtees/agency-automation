import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (!process.env.DATABASE_URL) {
    return (
      <main>
        <h1>Almost there</h1>
        <p>The app is deployed but has no database yet. Connect a Postgres database in Vercel (Storage &gt; Neon sets <code>DATABASE_URL</code> for you), then redeploy. Steps are in DEPLOY.md.</p>
      </main>
    );
  }
  return (
    <>
      <nav className="top">
        <strong>Agency</strong>
        <Link href="/admin">Clients</Link>
        <Link href="/admin/outbox">Outbox</Link>
      </nav>
      <main>{children}</main>
    </>
  );
}
