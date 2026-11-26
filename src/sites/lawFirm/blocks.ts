// Block markup helpers for the law-firm site builder. Same contract as
// templates/wp/blocks.ts: plain text goes through esc(), and the markup is
// what the block editor itself saves, so every generated page opens cleanly
// in the editor. Links and image URLs use two tokens that the theme's
// installer swaps for real URLs on activation:
//   {{HOME}}  -> home_url()          (internal links)
//   {{THEME}} -> get_theme_file_uri() (bundled photos)
export { esc } from "../../integrations/templates/wp/blocks";
import { esc } from "../../integrations/templates/wp/blocks";

export const HOME = "{{HOME}}";
export const THEME = "{{THEME}}";
export const url = (path: string) => (path === "/" ? `${HOME}/` : `${HOME}/${path.replace(/^\/|\/$/g, "")}/`);
export const asset = (file: string) => `${THEME}/assets/${file}`;

export const href = (u: string) => {
  const s = String(u ?? "").trim();
  return /^(https?:\/\/|mailto:|tel:|#|\{\{HOME\}\}|\{\{THEME\}\})/i.test(s) ? esc(s) : "#";
};

const attrJson = (a: Record<string, unknown>) =>
  JSON.stringify(a).replace(/--/g, "\\u002d\\u002d").replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
const clean = (a: Record<string, unknown>) => Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false));
const cls = (...c: (string | undefined | false | null)[]) => c.filter(Boolean).join(" ");

export function block(name: string, attrs: Record<string, unknown> = {}, inner?: string): string {
  const a = clean(attrs);
  const open = `<!-- wp:${name}${Object.keys(a).length ? " " + attrJson(a) : ""}`;
  return inner === undefined ? `${open} /-->` : `${open} -->\n${inner}\n<!-- /wp:${name} -->`;
}

/** `html` is trusted inline markup (use esc() / a() for text and links). */
export const p = (html: string, className?: string) => block("paragraph", { className }, `<p${className ? ` class="${className}"` : ""}>${html}</p>`);
export const t = (text: string, className?: string) => p(esc(text), className);

export const h = (level: 1 | 2 | 3 | 4 | 5 | 6, html: string, className?: string) =>
  block("heading", { level: level === 2 ? undefined : level, className }, `<h${level} class="${cls("wp-block-heading", className)}">${html}</h${level}>`);
export const ht = (level: 1 | 2 | 3 | 4 | 5 | 6, text: string, className?: string) => h(level, esc(text), className);

export const a = (label: string, to: string, className?: string) => `<a${className ? ` class="${className}"` : ""} href="${href(to)}">${esc(label)}</a>`;

type Layout = { type: "constrained" | "default" | "flex" | "grid"; minimumColumnWidth?: string; justifyContent?: string; flexWrap?: string; orientation?: string; columnCount?: number; verticalAlignment?: string };
export interface GroupOpts { tag?: string; className?: string; anchor?: string; layout?: Layout; align?: "wide" | "full"; bg?: { url: string; position?: string } }

export function group(inner: string, o: GroupOpts = {}) {
  const tag = o.tag ?? "div";
  const style = o.bg ? { background: { backgroundImage: { url: o.bg.url, source: "file", title: "" }, backgroundSize: "cover", backgroundPosition: o.bg.position ?? "50% 50%" } } : undefined;
  return block(
    "group",
    { tagName: tag === "div" ? undefined : tag, anchor: o.anchor, align: o.align, className: o.className, style, layout: o.layout ?? { type: "constrained" } },
    `<${tag}${o.anchor ? ` id="${esc(o.anchor)}"` : ""} class="${cls("wp-block-group", o.align && `align${o.align}`, o.className)}">${inner}</${tag}>`,
  );
}
export const row = (inner: string, className?: string, justify = "space-between") => group(inner, { className, layout: { type: "flex", flexWrap: "wrap", justifyContent: justify } });
export const grid = (items: string[], min: string, className?: string, columnCount?: number) =>
  group(items.join("\n"), { className: [className, columnCount ? `cols-${columnCount}` : ""].filter(Boolean).join(" ") || undefined, layout: { type: "grid", minimumColumnWidth: min, columnCount } });

export const columns = (cols: { html: string; width?: string; className?: string }[], className?: string, align?: "wide" | "full") =>
  block("columns", { className, align }, `<div class="${cls("wp-block-columns", align && `align${align}`, className)}">${cols.map((c) =>
    block("column", { width: c.width, className: c.className }, `<div class="${cls("wp-block-column", c.className)}"${c.width ? ` style="flex-basis:${c.width}"` : ""}>${c.html}</div>`)).join("\n")}</div>`);

export interface Btn { label: string; to: string; style?: "outline" | "link"; className?: string }
export const buttons = (items: Btn[], className?: string) =>
  block("buttons", { className }, `<div class="${cls("wp-block-buttons", className)}">${items.map((b) => {
    const c = cls(b.style === "outline" && "is-style-outline", b.style === "link" && "is-style-text", b.className);
    return block("button", { className: c || undefined }, `<div class="${cls("wp-block-button", c)}"><a class="wp-block-button__link wp-element-button" href="${href(b.to)}">${esc(b.label)}</a></div>`);
  }).join("\n")}</div>`);

export const list = (items: string[], className?: string, trusted = false) =>
  block("list", { className }, `<ul class="${cls("wp-block-list", className)}">${items.map((i) => block("list-item", {}, `<li>${trusted ? i : esc(i)}</li>`)).join("\n")}</ul>`);

export function image(file: string, alt: string, o: { className?: string; link?: string; caption?: string } = {}) {
  const img = `<img src="${href(file)}" alt="${esc(alt)}"/>`;
  return block("image", { sizeSlug: "full", linkDestination: o.link ? "custom" : "none", className: o.className },
    `<figure class="${cls("wp-block-image size-full", o.className)}">${o.link ? `<a href="${href(o.link)}">${img}</a>` : img}${o.caption ? `<figcaption class="wp-element-caption">${o.caption}</figcaption>` : ""}</figure>`);
}

export const quote = (textHtml: string, citeHtml: string, className?: string) =>
  block("quote", { className }, `<blockquote class="${cls("wp-block-quote", className)}">${p(textHtml)}${citeHtml ? `<cite>${citeHtml}</cite>` : ""}</blockquote>`);

export const details = (summary: string, inner: string, className?: string) =>
  block("details", { className }, `<details class="${cls("wp-block-details", className)}"><summary>${esc(summary)}</summary>${inner}</details>`);

export const separator = (className?: string) => block("separator", { className }, `<hr class="${cls("wp-block-separator has-alpha-channel-opacity", className)}"/>`);
export const shortcode = (code: string) => block("shortcode", {}, code);
export const html = (markup: string) => block("html", {}, markup);
export const spacer = (height: string) => block("spacer", { height }, `<div style="height:${height}" aria-hidden="true" class="wp-block-spacer"></div>`);
