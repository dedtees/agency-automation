// Full-site QA and preview export for the law-firm themes (src/sites/lawFirm).
// For each theme: fresh WordPress (SQLite, no MySQL) on the local PHP, activate,
// run the one-click installer, load every page and fail on any PHP error,
// warning or deprecation, send the consultation form end to end, then export
// the rendered site as static files (for the client portal) and take
// screenshots of the export.
//
//   npx tsx scripts/site-preview.ts --wp-zip wordpress.zip --sqlite-zip sqlite.zip \
//     --theme storage/themes/<slug> [--theme ...] --out previews [--port 8093]
//
// Writes <out>/sites/<slug>/ (static site), <out>/<slug>-*.jpg (screenshots)
// and prints a PASS/FAIL report.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const all = (k: string) => args.flatMap((a, i) => (a === `--${k}` ? [args[i + 1]] : []));
const wpZip = opt("wp-zip") ?? process.env.WP_CORE_ZIP;
const sqliteZip = opt("sqlite-zip") ?? process.env.WP_SQLITE_ZIP;
const themes = all("theme").map((t) => resolve(t));
const out = resolve(opt("out") ?? "previews");
const port = Number(opt("port") ?? 8093);
const noShots = args.includes("--no-shots");
if (!wpZip || !sqliteZip || !themes.length) {
  console.error("Usage: site-preview --wp-zip <wordpress.zip> --sqlite-zip <sqlite.zip> --theme <dir> [--theme <dir>] --out <dir>");
  process.exit(2);
}
const origin = `http://127.0.0.1:${port}`;
const root = mkdtempSync(join(tmpdir(), "site-preview-"));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function unzipInto(zip: string, dest: string) {
  const tmp = join(root, `unz-${randomBytes(3).toString("hex")}`);
  execFileSync("unzip", ["-q", zip, "-d", tmp]);
  const entries = readdirSync(tmp);
  renameSync(entries.length === 1 ? join(tmp, entries[0]) : tmp, dest);
}

// --- a WordPress install, prepared once and copied per theme -----------------------------------
const base = join(root, "base");
unzipInto(wpZip, base);
mkdirSync(join(base, "wp-content/database"), { recursive: true });
unzipInto(sqliteZip, join(base, "wp-content/plugins/sqlite-database-integration"));
const salt = () => randomBytes(32).toString("hex");
writeFileSync(join(base, "router.php"), `<?php
$path = (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $path;
if ($path !== '/' && is_file($file)) { return false; }
if (is_dir($file) && is_file(rtrim($file, '/') . '/index.php')) { $_SERVER['SCRIPT_NAME'] = rtrim($path, '/') . '/index.php'; require rtrim($file, '/') . '/index.php'; return; }
$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
`);
mkdirSync(join(base, "wp-content/mu-plugins"), { recursive: true });
writeFileSync(join(base, "wp-content/mu-plugins/preview-mail.php"), `<?php
// No mail server here: record outgoing mail instead of sending it.
add_filter('pre_wp_mail', static function ($null, array $atts) {
	file_put_contents(WP_CONTENT_DIR . '/mail.log', json_encode($atts) . "\\n", FILE_APPEND);
	return true;
}, 10, 2);
`);

function prepareSite(slug: string, themeDir: string) {
  const site = join(root, `site-${slug}`);
  cpSync(base, site, { recursive: true });
  const dbCopy = readFileSync(join(site, "wp-content/plugins/sqlite-database-integration/db.copy"), "utf8")
    .replaceAll("{SQLITE_IMPLEMENTATION_FOLDER_PATH}", join(site, "wp-content/plugins/sqlite-database-integration"))
    .replaceAll("{SQLITE_PLUGIN}", "sqlite-database-integration/load.php");
  writeFileSync(join(site, "wp-content/db.php"), dbCopy);
  writeFileSync(join(site, "wp-config.php"), `<?php
define('DB_NAME', 'wp'); define('DB_USER', ''); define('DB_PASSWORD', ''); define('DB_HOST', ''); define('DB_CHARSET', 'utf8'); define('DB_COLLATE', '');
define('DB_DIR', __DIR__ . '/wp-content/database/'); define('DB_FILE', '.ht.sqlite');
${["AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY", "AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT"].map((k) => `define('${k}', '${salt()}');`).join("\n")}
$table_prefix = 'wp_';
define('WP_DEBUG', true); define('WP_DEBUG_DISPLAY', true); define('WP_DEBUG_LOG', __DIR__ . '/debug.log');
define('WP_HOME', '${origin}'); define('WP_SITEURL', '${origin}');
define('DISABLE_WP_CRON', true); define('AUTOMATIC_UPDATER_DISABLED', true); define('WP_HTTP_BLOCK_EXTERNAL', true);
if (!defined('ABSPATH')) define('ABSPATH', __DIR__ . '/');
require_once ABSPATH . 'wp-settings.php';
`);
  writeFileSync(join(site, "install.php"), `<?php
define('WP_INSTALLING', true);
$_SERVER['HTTP_HOST'] = '127.0.0.1:${port}'; $_SERVER['REQUEST_URI'] = '/'; $_SERVER['SERVER_NAME'] = '127.0.0.1';
require __DIR__ . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
wp_install('My WordPress Website', 'admin', 'admin@example.test', false, '', wp_generate_password(24));
switch_theme($argv[1]);
echo get_stylesheet(), "\\n";
`);
  writeFileSync(join(site, "activate.php"), `<?php
$_SERVER['HTTP_HOST'] = '127.0.0.1:${port}'; $_SERVER['REQUEST_URI'] = '/'; $_SERVER['SERVER_NAME'] = '127.0.0.1';
require __DIR__ . '/wp-load.php';
wp_set_current_user(1);
do_action('after_switch_theme', 'twentytwentyfive', wp_get_theme());
$r = get_option('ss_site_installed');
echo json_encode(array('installed' => $r, 'front' => (int) get_option('page_on_front'), 'permalinks' => get_option('permalink_structure'), 'name' => get_option('blogname'), 'wp' => $GLOBALS['wp_version'], 'php' => PHP_VERSION)), "\\n";
`);
  writeFileSync(join(site, "inquiries.php"), `<?php
$_SERVER['HTTP_HOST'] = '127.0.0.1:${port}'; $_SERVER['REQUEST_URI'] = '/'; $_SERVER['SERVER_NAME'] = '127.0.0.1';
require __DIR__ . '/wp-load.php';
$q = get_posts(array('post_type' => 'ss_inquiry', 'post_status' => 'private', 'numberposts' => -1));
echo json_encode(array_map(static fn($p) => $p->post_title, $q)), "\\n";
`);
  cpSync(themeDir, join(site, "wp-content/themes", slug), { recursive: true });
  return site;
}

const php = (site: string, file: string, ...a: string[]) => execFileSync("php", ["-d", "display_errors=stderr", "-d", "memory_limit=512M", file, ...a], { cwd: site, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
async function serve(site: string): Promise<ChildProcess> {
  const srv = spawn("php", ["-d", "memory_limit=512M", "-S", `127.0.0.1:${port}`, "-t", site, join(site, "router.php")], { cwd: site, stdio: ["ignore", "ignore", "pipe"] });
  for (let i = 0; i < 80; i++) { try { await fetch(origin + "/wp-includes/images/blank.gif"); return srv; } catch { await sleep(100); } }
  throw new Error("PHP server did not start");
}

// --- static export --------------------------------------------------------------------------------
const ERR = /(Fatal error|Parse error|Warning|Notice|Deprecated)(<\/b>)?:\s/;
const ASSET_RE = new RegExp(`${origin.replace(/[.:/]/g, "\\$&")}/((?:wp-content|wp-includes)/[^"'\\s)<>?#&]+)`, "g");

function relPrefix(pagePath: string) {
  const depth = pagePath.split("/").filter(Boolean).length;
  return depth ? "../".repeat(depth) : "./";
}
// WordPress head links that only make sense on a live server (feeds, REST, oEmbed, RSD).
const SERVER_LINKS = /<link\b[^>]*\b(?:rel=["'](?:alternate|https:\/\/api\.w\.org\/|EditURI|shortlink)["'])[^>]*>\s*/gi;
function rewrite(html: string, prefix: string) {
  return html.replace(SERVER_LINKS, "").split(`${origin}/`).join(prefix).split(origin.replace(/\//g, "\\/") + "\\/").join(prefix.replace(/\//g, "\\/")).split(origin).join(prefix.replace(/\/$/, "") || ".");
}

function copyAsset(site: string, dest: string, rel: string, seen: Set<string>) {
  rel = decodeURIComponent(rel);
  if (seen.has(rel)) return;
  seen.add(rel);
  const src = join(site, rel);
  if (!existsSync(src) || !statSync(src).isFile()) return;
  mkdirSync(dirname(join(dest, rel)), { recursive: true });
  cpSync(src, join(dest, rel));
  if (extname(rel) === ".css") {
    const css = readFileSync(src, "utf8");
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const u = m[1];
      if (/^(data:|https?:|#)/.test(u)) continue;
      copyAsset(site, dest, normalize(join(dirname(rel), u.split(/[?#]/)[0])).replace(/\\/g, "/"), seen);
    }
  }
}

type PageReport = { path: string; status: number; errors: string[] };
async function exportSite(site: string, slug: string, paths: string[]) {
  const dest = join(out, "sites", slug);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const seen = new Set<string>();
  const reports: PageReport[] = [];
  for (const path of paths) {
    const r = await fetch(origin + path, { redirect: "manual" });
    const html = await r.text();
    reports.push({ path, status: r.status, errors: html.split("\n").filter((l) => ERR.test(l)).map((l) => l.replace(/<[^>]+>/g, "").trim()).slice(0, 5) });
    for (const m of html.replace(/\\\//g, "/").matchAll(ASSET_RE)) copyAsset(site, dest, m[1], seen);
    const file = join(dest, path.replace(/^\//, ""), "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, rewrite(html, relPrefix(path)));
  }
  return { dest, reports, assets: seen.size };
}

// --- static server for screenshots (mounted under a prefix, like the portal) ----------------------------
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".gif": "image/gif", ".webp": "image/webp" };
function staticServer(dir: string, prefix: string, p: number) {
  const srv = createServer((req, res) => {
    let u = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (!u.startsWith(prefix)) { res.writeHead(404).end(); return; }
    if (req.method === "POST") { res.writeHead(303, { location: `${prefix}contact/thank-you/` }).end(); return; }
    u = u.slice(prefix.length);
    let f = normalize(join(dir, u));
    if (!f.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }).end(readFileSync(f));
  });
  return new Promise<typeof srv>((r) => srv.listen(p, "127.0.0.1", () => r(srv)));
}

async function screenshots(slug: string, dir: string) {
  const req = createRequire(import.meta.url);
  let pw: any;
  try { pw = req("playwright"); } catch { pw = req(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "playwright")); }
  const prefix = `/p/preview/site/${slug}/`;
  const sp = port + 100;
  const srv = await staticServer(dir, prefix, sp);
  const browser = await pw.chromium.launch();
  const shots: string[] = [];
  const broken: string[] = [];
  const base = `http://127.0.0.1:${sp}${prefix}`;
  const take = async (name: string, path: string, vp: { width: number; height: number }, scale: number, full: boolean) => {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: scale });
    page.on("response", (r: any) => { if (r.status() >= 400 && r.url().startsWith(base)) broken.push(`${r.status()} ${r.url().slice(base.length)}`); });
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((i) => ((i as HTMLImageElement).loading = "eager")));
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => (i.complete ? i.decode().catch(() => null) : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    await page.waitForTimeout(150);
    const file = join(out, `${slug}-${name}.jpg`);
    await page.screenshot({ path: file, fullPage: full, type: "jpeg", quality: 80 });
    shots.push(file);
    await page.close();
  };
  const D = { width: 1440, height: 900 }, M = { width: 390, height: 844 };
  await take("desktop", "", D, 1, true);
  await take("desktop-fold", "", D, 2, false);
  await take("mobile", "", M, 2, true);
  await take("mobile-fold", "", M, 2, false);
  await take("practice", "practice-areas/land-use-zoning/", D, 1, true);
  await take("practice-fold", "practice-areas/family-law/", D, 2, false);
  await take("attorneys", "attorneys/", D, 1, true);
  await take("bio", "attorneys/steven-k-warner/", D, 1, true);
  await take("contact", "contact/", D, 1, true);
  // mobile menu open
  const page = await browser.newPage({ viewport: M, deviceScaleFactor: 2 });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.click(".ss-menu-toggle");
  await page.screenshot({ path: join(out, `${slug}-mobile-menu.jpg`), type: "jpeg", quality: 80 });
  shots.push(join(out, `${slug}-mobile-menu.jpg`));
  // the form posts and lands on the thank-you page inside the preview
  await page.goto(base + "contact/", { waitUntil: "networkidle" });
  await page.fill("#ss-form-1 input[name=ss_name]", "Preview Test");
  await page.fill("#ss-form-1 input[name=ss_email]", "test@example.test");
  await page.fill("#ss-form-1 textarea", "Testing the form.");
  await page.check("#ss-form-1 input[name=ss_consent]");
  await Promise.all([page.waitForNavigation(), page.click("#ss-form-1 .ss-submit")]);
  const landed = page.url();
  await browser.close();
  srv.close();
  return { shots, broken: [...new Set(broken)], formLanded: landed.endsWith("contact/thank-you/") };
}

// --- run --------------------------------------------------------------------------------------------
let allOk = true;
try {
  for (const themeDir of themes) {
    const slug = basename(themeDir);
    const site = prepareSite(slug, themeDir);
    let setup = "";
    try { setup = php(site, "install.php", slug).trim(); } catch (e: any) { setup = String(e.stderr ?? e.message); }
    let activated: any = {};
    try { activated = JSON.parse(php(site, "activate.php").trim().split("\n").pop()!); } catch (e: any) { activated = { error: String(e.stderr ?? e.message).slice(0, 500) }; }
    const manifest = JSON.parse(readFileSync(join(themeDir, "content/pages.json"), "utf8")).pages as { path: string }[];
    const paths = manifest.map((p) => (p.path === "home" ? "/" : `/${p.path}/`));
    const srv = await serve(site);
    let report;
    try {
      report = await exportSite(site, slug, paths);
      // extra pages that must render cleanly but aren't exported
      for (const path of ["/?s=zoning", "/this-page-does-not-exist/", "/?p=1"]) {
        const r = await fetch(origin + path);
        const html = await r.text();
        report.reports.push({ path, status: r.status, errors: html.split("\n").filter((l) => ERR.test(l)).map((l) => l.replace(/<[^>]+>/g, "").trim()).slice(0, 5) });
      }
      // the real form, end to end, on WordPress
      const contact = await (await fetch(origin + "/contact/")).text();
      const nonce = /name="_ss_nonce" value="([^"]+)"/.exec(contact)?.[1] ?? "";
      const body = new URLSearchParams({ action: "ss_contact", _ss_nonce: nonce, ss_return: `${origin}/contact/`, ss_name: "QA Visitor", ss_phone: "908-555-0100", ss_email: "qa@example.test", ss_matter: "Family & Matrimonial Law", ss_message: "Smoke test message.", ss_consent: "1" });
      const post = await fetch(origin + "/wp-admin/admin-post.php", { method: "POST", body, redirect: "manual" });
      const missing = await fetch(origin + "/wp-admin/admin-post.php", { method: "POST", body: new URLSearchParams({ action: "ss_contact", _ss_nonce: nonce, ss_return: `${origin}/contact/`, ss_name: "", ss_message: "" }), redirect: "manual" });
      const inquiries = JSON.parse(php(site, "inquiries.php").trim());
      const mail = existsSync(join(site, "wp-content/mail.log")) ? readFileSync(join(site, "wp-content/mail.log"), "utf8").trim().split("\n").filter((l) => l.includes("Consultation request")).length : 0;
      const form = {
        submitted: post.status === 302 && (post.headers.get("location") ?? "").endsWith("/contact/thank-you/"),
        rejectedEmpty: missing.status === 302 && (missing.headers.get("location") ?? "").includes("ss_error=missing"),
        saved: inquiries.length === 1, mailed: mail === 1,
      };
      const log = existsSync(join(site, "debug.log")) ? readFileSync(join(site, "debug.log"), "utf8").split("\n").filter((l) => ERR.test(l) && !/wp_(version_check|update_plugins|update_themes)\(\)/.test(l)) : []; // update checks fail offline: environment, not theme
      const pagesOk = report.reports.every((p) => !p.errors.length && (p.path === "/this-page-does-not-exist/" ? p.status === 404 : p.status === 200));
      const expectPages = manifest.length;
      const installOk = (activated?.installed?.created ?? 0) + (activated?.installed?.skipped ?? 0) === expectPages && activated.front > 0 && activated.permalinks === "/%postname%/";
      let shotInfo: Awaited<ReturnType<typeof screenshots>> | null = null;
      srv.kill();
      if (!noShots) shotInfo = await screenshots(slug, report.dest);
      const ok = setup === slug && installOk && pagesOk && !log.length && Object.values(form).every(Boolean) && (!shotInfo || (!shotInfo.broken.length && shotInfo.formLanded));
      allOk &&= ok;
      console.log(`${ok ? "PASS" : "FAIL"} ${slug} on WordPress ${activated.wp}, PHP ${activated.php}`);
      console.log(`  install: ${(activated?.installed?.created ?? 0) + (activated?.installed?.skipped ?? 0)}/${expectPages} pages in place, front page ${activated.front ? "set" : "NOT set"}, permalinks ${activated.permalinks}, site name "${activated.name}"`);
      console.log(`  pages: ${report.reports.filter((p) => !p.errors.length && p.status < 400).length}/${report.reports.length} clean (404 page returns ${report.reports.find((p) => p.path === "/this-page-does-not-exist/")?.status})`);
      for (const p of report.reports.filter((p) => p.errors.length || (p.status !== 200 && p.path !== "/this-page-does-not-exist/"))) console.log(`    ${p.path} ${p.status} ${p.errors.join(" | ")}`);
      console.log(`  debug.log: ${log.length ? log.slice(0, 10).join(" | ") : "no PHP errors, warnings or deprecations"}`);
      console.log(`  form: submit→thank-you ${form.submitted}, empty rejected ${form.rejectedEmpty}, saved as inquiry ${form.saved}, email sent ${form.mailed}`);
      console.log(`  export: ${report.reports.length - 3} pages + ${report.assets} assets → ${report.dest}`);
      if (shotInfo) console.log(`  preview: ${shotInfo.broken.length ? "broken: " + shotInfo.broken.join(", ") : "no broken links or assets"}, form in preview lands on thank-you ${shotInfo.formLanded}, ${shotInfo.shots.length} screenshots`);
    } finally {
      srv.kill();
    }
  }
} finally {
  if (!args.includes("--keep")) rmSync(root, { recursive: true, force: true });
  else console.log(`kept ${root}`);
}
process.exit(allOk ? 0 : 1);
