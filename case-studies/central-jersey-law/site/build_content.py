"""Builds content.json and the optimized photo set for the Central Jersey Law
full-site concepts from what we pulled off centraljerseylaw.com.

    python3 build_content.py <research-dir>

<research-dir> holds pages.json (main content of every practice, result,
testimonial and decision page), team.json (attorney pages), firm/ (headshots)
and stock/ (freely licensed Wikimedia Commons photos plus credits.json).
Everything the site says comes from those files or from ../profile.json;
light copy edits (typos, the 7-name firm name shortened to "Savo Schalk") are
listed in content.json under copyEdits so the firm can review them.
"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

SRC = Path(sys.argv[1])
HERE = Path(__file__).resolve().parent
OUT_ASSETS = HERE / "assets"
profile = json.loads((HERE.parent / "profile.json").read_text())
pages = {p["url"].split(".com/")[1].strip("/"): p for p in json.loads((SRC / "pages.json").read_text())}
team_raw = json.loads((SRC / "team.json").read_text())
credits = {c["file"]: c for c in json.loads((SRC / "stock" / "credits.json").read_text())}

FIRM_LONG = re.compile(r"Savo,? Schalk,? (Corsini, Warner, )?Gillespie,? O[’']Grodnick (&|and) Fisher(,? P\.A\.)?")
FIXES = [("Bankrutpcy", "Bankruptcy"), ("governmental entitles", "governmental entities"), (" in an experienced", " is an experienced"),
         ("well-know ", "well-known "), ("backround", "background"), ("an handicap", "a handicap"), ("can longer", "can no longer"),
         ("for his local government clients", "for local government clients"), ("seen his clients", "seen clients"),
         ("Collections It is", "It is"), ("PETER U. LANFRIT is", "Peter U. Lanfrit is"), ("(908) 527-0707", "(908) 526-0707")]
copy_edits = ["The seven-name firm name is shortened to \"Savo Schalk\" in running text (the full legal name stays in the footer and legal pages)."] + \
             [f"Typo: \"{a.strip()}\" → \"{b.strip()}\"" for a, b in FIXES]

def tidy(s: str) -> str:
    s = FIRM_LONG.sub("Savo Schalk", s)
    for a, b in FIXES: s = s.replace(a, b)
    s = s.replace("Savo Schalk Law Firm", "Savo Schalk").replace("the attorneys of Savo Schalk shine", "our attorneys shine")
    return re.sub(r"\s+", " ", s).strip()

CTA = re.compile(r"^(please call|for all your|if you believe that you or a loved one|when the time comes|we approach your wills)", re.I)
def main_blocks(key):
    out = []
    for t, c in pages[key]["blocks"]:
        if c in ("Latest news",) or re.match(r"^Our .* Attorneys$", c): break
        out.append((t, c))
    return out

def paras(key, limit=None):
    ps = [tidy(c) for t, c in main_blocks(key) if t == "p" and not CTA.match(c)]
    return ps[:limit] if limit else ps

def bullets(key):
    return [tidy(c) for t, c in main_blocks(key) if t == "li"]

# --- attorneys -------------------------------------------------------------------
role_of = {m["name"]: m["role"] for m in profile["team"]}
def norm(n): return re.sub(r"[^a-z]", "", n.lower().replace("’", "'"))
names = [m["name"] for m in profile["team"]]
by_norm = {norm(n): n for n in names}

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("’", "").replace("'", "")).strip("-")

FACT_HEADINGS = {"Education": "education", "Bar Admissions": "admissions", "Jurisdictions Admitted to Practice": "admissions",
                 "Professional & Bar Association Memberships": "memberships", "Professional Memberships": "memberships",
                 "Appointments": "appointments", "Representative Matters": "matters"}
# Bios without a practice list: taken from what the bio itself says the attorney does.
EXTRA_PRACTICES = {"peter-u-lanfrit": ["Land Use, Zoning, Condemnation and Environmental Law", "Commercial Real Estate"]}
attorneys = []
for t in team_raw:
    name = by_norm[norm(t["name"].replace("&#8217;", "'"))]
    lines = [l.strip() for l in t["bio"].split("\n") if l.strip()]
    if len(t["bio"]) >= 3500: lines = lines[:-1]   # team.json capped bios at 3,500 characters
    email = lines[0]
    body, practice, education, dept, facts = [], [], "", "", {}
    current = None
    for l in lines[1:]:
        if l.startswith(("Phone:", "Fax:", "Email:", "56 E", "Somerville")) or l in ("Download VCard",) or l.upper() == name.upper(): continue
        if l.startswith("Qualification:"): education = l.split(":", 1)[1].strip(); continue
        if l.startswith(("Department", "Position:")):
            if ":" in l: dept = l.split(":", 1)[1].strip()
            else: current = "practice"
            if l.startswith("Department") and ":" not in l: current = "practice"
            continue
        if l == "PRACTICE AREAS": current = "practice"; continue
        if l in FACT_HEADINGS: current = FACT_HEADINGS[l]; facts.setdefault(current, []); continue
        if current == "practice" and len(l) < 80 and not l.endswith("."): practice.append(l); continue
        if current and current != "practice" and len(l) < 160:
            if l == "magna cum laude" and facts[current]: facts[current][-1] += ", magna cum laude"
            else: facts[current].append(tidy(l))
            continue
        current = None
        body.append(tidy(l))
    if body and not body[-1].endswith((".", "”", ")", "\"")):
        cut = body[-1].rfind(". ")
        body[-1] = body[-1][: cut + 1] if cut > 0 else ""
        body = [b for b in body if b]
    s = t["url"].rstrip("/").split("/")[-1]
    if not facts.get("education") and education: facts["education"] = [education]
    facts = {k: v for k, v in facts.items() if v}
    attorneys.append({"slug": s, "name": name, "role": role_of[name], "email": email, "bio": body,
                      "facts": facts, "practiceAreas": practice + ([] if practice else EXTRA_PRACTICES.get(s, [])),
                      "photo": f"people/{s}.jpg" if not t["img"].endswith(".png") else None})
order = {n: i for i, n in enumerate(names)}
attorneys.sort(key=lambda a: order[a["name"]])

def listed_attorneys(key):
    found = []
    for t, c in pages[key]["blocks"]:
        if t != "li": continue
        for a in attorneys:
            if norm(a["name"]) in norm(c) and a["slug"] not in found: found.append(a["slug"])
    return found

# --- practice groups -----------------------------------------------------------------
G = [
    ("land-use-zoning", "Land Use, Zoning & Environmental", "business", "landuse", "farmland-along-mellicks-woods-road-pohatcong-township-nj-feb.jpg",
     ["practice_area/land-use-zoning-and-environmental-law"], []),
    ("municipal-government", "Municipal & Government Law", "business", "capitol", "nj-capitol-jpg.jpg",
     ["practice_area/municipal-and-government-law"], [("Government affairs & election law", "practice_area/government-affairs-and-election-law-2"), ("Crisis management for local government", "practice_area/crisis-management")]),
    ("business-corporate", "Business & Corporate", "business", "briefcase", "90-nassau-street-princeton-new-jersey-2024-043-jpg.jpg",
     ["practice_area/business-and-corporate"], [("Shareholder & partner disputes", "practice_area/shareholder-and-partner-disputes"), ("Minority shareholder actions", "practice_area/minority-shareholder-actions")]),
    ("commercial-real-estate", "Commercial Real Estate", "business", "building", "first-reformed-church-and-somerset-county-courthouse-somervi.jpg",
     ["practice_area/commercial-real-estate"], []),
    ("litigation", "Litigation & Dispute Resolution", "business", "gavel", "courtgavel-jpg.jpg",
     ["practice_area/litigation"], [("Construction litigation", "practice_area/construction-litigation-2"), ("Products liability defense", "practice_area/products-liability"), ("Insurance defense", "practice_area/insurance-defense"), ("Court-approved mediation", "practice_area/dispute-mediation")]),
    ("banking-bankruptcy", "Banking, Bankruptcy & Creditors’ Rights", "business", "bank", "old-somerset-county-courthouse-somerville-nj-july-2026-jpg.jpg",
     ["practice_area/banking-and-financial-services"], [("Chapter 7, 11 & 13 bankruptcy", "practice_area/bankruptcy-chapter-11-reorganization"), ("Creditors’ rights", "practice_area/creditor-rights"), ("Collections", "practice_area/collections"), ("Business debt workouts", "practice_area/business-debt-workouts")]),
    ("employers", "Employers & Workers’ Compensation Defense", "business", "people", "conference-room-in-the-berlaymont-building-2-jpg.jpg",
     ["practice_area/representation-of-employers"], [("Workers’ compensation defense", "practice_area/workers-compensation")]),
    ("personal-injury", "Personal Injury & Medical Malpractice", "individual", "shield", "raritan-river-nj-south-branch-and-north-branch-confluence-jp.jpg",
     ["practice_area/accident-and-personal-injury"], [("Medical malpractice", "practice_area/medical-malpractice"), ("Workers’ compensation", "practice_area/workers-compensations"), ("Social Security disability appeals", "practice_area/social-security-disability-appeals")]),
    ("family-law", "Family & Matrimonial Law", "individual", "family", "a-mixed-race-family-walking-in-a-park-with-european-flags-p0.jpg",
     ["practice_area/matrimonial-and-family-law"], []),
    ("wills-trusts-estates", "Wills, Trusts & Estates", "individual", "document", "john-m-fleming-home-place-jpg.jpg",
     ["practice_area/wills-trusts-and-estates"], []),
    ("criminal-defense", "Criminal Defense & Municipal Court", "individual", "scales", "somerset-county-courthouse-somerville-nj-front-view-jpg.jpg",
     ["practice_area/criminal-defense"], [("Municipal court: DWI, traffic & drug charges", "practice_area/municipal-court-drunk-driving-traffic-and-drug-violations")]),
    ("employment-education-civil-rights", "Employment, Education & Civil Rights", "individual", "people", "business-people-discussing-in-the-cafe-44876336845-jpg.jpg",
     ["practice_area/employment-law-2"], [("Student discipline & education law", "practice_area/education-law"), ("Civil rights", "practice_area/civil-rights")]),
    ("residential-real-estate-debt", "Home, Debt & Residential Real Estate", "individual", "home", "2018-05-29-19-13-00-view-east-along-new-jersey-state-route-2.jpg",
     ["practice_area/residential-real-estate"], [("Mortgage & loan modification", "practice_area/mortgage-modification-and-debt-resolution"), ("Individual bankruptcy", "practice_area/bankruptcy-individual")]),
]
blurbs = {g["name"]: g["blurb"] for a in profile["serviceGroups"] for g in a["groups"]}
blurb_for = dict(zip([g[0] for g in G], [blurbs[n] for n in [
    "Land Use, Zoning & Environmental", "Municipal & Government Law", "Business & Corporate", "Commercial Real Estate", "Litigation & Dispute Resolution",
    "Banking, Bankruptcy & Creditors' Rights", "Employers & Workers' Compensation", "Personal Injury & Medical Malpractice", "Family & Matrimonial",
    "Wills, Trusts & Estates", "Criminal & Municipal Court", "Employment, Education & Civil Rights", "Home, Debt & Real Estate"]]))

# The employment page links out to a separate site; keep its first two paragraphs and the issue list.
def employment_intro():
    ps = paras("practice_area/employment-law-2")
    return ps[:2]
EMPLOYMENT_HANDLES = ["Discrimination and sexual harassment", "Retaliation and whistleblower (CEPA) claims", "Wrongful termination",
                      "Severance and executive negotiations", "Wage and hour disputes", "Leave and reasonable accommodation"]

practices = []
for key, name, aud, icon, img, primary, subs in G:
    intro = employment_intro() if key == "employment-education-civil-rights" else paras(primary[0], 4)
    handles = EMPLOYMENT_HANDLES if key == "employment-education-civil-rights" else bullets(primary[0])
    sections = []
    for title, src in subs:
        sp = paras(src, 2)
        sb = bullets(src)
        if sp or sb: sections.append({"title": title, "paragraphs": sp, "bullets": sb})
    atty = []
    for src in primary + [s for _, s in subs]:
        for a in listed_attorneys(src):
            if a not in atty: atty.append(a)
    practices.append({"slug": key, "name": name, "audience": aud, "icon": icon, "image": f"photos/{img}", "blurb": blurb_for[key],
                      "intro": intro, "handles": handles, "sections": sections, "attorneys": atty, "source": [f"https://centraljerseylaw.com/{s}/" for s in primary]})

# attorneys -> practice slugs, from their own "Practice areas" lists
name_to_group = {}
for key, name, aud, icon, img, primary, subs in G:
    for src in primary + [s for _, s in subs]:
        h1 = next((c for t, c in pages[src]["blocks"] if t == "h1"), "")
        name_to_group[norm(tidy(h1))] = key
for a in attorneys:
    gs = []
    for pa in a.pop("practiceAreas"):
        g = name_to_group.get(norm(pa))
        if g and g not in gs: gs.append(g)
    for p in practices:
        if a["slug"] in p["attorneys"] and p["slug"] not in gs: gs.append(p["slug"])
    a["practices"] = gs

# --- results, testimonials, decisions ---------------------------------------------------
def first_sentences(key, n=2):
    txt = " ".join(paras(key))
    parts = re.split(r"(?<=[.!?])\s+", txt)
    return " ".join(parts[:n])
R = "result/"
results = [
    {"figure": "$20 Million", "label": "Church property verdict", "practice": "litigation", "attorneys": [], "page": R + "20-million-victory",
     "summary": "After four years of litigation and an eleven-day trial, the Essex County Chancery Division ruled fully in favor of our clients, the Board of Trustees of the First Presbyterian Church in Newark (2019)."},
    {"figure": "Unanimous", "label": "NJ Supreme Court decision", "practice": "land-use-zoning", "attorneys": ["kelly-m-carey"], "page": R + "kelly-m-carey-secures-new-jersey-supreme-court-decision-clarifying-decades-old-zoning-variance-standard",
     "summary": "Kelly M. Carey argued Monarch Communities LLC v. Township of Montville Zoning Board of Adjustment; the Court revised the Sica test for inherently beneficial use variances."},
    {"figure": "$8 Million", "label": "Saved in a brain injury defense", "practice": "litigation", "attorneys": [], "page": R + "8-million-saved-in-brain-injury-defense",
     "summary": first_sentences(R + "8-million-saved-in-brain-injury-defense", 2)},
    {"figure": "$3 Million+", "label": "Whistleblower (CEPA) verdict", "practice": "employment-education-civil-rights", "attorneys": ["charles-z-schalk"], "page": R + "3-million-verdict",
     "summary": "A verdict of more than three million dollars against a large corporation for an employee under the Conscientious Employee Protection Act. Charles Schalk was lead counsel."},
    {"figure": "~$3 Million", "label": "Minority shareholder settlement", "practice": "business-corporate", "attorneys": ["charles-z-schalk"], "page": R + "close-to-3-million-settlement",
     "summary": "A settlement of close to $3 million for minority shareholders who were oppressed by the majority shareholder. Charles Schalk was lead counsel."},
    {"figure": "$2.5 Million", "label": "Personal injury arbitration award", "practice": "personal-injury", "attorneys": ["charles-z-schalk"], "page": R + "2-5-million-personal-injury-arbitration-award",
     "summary": first_sentences(R + "2-5-million-personal-injury-arbitration-award", 1)},
    {"figure": "$2.025 Million", "label": "Student due-process verdict", "practice": "employment-education-civil-rights", "attorneys": ["charles-z-schalk", "michael-p-ogrodnick"], "page": R + "2-025-million-student-verdict",
     "summary": "A three-week jury trial in Essex County for a student expelled from dental school (Vladimer v. UMDNJ). Charles Schalk was lead counsel, assisted by Michael O’Grodnick."},
    {"figure": "$2 Million", "label": "Settlement for a crash passenger", "practice": "personal-injury", "attorneys": [], "page": R + "2-million-settlement",
     "summary": first_sentences(R + "2-million-settlement", 1)},
    {"figure": "$950,000", "label": "Defective tool settlement", "practice": "personal-injury", "attorneys": [], "page": R + "950000-settlement",
     "summary": "A settlement for a mechanic who suffered a severe hand injury from a defectively designed tool that lacked proper warnings."},
    {"figure": "191 homes", "label": "Hillsborough Village Center approved", "practice": "land-use-zoning", "attorneys": ["michael-p-ogrodnick"], "page": R + "savo-schalk-partner-obtains-approvals-for-188-apartments-in-hillsborough",
     "summary": "Planning board approval (May 2019) for 191 apartments in 13 buildings on Route 206, 46 of them affordable. Michael O’Grodnick represented the applicant."},
    {"figure": "126 homes", "label": "Hillsborough residential approvals", "practice": "land-use-zoning", "attorneys": ["michael-p-ogrodnick"], "page": R + "savo-schalk-obtains-approvals-for-126-unit-residential-project-in-hillsborough",
     "summary": "Preliminary and final site plan approval for nine buildings, including 36 affordable units, after five years of work with the municipality."},
    {"figure": "Route 22", "label": "Major self-storage approval, Branchburg", "practice": "land-use-zoning", "attorneys": ["michael-p-ogrodnick"], "page": R + "savo-schalk-partner-obtains-approvals-for-one-of-the-largest-self-storage-facilities-on-the-east-coast-in-branchburg",
     "summary": "Zoning board approval (June 2019) to convert a vacant 40-year-old bank building into one of the largest self-storage facilities on the East Coast."},
]
for r in results: r["source"] = f"https://centraljerseylaw.com/{r.pop('page')}/"
recognition = [
    {"title": "New Jersey Super Lawyers", "detail": "Steven K. Warner, zoning and land use, every year since 2011"},
    {"title": "Professional Lawyer of the Year", "detail": "Somerset County, awarded to Steven K. Warner"},
    {"title": "Top published verdicts", "detail": "New Jersey Law Journal, employment and civil verdicts, several years running"},
    {"title": "Court-approved mediator", "detail": "Charles Z. Schalk, State of New Jersey roster"},
]

def testimonial(key, author, matter, attorney):
    ps = paras(key)
    return {"author": author, "matter": matter, "attorney": attorney, "quote": ps[0], "story": ps[1:]}
testimonials = [
    testimonial("our-testimonials/kathy", "Stephen V.", "Education law", "charles-z-schalk"),
    testimonial("our-testimonials/579-2", "Babette", "Landlord-tenant & civil litigation", "michael-p-ogrodnick"),
    testimonial("our-testimonials/joseph", "Joseph", "Homeowners association", "charles-z-schalk"),
]
decisions = [re.sub(r"\s*View PDF$", "", tidy(c)).replace("Savo Schalk Attorney, Michael O’Grodnick, Esq., prevails…", "Michael O’Grodnick prevails in the Appellate Division, reversing the dismissal of a mortgage foreclosure case") for t, c in pages["appellate-decisions"]["blocks"] if t == "li"]

# --- photos ------------------------------------------------------------------------------
def save_jpg(im, path, q):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, "JPEG", quality=q, optimize=True, progressive=True)

used_photos = sorted({p["image"].split("/", 1)[1] for p in practices} | {
    "old-somerset-county-courthouse-somerville-nj-july-2026-jpg.jpg", "somerset-county-courthouse-somerville-nj-front-view-jpg.jpg",
    "first-reformed-church-and-somerset-county-courthouse-somervi.jpg", "business-people-discussing-in-the-cafe-44876336845-jpg.jpg",
    "books-on-shelf-at-the-ghalib-chamber-law-library-jpg.jpg", "2018-05-29-19-13-00-view-east-along-new-jersey-state-route-2.jpg"})
PLACEHOLDER_STOCK = {"a-mixed-race-family-walking-in-a-park-with-european-flags-p0.jpg", "business-people-discussing-in-the-cafe-44876336845-jpg.jpg",
                     "conference-room-in-the-berlaymont-building-2-jpg.jpg", "books-on-shelf-at-the-ghalib-chamber-law-library-jpg.jpg"}
photos = []
for f in used_photos:
    im = Image.open(SRC / "stock" / f)
    im = ImageOps.exif_transpose(im)
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    save_jpg(im, OUT_ASSETS / "photos" / f, 70)
    c = credits[f]
    photos.append({"file": f"photos/{f}", "title": c["title"].removeprefix("File:").rsplit(".", 1)[0], "artist": c["artist"], "license": c["license"],
                   "source": c["page"], "placeholder": f in PLACEHOLDER_STOCK})

for a in attorneys:
    if not a["photo"]: continue
    im = ImageOps.exif_transpose(Image.open(SRC / "firm" / f"{a['slug']}.jpg")).convert("RGB")
    w, h = im.size
    tw = min(w, round(h * 4 / 5))      # 4:5 portrait, centred
    th = round(tw * 5 / 4)
    left = (w - tw) // 2
    im = im.crop((left, 0, left + tw, min(h, th)))
    im = im.resize((480, 600), Image.LANCZOS)
    if w < 480: im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    save_jpg(im, OUT_ASSETS / a["photo"], 84)

f = profile
content = {
    "firm": {"legalName": f["legalName"], "shortName": f["shortName"], "tagline": f["tagline"], "summary": f["summary"], "phone": f["phone"], "fax": f["fax"],
             "email": f["email"], "address": f["address"], "serviceArea": f["serviceArea"], "languages": f["languages"], "about": f["about"], "stats": f["stats"],
             "payments": f["payments"], "social": f["social"], "disclaimer": f["disclaimer"],
             "hours": None},  # not published on the current site: shown as a placeholder
    "practices": practices, "attorneys": attorneys, "results": results, "recognition": recognition, "testimonials": testimonials,
    "decisions": decisions, "photos": photos, "copyEdits": copy_edits,
    "toConfirm": f["toConfirm"] + [
        "Office hours (not published on the current site).",
        "Headshots for Evan H. Alter and Peter U. Lanfrit (none on the current site).",
        "The student verdict is titled $2.25 million on the current site but described as $2.025 million; the new site uses $2.025 million.",
        "The Hillsborough apartments result is titled 188 apartments but the article says 191; the new site uses 191.",
        "The current Property Tax Appeals and Defense of Collection Lawsuits pages carry text from other pages, so the new site does not reuse it.",
    ],
}
(HERE / "content.json").write_text(json.dumps(content, indent=1, ensure_ascii=False) + "\n")
print(len(practices), "practices,", len(attorneys), "attorneys,", len(results), "results,", len(photos), "photos")
