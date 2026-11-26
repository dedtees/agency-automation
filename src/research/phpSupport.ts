// PHP release support windows (php.net/supported-versions). Used by the site
// audit to say whether a client's server is still getting security fixes.
// Update this table once a year when a new PHP version ships.

export interface PhpBranch {
  branch: string;
  activeUntil: string;   // end of bug-fix support
  securityUntil: string; // end of security fixes (end of life)
}

export const PHP_BRANCHES: PhpBranch[] = [
  { branch: "5.6", activeUntil: "2017-01-19", securityUntil: "2018-12-31" },
  { branch: "7.0", activeUntil: "2017-12-03", securityUntil: "2019-01-10" },
  { branch: "7.1", activeUntil: "2018-12-01", securityUntil: "2019-12-01" },
  { branch: "7.2", activeUntil: "2019-11-30", securityUntil: "2020-11-30" },
  { branch: "7.3", activeUntil: "2020-12-06", securityUntil: "2021-12-06" },
  { branch: "7.4", activeUntil: "2021-11-28", securityUntil: "2022-11-28" },
  { branch: "8.0", activeUntil: "2022-11-26", securityUntil: "2023-11-26" },
  { branch: "8.1", activeUntil: "2023-11-25", securityUntil: "2025-12-31" },
  { branch: "8.2", activeUntil: "2024-12-31", securityUntil: "2026-12-31" },
  { branch: "8.3", activeUntil: "2025-12-31", securityUntil: "2027-12-31" },
  { branch: "8.4", activeUntil: "2026-12-31", securityUntil: "2028-12-31" },
  { branch: "8.5", activeUntil: "2027-12-31", securityUntil: "2029-12-31" },
];

/** The PHP version our generated themes are built and tested against. */
export const TARGET_PHP = "8.3";

export type PhpStatus = "unknown" | "end-of-life" | "security-only" | "active";

export function phpStatus(version: string | null | undefined, today = new Date()): { status: PhpStatus; branch?: PhpBranch; daysPastEol?: number } {
  const m = version?.match(/^(\d+)\.(\d+)/);
  if (!m) return { status: "unknown" };
  const branch = PHP_BRANCHES.find((b) => b.branch === `${m[1]}.${m[2]}`);
  if (!branch) {
    // Older than the table → long dead; newer → assume active.
    const n = Number(m[1]) * 100 + Number(m[2]);
    return { status: n < 506 ? "end-of-life" : "active" };
  }
  const eol = new Date(branch.securityUntil + "T00:00:00Z");
  if (today > eol) return { status: "end-of-life", branch, daysPastEol: Math.floor((+today - +eol) / 86_400_000) };
  if (today > new Date(branch.activeUntil + "T00:00:00Z")) return { status: "security-only", branch };
  return { status: "active", branch };
}
