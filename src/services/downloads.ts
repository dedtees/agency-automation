// Short-lived signed links for purchased theme packages. The link carries the
// file, an expiry and an HMAC; the download route checks all three and only
// ever serves files from STORAGE_DIR/packages.
import { createHmac, timingSafeEqual } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { getConfig } from "../core/config";

function secret() {
  const s = getConfig().downloadSigningSecret;
  if (!s) throw new Error("DOWNLOAD_SIGNING_SECRET is not set");
  return s;
}
const mac = (file: string, exp: number) => createHmac("sha256", secret()).update(`${file}\n${exp}`).digest("base64url");

export function signedDownloadUrl(packagePath: string, ttlSeconds: number, now = Date.now()) {
  const file = basename(packagePath);
  const exp = Math.floor(now / 1000) + ttlSeconds;
  const q = new URLSearchParams({ f: file, exp: String(exp), sig: mac(file, exp) });
  return `${getConfig().appUrl}/downloads?${q}`;
}

/** Returns the absolute path to serve, or null if the link is bad or expired. */
export function verifyDownload(params: URLSearchParams, now = Date.now()): string | null {
  const file = params.get("f") ?? "";
  const exp = Number(params.get("exp"));
  const sig = params.get("sig") ?? "";
  if (!file || file !== basename(file) || !/^[\w.-]+\.zip$/.test(file) || !Number.isFinite(exp) || exp * 1000 < now) return null;
  const want = Buffer.from(mac(file, exp));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const dir = resolve(getConfig().storageDir, "packages");
  const full = resolve(join(dir, file));
  return full.startsWith(dir + "/") ? full : null;
}
