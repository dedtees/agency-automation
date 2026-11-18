// Renders a concept section from its stored content. Stand-in for real
// WordPress previews until the template builder produces them.
type Palette = { primary: string; secondary: string; accent: string; background: string; text: string };

export function SectionPreview({ kind, title, content, palette }: { kind: string; title: string; content: any; palette: Palette }) {
  const style = kind === "HERO"
    ? { background: palette.secondary, color: "#fff" }
    : { background: palette.background, color: palette.text, border: `1px solid ${palette.primary}22` };
  return (
    <div className="section-preview" style={style}>
      <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
      {kind === "HERO" ? (
        <>
          <h2 style={{ margin: "6px 0" }}>{content?.headline}</h2>
          <p style={{ margin: 0 }}>{content?.subhead}</p>
          <span className="btn" style={{ marginTop: 10, background: palette.accent, borderColor: palette.accent, color: palette.secondary }}>{content?.cta}</span>
        </>
      ) : Array.isArray(content?.items) ? (
        <ul>{content.items.map((i: string) => <li key={i}>{i}</li>)}</ul>
      ) : Array.isArray(content?.quotes) ? (
        content.quotes.map((q: string, i: number) => <blockquote key={i} style={{ margin: "6px 0" }}>“{q}”</blockquote>)
      ) : (
        <p style={{ margin: "6px 0" }}>{content?.body ?? (content?.images ? `${content.images}-photo gallery` : content?.form ? `Contact form: ${content.form.join(", ")}` : "")}</p>
      )}
    </div>
  );
}
