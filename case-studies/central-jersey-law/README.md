# Case study: Central Jersey Law (Savo Schalk)

**Client:** Savo, Schalk, Corsini, Warner, Gillespie, O'Grodnick & Fisher, P.A., a 15-attorney
full-service firm in Somerville, NJ. Site: https://centraljerseylaw.com/
**Run:** 26 Nov 2026. **Status:** concepts approved internally, client invite drafted and
waiting in the Outbox. Nothing has been sent to the client.

## The problem

The site runs on **PHP 7.4.33**, which stopped getting security fixes on 28 Nov 2022
(1,459 days before this audit). It can't simply be switched to PHP 8: the front end is a
one-off custom theme from 2018 ("Savo Schalk" v1.0.0 by cws, built on the Underscores
starter) that bundles its own jQuery 1.11.1 and Bootstrap 3.3.7. Themes of that age
typically hit fatal errors on PHP 8. The theme's PHP isn't public, so we can't list the
exact breakages without server access, but the safe path is the same either way:
replace the theme.

## What the automation did

| Step | What happened | Where |
|---|---|---|
| Intake | Client record created from `client.json` (manual source) | `src/intake` |
| Research: audit | Fetched the public homepage, `/wp-json/`, the theme's `style.css` and bundled library banners. Produced 12 findings: 1 critical, 2 high, 3 medium, 6 low | `src/research/audit.ts`, `out/audit.json` |
| Research: profile | Real services, team, results, testimonials, contact and payment details captured as a validated profile | `profile.json` |
| Concepts | `researched` generator wrote two directions from the profile, with no placeholder copy | `src/integrations/concepts/researched.ts` |
| Build | `wp-block-theme` builder turned each concept into an installable WordPress block theme (19 files, ~15 KB zipped, 17 lines of PHP) | `src/integrations/templates/wp/` |
| QA | `wp:smoke` installed WordPress on PHP 8.3.6 (SQLite), activated each theme, loaded 5 URLs each: **0 PHP errors, warnings or deprecations** | `scripts/wp-smoke.ts` |
| Approval gate | Concepts approved; portal link created; invite email drafted as `PENDING_APPROVAL` | Admin → Outbox |
| Portal + payment | Verified on a throwaway copy of the database: section ratings and comments, favorite, both offers, fake checkout, webhook, fulfillment. The real record was not touched | `app/p/[token]` |

Re-run it: `npm run case-study -- case-studies/central-jersey-law` (add `--live` to re-audit the live site).

## Audit findings (before)

| Severity | Finding |
|---|---|
| Critical | PHP 7.4.33, end of life since 2022-11-28 |
| High | Unmaintained custom classic theme (2018, Underscores-based); likely PHP 8 fatals |
| High | Theme ships jQuery 1.11.1 (XSS: CVE-2020-11022, CVE-2020-11023) |
| Medium | Bootstrap 3.3.7, end of life; XSS CVEs fixed only in 3.4.1 |
| Medium | Practice-area menu has 40 links, three of them duplicated to different pages (Construction Litigation, Workers Compensation, Government Affairs and Election Law) |
| Medium | Firm name appears 4 different ways in the site's own data; schema.org lists an old street address (77 N Bridge St) |
| Low | `X-Powered-By: PHP/7.4.33` on every response; no HSTS; XML-RPC open |
| Low | Images without useful alt text (4 in the server HTML; 15 attorney headshots in the rendered hero banner) |
| Low | Footer says © 2022; 11 pages untouched for 3+ years |

Other observations from reading the site: the "Make a payment" page relies on an
image-only Clover link with no alt text next to an empty button block; the About page
says 18 lawyers while the Attorneys page lists 15; the Facebook link points to a page
under the firm's former name.

WordPress core itself is current (6.9.12) and the plugins in use (All in One SEO,
Contact Form 7, Solid Security, Akismet, Redirection, Popup Maker, ExactMetrics) all
support PHP 8, so the theme is the blocker.

## The two concepts (after)

**Heritage.** Navy and brass, serif headlines, results right under the hero. Order: hero →
results → practice areas → about → attorneys → testimonials → contact.

**Modern Counsel.** Deep teal with an amber call button, "How can we help?" opener that
splits businesses/municipalities from individuals/families, practice-area finder first.
Order: hero → practice areas → results → testimonials → attorneys → about → contact.

Both: 40 practice-area links consolidated into 13 groups (7 business, 6 individual),
click-to-call in the header, the existing Clover payment link kept, "Se habla español",
NJ attorney-advertising disclaimer, no jQuery, no page builder, no external fonts or
trackers, theme.json v3, `Requires PHP: 8.1`.

Screenshots are in the project files (`case-study-central-jersey-law/screenshots/`).

## Before launch (needs the firm)

- Confirm the attorney count, the exact firm name, and the Facebook page.
- Permission to publish each result and testimonial (RPC 7.1 disclaimer is included).
- Real headshots (the concepts use initials).
- Move the site to a host on PHP 8.3, install the chosen theme, keep the existing
  Contact Form 7 form and 301 redirects for the merged practice-area URLs.

## Limits of this run

- Tested on WordPress 6.6-RC3, the newest core available offline in the build
  environment; the live site runs 6.9.12. Re-run `wp:smoke` with the current
  wordpress.org zip before delivery.
- The audit is outside-in only. Without server access we can't list the old theme's
  exact PHP 8 errors or check plugin versions.
