// QA for generated themes: installs a throwaway WordPress (SQLite, no MySQL
// needed) on the local PHP, activates each theme, loads the home page and a
// few other templates, fails on any PHP error/warning/deprecation, and
// optionally takes screenshots with Playwright.
//
//   npm run wp:smoke -- --wp-zip wordpress.zip --sqlite-zip sqlite-database-integration.zip \
//     --theme storage/themes/<slug> [--theme ...] [--title "Site name"] [--shots out/dir]
//
// wordpress.zip: https://wordpress.org/latest.zip
// sqlite-database-integration.zip: https://downloads.wordpress.org/plugin/sqlite-database-integration.zip
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const all = (k: string) => args.flatMap((a, i) => (a === `--${k}` ? [args[i + 1]] : []));
const wpZip = opt("wp-zip") ?? process.env.WP_CORE_ZIP;
const sqliteZip = opt("sqlite-zip") ?? process.env.WP_SQLITE_ZIP;
const themes = all("theme").map((t) => resolve(t));
const shots = opt("shots");
const title = opt("title") ?? "Theme preview";
const port = Number(opt("port") ?? 8091);
if (!wpZip || !sqliteZip || !themes.length) {
  console.error("Usage: wp-smoke --wp-zip <wordpress.zip> --sqlite-zip <sqlite-database-integration.zip> --theme <dir> [--theme <dir>] [--shots <dir>]");
  process.exit(2);
}

const root = mkdtempSync(join(tmpdir(), "wp-smoke-"));
const site = join(root, "site");
const php = (file: string, ...a: string[]) => execFileSync("php", ["-d", "display_errors=stderr", file, ...a], { cwd: site, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function unzipInto(zip: string, dest: string) {
  const tmp = join(root, `unz-${randomBytes(3).toString("hex")}`);
  execFileSync("unzip", ["-q", zip, "-d", tmp]);
  const entries = readdirSync(tmp);
  const top = entries.length === 1 ? join(tmp, entries[0]) : tmp; // official zips wrap everything in one folder
  renameSync(top, dest);
}

// 1. WordPress core + SQLite drop-in
unzipInto(wpZip, site);
rmSync(join(site, "wp-config.php"), { force: true });
rmSync(join(site, "wp-content/database"), { recursive: true, force: true });
mkdirSync(join(site, "wp-content/database"), { recursive: true });
unzipInto(sqliteZip, join(site, "wp-content/plugins/sqlite-database-integration"));
const dbCopy = readFileSync(join(site, "wp-content/plugins/sqlite-database-integration/db.copy"), "utf8")
  .replaceAll("{SQLITE_IMPLEMENTATION_FOLDER_PATH}", join(site, "wp-content/plugins/sqlite-database-integration"))
  .replaceAll("{SQLITE_PLUGIN}", "sqlite-database-integration/load.php");
writeFileSync(join(site, "wp-content/db.php"), dbCopy);
const url = `http://127.0.0.1:${port}`;
const salt = () => randomBytes(32).toString("hex");
writeFileSync(join(site, "wp-config.php"), `<?php
define('DB_NAME', 'wp'); define('DB_USER', ''); define('DB_PASSWORD', ''); define('DB_HOST', ''); define('DB_CHARSET', 'utf8'); define('DB_COLLATE', '');
define('DB_ENGINE', 'sqlite'); define('DB_DIR', __DIR__ . '/wp-content/database/'); define('DB_FILE', '.ht.sqlite');
${["AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY", "AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT"].map((k) => `define('${k}', '${salt()}');`).join("\n")}
$table_prefix = 'wp_';
define('WP_DEBUG', true); define('WP_DEBUG_DISPLAY', true); define('WP_DEBUG_LOG', __DIR__ . '/debug.log');
define('WP_HOME', '${url}'); define('WP_SITEURL', '${url}');
define('DISABLE_WP_CRON', true); define('AUTOMATIC_UPDATER_DISABLED', true); define('WP_HTTP_BLOCK_EXTERNAL', true);
if (!defined('ABSPATH')) define('ABSPATH', __DIR__ . '/');
require_once ABSPATH . 'wp-settings.php';
`);
writeFileSync(join(site, "smoke-setup.php"), `<?php
define('WP_INSTALLING', true);
$_SERVER['HTTP_HOST'] = '127.0.0.1:${port}'; $_SERVER['REQUEST_URI'] = '/'; $_SERVER['SERVER_NAME'] = '127.0.0.1';
require __DIR__ . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
add_filter('pre_wp_mail', '__return_true'); // no mail server in a throwaway install
if (!is_blog_installed()) { wp_install($argv[2], 'admin', 'admin@example.test', false, '', wp_generate_password(24)); }
update_option('blogname', $argv[2]);
update_option('blogdescription', '');
switch_theme($argv[1]);
echo get_stylesheet(), ' on WordPress ', $GLOBALS['wp_version'], ', PHP ', PHP_VERSION, "\\n";
`);

// 2. Copy themes in
for (const t of themes) cpSync(t, join(site, "wp-content/themes", basename(t)), { recursive: true });

const ERR = /(Fatal error|Parse error|Warning|Notice|Deprecated)(<\/b>)?:\s/;
async function serve() {
  const srv = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", site], { cwd: site, stdio: ["ignore", "ignore", "pipe"] });
  for (let i = 0; i < 50; i++) { try { await fetch(url + "/wp-includes/images/blank.gif"); return srv; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error("PHP server did not start");
}

const results: { theme: string; ok: boolean; pages: { path: string; status: number; errors: string[]; bytes: number }[]; screenshots: string[] }[] = [];
const srv = await serve();
try {
  for (const t of themes) {
    const slug = basename(t);
    rmSync(join(site, "debug.log"), { force: true });
    let setupOut = "";
    try { setupOut = php("smoke-setup.php", slug, title); } catch (e: any) { setupOut = String(e.stderr ?? e.message); }
    const pages = [];
    for (const path of ["/", "/?page_id=2", "/?p=1", "/?p=987654", "/?s=law"]) {
      const r = await fetch(url + path);
      const html = await r.text();
      const errors = [...html.split("\n").filter((l) => ERR.test(l)).map((l) => l.replace(/<[^>]+>/g, "").trim())];
      pages.push({ path, status: r.status, errors, bytes: html.length });
    }
    const log = existsSync(join(site, "debug.log")) ? readFileSync(join(site, "debug.log"), "utf8").trim() : "";
    const logErrors = log ? log.split("\n").filter((l) => ERR.test(l)) : [];
    if (logErrors.length) pages.push({ path: "debug.log", status: 0, errors: logErrors.slice(0, 20), bytes: log.length });
    const expectStatus = (p: { path: string; status: number }) => p.path === "debug.log" || (p.path === "/?p=987654" ? p.status === 404 : p.status === 200);
    const ok = pages.every((p) => !p.errors.length && expectStatus(p)) && setupOut.startsWith(slug);
    const shotsTaken: string[] = [];
    if (shots) {
      mkdirSync(shots, { recursive: true });
      try {
        const req = createRequire(import.meta.url);
        let pw: any;
        try { pw = req("playwright"); } catch { pw = req(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "playwright")); }
        const browser = await pw.chromium.launch();
        for (const [label, vp, scale] of [["desktop", { width: 1440, height: 900 }, 1], ["mobile", { width: 390, height: 844 }, 2]] as const) {
          const page = await browser.newPage({ viewport: vp, deviceScaleFactor: scale });
          await page.goto(url + "/", { waitUntil: "networkidle" });
          const file = join(shots, `${slug}-${label}.jpg`);
          await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 82 });
          shotsTaken.push(file);
          if (label === "desktop") {
            const p2 = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
            await p2.goto(url + "/", { waitUntil: "networkidle" });
            const fold = join(shots, `${slug}-desktop-fold.jpg`);
            await p2.screenshot({ path: fold, type: "jpeg", quality: 85 });
            shotsTaken.push(fold);
          }
        }
        await browser.close();
      } catch (e: any) { console.warn(`  screenshots skipped: ${e.message}`); }
    }
    results.push({ theme: slug, ok, pages, screenshots: shotsTaken });
    console.log(`${ok ? "PASS" : "FAIL"} ${slug} — ${setupOut.trim()}`);
    for (const p of pages) console.log(`  ${p.path.padEnd(12)} ${p.status || ""} ${p.errors.length ? p.errors.join(" | ") : "no PHP errors"}`);
  }
} finally {
  srv.kill();
  if (!args.includes("--keep")) rmSync(root, { recursive: true, force: true });
  else console.log(`site kept at ${site}`);
}
if (opt("json")) writeFileSync(opt("json")!, JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
