// Assembles a complete, installable WordPress block theme for a law firm:
// design (designs.ts), every page of the site as editable block content
// (pages.ts), photos and fonts, a one-click installer that creates the pages
// on activation, and a working consultation form. Pure function of its
// inputs: the caller reads content.json and the asset files.
import type { Attorney, DesignId, SiteContent } from "./types";
import { a, block, buttons, columns, esc, group, html, list, p, row, t } from "./blocks";
import { DESIGNS, stylesheet } from "./designs";
import { buildPages, initials } from "./pages";

export interface LawFirmThemeInput {
  content: SiteContent;
  design: DesignId;
  slug: string;
  /** Files to ship under assets/, keyed by their path there (photos/x.jpg, people/y.jpg). */
  assets: Record<string, Buffer>;
  /** Font files by file name (designs.ts lists the ones each design needs). */
  fonts: Record<string, Buffer>;
  agencyName?: string;
  version?: string;
}
export interface LawFirmTheme { slug: string; name: string; files: Record<string, string | Buffer>; pages: { path: string; title: string }[] }

const TARGET = { requiresWp: "6.6", testedWp: "7.1", requiresPhp: "8.1" };
const phpStr = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const noComment = (s: string) => s.replace(/\*\//g, "");
const tel = (phone: string) => `tel:+1${phone.replace(/\D/g, "")}`;

// Header/footer are PHP patterns so their links follow home_url() (subdirectory installs work).
const toPhp = (markup: string) =>
  markup.replace(/\{\{HOME\}\}/g, "<?php echo esc_url( untrailingslashit( home_url() ) ); ?>").replace(/\{\{THEME\}\}/g, "<?php echo esc_url( get_theme_file_uri() ); ?>");
const H = (path: string) => (path === "/" ? "{{HOME}}/" : `{{HOME}}/${path}/`);

function navLink(label: string, to: string) { return block("navigation-link", { label, url: to, kind: "custom", isTopLevelLink: true }); }

function header(c: SiteContent, d: DesignId) {
  const f = c.firm;
  const util = group(group([
    p(`${esc(`${f.address.street.replace(/, Suite.*$/, "")}, ${f.address.city}, ${f.address.state}`)} <span aria-hidden="true">·</span> Se habla español`, "ss-util-left"),
    p([a("Make a payment", H("make-a-payment")), a(f.email, `mailto:${f.email}`), a(f.phone, tel(f.phone))].join(""), "ss-util-right"),
  ].join("\n"), { className: "ss-inner", layout: { type: "default" } }), { className: "ss-util", layout: { type: "default" } });
  const brand = group([
    d === "modern" ? group([block("site-title", { level: 0 }), t("Attorneys at Law", "ss-brand-sub")].join("\n"), { className: "ss-brand-text", layout: { type: "default" } })
      : [block("site-title", { level: 0 }), t("Attorneys at Law", "ss-brand-sub")].join("\n"),
  ].join("\n"), { className: "ss-brand", layout: { type: "default" } });
  const sub = c.practices.map((x) => block("navigation-link", { label: x.name, url: H(`practice-areas/${x.slug}`), kind: "custom" })).join("\n");
  const nav = block("navigation", { overlayMenu: "never", className: "ss-nav", layout: { type: "flex", justifyContent: "right", flexWrap: "nowrap" } }, [
    block("navigation-submenu", { label: "Practice Areas", url: H("practice-areas"), kind: "custom" }, sub),
    navLink("Attorneys", H("attorneys")), navLink("Results", H("results")), navLink("About", H("about")), navLink("Client Stories", H("reviews")), navLink("Contact", H("contact")),
  ].join("\n"));
  const cta = group([
    d === "modern" ? p(`<a class="ss-header-phone" href="${tel(f.phone)}">${esc(f.phone)}</a>`) : "",
    buttons([{ label: d === "heritage" ? "Free Consultation" : "Free consultation", to: H("contact") }]),
    html(`<button class="ss-menu-toggle" type="button" aria-expanded="false" aria-label="Menu"><span></span><span></span><span></span></button>`),
  ].join("\n"), { className: "ss-header-cta", layout: { type: "flex", flexWrap: "nowrap" } });
  const mast = group(group([brand, nav, cta].join("\n"), { className: "ss-inner", layout: { type: "default" } }), { className: "ss-masthead", layout: { type: "default" } });
  return [util, mast].join("\n");
}

function footer(c: SiteContent) {
  const f = c.firm;
  const col = (title: string, items: string[]) => [block("heading", { level: 4 }, `<h4 class="wp-block-heading">${esc(title)}</h4>`), list(items, "", true)].join("\n");
  const cols = columns([
    { html: [block("site-title", { level: 0 }), t(f.summary), p(`<span class="ss-badge">Se habla español</span>`)].join("\n"), width: "34%" },
    { html: col("For organizations", c.practices.filter((x) => x.audience === "business").map((x) => a(x.name, H(`practice-areas/${x.slug}`)))) },
    { html: col("For individuals", c.practices.filter((x) => x.audience === "individual").map((x) => a(x.name, H(`practice-areas/${x.slug}`)))) },
    { html: [col("Firm", [a("Attorneys", H("attorneys")), a("Results", H("results")), a("About", H("about")), a("Client Stories", H("reviews")), a("Make a Payment", H("make-a-payment"))]),
      col("Contact", [esc(`${f.address.street}`), esc(`${f.address.city}, ${f.address.state} ${f.address.zip}`), a(f.phone, tel(f.phone)), a(f.email, `mailto:${f.email}`)])].join("\n") },
  ], "ss-footer-cols");
  const bottom = row([
    p(`© <?php echo esc_html( gmdate( 'Y' ) ); ?> ${esc(f.legalName)}`),
    p([a("Disclaimer", H("disclaimer")), a("Privacy Policy", H("privacy-policy")), a("Photo Credits", H("photo-credits"))].join(" &nbsp;·&nbsp; ")),
  ].join("\n"), "ss-footer-bottom");
  return group(group([cols, bottom, t(f.disclaimer, "ss-fineprint")].join("\n"), { className: "ss-inner", layout: { type: "default" } }), { className: "ss-footer", layout: { type: "default" } });
}

function placeholderPortrait(x: Attorney, d: DesignId) {
  const [bg, fg, accent] = d === "heritage" ? ["#F6F2EA", "#0E2340", "#B08D57"] : ["#EFF5F3", "#0F4C4A", "#E9A23B"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600"><rect width="480" height="600" fill="${bg}"/>` +
    `<circle cx="240" cy="230" r="92" fill="none" stroke="${accent}" stroke-width="2"/><text x="240" y="258" text-anchor="middle" font-family="Georgia, serif" font-size="78" fill="${fg}">${esc(initials(x.name))}</text>` +
    `<path d="M110 520c10-90 60-140 130-140s120 50 130 140" fill="none" stroke="${accent}" stroke-width="2"/>` +
    `<text x="240" y="566" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="3" fill="${fg}" opacity=".7">HEADSHOT TO COME</text></svg>\n`;
}

const wrap = (inner: string) =>
  `${block("template-part", { slug: "header", tagName: "header" })}\n${block("group", { tagName: "main", layout: { type: "default" } }, `<main class="wp-block-group">${inner}</main>`)}\n${block("template-part", { slug: "footer", tagName: "footer" })}\n`;
const simpleSection = (inner: string) => group(group(inner, { className: "ss-inner", layout: { type: "constrained", contentSize: "760px" } as any }), { tag: "section", className: "ss-section", layout: { type: "default" } });
const titleHero = (inner: string) => group(group(inner, { className: "ss-inner", layout: { type: "default" } }), { tag: "section", className: "ss-page-hero", layout: { type: "default" } });

function readme(c: SiteContent, name: string, pageCount: number, design: string) {
  return `=== ${name} ===
Requires at least: ${TARGET.requiresWp}
Tested up to: ${TARGET.testedWp}
Requires PHP: ${TARGET.requiresPhp}
License: GPLv2 or later

${design}

== Launch in 15 minutes ==

1. Install (2 min). Appearance > Themes > Add New > Upload Theme, choose this
   zip, Activate. Activation creates all ${pageCount} pages (home, 13 practice
   areas, 15 attorney bios, results, client stories, about, contact, payment
   and legal pages), sets the home page and turns on pretty permalinks.
   Pages that already exist are never overwritten.
2. Form email (3 min). Tools > Site setup: enter the address that should get
   consultation requests (default: the admin email). Every request is also
   saved under Inquiries in the admin menu, so nothing is lost if email fails.
   If the host can't send email, add an SMTP plugin.
3. Placeholders (5 min). Yellow dashed boxes mark what the firm still has to
   supply: office hours, firm history, two headshots, the privacy policy
   review and links to the appellate decision PDFs.
4. Photos (3 min). Photos tagged "stock placeholder" (Photo Credits page) are
   stand-ins: swap them for licensed Adobe Stock images with Replace in the
   block toolbar.
5. Go live (2 min). Import content/redirects.csv into the Redirection plugin
   so old centraljerseylaw.com links land on the new pages.

== Before launch, confirm with the firm ==
${c.toConfirm.map((x) => `* ${x}`).join("\n")}

== Copy edits made from the current site ==
${c.copyEdits.map((x) => `* ${x}`).join("\n")}

== Editing ==
Every page is regular block content: Pages > edit. Header and footer:
Appearance > Editor > Patterns > Header / Footer. Colors and fonts:
Appearance > Editor > Styles. No page builder and no jQuery. Fonts are
bundled (no Google Fonts requests).

== Credits ==
Fonts: Cormorant Garamond, Inter, Manrope, Fraunces (SIL Open Font License).
Photos: see the Photo Credits page (Creative Commons licenses).
`;
}

function redirects(c: SiteContent) {
  const lines = ["source,target"];
  for (const x of c.practices) for (const s of x.source) lines.push(`${new URL(s).pathname},/practice-areas/${x.slug}/`);
  for (const x of c.attorneys) lines.push(`/team/${x.slug}/,/attorneys/${x.slug}/`);
  lines.push("/our-results/,/results/", "/appellate-decisions/,/results/", "/contact-us/,/contact/", "/our-testimonials/,/reviews/", "/service/business-services/,/practice-areas/", "/service/individual-services/,/practice-areas/");
  return lines.join("\n") + "\n";
}

export function renderLawFirmTheme(input: LawFirmThemeInput): LawFirmTheme {
  const { content: c, design: d, slug } = input;
  const design = DESIGNS[d];
  const name = `${c.firm.shortName} — ${design.name}`;
  const version = input.version ?? "1.0.0";
  const pages = buildPages(c, d);
  const files: Record<string, string | Buffer> = {};

  // content: one file per page plus a manifest the installer reads
  const manifest = pages.map((pg) => ({ path: pg.path, title: pg.title, parent: pg.parent, template: pg.template, menuOrder: pg.menuOrder ?? 0, excerpt: pg.excerpt, file: `${pg.path.replace(/\//g, "--")}.html` }));
  for (const pg of pages) files[`content/pages/${pg.path.replace(/\//g, "--")}.html`] = pg.content + "\n";
  files["content/pages.json"] = JSON.stringify({ version, pages: manifest }, null, 1) + "\n";
  files["content/site.json"] = JSON.stringify({ name: c.firm.shortName, tagline: c.firm.tagline, phone: c.firm.phone, email: c.firm.email, practices: c.practices.map((x) => x.name) }, null, 1) + "\n";
  files["content/redirects.csv"] = redirects(c);

  // assets
  for (const [k, v] of Object.entries(input.assets)) files[`assets/${k}`] = v;
  for (const x of c.attorneys) if (!x.photo) files[`assets/people/placeholder-${x.slug}.svg`] = placeholderPortrait(x, d);
  for (const face of design.fonts.faces) {
    const buf = input.fonts[face.file];
    if (!buf) throw new Error(`missing font ${face.file}`);
    files[`assets/fonts/${face.file}`] = buf;
  }
  const mark = initials(c.firm.shortName);
  files["assets/css/site.css"] = stylesheet(design) + (d === "modern" ? `.ss-brand::before{content:${JSON.stringify(mark)}}\n` : "");
  files["assets/js/site.js"] = `(function(){var b=document.body,t=document.querySelector('.ss-menu-toggle');
if(t){t.addEventListener('click',function(){var o=b.classList.toggle('ss-menu-open');t.setAttribute('aria-expanded',String(o));});
document.querySelectorAll('.ss-nav a').forEach(function(l){l.addEventListener('click',function(){b.classList.remove('ss-menu-open');t.setAttribute('aria-expanded','false');});});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&b.classList.contains('ss-menu-open')){b.classList.remove('ss-menu-open');t.setAttribute('aria-expanded','false');t.focus();}});}
var s=function(){b.classList.toggle('is-scrolled',window.scrollY>8);};window.addEventListener('scroll',s,{passive:true});s();})();
`;

  // header & footer as PHP patterns
  const pat = (key: string, title: string, markup: string) => `<?php\n/**\n * Title: ${noComment(title)}\n * Slug: ${slug}/${key}\n * Inserter: no\n */\n?>\n${toPhp(markup)}\n`;
  files["patterns/header.php"] = pat("header", "Header", header(c, d));
  files["patterns/footer.php"] = pat("footer", "Footer", footer(c));
  files["parts/header.html"] = block("pattern", { slug: `${slug}/header` }) + "\n";
  files["parts/footer.html"] = block("pattern", { slug: `${slug}/footer` }) + "\n";

  // templates
  const content = block("post-content", { layout: { type: "default" } });
  files["templates/full-width.html"] = wrap(content);
  files["templates/front-page.html"] = wrap(content);
  files["templates/page.html"] = wrap(titleHero(block("post-title", { level: 1, className: "ss-page-title" })) + "\n" + simpleSection(block("post-content", { layout: { type: "constrained" } })));
  files["templates/single.html"] = wrap(titleHero(block("post-title", { level: 1, className: "ss-page-title" }) + "\n" + block("post-date")) + "\n" + simpleSection(block("post-content", { layout: { type: "constrained" } })));
  files["templates/index.html"] = wrap(titleHero(block("heading", { level: 1, className: "ss-page-title" }, `<h1 class="wp-block-heading ss-page-title">News</h1>`)) + "\n" + simpleSection(
    block("query", { queryId: 1, query: { perPage: 10, pages: 0, offset: 0, postType: "post", order: "desc", orderBy: "date", inherit: true } },
      `<div class="wp-block-query">${block("post-template", {}, `${block("post-title", { isLink: true, level: 2 })}\n${block("post-date")}\n${block("post-excerpt")}`)}\n${block("query-pagination", {}, `${block("query-pagination-previous")}\n${block("query-pagination-next")}`)}</div>`)));
  files["templates/search.html"] = wrap(titleHero(block("query-title", { type: "search", className: "ss-page-title" })) + "\n" + simpleSection(
    block("query", { queryId: 2, query: { perPage: 10, pages: 0, offset: 0, postType: "page", inherit: true } },
      `<div class="wp-block-query">${block("post-template", {}, `${block("post-title", { isLink: true, level: 2 })}\n${block("post-excerpt")}`)}\n${block("query-no-results", {}, p("Nothing matched. Try another word, or call us."))}</div>`)));
  files["templates/404.html"] = wrap(titleHero(block("heading", { level: 1, className: "ss-page-title" }, `<h1 class="wp-block-heading ss-page-title">Page not found</h1>`)) + "\n" +
    simpleSection(p(`The page may have moved with our new website. Start from the <a href="/">home page</a> or call ${esc(c.firm.phone)}.`) + "\n" + block("search", { label: "Search", buttonText: "Search" })));

  // theme.json
  const faces = (family: string) => design.fonts.faces.filter((x) => x.family === family).map((x) => ({ fontFamily: x.family, fontWeight: x.weight, fontStyle: x.style ?? "normal", fontDisplay: "swap", src: [`file:./assets/fonts/${x.file}`] }));
  const famName = (stack: string) => stack.split(",")[0].replace(/"/g, "").trim();
  const families = [
    { slug: "heading", name: famName(design.fonts.heading), fontFamily: design.fonts.heading, fontFace: faces(famName(design.fonts.heading)) },
    { slug: "body", name: famName(design.fonts.body), fontFamily: design.fonts.body, fontFace: faces(famName(design.fonts.body)) },
    ...(design.fonts.accent ? [{ slug: "accent", name: famName(design.fonts.accent), fontFamily: design.fonts.accent, fontFace: faces(famName(design.fonts.accent)) }] : []),
  ];
  const tk = design.tokens;
  files["theme.json"] = JSON.stringify({
    $schema: "https://schemas.wp.org/wp/6.6/theme.json",
    version: 3,
    settings: {
      appearanceTools: true,
      layout: { contentSize: "760px", wideSize: "1240px" },
      color: { defaultPalette: false, defaultGradients: false, defaultDuotone: false, palette: [
        { slug: "ink", name: "Ink", color: tk["--ss-ink"] }, { slug: "brand", name: "Brand", color: tk["--ss-brand"] }, { slug: "accent", name: "Accent", color: tk["--ss-accent"] },
        { slug: "soft", name: "Soft", color: tk["--ss-soft"] }, { slug: "paper", name: "Paper", color: tk["--ss-paper"] }, { slug: "text", name: "Text", color: tk["--ss-text"] }] },
      typography: { defaultFontSizes: false, fontFamilies: families, fontSizes: [
        { slug: "small", name: "Small", size: "0.9rem" }, { slug: "medium", name: "Medium", size: "1.0625rem" }, { slug: "large", name: "Large", size: "1.25rem" },
        { slug: "x-large", name: "Extra large", size: "2.25rem" }, { slug: "xx-large", name: "Huge", size: "3.5rem" }] },
      spacing: { units: ["px", "em", "rem", "%", "vw"] },
    },
    styles: {
      color: { background: tk["--ss-paper"], text: tk["--ss-text"] },
      typography: { fontFamily: "var(--wp--preset--font-family--body)", lineHeight: "1.7" },
      spacing: { blockGap: "1.25rem", padding: { top: "0", bottom: "0", left: "0", right: "0" } },
      elements: { heading: { typography: { fontFamily: "var(--wp--preset--font-family--heading)" }, color: { text: tk["--ss-ink"] } }, link: { color: { text: tk["--ss-link"] } } },
    },
    customTemplates: [{ name: "full-width", title: "Full width (page builds its own header)", postTypes: ["page"] }],
    templateParts: [{ name: "header", area: "header", title: "Header" }, { name: "footer", area: "footer", title: "Footer" }],
  }, null, 1) + "\n";

  files["style.css"] = `/*
Theme Name: ${noComment(name)}
Author: ${noComment(input.agencyName ?? "Agency")}
Description: ${noComment(design.description)} Complete website for ${noComment(c.firm.legalName)}: ${pages.length} pages installed on activation, consultation form included.
Requires at least: ${TARGET.requiresWp}
Tested up to: ${TARGET.testedWp}
Requires PHP: ${TARGET.requiresPhp}
Version: ${version}
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${slug}
*/
`;
  files["functions.php"] = `<?php
/**
 * ${noComment(name)}
 *
 * Block theme. Design: theme.json and assets/css/site.css. Pages: content/
 * (installed once on activation by inc/setup.php). Consultation form:
 * inc/contact-form.php. Written for PHP 8.1+ with no deprecated APIs.
 */

declare(strict_types=1);

const SS_THEME_VERSION = ${phpStr(version)};

require_once __DIR__ . '/inc/setup.php';
require_once __DIR__ . '/inc/contact-form.php';

add_action(
	'after_setup_theme',
	static function (): void {
		add_theme_support( 'editor-styles' );
		add_editor_style( 'assets/css/site.css' );
		add_theme_support( 'responsive-embeds' );
	}
);

add_action(
	'wp_enqueue_scripts',
	static function (): void {
		wp_enqueue_style( 'ss-site', get_theme_file_uri( 'assets/css/site.css' ), array( 'global-styles' ), SS_THEME_VERSION );
		wp_enqueue_script( 'ss-site', get_theme_file_uri( 'assets/js/site.js' ), array(), SS_THEME_VERSION, array( 'in_footer' => true, 'strategy' => 'defer' ) );
	}
);
`;
  files["inc/setup.php"] = SETUP_PHP.replace("__TITLE__", phpStr(c.firm.shortName)).replace("__TAGLINE__", phpStr(c.firm.tagline));
  files["inc/contact-form.php"] = CONTACT_PHP;
  files["readme.txt"] = readme(c, name, pages.length, design.description);
  return { slug, name, files, pages: pages.map((x) => ({ path: x.path, title: x.title })) };
}

const SETUP_PHP = `<?php
/**
 * One-click setup. On activation (and from Tools > Site setup) this creates
 * every page listed in content/pages.json that doesn't exist yet, sets the
 * home page, turns on pretty permalinks and names the site. Existing pages
 * are never touched.
 */

declare(strict_types=1);

/**
 * @return array{created:int,skipped:int}
 */
function ss_install_site(): array {
	$manifest = json_decode( (string) file_get_contents( get_theme_file_path( 'content/pages.json' ) ), true );
	if ( ! is_array( $manifest ) || ! isset( $manifest['pages'] ) ) {
		return array( 'created' => 0, 'skipped' => 0 );
	}
	$home    = untrailingslashit( home_url() );
	$theme   = untrailingslashit( get_theme_file_uri() );
	$ids     = array();
	$created = 0;
	$skipped = 0;

	// Our own, trusted markup: keep it exactly as written (no KSES rewriting).
	kses_remove_filters();
	foreach ( $manifest['pages'] as $page ) {
		$path     = (string) $page['path'];
		$existing = get_page_by_path( $path, OBJECT, 'page' );
		$privacy  = (int) get_option( 'wp_page_for_privacy_policy' );
		if ( $existing instanceof WP_Post && 'publish' !== $existing->post_status && $existing->ID === $privacy ) {
			// WordPress's own unpublished privacy draft: replace it with ours.
			wp_delete_post( $existing->ID, true );
			$existing = null;
		}
		if ( $existing instanceof WP_Post ) {
			$ids[ $path ] = $existing->ID;
			++$skipped;
			continue;
		}
		$file   = get_theme_file_path( 'content/pages/' . basename( (string) $page['file'] ) );
		$markup = is_readable( $file ) ? (string) file_get_contents( $file ) : '';
		$markup = str_replace( array( '{{HOME}}', '{{THEME}}' ), array( $home, $theme ), $markup );
		$parent = isset( $page['parent'] ) ? (int) ( $ids[ (string) $page['parent'] ] ?? 0 ) : 0;
		$id     = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => (string) $page['title'],
				'post_name'    => basename( $path ),
				'post_parent'  => $parent,
				'menu_order'   => (int) ( $page['menuOrder'] ?? 0 ),
				'post_excerpt' => (string) ( $page['excerpt'] ?? '' ),
				'post_content' => wp_slash( $markup ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			continue;
		}
		if ( ! empty( $page['template'] ) ) {
			update_post_meta( $id, '_wp_page_template', sanitize_key( (string) $page['template'] ) );
		}
		$ids[ $path ] = $id;
		++$created;
	}
	kses_init_filters();

	if ( isset( $ids['privacy-policy'] ) ) {
		update_option( 'wp_page_for_privacy_policy', $ids['privacy-policy'] );
	}
	if ( isset( $ids['home'] ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $ids['home'] );
	}
	if ( '' === (string) get_option( 'permalink_structure' ) ) {
		update_option( 'permalink_structure', '/%postname%/' );
	}
	if ( in_array( (string) get_option( 'blogname' ), array( '', 'My WordPress Blog', 'My WordPress Website', 'WordPress' ), true ) ) {
		update_option( 'blogname', __TITLE__ );
	}
	if ( '' === (string) get_option( 'blogdescription' ) || 'Just another WordPress site' === get_option( 'blogdescription' ) ) {
		update_option( 'blogdescription', __TAGLINE__ );
	}
	flush_rewrite_rules( false );
	update_option( 'ss_site_installed', array( 'version' => SS_THEME_VERSION, 'created' => $created, 'skipped' => $skipped ) );
	return array( 'created' => $created, 'skipped' => $skipped );
}

add_action(
	'after_switch_theme',
	static function (): void {
		$result = ss_install_site();
		set_transient( 'ss_setup_notice', $result, 300 );
	}
);

add_action(
	'admin_notices',
	static function (): void {
		$result = get_transient( 'ss_setup_notice' );
		if ( ! is_array( $result ) || ! current_user_can( 'edit_pages' ) ) {
			return;
		}
		delete_transient( 'ss_setup_notice' );
		printf(
			'<div class="notice notice-success is-dismissible"><p><strong>%s</strong> %s <a href="%s">%s</a> · <a href="%s">%s</a></p></div>',
			esc_html__( 'Your website is ready.', 'default' ),
			esc_html( sprintf( '%d pages created, %d already existed.', (int) $result['created'], (int) $result['skipped'] ) ),
			esc_url( home_url( '/' ) ),
			esc_html__( 'View site', 'default' ),
			esc_url( admin_url( 'tools.php?page=ss-site-setup' ) ),
			esc_html__( 'Finish setup', 'default' )
		);
	}
);

add_action(
	'admin_menu',
	static function (): void {
		add_management_page( 'Site setup', 'Site setup', 'manage_options', 'ss-site-setup', 'ss_render_setup_page' );
	}
);

function ss_render_setup_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$done = isset( $_GET['ss_done'] ) ? sanitize_key( wp_unslash( $_GET['ss_done'] ) ) : '';
	$to   = (string) get_option( 'ss_contact_email', get_option( 'admin_email' ) );
	echo '<div class="wrap"><h1>Site setup</h1>';
	if ( 'saved' === $done ) {
		echo '<div class="notice notice-success"><p>Saved.</p></div>';
	} elseif ( 'pages' === $done ) {
		echo '<div class="notice notice-success"><p>Missing pages created.</p></div>';
	}
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'ss_setup' );
	echo '<input type="hidden" name="action" value="ss_setup">';
	echo '<h2>Consultation form</h2><p>Send consultation requests to:</p>';
	echo '<p><input type="email" class="regular-text" name="ss_contact_email" value="' . esc_attr( $to ) . '" required></p>';
	echo '<p class="description">Every request is also saved under Inquiries.</p>';
	submit_button( 'Save' );
	echo '</form><hr>';
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'ss_setup' );
	echo '<input type="hidden" name="action" value="ss_setup"><input type="hidden" name="ss_pages" value="1">';
	echo '<h2>Pages</h2><p>Re-create any of the site\\'s pages that were deleted. Existing pages are left alone.</p>';
	submit_button( 'Create missing pages', 'secondary' );
	echo '</form></div>';
}

add_action(
	'admin_post_ss_setup',
	static function (): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'default' ), 403 );
		}
		check_admin_referer( 'ss_setup' );
		$done = 'saved';
		if ( ! empty( $_POST['ss_pages'] ) ) {
			ss_install_site();
			$done = 'pages';
		} elseif ( isset( $_POST['ss_contact_email'] ) ) {
			$email = sanitize_email( wp_unslash( (string) $_POST['ss_contact_email'] ) );
			if ( is_email( $email ) ) {
				update_option( 'ss_contact_email', $email );
			}
		}
		wp_safe_redirect( admin_url( 'tools.php?page=ss-site-setup&ss_done=' . $done ) );
		exit;
	}
);
`;

const CONTACT_PHP = `<?php
/**
 * Consultation form: [ss_contact_form] (add compact="1" for the short
 * version). Submissions are checked (nonce, honeypot, required fields),
 * saved as private "Inquiries" in the admin and emailed to the address set
 * in Tools > Site setup. Visitors land on /contact/thank-you/.
 */

declare(strict_types=1);

add_action(
	'init',
	static function (): void {
		register_post_type(
			'ss_inquiry',
			array(
				'labels'          => array(
					'name'          => 'Inquiries',
					'singular_name' => 'Inquiry',
					'menu_name'     => 'Inquiries',
				),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => true,
				'menu_position'   => 25,
				'menu_icon'       => 'dashicons-email-alt',
				'supports'        => array( 'title', 'editor' ),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
				'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			)
		);
		add_shortcode( 'ss_contact_form', 'ss_contact_form' );
	}
);

/**
 * @return array<string,mixed>
 */
function ss_site_info(): array {
	static $info = null;
	if ( null === $info ) {
		$decoded = json_decode( (string) file_get_contents( get_theme_file_path( 'content/site.json' ) ), true );
		$info    = is_array( $decoded ) ? $decoded : array();
	}
	return $info;
}

/**
 * @param array<string,string>|string $atts Shortcode attributes.
 */
function ss_contact_form( $atts = array() ): string {
	$atts    = shortcode_atts( array( 'compact' => '0' ), (array) $atts, 'ss_contact_form' );
	$compact = '1' === (string) $atts['compact'];
	static $count = 0;
	++$count;
	$uid      = 'ss-form-' . $count;
	$info     = ss_site_info();
	$matters  = isset( $info['practices'] ) && is_array( $info['practices'] ) ? $info['practices'] : array();
	$error    = isset( $_GET['ss_error'] ) ? sanitize_key( wp_unslash( (string) $_GET['ss_error'] ) ) : '';
	$messages = array(
		'missing' => 'Please add your name, a phone number or email, and a short message.',
		'consent' => 'Please tick the box to confirm you have read the note about confidential information.',
		'expired' => 'The form expired before it was sent. Please try again.',
	);
	$field = static function ( string $name, string $label, string $type, bool $required, string $auto, bool $wide = false ) use ( $uid ): string {
		return sprintf(
			'<div class="ss-field%6$s"><label for="%1$s-%2$s">%3$s%4$s</label><input id="%1$s-%2$s" name="ss_%2$s" type="%5$s" autocomplete="%7$s"%8$s></div>',
			esc_attr( $uid ),
			esc_attr( $name ),
			esc_html( $label ),
			$required ? ' <span class="req" aria-hidden="true">*</span>' : '',
			esc_attr( $type ),
			$wide ? ' is-wide' : '',
			esc_attr( $auto ),
			$required ? ' required' : ''
		);
	};

	$out  = '<form class="ss-form" id="' . esc_attr( $uid ) . '" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	if ( '' !== $error && isset( $messages[ $error ] ) && 1 === $count ) {
		$out .= '<p class="ss-form-error" role="alert">' . esc_html( $messages[ $error ] ) . '</p>';
	}
	$out .= '<input type="hidden" name="action" value="ss_contact">';
	$out .= wp_nonce_field( 'ss_contact', '_ss_nonce', false, false );
	$out .= '<input type="hidden" name="ss_return" value="' . esc_url( (string) ( get_permalink() ?: home_url( '/' ) ) ) . '">';
	$out .= '<div class="ss-hp" aria-hidden="true"><label>Leave this field empty <input type="text" name="ss_website" tabindex="-1" autocomplete="off"></label></div>';
	$out .= $field( 'name', 'Full name', 'text', true, 'name' );
	$out .= $field( 'phone', 'Phone', 'tel', false, 'tel' );
	$out .= $field( 'email', 'Email', 'email', false, 'email' );
	$out .= '<div class="ss-field"><label for="' . esc_attr( $uid ) . '-matter">How can we help?</label><select id="' . esc_attr( $uid ) . '-matter" name="ss_matter"><option value="">Choose an area</option>';
	foreach ( $matters as $matter ) {
		$out .= '<option>' . esc_html( (string) $matter ) . '</option>';
	}
	$out .= '<option>Something else</option></select></div>';
	if ( ! $compact ) {
		$out .= '<div class="ss-field is-wide"><label for="' . esc_attr( $uid ) . '-pref">Best way to reach you</label><select id="' . esc_attr( $uid ) . '-pref" name="ss_contact_pref"><option>Phone</option><option>Email</option><option>Either</option></select></div>';
	}
	$out .= '<div class="ss-field is-wide"><label for="' . esc_attr( $uid ) . '-message">Briefly, what is going on? <span class="req" aria-hidden="true">*</span></label><textarea id="' . esc_attr( $uid ) . '-message" name="ss_message" rows="' . ( $compact ? '4' : '6' ) . '" required></textarea></div>';
	$out .= '<label class="ss-consent"><input type="checkbox" name="ss_consent" value="1" required> <span>I understand that sending this form does not make me a client of the firm, and I will not include confidential information until the firm agrees to represent me.</span></label>';
	$out .= '<button class="ss-submit" type="submit">Request my consultation</button>';
	if ( ! empty( $info['phone'] ) ) {
		$out .= '<p class="ss-form-note">Prefer to talk? Call ' . esc_html( (string) $info['phone'] ) . '. Se habla español.</p>';
	}
	return $out . '</form>';
}

function ss_thank_you_url(): string {
	$page = get_page_by_path( 'contact/thank-you' );
	return $page instanceof WP_Post ? (string) get_permalink( $page ) : home_url( '/' );
}

function ss_contact_submit(): void {
	$back = isset( $_POST['ss_return'] ) ? esc_url_raw( wp_unslash( (string) $_POST['ss_return'] ) ) : home_url( '/' );
	$back = wp_validate_redirect( $back, home_url( '/' ) );
	$fail = static function ( string $code ) use ( $back ): void {
		wp_safe_redirect( add_query_arg( 'ss_error', $code, $back ) . '#ss-form-1' );
		exit;
	};
	$nonce = isset( $_POST['_ss_nonce'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['_ss_nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'ss_contact' ) ) {
		$fail( 'expired' );
	}
	if ( ! empty( $_POST['ss_website'] ) ) { // Honeypot: quietly accept and drop.
		wp_safe_redirect( ss_thank_you_url() );
		exit;
	}
	$f = array();
	foreach ( array( 'name', 'phone', 'email', 'matter', 'contact_pref' ) as $key ) {
		$f[ $key ] = isset( $_POST[ 'ss_' . $key ] ) ? sanitize_text_field( wp_unslash( (string) $_POST[ 'ss_' . $key ] ) ) : '';
	}
	$f['email']   = sanitize_email( $f['email'] );
	$f['message'] = isset( $_POST['ss_message'] ) ? sanitize_textarea_field( wp_unslash( (string) $_POST['ss_message'] ) ) : '';
	if ( '' === $f['name'] || ( '' === $f['phone'] && '' === $f['email'] ) || '' === $f['message'] ) {
		$fail( 'missing' );
	}
	if ( empty( $_POST['ss_consent'] ) ) {
		$fail( 'consent' );
	}
	$lines = array(
		'Name: ' . $f['name'],
		'Phone: ' . ( $f['phone'] ?: '-' ),
		'Email: ' . ( $f['email'] ?: '-' ),
		'Area: ' . ( $f['matter'] ?: '-' ),
		'Prefers: ' . ( $f['contact_pref'] ?: '-' ),
		'',
		$f['message'],
	);
	$body = implode( "\\n", $lines );
	wp_insert_post(
		array(
			'post_type'    => 'ss_inquiry',
			'post_status'  => 'private',
			'post_title'   => sprintf( '%s (%s)', $f['name'], $f['matter'] ?: 'General' ),
			'post_content' => esc_html( $body ),
		)
	);
	$to      = (string) apply_filters( 'ss_contact_recipient', (string) get_option( 'ss_contact_email', get_option( 'admin_email' ) ) );
	$headers = '' !== $f['email'] ? array( sprintf( 'Reply-To: %s <%s>', str_replace( array( '<', '>', '"' ), '', $f['name'] ), $f['email'] ) ) : array();
	wp_mail( $to, sprintf( '[%s] Consultation request from %s', wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES ), $f['name'] ), $body, $headers );
	wp_safe_redirect( ss_thank_you_url() );
	exit;
}
add_action( 'admin_post_nopriv_ss_contact', 'ss_contact_submit' );
add_action( 'admin_post_ss_contact', 'ss_contact_submit' );
`;
