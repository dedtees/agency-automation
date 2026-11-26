// Renders a concept section from its stored content, so the client can see
// exactly what they're rating. When a real WordPress screenshot exists the
// portal shows that above the sections too.
type Palette = { primary: string; secondary: string; accent: string; background: string; text: string };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

function Body({ kind, c, palette }: { kind: string; c: any; palette: Palette }) {
  if (kind === "HERO") {
    const primary = c?.primaryCta?.label ?? c?.cta;
    return (
      <>
        {c?.eyebrow && <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: palette.accent }}>{c.eyebrow}</div>}
        <h2 style={{ margin: "6px 0" }}>{c?.headline}</h2>
        <p style={{ margin: 0 }}>{c?.subhead}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {primary && <span className="btn" style={{ background: palette.accent, borderColor: palette.accent, color: palette.secondary }}>{primary}</span>}
          {c?.secondaryCta?.label && <span className="btn" style={{ background: "transparent", color: "inherit" }}>{c.secondaryCta.label}</span>}
        </div>
        {arr(c?.audienceLinks).length > 0 && <div className="grid" style={{ marginTop: 12 }}>{arr(c.audienceLinks).map((a) => <div key={a.label} style={{ background: "#fff", color: palette.text, borderRadius: 8, padding: 10 }}><strong>{a.label}</strong><div style={{ fontSize: 13 }}>{a.blurb}</div></div>)}</div>}
      </>
    );
  }
  if (arr(c?.groups).length) return (
    <>{c.intro && <p style={{ marginTop: 0 }}>{c.intro}</p>}{arr(c.groups).map((g) => (
      <div key={g.audience ?? "g"} style={{ marginBottom: 10 }}>
        {g.audience && <strong style={{ color: palette.primary }}>{g.audience}</strong>}
        <ul style={{ margin: "4px 0", columns: 2, columnGap: 24 }}>{arr(g.items).map((i) => <li key={str(i) || i.name}>{str(i) || i.name}</li>)}</ul>
      </div>))}</>
  );
  if (arr(c?.members).length) return <p style={{ margin: 0 }}>{arr(c.members).map((m) => `${m.name} (${m.role})`).join(" · ")}</p>;
  if (kind === "RESULTS") return <ul style={{ margin: 0 }}>{arr(c?.items).map((r) => <li key={r.title}><strong>{r.title}</strong>{r.detail ? `. ${r.detail}` : ""}</li>)}</ul>;
  if (arr(c?.quotes).length) return <>{arr(c.quotes).map((q, i) => <blockquote key={i} style={{ margin: "6px 0" }}>“{str(q) || q.quote}”{q.author ? <em> — {q.author}</em> : null}</blockquote>)}</>;
  if (arr(c?.paragraphs).length) return <>{arr(c.paragraphs).map((t, i) => <p key={i} style={{ margin: "6px 0" }}>{t}</p>)}{arr(c.stats).length > 0 && <p><strong>{arr(c.stats).map((s) => `${s.value} ${s.label}`).join(" · ")}</strong></p>}</>;
  if (kind === "CONTACT" && (c?.phone || c?.address)) return <p style={{ margin: 0 }}>{[c.address, c.phone, c.email, c.languages, c.payment ? `${c.payment.label} online` : ""].filter(Boolean).join(" · ")}</p>;
  if (kind === "FOOTER" && c?.legalName) return <p style={{ margin: 0 }}>{c.legalName} · {c.address} · {c.phone}</p>;
  if (Array.isArray(c?.items)) return <ul>{c.items.map((i: string) => <li key={i}>{i}</li>)}</ul>;
  return <p style={{ margin: "6px 0" }}>{c?.body ?? (c?.images ? `${c.images}-photo gallery` : c?.form ? `Contact form: ${c.form.join(", ")}` : "")}</p>;
}

export function SectionPreview({ kind, title, content, palette }: { kind: string; title: string; content: any; palette: Palette }) {
  const style = kind === "HERO" || kind === "FOOTER"
    ? { background: palette.secondary, color: "#fff" }
    : { background: palette.background, color: palette.text, border: `1px solid ${palette.primary}22` };
  return (
    <div className="section-preview" style={style}>
      <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
      <Body kind={kind} c={content} palette={palette} />
    </div>
  );
}
