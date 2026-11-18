import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
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
