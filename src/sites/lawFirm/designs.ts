// The two design directions for the law-firm site. Each is a set of tokens
// (colors, type, radius) plus a stylesheet; the shared stylesheet does the
// layout and every rule reads the tokens, so the designs only override what
// makes them look different.
import type { DesignId } from "./types";

export interface FontFace { family: string; file: string; weight: string; style?: "normal" | "italic" }
export interface Design {
  id: DesignId;
  name: string;
  description: string;
  tokens: Record<string, string>;
  fonts: { heading: string; body: string; accent?: string; faces: FontFace[] };
  css: string;
}

const icon = (paths: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='${paths}'/></svg>`)}")`;

export const ICONS: Record<string, string> = {
  landuse: "M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3zM9 3.5v14M15 6.5v14",
  capitol: "M3 21h18M5 21v-9m14 9v-9M9 21v-9m6 9v-9M2.5 9.5L12 4l9.5 5.5zM12 4V2",
  briefcase: "M3 7.5h18V20H3zM8.5 7.5V4.5h7v3M3 12.5h18M11 12.5v2h2v-2",
  building: "M4 21V4h11v17M15 9h5v12M2 21h20M7.5 8h1m2.5 0h1m-4.5 4h1m2.5 0h1m-4.5 4h1m2.5 0h1",
  gavel: "M13.5 3.5l7 7M10.5 6.5l7 7M12 5l-4.5 4.5 7 7L19 12M9.75 11.75L3 18.5 5.5 21l6.75-6.75M2.5 21.5h10",
  bank: "M3 21h18M4 9.5h16M12 3l9 5H3zM6 9.5V18m4-8.5V18m4-8.5V18m4-8.5V18M4 18h16",
  people: "M9 11a3.75 3.75 0 100-7.5A3.75 3.75 0 009 11zM2.5 20.5v-1a6.5 6.5 0 0113 0v1M16 3.75a3.75 3.75 0 010 7.25M21.5 20.5v-1a6.5 6.5 0 00-3.5-5.75",
  shield: "M12 3l8 3v6c0 4.75-3.4 7.9-8 9-4.6-1.1-8-4.25-8-9V6zM9 12l2 2 4-4",
  family: "M12 20.5s-7.5-4.6-9.2-9.4A4.9 4.9 0 0112 7.2a4.9 4.9 0 019.2 3.9c-1.7 4.8-9.2 9.4-9.2 9.4z",
  document: "M6 3h9l4 4v14H6zM14.5 3v4.5H19M9 12h7M9 16h7M9 8h3",
  scales: "M12 4v16M7.5 20h9M4.5 7.5h15M12 4a1 1 0 100-.01M4.5 7.5L2 14a3 3 0 005 0zM19.5 7.5L17 14a3 3 0 005 0z",
  home: "M3 11.5L12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5.5h4V20",
  phone: "M5 3.5h3.5l2 5-2.25 1.5a11 11 0 005.75 5.75L15.5 13.5l5 2V19a2 2 0 01-2 2A16.5 16.5 0 013 5.5a2 2 0 012-2z",
  mail: "M3 5.5h18v13H3zM3.5 6l8.5 7 8.5-7",
  pin: "M12 21.5s-7-6.25-7-12a7 7 0 0114 0c0 5.75-7 12-7 12zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2",
  arrow: "M4.5 12h15M13.5 6l6 6-6 6",
  check: "M4.5 12.5l4.5 4.5L19.5 7",
  card: "M3 6h18v12H3zM3 10h18M7 14.5h4",
};
const iconCss = Object.entries(ICONS).map(([k, v]) => `.icon-${k}{--ss-i:${icon(v)}}`).join("\n");

// --- shared layout -------------------------------------------------------------------------
const BASE = `
:root{--ss-gutter:clamp(18px,4.5vw,56px);--ss-wide:1240px;--ss-check:${icon(ICONS.check)};--ss-arrow:${icon(ICONS.arrow)};--ss-phone:${icon(ICONS.phone)}}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--ss-font-body);font-size:17px;line-height:1.7;color:var(--ss-text);background:var(--ss-paper);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.wp-site-blocks{padding:0!important}
.wp-site-blocks>*,.wp-block-post-content>*,main>*{margin-block-start:0!important}
:where(.wp-block-post-content) p{margin:0}
a{color:var(--ss-link);text-underline-offset:.18em;text-decoration-thickness:1px}
a:hover{color:var(--ss-accent-deep)}
img{max-width:100%;height:auto;display:block}
h1,h2,h3,h4,h5{font-family:var(--ss-font-head);color:var(--ss-ink);font-weight:var(--ss-head-weight);letter-spacing:var(--ss-head-track);line-height:1.1;text-wrap:balance;margin:0}
h3{font-size:1.3rem;line-height:1.25}
:focus-visible{outline:2px solid var(--ss-accent);outline-offset:3px}
.screen-reader-text{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

/* sections */
.ss-section{padding:clamp(64px,8vw,116px) var(--ss-gutter);margin:0!important;position:relative}
.ss-inner{max-width:var(--ss-wide);margin-inline:auto!important;width:100%}
.ss-section.is-alt{background:var(--ss-soft)}
.ss-narrow .ss-inner{max-width:760px}
.ss-head{margin-bottom:clamp(32px,4vw,56px)!important;max-width:760px}
.ss-head.is-center{text-align:center;margin-inline:auto!important}
.ss-head.is-center .ss-lede{margin-inline:auto}
.ss-head>*+*{margin-top:14px!important}
.ss-head-row{align-items:flex-end!important;gap:24px 48px!important;margin-bottom:clamp(32px,4vw,56px)!important}
.ss-head-row .ss-head{margin-bottom:0!important}
.ss-title{font-size:clamp(2rem,3.5vw,3rem)}
.ss-lede{font-size:clamp(1.06rem,1.35vw,1.22rem);line-height:1.6;color:var(--ss-muted);max-width:44rem}
.ss-eyebrow{font-family:var(--ss-font-body);font-size:.78rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--ss-eyebrow)}
.ss-center{justify-content:center;margin-top:44px!important}
.ss-fineprint{font-size:.82rem;line-height:1.55;color:var(--ss-muted);margin-top:28px!important;max-width:60rem}
.ss-badge{display:inline-block;font-size:.8rem;font-weight:600;letter-spacing:.04em;padding:5px 12px;border:1px solid currentColor;border-radius:var(--ss-pill);opacity:.9}
.ss-section>.ss-inner>*+*,.ss-main>*+*{margin-top:22px}
.ss-main>p,.ss-intro-cols p:not(.ss-eyebrow){font-size:1.06rem}

/* buttons */
.wp-block-buttons{gap:12px;flex-wrap:wrap}
.wp-element-button,.wp-block-button__link{font-family:var(--ss-font-body);font-weight:600;font-size:.98rem;line-height:1.2;padding:16px 26px;border-radius:var(--ss-btn-radius);background:var(--ss-btn-bg);color:var(--ss-btn-text);border:1.5px solid var(--ss-btn-bg);text-decoration:none;letter-spacing:var(--ss-btn-track);text-transform:var(--ss-btn-case);transition:transform .15s,background .15s,color .15s,border-color .15s;display:inline-block}
.wp-block-button__link:hover{background:var(--ss-btn-hover);border-color:var(--ss-btn-hover);color:var(--ss-btn-text);transform:translateY(-1px)}
.is-style-outline .wp-block-button__link{background:transparent;color:var(--ss-ink);border-color:var(--ss-line-strong)}
.is-style-outline .wp-block-button__link:hover{background:var(--ss-ink);border-color:var(--ss-ink);color:#fff}
.is-style-text .wp-block-button__link{background:none;border:0;padding:6px 0;color:var(--ss-ink);border-bottom:1.5px solid var(--ss-accent);border-radius:0}
.is-style-text .wp-block-button__link:hover{background:none;color:var(--ss-accent-deep);transform:none}

/* icons */
.has-icon::before{content:"";display:block;width:30px;height:30px;background:var(--ss-icon);-webkit-mask:var(--ss-i) center/contain no-repeat;mask:var(--ss-i) center/contain no-repeat;margin-bottom:16px}
${iconCss}

/* checks & chips */
ul.ss-check-grid,ul.ss-checks,ul.ss-link-list,ul.ss-fact-list,ul.ss-contact-list,ul.ss-chip-list,ul.ss-decisions,ul.ss-credits{list-style:none;padding:0;margin:0}
.ss-check-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(16rem,100%),1fr));gap:10px 28px}
.ss-check-grid.is-3{grid-template-columns:repeat(auto-fill,minmax(min(15rem,100%),1fr))}
.ss-check-grid li,.ss-checks li{position:relative;padding-left:30px;line-height:1.5}
.ss-check-grid li::before,.ss-checks li::before{content:"";position:absolute;left:0;top:.2em;width:18px;height:18px;background:var(--ss-accent-deep);-webkit-mask:var(--ss-check) center/contain no-repeat;mask:var(--ss-check) center/contain no-repeat}
.ss-chip-list{display:flex;flex-wrap:wrap;gap:8px}
.ss-chip-list a{display:inline-block;padding:7px 14px;border:1px solid var(--ss-line-strong);border-radius:var(--ss-pill);font-size:.9rem;font-weight:500;color:var(--ss-ink);text-decoration:none;line-height:1.3;background:var(--ss-paper)}
.ss-chip-list a:hover{border-color:var(--ss-accent-deep);color:var(--ss-accent-deep)}
.ss-link-list li{border-top:1px solid var(--ss-line)}
.ss-link-list a{display:block;padding:11px 0;text-decoration:none;color:var(--ss-ink);font-weight:500;font-size:.97rem}
.ss-link-list a:hover{color:var(--ss-accent-deep)}
.ss-contact-list li{padding:10px 0;border-bottom:1px solid var(--ss-line);line-height:1.5}
.ss-contact-list li small{display:block;color:var(--ss-muted);margin-top:4px;font-size:.86rem}
.ss-contact-list .ss-k{display:inline-block;min-width:64px;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ss-muted)}
.ss-contact-list a{color:inherit;text-decoration:none;font-weight:600}
.ss-contact-list.is-inline{display:flex;flex-wrap:wrap;gap:4px 28px}
.ss-contact-list.is-inline li{border:0;padding:4px 0}
.ss-fact-list li{padding:8px 0;border-top:1px solid var(--ss-line);font-size:.94rem;line-height:1.5}
.ss-fact-list li:first-child{border-top:0}
.ss-decisions{columns:2 22rem;column-gap:48px}
.ss-decisions li{break-inside:avoid;padding:12px 0;border-top:1px solid var(--ss-line);font-size:.95rem}
.ss-credits li{padding:10px 0;border-top:1px solid var(--ss-line);font-size:.92rem}

/* placeholders: deliberately visible until the firm supplies the real thing */
.ss-placeholder{border:1.5px dashed #C69A1E;background:#FFF8E3;color:#5A4510;padding:14px 18px;border-radius:8px;font-size:.93rem;line-height:1.5}
.ss-placeholder-inline{background:#FFF1C7;color:#5A4510;padding:1px 6px;border-radius:4px;font-size:.9em}
.ss-photo-tag{position:absolute;right:16px;bottom:14px;margin:0!important;font-size:.72rem;padding:5px 10px;border-radius:999px;background:rgba(255,248,227,.94);color:#5A4510;border:1px dashed #C69A1E;z-index:2}

/* header */
header.wp-block-template-part{position:sticky;top:calc(var(--ss-util-h) * -1);z-index:60;margin:0}
.ss-util{background:var(--ss-util-bg);color:var(--ss-util-text);font-size:.83rem;padding:0 var(--ss-gutter);height:var(--ss-util-h);display:flex;align-items:center}
.ss-util .ss-inner{display:flex;justify-content:space-between;align-items:center;gap:16px}
.ss-util p{margin:0}
.ss-util a{color:inherit;text-decoration:none}
.ss-util a:hover{color:#fff}
.ss-util-right{display:flex;gap:22px}
.ss-masthead{background:var(--ss-header-bg);padding:0 var(--ss-gutter);border-bottom:1px solid var(--ss-header-line);transition:box-shadow .25s}
body.is-scrolled .ss-masthead{box-shadow:0 10px 30px -18px rgba(10,20,40,.35)}
.ss-masthead>.ss-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:var(--ss-header-h)}
.ss-brand{display:flex;flex-direction:column;gap:2px;flex-shrink:0}
.ss-brand .wp-block-site-title{margin:0;font-family:var(--ss-font-head);font-size:var(--ss-logo-size);font-weight:var(--ss-logo-weight);letter-spacing:var(--ss-logo-track);line-height:1}
.ss-brand .wp-block-site-title a{color:var(--ss-ink);text-decoration:none}
.ss-brand .ss-brand-sub{margin:0;font-size:.66rem;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:var(--ss-eyebrow)}
.ss-nav{flex:1;justify-content:flex-end}
.ss-nav .wp-block-navigation__container{gap:clamp(16px,2.1vw,32px)}
.ss-nav .wp-block-navigation-item__content{font-family:var(--ss-font-body);font-size:.95rem;font-weight:500;color:var(--ss-ink);text-decoration:none;padding:10px 0}
.ss-nav .wp-block-navigation-item__content:hover{color:var(--ss-accent-deep)}
.ss-nav .wp-block-navigation__submenu-icon{margin-left:4px}
.ss-nav .has-child>.wp-block-navigation__submenu-container{display:grid!important;grid-template-columns:1fr 1fr;min-width:600px!important;padding:14px!important;gap:0 8px;border:1px solid var(--ss-line)!important;border-radius:var(--ss-radius);box-shadow:0 30px 60px -30px rgba(10,20,40,.45);top:calc(100% + 6px)!important;left:-24px!important;background:var(--ss-paper)!important}
.ss-nav .wp-block-navigation__submenu-container .wp-block-navigation-item__content{padding:10px 12px!important;font-size:.9rem;border-radius:calc(var(--ss-radius) * .6)}
.ss-nav .wp-block-navigation__submenu-container .wp-block-navigation-item__content:hover{background:var(--ss-soft)}
.ss-header-cta{flex-shrink:0;align-items:center;gap:18px!important}
.ss-header-cta .wp-block-button__link{padding:12px 20px;font-size:.9rem}
.ss-header-phone{font-weight:700;font-size:.98rem;color:var(--ss-ink)!important;text-decoration:none;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.ss-header-phone::before{content:"";width:18px;height:18px;background:var(--ss-accent-deep);-webkit-mask:var(--ss-phone) center/contain no-repeat;mask:var(--ss-phone) center/contain no-repeat}
.ss-menu-toggle{display:none;width:46px;height:46px;border:1px solid var(--ss-line-strong);background:transparent;border-radius:var(--ss-radius);cursor:pointer;padding:12px 11px;flex-direction:column;justify-content:space-between}
.ss-menu-toggle span{display:block;height:2px;background:var(--ss-ink);transition:transform .2s,opacity .2s}
body.ss-menu-open .ss-menu-toggle span:nth-child(1){transform:translateY(9px) rotate(45deg)}
body.ss-menu-open .ss-menu-toggle span:nth-child(2){opacity:0}
body.ss-menu-open .ss-menu-toggle span:nth-child(3){transform:translateY(-9px) rotate(-45deg)}

/* heroes */
.ss-hero,.ss-page-hero{position:relative;isolation:isolate;padding:0 var(--ss-gutter);margin:0!important;overflow:hidden}
.ss-hero-actions{margin-top:34px!important}
.ss-crumbs{font-size:.82rem;color:var(--ss-muted);margin-bottom:18px!important}
.ss-crumbs a{color:inherit;text-decoration:none}
.ss-crumbs a:hover{text-decoration:underline}
.ss-page-title{font-size:clamp(2.4rem,5vw,4rem);line-height:1.04}
.ss-page-hero .ss-lede{margin-top:18px!important}
.ss-page-hero .ss-eyebrow{margin-bottom:12px!important}

/* practice lists & cards */
.ss-card{background:var(--ss-paper);border:1px solid var(--ss-line);border-radius:var(--ss-radius);padding:30px 28px;transition:border-color .2s,box-shadow .2s,transform .2s;height:100%;box-sizing:border-box}
.ss-card:hover{border-color:var(--ss-accent);box-shadow:0 24px 48px -32px rgba(10,20,40,.35);transform:translateY(-2px)}
.ss-card h3{font-size:1.32rem;margin-bottom:10px!important}
.ss-card p{color:var(--ss-muted);font-size:.97rem;line-height:1.6}
.ss-more{font-weight:600;font-size:.93rem;color:var(--ss-ink)!important;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
.ss-more::after,.ss-practice-name a::after{content:"";width:16px;height:16px;background:var(--ss-accent-deep);-webkit-mask:var(--ss-arrow) center/contain no-repeat;mask:var(--ss-arrow) center/contain no-repeat;transition:transform .2s;flex-shrink:0}
.ss-card:hover .ss-more::after,.ss-practice-name a:hover::after{transform:translateX(4px)}
.ss-more-wrap{margin-top:18px!important}
.ss-cards{gap:20px!important}

/* results */
.ss-results-grid{gap:20px!important}
.ss-result{padding:30px 26px;border-radius:var(--ss-radius);height:100%;box-sizing:border-box}
.ss-result-figure{font-family:var(--ss-font-figure);font-size:clamp(2.2rem,3vw,2.9rem);line-height:1;font-weight:600;color:var(--ss-figure);letter-spacing:-.01em}
.ss-result-label{font-weight:700;font-size:.98rem;margin-top:14px!important;color:var(--ss-ink)}
.ss-result-summary{font-size:.92rem;line-height:1.6;color:var(--ss-muted);margin-top:10px!important}
.ss-result-who{font-size:.85rem;margin-top:14px!important}
.ss-result-who a{color:var(--ss-ink);font-weight:600}
.ss-results-foot{margin-top:36px!important;align-items:center!important;gap:20px!important}
.ss-results-foot .ss-fineprint{margin:0!important;max-width:38rem}
.ss-results-grid.is-compact .ss-result{padding:22px}
.ss-results-grid.is-compact .ss-result-figure{font-size:1.9rem}

/* people */
.ss-people{gap:clamp(18px,2.4vw,32px)!important}
.ss-person{margin:0}
.ss-person>*+*{margin-top:0!important}
.ss-portrait{margin:0 0 16px!important;overflow:hidden;border-radius:var(--ss-radius);background:var(--ss-soft)}
.ss-portrait img{width:100%;aspect-ratio:4/5;object-fit:cover;object-position:50% 20%;transition:transform .5s}
.ss-person:hover .ss-portrait img{transform:scale(1.035)}
.ss-portrait.is-large{max-width:360px}
.ss-person-name{font-size:1.25rem;margin-bottom:4px!important}
.ss-person-name a{color:var(--ss-ink);text-decoration:none}
.ss-person-role{font-size:.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ss-eyebrow)}
.ss-person-focus{font-size:.88rem;color:var(--ss-muted);margin-top:6px!important;line-height:1.45}
.ss-mini{gap:14px!important;align-items:center!important;padding:10px 0;border-top:1px solid var(--ss-line)}
.ss-mini:first-of-type{border-top:0}
.ss-mini-photo{margin:0!important;width:54px;flex-shrink:0}
.ss-mini-photo img{width:54px;height:54px;object-fit:cover;object-position:50% 20%;border-radius:var(--ss-avatar-radius)}
.ss-mini-text{font-size:.82rem;line-height:1.35;color:var(--ss-muted)}
.ss-mini-text a{font-size:.97rem;font-weight:600;color:var(--ss-ink);text-decoration:none}

/* body + aside */
.ss-body-cols{gap:clamp(32px,5vw,80px)!important;align-items:flex-start!important}
.ss-sub{font-size:1.45rem;margin-top:44px!important;margin-bottom:6px!important}
.ss-handles,.ss-subsection,.ss-related{margin-top:8px!important}
.ss-handles>*+*,.ss-subsection>*+*,.ss-related>*+*{margin-top:16px!important}
.ss-aside{align-self:flex-start}
@media (min-width:782px){.ss-aside{position:sticky;top:calc(var(--ss-header-h) + 28px)}}
.ss-aside>*+*{margin-top:20px!important}
.ss-aside-card{border:1px solid var(--ss-line);border-radius:var(--ss-radius);padding:26px;background:var(--ss-paper)}
.ss-aside-card>*+*{margin-top:14px!important}
.ss-aside-card h3{font-size:1.2rem}
.ss-aside-card.is-cta{background:var(--ss-soft);border-color:transparent}
.ss-big-phone{font-family:var(--ss-font-head);font-size:1.6rem;font-weight:700;color:var(--ss-ink)!important;text-decoration:none}
.ss-mini-result{font-size:.92rem;line-height:1.45;padding-top:10px;border-top:1px solid var(--ss-line)}
.ss-mini-result strong{display:block;font-family:var(--ss-font-figure);font-size:1.3rem;color:var(--ss-figure)}
.ss-framed{margin:0!important}
.ss-framed img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--ss-radius-lg)}
.ss-intro-cols{gap:clamp(32px,6vw,96px)!important;align-items:center!important}
.ss-intro-cols>.wp-block-column>*+*{margin-top:20px!important}
.ss-stat-grid{gap:16px!important}
.ss-stat-grid .ss-stat{padding:24px;border:1px solid var(--ss-line);border-radius:var(--ss-radius)}
.ss-stat-value{font-family:var(--ss-font-figure);font-size:2.4rem;line-height:1;font-weight:600;color:var(--ss-figure)}
.ss-stat-label{font-size:.88rem;color:var(--ss-muted);margin-top:8px!important}

/* recognition */
.ss-recognition{padding-block:56px!important;background:var(--ss-paper);border-block:1px solid var(--ss-line)}
.ss-rec-grid{gap:0!important}
.ss-rec{padding:6px 28px;border-left:1px solid var(--ss-line-strong)}
.ss-rec:first-child{border-left:0;padding-left:0}
.ss-rec-title{font-family:var(--ss-font-head);font-size:1.22rem;font-weight:700;color:var(--ss-ink);line-height:1.2}
.ss-rec-detail{font-size:.86rem;color:var(--ss-muted);margin-top:6px!important;line-height:1.5}

/* quotes */
.wp-block-quote.ss-quote,.wp-block-quote.ss-quote-feature{margin:0;padding:0;border:0}
.ss-quote{padding:30px!important;background:var(--ss-paper);border:1px solid var(--ss-line)!important;border-radius:var(--ss-radius);height:100%;box-sizing:border-box}
.ss-quote p{font-size:1rem;line-height:1.65;color:var(--ss-text)}
.ss-quote cite,.ss-quote-feature cite{display:block;margin-top:16px;font-style:normal;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ss-eyebrow)}
.ss-quote-feature p{font-family:var(--ss-font-quote);font-size:clamp(1.5rem,2.4vw,2.1rem);line-height:1.35;color:var(--ss-ink);font-style:var(--ss-quote-style)}
.ss-quote-feature::before{content:"\\201C";display:block;font-family:var(--ss-font-quote);font-size:5.5rem;line-height:.8;color:var(--ss-accent);height:44px}
.ss-quotes{gap:clamp(28px,4vw,64px)!important}
.ss-quotes .wp-block-column>*+*{margin-top:20px!important}
.ss-quotes .ss-quote{height:auto}
.ss-quote-grid{gap:20px!important}

/* consultation band + form */
.ss-consult{color:#fff}
.ss-consult .ss-title,.ss-consult h2,.ss-consult h3{color:#fff}
.ss-consult .ss-form-card h3,.ss-consult .ss-form-card{color:var(--ss-text)}
.ss-consult .ss-lede{color:rgba(255,255,255,.78)}
.ss-consult .ss-eyebrow{color:var(--ss-accent)}
.ss-consult .ss-contact-list li{border-color:rgba(255,255,255,.16)}
.ss-consult .ss-contact-list .ss-k{color:rgba(255,255,255,.55)}
.ss-consult .ss-placeholder-inline{background:rgba(255,241,199,.95)}
.ss-consult-cols{gap:clamp(32px,6vw,88px)!important;align-items:center!important}
.ss-consult-cols>.wp-block-column:first-child>*+*{margin-top:20px!important}
.ss-form-card{background:var(--ss-paper);border-radius:var(--ss-radius-lg);padding:clamp(24px,3vw,40px);box-shadow:0 40px 80px -40px rgba(0,0,0,.5)}
.ss-form-card.is-flat{box-shadow:none;border:1px solid var(--ss-line);padding:clamp(24px,3vw,44px)}
.ss-form-title{font-size:1.5rem;margin-bottom:18px!important;color:var(--ss-ink)!important}
.ss-form{display:grid;grid-template-columns:1fr 1fr;gap:16px 16px}
.ss-form .ss-field{display:flex;flex-direction:column;gap:6px}
.ss-form .ss-field.is-wide,.ss-form .ss-consent,.ss-form .ss-submit,.ss-form .ss-form-note,.ss-form .ss-form-error{grid-column:1/-1}
.ss-form label{font-size:.8rem;font-weight:600;color:var(--ss-ink);letter-spacing:.02em}
.ss-form label .req{color:var(--ss-accent-deep)}
.ss-form input[type=text],.ss-form input[type=email],.ss-form input[type=tel],.ss-form select,.ss-form textarea{font:inherit;font-size:16px;color:var(--ss-text);background:#fff;border:1px solid var(--ss-line-strong);border-radius:var(--ss-input-radius);padding:13px 14px;width:100%;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}
.ss-form textarea{min-height:128px;resize:vertical}
.ss-form input:focus,.ss-form select:focus,.ss-form textarea:focus{outline:none;border-color:var(--ss-accent-deep);box-shadow:0 0 0 3px var(--ss-focus)}
.ss-form .ss-consent{display:flex;gap:10px;align-items:flex-start;font-size:.8rem;line-height:1.5;color:var(--ss-muted);font-weight:400;letter-spacing:0}
.ss-form .ss-consent input{margin-top:3px;width:16px;height:16px;accent-color:var(--ss-accent-deep);flex-shrink:0}
.ss-form .ss-submit{font:inherit;font-weight:700;font-size:1rem;padding:16px 24px;border-radius:var(--ss-btn-radius);background:var(--ss-btn-bg);color:var(--ss-btn-text);border:0;cursor:pointer;letter-spacing:var(--ss-btn-track);text-transform:var(--ss-btn-case);transition:background .15s}
.ss-form .ss-submit:hover{background:var(--ss-btn-hover)}
.ss-form .ss-form-note{font-size:.78rem;color:var(--ss-muted);text-align:center}
.ss-form .ss-form-error{background:#FDECEC;color:#8A1C1C;border-radius:8px;padding:12px 14px;font-size:.9rem}
.ss-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}

/* footer */
.ss-footer{background:var(--ss-footer-bg);color:rgba(255,255,255,.72);padding:clamp(56px,7vw,96px) var(--ss-gutter) 36px;font-size:.93rem;margin:0!important}
.ss-footer a{color:rgba(255,255,255,.85);text-decoration:none}
.ss-footer a:hover{color:var(--ss-accent)}
.ss-footer h4{font-family:var(--ss-font-body);font-size:.74rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#fff;margin-bottom:16px!important}
.ss-footer ul{list-style:none;padding:0;margin:0}
.ss-footer li{padding:4px 0;line-height:1.45}
.ss-footer .wp-block-site-title{font-family:var(--ss-font-head);font-size:1.9rem;font-weight:var(--ss-logo-weight);margin:0}
.ss-footer .wp-block-site-title a{color:#fff}
.ss-footer-cols{gap:clamp(28px,4vw,56px)!important}
.ss-footer-cols>.wp-block-column>*+*{margin-top:14px!important}
.ss-footer-bottom{border-top:1px solid rgba(255,255,255,.14);margin-top:56px!important;padding-top:26px;font-size:.8rem;gap:12px 32px!important}
.ss-footer-bottom p{margin:0}
.ss-footer .ss-fineprint{color:rgba(255,255,255,.5);margin-top:18px!important;max-width:none}
.ss-footer .ss-badge{color:var(--ss-accent)}

/* grids: explicit columns, stepping down on smaller screens */
.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))!important}
.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))!important}
@media (max-width:1000px){.cols-4,.cols-3{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media (max-width:600px){.cols-4:not(.ss-people):not(.ss-hero-stats),.cols-3,.cols-2:not(.ss-stat-grid){grid-template-columns:1fr!important}.ss-people{gap:20px 14px!important}.ss-person-name{font-size:1.05rem!important}}
.ss-form input[type=text],.ss-form input[type=email],.ss-form input[type=tel],.ss-form select{height:52px}
/* responsive */
@media (max-width:1100px){
  .ss-nav,.ss-header-cta .wp-block-buttons{display:none!important}
  .ss-menu-toggle{display:flex}
  body.ss-menu-open{overflow:hidden}
  body.ss-menu-open .ss-nav{display:block!important;position:fixed;left:0;right:0;top:var(--ss-header-h);bottom:0;background:var(--ss-paper);overflow:auto;padding:12px var(--ss-gutter) 40px;z-index:70;border-top:1px solid var(--ss-line)}
  body.ss-menu-open .ss-nav .wp-block-navigation__container{flex-direction:column;align-items:stretch;gap:0}
  body.ss-menu-open .ss-nav .wp-block-navigation-item{border-bottom:1px solid var(--ss-line);flex-direction:column;align-items:stretch}
  body.ss-menu-open .ss-nav .wp-block-navigation-item__content{font-size:1.15rem;padding:16px 0}
  body.ss-menu-open .ss-nav .has-child>.wp-block-navigation__submenu-container{position:static!important;visibility:visible!important;opacity:1!important;width:auto!important;height:auto!important;min-width:0!important;grid-template-columns:1fr!important;box-shadow:none;border:0!important;padding:0 0 12px 12px!important;left:0!important}
  body.ss-menu-open .ss-nav .wp-block-navigation__submenu-container .wp-block-navigation-item{border:0}
  body.ss-menu-open .ss-nav .wp-block-navigation__submenu-container .wp-block-navigation-item__content{font-size:.98rem;padding:8px 0!important}
  .ss-util-left{display:none}
  .ss-util .ss-inner{justify-content:center}
}
@media (max-width:781px){
  body{font-size:16px}
  .ss-hero-stats .ss-stat{padding:18px 12px 20px 0;border-left:0}
  .ss-hero-stats .ss-stat:nth-child(2n){padding-left:16px;border-left:1px solid rgba(255,255,255,.12)}
  .ss-form{grid-template-columns:1fr}
  .ss-rec{border-left:0;padding:16px 0;border-top:1px solid var(--ss-line-strong)}
  .ss-rec:first-child{border-top:0}
  .ss-header-phone{display:none}
  .ss-portrait.is-large{max-width:260px}
  .ss-head-row{align-items:flex-start!important}
}
`;

// --- Heritage: navy, ivory and brass; Cormorant Garamond with Inter ----------------------------
const HERITAGE_CSS = `
.ss-util{border-bottom:1px solid rgba(176,141,87,.25)}
.ss-brand .wp-block-site-title{text-transform:none}
.ss-eyebrow{display:flex;align-items:center;gap:14px}
.ss-eyebrow::before{content:"";width:34px;height:1px;background:currentColor;flex-shrink:0}
.ss-head.is-center .ss-eyebrow{justify-content:center}
.ss-title{font-weight:600}
.ss-hero{min-height:min(860px,calc(100vh - 40px));display:flex;align-items:flex-end;color:#fff;background-color:#0A1A2F}
.ss-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(8,20,38,.94) 0%,rgba(8,20,38,.82) 38%,rgba(8,20,38,.38) 72%,rgba(8,20,38,.2) 100%),linear-gradient(0deg,rgba(8,20,38,.85) 0%,rgba(8,20,38,0) 40%)}
.ss-hero>.ss-inner{padding:clamp(96px,13vh,150px) 0 0}
.ss-hero .ss-eyebrow{color:var(--ss-accent)}
.ss-hero-title{color:#fff;font-size:clamp(3rem,6.4vw,5.8rem);font-weight:600;line-height:.98;max-width:15ch;margin-top:22px!important;letter-spacing:-.01em}
.ss-hero .ss-lede{color:rgba(255,255,255,.82);max-width:40rem;margin-top:26px!important;font-size:clamp(1.08rem,1.5vw,1.28rem)}
.ss-hero .is-style-outline .wp-block-button__link{color:#fff;border-color:rgba(255,255,255,.5)}
.ss-hero .is-style-outline .wp-block-button__link:hover{background:#fff;color:var(--ss-ink);border-color:#fff}
.ss-hero-stats{margin-top:clamp(48px,7vh,80px)!important;border-top:1px solid rgba(255,255,255,.18);gap:0!important}
.ss-hero-stats .ss-stat{padding:26px 24px 34px;border-left:1px solid rgba(255,255,255,.12)}
.ss-hero-stats .ss-stat:first-child{border-left:0;padding-left:0}
.ss-hero-stats .ss-stat-value{color:#fff;font-size:clamp(1.7rem,2.6vw,2.4rem)}
.ss-hero-stats .ss-stat-label{color:rgba(255,255,255,.62);font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}
.ss-page-hero{background:var(--ss-soft);padding-block:clamp(64px,8vw,112px)}
.ss-page-hero.has-photo{color:#fff;background-color:#0A1A2F;padding-block:clamp(96px,12vw,168px) clamp(64px,8vw,104px)}
.ss-page-hero.has-photo::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(8,20,38,.94) 0%,rgba(8,20,38,.8) 50%,rgba(8,20,38,.5) 100%)}
.ss-page-hero.has-photo .ss-page-title{color:#fff}
.ss-page-hero.has-photo .ss-lede{color:rgba(255,255,255,.8)}
.ss-page-hero.has-photo .ss-crumbs{color:rgba(255,255,255,.6)}
.ss-page-hero.has-photo .ss-eyebrow{color:var(--ss-accent)}
.ss-page-hero.has-photo .is-style-outline .wp-block-button__link{color:#fff;border-color:rgba(255,255,255,.5)}
.ss-page-hero.has-photo .is-style-outline .wp-block-button__link:hover{background:#fff;color:var(--ss-ink)}
.ss-page-hero .ss-page-title{max-width:18ch}
.ss-page-hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,var(--ss-accent) 0 120px,transparent 120px)}
.ss-bio-hero{background:var(--ss-soft)}
.ss-bio-hero .ss-page-title{max-width:none}
.ss-bio-cols{align-items:flex-end!important;gap:clamp(28px,5vw,72px)!important}
.ss-bio-cols>.wp-block-column:last-child>*+*{margin-top:18px!important}
.ss-bio-hero .ss-portrait{margin:0!important;box-shadow:24px 24px 0 -1px var(--ss-paper),24px 24px 0 0 var(--ss-accent)}
.ss-practices .ss-practice-cols{gap:clamp(32px,6vw,96px)!important}
.ss-col-title{font-family:var(--ss-font-body);font-size:.78rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--ss-eyebrow);padding-bottom:14px;border-bottom:2px solid var(--ss-ink)}
.ss-practice-row{padding:22px 0;border-bottom:1px solid var(--ss-line);margin:0!important}
.ss-practice-row>*+*{margin-top:6px!important}
.ss-practice-name{display:flex;align-items:center;gap:16px;font-size:1.55rem;font-weight:600}
.ss-practice-name::before{margin:0;width:26px;height:26px;flex-shrink:0}
.ss-practice-name a{color:var(--ss-ink);text-decoration:none;display:inline-flex;align-items:center;gap:12px}
.ss-practice-name a:hover{color:var(--ss-accent-deep)}
.ss-practice-blurb{padding-left:42px;color:var(--ss-muted);font-size:.95rem;line-height:1.55}
.ss-intro{background:var(--ss-paper)}
.ss-intro .ss-framed img{aspect-ratio:4/5;border-radius:0;object-position:72% 50%}
.ss-intro .ss-framed{box-shadow:-24px 24px 0 0 var(--ss-soft)}
.ss-results.is-dark{background:#0A1A2F;color:#fff}
.ss-results.is-dark .ss-title{color:#fff}
.ss-results.is-dark .ss-lede{color:rgba(255,255,255,.7)}
.ss-results.is-dark .ss-eyebrow{color:var(--ss-accent)}
.ss-results.is-dark .ss-result{border-top:1px solid rgba(176,141,87,.6);border-radius:0;padding:28px 0 0}
.ss-results.is-dark .ss-result-figure{color:var(--ss-accent);font-size:clamp(2.4rem,3.4vw,3.4rem)}
.ss-results.is-dark .ss-result-label{color:#fff}
.ss-results.is-dark .ss-result-summary{color:rgba(255,255,255,.66)}
.ss-results.is-dark .ss-result-who a{color:#fff}
.ss-results.is-dark .ss-fineprint{color:rgba(255,255,255,.5)}
.ss-results.is-dark .is-style-outline .wp-block-button__link{color:#fff;border-color:rgba(255,255,255,.4)}
.ss-results.is-dark .is-style-outline .wp-block-button__link:hover{background:#fff;color:var(--ss-ink)}
.ss-results:not(.is-dark) .ss-result{background:var(--ss-paper);border:1px solid var(--ss-line);border-top:3px solid var(--ss-accent)}
.ss-related .ss-result{background:var(--ss-soft);border-top:3px solid var(--ss-accent);border-radius:0}
.ss-portrait{border-radius:0}
.ss-person-name{font-size:1.45rem}
.ss-reviews{background:var(--ss-soft)}
.ss-reviews .ss-quote{background:var(--ss-paper)}
.ss-consult.is-dark{background:#0A1A2F;background-image:linear-gradient(135deg,rgba(176,141,87,.08) 25%,transparent 25%,transparent 50%,rgba(176,141,87,.08) 50%,rgba(176,141,87,.08) 75%,transparent 75%);background-size:28px 28px}
.ss-consult .ss-badge{color:var(--ss-accent)}
.ss-card .has-icon::before,.ss-feature .has-icon::before{margin-bottom:18px}
.ss-practice-index .ss-card{border-top:3px solid var(--ss-accent)}
.ss-team.is-alt,.ss-practice-index.is-alt{background:var(--ss-soft)}
`;

// --- Modern Counsel: deep teal, ink and amber; Manrope with Inter, Fraunces for figures -----------------
const MODERN_CSS = `
.ss-brand{flex-direction:row;align-items:center;gap:12px}
.ss-brand::before{content:attr(data-mark);display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--ss-brand);color:#fff;font-family:var(--ss-font-figure);font-weight:600;font-size:1.15rem;letter-spacing:-.02em;flex-shrink:0}
.ss-brand-text{display:flex;flex-direction:column;gap:4px}
.ss-brand .ss-brand-sub{letter-spacing:.2em;color:var(--ss-muted)}
.ss-title{letter-spacing:-.025em}
.ss-hero{background:radial-gradient(900px 520px at 88% 10%,rgba(233,162,59,.16),transparent 60%),linear-gradient(180deg,var(--ss-soft),#fff);padding-block:clamp(56px,8vw,104px) clamp(64px,9vw,120px)}
.ss-hero-cols{gap:clamp(32px,6vw,88px)!important;align-items:center!important}
.ss-pills{display:flex;gap:8px;flex-wrap:wrap}
.ss-pill{display:inline-block;padding:7px 14px;border-radius:999px;background:#fff;border:1px solid var(--ss-line);font-size:.82rem;font-weight:600;color:var(--ss-brand)}
.ss-hero-title{font-size:clamp(2.6rem,5vw,4.4rem);line-height:1.03;letter-spacing:-.035em;margin-top:22px!important;max-width:16ch}
.ss-hero .ss-lede{margin-top:22px!important}
.ss-checks{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:30px!important;font-size:.93rem;font-weight:600;color:var(--ss-ink)}
.ss-hero-media{position:relative}
.ss-hero-img{margin:0!important}
.ss-hero-img img{width:100%;aspect-ratio:5/6;object-fit:cover;object-position:50% 40%;border-radius:28px;box-shadow:0 50px 90px -50px rgba(11,42,44,.6)}
.ss-float-card{position:absolute;left:-36px;bottom:36px;max-width:300px;background:#fff;border-radius:18px;padding:20px 22px;box-shadow:0 30px 60px -28px rgba(11,42,44,.45);border:1px solid var(--ss-line)}
.ss-float-card>*+*{margin-top:6px!important}
.ss-float-eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ss-accent-deep)}
.ss-float-title{font-family:var(--ss-font-head);font-weight:800;font-size:1.12rem;line-height:1.25;color:var(--ss-ink)}
.ss-float-text{font-size:.85rem;line-height:1.5;color:var(--ss-muted)}
.ss-page-hero{background:radial-gradient(800px 400px at 92% 0%,rgba(233,162,59,.14),transparent 60%),var(--ss-soft);padding-block:clamp(56px,7vw,96px)}
.ss-page-hero-cols{gap:clamp(32px,5vw,72px)!important;align-items:center!important}
.ss-page-hero-img{margin:0!important}
.ss-page-hero-img img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:24px}
.ss-page-hero .ss-page-title{letter-spacing:-.035em;max-width:16ch}
.ss-bio-cols{align-items:center!important;gap:clamp(28px,5vw,64px)!important}
.ss-bio-cols>.wp-block-column:last-child>*+*{margin-top:18px!important}
.ss-bio-hero .ss-portrait{margin:0!important;border-radius:24px}
.ss-stats-strip{padding-block:0!important}
.ss-audience-cols{gap:24px!important}
.ss-audience{background:#fff;border:1px solid var(--ss-line);border-radius:24px;padding:clamp(28px,3.4vw,44px);height:100%;box-sizing:border-box;box-shadow:0 30px 60px -48px rgba(11,42,44,.5)}
.ss-audience.is-business{background:linear-gradient(160deg,#0F4C4A,#0A2E2F);border:0}
.ss-audience.is-business h3,.ss-audience.is-business .ss-audience-blurb{color:#fff}
.ss-audience.is-business .ss-audience-blurb{opacity:.75}
.ss-audience.is-business .has-icon::before{background:var(--ss-accent)}
.ss-audience.is-business .ss-chip-list a{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.22);color:#fff}
.ss-audience.is-business .ss-chip-list a:hover{background:#fff;color:var(--ss-ink)}
.ss-audience-title{font-size:1.75rem;letter-spacing:-.02em}
.ss-audience-blurb{margin-top:12px!important;color:var(--ss-muted)}
.ss-audience .ss-chip-list{margin-top:24px!important}
.ss-audience .ss-chip-list a{padding:10px 16px;font-weight:600}
.ss-why{background:var(--ss-soft)}
.ss-features{gap:20px!important}
.ss-feature{background:#fff;border-radius:20px;padding:32px;border:1px solid var(--ss-line)}
.ss-feature h3{font-size:1.3rem}
.ss-feature>*+*{margin-top:10px!important}
.ss-feature p{color:var(--ss-muted);font-size:.97rem}
.ss-feature .has-icon::before{width:48px;height:48px;border-radius:14px;background:var(--ss-soft);-webkit-mask:none;mask:none;position:relative}
.ss-feature h3.has-icon{position:relative}
.ss-feature h3.has-icon::after{content:"";position:absolute;left:12px;top:12px;width:24px;height:24px;background:var(--ss-brand);-webkit-mask:var(--ss-i) center/contain no-repeat;mask:var(--ss-i) center/contain no-repeat}
.ss-results .ss-result{background:#fff;border:1px solid var(--ss-line);border-radius:20px}
.ss-results .ss-result-figure{font-family:var(--ss-font-figure);color:var(--ss-brand)}
.ss-results{background:#fff}
.ss-intro{background:var(--ss-soft)}
.ss-intro .ss-framed img{border-radius:24px}
.ss-person .ss-portrait{border-radius:20px}
.ss-person-name{font-family:var(--ss-font-head);font-weight:700;letter-spacing:-.01em;font-size:1.12rem}
.ss-person-role{letter-spacing:.08em;color:var(--ss-accent-deep)}
.ss-reviews{background:var(--ss-soft)}
.ss-quote{border-radius:20px}
.ss-quote::before{content:"\\2605\\2605\\2605\\2605\\2605";display:block;color:var(--ss-accent);letter-spacing:3px;font-size:1rem;margin-bottom:14px}
.ss-steps{gap:20px!important;counter-reset:s}
.ss-step{border-top:2px solid var(--ss-line);padding-top:26px}
.ss-step>*+*{margin-top:10px!important}
.ss-step-n{font-family:var(--ss-font-figure);font-size:2.6rem;line-height:1;color:var(--ss-accent-deep)}
.ss-step p:not(.ss-step-n){color:var(--ss-muted)}
.ss-consult.is-brand{background:radial-gradient(900px 500px at 0% 100%,rgba(233,162,59,.18),transparent 60%),linear-gradient(160deg,#0F4C4A,#0A2E2F)}
.ss-consult .ss-badge{color:var(--ss-accent)}
.ss-card{border-radius:20px}
.ss-card .has-icon::before{width:28px;height:28px;padding:10px;background:var(--ss-brand);border-radius:0}
.ss-practice-index .ss-card h3.has-icon::before{box-shadow:none}
.ss-aside-card{border-radius:20px}
.ss-aside-card.is-cta{background:linear-gradient(160deg,#0F4C4A,#0A2E2F);color:#fff}
.ss-aside-card.is-cta h3,.ss-aside-card.is-cta .ss-big-phone{color:#fff!important}
.ss-aside-card.is-cta p{color:rgba(255,255,255,.78)}
.ss-aside-card.is-cta .ss-badge{color:var(--ss-accent)}
.ss-aside-card.is-cta .ss-contact-list li{border-color:rgba(255,255,255,.16)}
.ss-aside-card.is-cta .ss-contact-list .ss-k{color:rgba(255,255,255,.55)}
.ss-recognition{background:#fff}
.ss-team.is-alt,.ss-practice-index.is-alt{background:var(--ss-soft)}
@media (max-width:781px){.ss-float-card{left:12px;right:12px;bottom:12px;max-width:none}.ss-hero-img img{aspect-ratio:4/3}}
`;

export const DESIGNS: Record<DesignId, Design> = {
  heritage: {
    id: "heritage",
    name: "Heritage",
    description: "Classic and established: navy, ivory and brass, with Cormorant Garamond headlines over Inter. A full-bleed photo of the Somerset County Courthouse opens the site.",
    tokens: {
      "--ss-ink": "#0E2340", "--ss-text": "#29303D", "--ss-muted": "#5E6574", "--ss-paper": "#FFFFFF", "--ss-soft": "#F6F2EA", "--ss-line": "#E6DFD1", "--ss-line-strong": "#CDBFA6",
      "--ss-brand": "#0E2340", "--ss-accent": "#B08D57", "--ss-accent-deep": "#8C6A35", "--ss-link": "#0E2340", "--ss-eyebrow": "#8C6A35", "--ss-icon": "#B08D57", "--ss-figure": "#0E2340",
      "--ss-btn-bg": "#B08D57", "--ss-btn-hover": "#9A7745", "--ss-btn-text": "#0A1A2F", "--ss-btn-radius": "0", "--ss-btn-track": ".1em", "--ss-btn-case": "uppercase",
      "--ss-radius": "2px", "--ss-radius-lg": "2px", "--ss-pill": "2px", "--ss-input-radius": "2px", "--ss-avatar-radius": "50%", "--ss-focus": "rgba(176,141,87,.25)",
      "--ss-head-weight": "600", "--ss-head-track": "-.005em", "--ss-logo-size": "2rem", "--ss-logo-weight": "700", "--ss-logo-track": "0",
      "--ss-util-bg": "#0A1A2F", "--ss-util-text": "rgba(255,255,255,.72)", "--ss-util-h": "40px", "--ss-header-bg": "#FFFFFF", "--ss-header-line": "#E6DFD1", "--ss-header-h": "92px",
      "--ss-footer-bg": "#06111F", "--ss-quote-style": "italic",
      "--ss-font-head": "var(--wp--preset--font-family--heading)", "--ss-font-body": "var(--wp--preset--font-family--body)", "--ss-font-figure": "var(--wp--preset--font-family--heading)", "--ss-font-quote": "var(--wp--preset--font-family--heading)",
    },
    fonts: {
      heading: `"Cormorant Garamond", "Iowan Old Style", Georgia, serif`,
      body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
      faces: [
        { family: "Cormorant Garamond", file: "cormorant-garamond-latin-500-normal.woff2", weight: "500" },
        { family: "Cormorant Garamond", file: "cormorant-garamond-latin-600-normal.woff2", weight: "600" },
        { family: "Cormorant Garamond", file: "cormorant-garamond-latin-700-normal.woff2", weight: "700" },
        { family: "Cormorant Garamond", file: "cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
        { family: "Inter", file: "inter-latin-400-normal.woff2", weight: "400" },
        { family: "Inter", file: "inter-latin-500-normal.woff2", weight: "500" },
        { family: "Inter", file: "inter-latin-600-normal.woff2", weight: "600" },
        { family: "Inter", file: "inter-latin-700-normal.woff2", weight: "700" },
      ],
    },
    css: HERITAGE_CSS,
  },
  modern: {
    id: "modern",
    name: "Modern Counsel",
    description: "Contemporary and approachable: deep teal with an amber call to action, Manrope headlines, and a \"How can we help?\" split between organizations and individuals.",
    tokens: {
      "--ss-ink": "#0B2A2C", "--ss-text": "#1F3437", "--ss-muted": "#5A6E71", "--ss-paper": "#FFFFFF", "--ss-soft": "#EFF5F3", "--ss-line": "#DCE7E4", "--ss-line-strong": "#B9CCC8",
      "--ss-brand": "#0F4C4A", "--ss-accent": "#E9A23B", "--ss-accent-deep": "#B86F0E", "--ss-link": "#0F4C4A", "--ss-eyebrow": "#0F6B66", "--ss-icon": "#0F4C4A", "--ss-figure": "#0F4C4A",
      "--ss-btn-bg": "#E9A23B", "--ss-btn-hover": "#D68E25", "--ss-btn-text": "#1A1205", "--ss-btn-radius": "999px", "--ss-btn-track": "0", "--ss-btn-case": "none",
      "--ss-radius": "14px", "--ss-radius-lg": "20px", "--ss-pill": "999px", "--ss-input-radius": "12px", "--ss-avatar-radius": "14px", "--ss-focus": "rgba(233,162,59,.3)",
      "--ss-head-weight": "800", "--ss-head-track": "-.02em", "--ss-logo-size": "1.35rem", "--ss-logo-weight": "800", "--ss-logo-track": "-.02em",
      "--ss-util-bg": "#0A2E2F", "--ss-util-text": "rgba(255,255,255,.78)", "--ss-util-h": "38px", "--ss-header-bg": "#FFFFFF", "--ss-header-line": "#DCE7E4", "--ss-header-h": "84px",
      "--ss-footer-bg": "#0A2426", "--ss-quote-style": "normal",
      "--ss-font-head": "var(--wp--preset--font-family--heading)", "--ss-font-body": "var(--wp--preset--font-family--body)", "--ss-font-figure": "var(--wp--preset--font-family--accent)", "--ss-font-quote": "var(--wp--preset--font-family--accent)",
    },
    fonts: {
      heading: `Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
      body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
      accent: `Fraunces, Georgia, serif`,
      faces: [
        { family: "Manrope", file: "manrope-latin-600-normal.woff2", weight: "600" },
        { family: "Manrope", file: "manrope-latin-700-normal.woff2", weight: "700" },
        { family: "Manrope", file: "manrope-latin-800-normal.woff2", weight: "800" },
        { family: "Inter", file: "inter-latin-400-normal.woff2", weight: "400" },
        { family: "Inter", file: "inter-latin-500-normal.woff2", weight: "500" },
        { family: "Inter", file: "inter-latin-600-normal.woff2", weight: "600" },
        { family: "Inter", file: "inter-latin-700-normal.woff2", weight: "700" },
        { family: "Fraunces", file: "fraunces-latin-500-normal.woff2", weight: "500" },
        { family: "Fraunces", file: "fraunces-latin-600-normal.woff2", weight: "600" },
        { family: "Fraunces", file: "fraunces-latin-400-italic.woff2", weight: "400", style: "italic" },
      ],
    },
    css: MODERN_CSS,
  },
};

export function stylesheet(d: Design) {
  const vars = `:root{${Object.entries(d.tokens).map(([k, v]) => `${k}:${v}`).join(";")}}`;
  return `${vars}\n${BASE}\n${d.css}`.replace(/\n\s*/g, "\n").trim() + "\n";
}
