import { db } from "@/core/db";
import { themeSlug } from "@/integrations/templates/wp/theme";
import { getConfig } from "@/core/config";
import { findPreview, findSiteDir } from "@/research/previews";
import { loadPortal, PortalAccessError } from "@/services/portal";
import { SectionPreview } from "../../components/SectionPreview";
import { checkoutAction, favoriteAction } from "./actions";
import { SectionFeedback } from "./SectionFeedback";

export const dynamic = "force-dynamic";
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

export default async function Portal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string; preview?: string }> }) {
  const { token } = await params;
  const { paid, preview } = await searchParams;
  let client;
  try { client = await loadPortal(db, token, { preview: preview === "1" }); }
  catch (e) {
    if (e instanceof PortalAccessError) return <main><h1>Link expired</h1><p>{e.message} Please contact us for a new one.</p></main>;
    throw e;
  }
  const cfg = getConfig();
  const fb = (conceptId: string, sectionId: string | null) => client.feedback.find((f) => f.conceptId === conceptId && f.sectionId === sectionId);
  const paidOrder = client.orders.find((o) => o.status !== "PENDING" && o.status !== "CANCELED");

  return (
    <main>
      {preview === "1" && <div className="card" style={{ borderColor: "var(--warn)" }}>Owner preview. This is what the client sees; ratings you leave here are saved as theirs.</div>}
      <h1>Website concepts for {client.businessName}</h1>
      {paid && <div className="card" style={{ borderColor: "var(--ok)" }}>Thanks! Your payment is being confirmed. We'll email you shortly.</div>}
      <p className="muted">Rate each section, tell us what you'd change, and mark your favorite. Your notes save automatically.</p>

      {client.concepts.map((c) => (
        <section key={c.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0 }}>{c.name}</h2><span className="muted">{c.styleDirection}</span></div>
            {client.favoriteConceptId === c.id
              ? <span className="pill owner">★ Your favorite</span>
              : <form action={favoriteAction.bind(null, token, c.id)}><button>Make this my favorite</button></form>}
          </div>
          {findSiteDir(themeSlug({ name: c.name, client })) && (
            <div className="card" style={{ margin: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>Your full website is ready to explore</strong>
                <div className="muted" style={{ fontSize: 13 }}>Every page, with your attorneys, practice areas, results and a working contact form. Click around on your laptop or phone.</div>
              </div>
              <a className="btn primary" href={`/p/${token}/site/${c.id}/`} target="_blank" rel="noopener">Open the website</a>
            </div>
          )}
          {findPreview(themeSlug({ name: c.name, client }), "desktop-fold") && (
            <div style={{ margin: "12px 0" }}>
              <a href={`/p/${token}/shot/${c.id}/desktop`} target="_blank">
                <img src={`/p/${token}/shot/${c.id}/desktop-fold`} alt={`${c.name} home page on a laptop`} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
              </a>
              <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
                The real WordPress design. Open the <a href={`/p/${token}/shot/${c.id}/desktop`} target="_blank">full page</a> or the <a href={`/p/${token}/shot/${c.id}/mobile`} target="_blank">phone version</a>, then rate each section below.
              </p>
            </div>
          )}
          {c.sections.map((s) => {
            const f = fb(c.id, s.id);
            return (
              <div key={s.id} id={`${c.id}-${s.previewAnchor}`}>
                <SectionPreview kind={s.kind} title={s.title} content={s.content} palette={c.palette as any} />
                <SectionFeedback token={token} conceptId={c.id} sectionId={s.id} rating={f?.rating ?? null} comment={f?.comment ?? null} />
              </div>
            );
          })}
          <SectionFeedback token={token} conceptId={c.id} sectionId={null} rating={fb(c.id, null)?.rating ?? null} comment={fb(c.id, null)?.comment ?? null} label="Overall" />
        </section>
      ))}

      {client.favoriteConceptId && !paidOrder && (
        <section className="card">
          <h2>Ready to go?</h2>
          <div className="grid">
            <form action={checkoutAction.bind(null, token, "TEMPLATE_DOWNLOAD")} className="card">
              <h3>WordPress template</h3>
              <p>Download the theme and install it on your own WordPress site.</p>
              <p><strong>{money(cfg.pricing.TEMPLATE_DOWNLOAD.oneTimeCents)}</strong> one time</p>
              <button className="primary">Buy template</button>
            </form>
            <form action={checkoutAction.bind(null, token, "HOSTED_SITE")} className="card">
              <h3>We build & host it</h3>
              <p>We set up the site on WordPress, host it, and keep it updated.</p>
              <p><strong>{money(cfg.pricing.HOSTED_SITE.oneTimeCents)}</strong> setup + <strong>{money(cfg.pricing.HOSTED_SITE.monthlyCents!)}</strong>/month</p>
              <button className="primary">Get started</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
