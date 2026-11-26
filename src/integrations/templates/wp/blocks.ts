// Helpers that emit WordPress block markup (the same comment-delimited HTML
// the block editor saves). Text passed to these is escaped here, so nothing
// from a client's content can become HTML or PHP in a generated theme.

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

/** Only http(s), mailto, tel and in-page anchors survive; anything else becomes "#". */
export const safeUrl = (u: unknown) => {
  const s = String(u ?? "").trim();
  return /^(https?:\/\/|mailto:|tel:|#)/i.test(s) ? esc(s) : "#";
};

// Block attributes are JSON inside an HTML comment; escape what core escapes.
const attrJson = (a: Record<string, unknown>) =>
  JSON.stringify(a).replace(/--/g, "\\u002d\\u002d").replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

const clean = (a: Record<string, unknown>) => Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export function block(name: string, attrs: Record<string, unknown> = {}, inner?: string): string {
  const a = clean(attrs);
  const open = `<!-- wp:${name}${Object.keys(a).length ? " " + attrJson(a) : ""}`;
  return inner === undefined ? `${open} /-->` : `${open} -->\n${inner}\n<!-- /wp:${name} -->`;
}

const cls = (...c: (string | undefined | false)[]) => c.filter(Boolean).join(" ");

/** `html` is trusted inline markup built by these helpers; use esc() for plain text. */
export const p = (html: string, className?: string) =>
  block("paragraph", { className }, `<p${className ? ` class="${className}"` : ""}>${html}</p>`);

export const h = (level: 1 | 2 | 3 | 4, text: string, className?: string) =>
  block("heading", { level: level === 2 ? undefined : level, className }, `<h${level} class="${cls("wp-block-heading", className)}">${esc(text)}</h${level}>`);

type Layout = { type: "constrained" | "default" | "flex" | "grid"; minimumColumnWidth?: string; justifyContent?: string; flexWrap?: string; orientation?: string; columnCount?: number };

export function group(inner: string, o: { tag?: string; className?: string; anchor?: string; layout?: Layout; align?: "wide" | "full" } = {}) {
  const tag = o.tag ?? "div";
  return block(
    "group",
    { tagName: tag === "div" ? undefined : tag, anchor: o.anchor, align: o.align, className: o.className, layout: o.layout ?? { type: "constrained" } },
    `<${tag}${o.anchor ? ` id="${esc(o.anchor)}"` : ""} class="${cls("wp-block-group", o.align && `align${o.align}`, o.className)}">${inner}</${tag}>`,
  );
}

export const columns = (cols: string[], className?: string) =>
  block("columns", { className }, `<div class="${cls("wp-block-columns", className)}">${cols.map((c) => block("column", {}, `<div class="wp-block-column">${c}</div>`)).join("\n")}</div>`);

export interface Btn { label: string; href: string; outline?: boolean }
export const buttons = (items: Btn[], className?: string) =>
  block("buttons", { className }, `<div class="${cls("wp-block-buttons", className)}">${items.map((b) =>
    block("button", { className: b.outline ? "is-style-outline" : undefined },
      `<div class="${cls("wp-block-button", b.outline && "is-style-outline")}"><a class="wp-block-button__link wp-element-button" href="${safeUrl(b.href)}">${esc(b.label)}</a></div>`)).join("\n")}</div>`);

export const list = (items: string[], className?: string) =>
  block("list", { className }, `<ul class="${cls("wp-block-list", className)}">${items.map((i) => block("list-item", {}, `<li>${esc(i)}</li>`)).join("\n")}</ul>`);

export const quote = (text: string, cite: string, className?: string) =>
  block("quote", { className }, `<blockquote class="${cls("wp-block-quote", className)}">${p(esc(text))}<cite>${esc(cite)}</cite></blockquote>`);

export const link = (label: string, href: string) => `<a href="${safeUrl(href)}">${esc(label)}</a>`;
