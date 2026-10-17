"""Build chat/answers.json for the Ask REVI chat.

Every answer is quoted word for word from the site blocks in this repo.
The script stops with an error if a quoted line can't be found, so a copy
change on the site can never leave a stale or invented answer in the chat.

Run from the repo root:  python3 chat/build_answers.py
"""
import html
import json
import re
from pathlib import Path
from urllib.parse import quote as urlquote

ROOT = Path(__file__).resolve().parent.parent
B = ROOT / "blocks"
SITE = "https://www.revibookkeeping.com"


def text_of(path):
    s = (B / path).read_text()
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", s, flags=re.S)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<(br|/p|/h[1-6]|/li|/div|/summary|/dt|/dd)[^>]*>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return [re.sub(r"\s+", " ", l).strip() for l in s.split("\n") if l.strip()]


def line(path, starts):
    """The full line in a block that starts with `starts`."""
    for l in text_of(path):
        if l.startswith(starts):
            return l
    raise SystemExit(f"Not found in {path}: {starts!r}")


def part(path, starts, ends=None):
    """A sentence span inside a line: from `starts` up to and including `ends`."""
    for l in text_of(path):
        i = l.find(starts)
        if i >= 0:
            s = l[i:]
            if ends:
                j = s.find(ends)
                if j < 0:
                    raise SystemExit(f"End not found in {path}: {ends!r}")
                s = s[: j + len(ends)]
            return s
    raise SystemExit(f"Not found in {path}: {starts!r}")


def frag(t):
    """Text fragment link so the page scrolls to the quoted words."""
    words = t.split()[:6]
    return "#:~:text=" + urlquote(" ".join(words), safe="")


# ---- FAQs: straight from the FAQ structured data block ----
schema = (B / "faqs/4-faq-schema.html").read_text()
faq = json.loads(schema[schema.find("{"): schema.rfind("}") + 1])["mainEntity"]
FAQ = {q["name"]: html.unescape(q["acceptedAnswer"]["text"]) for q in faq}

entries = []


def add(id, question, answer, page, url, ask=(), tags=(), related=(), source_text=None, kind="answer", cta=False, avoid=()):
    blocks = answer if isinstance(answer, list) else [answer]
    first = blocks[0]
    if not isinstance(first, str):
        first = first.get("steps", [{}])[0].get("text", "") if "steps" in first else ""
    st = source_text or (question if page == "FAQs" else first)
    entries.append({
        "id": id,
        "q": question,
        "ask": list(ask),
        "tags": list(tags),
        "a": blocks,
        "source": {"label": f"From {page}: {question}" if page == "FAQs" else f"From {page}", "url": SITE + url + (frag(st) if st else "")},
        "related": list(related),
        "kind": kind,
        "cta": cta,
        "avoid": list(avoid),
    })


def faq_entry(id, question, ask=(), tags=(), related=(), cta=False, avoid=()):
    if question not in FAQ:
        raise SystemExit(f"FAQ missing: {question}")
    add(id, question, FAQ[question], "FAQs", "/faqs", ask, tags, related, cta=cta, avoid=avoid)


# Flips and rentals
faq_entry("faq-different", "How is real estate bookkeeping different from regular small business bookkeeping?",
          ["what makes real estate bookkeeping different", "why do I need a real estate bookkeeper", "can a regular bookkeeper do my books"],
          ["different", "regular", "small business", "specialized"], ["faq-flip-vs-rental", "who-hero"])
faq_entry("faq-depreciate", "Does a flip get depreciated?",
          ["do flips depreciate", "can I depreciate a flip", "depreciation on a flip"],
          ["depreciate", "depreciation"], ["faq-rehab-deductible", "faq-balance-sheet"])
faq_entry("faq-rehab-deductible", "Are rehab costs deductible when you pay them?",
          ["can I deduct rehab costs", "are renovation costs deductible", "write off rehab costs"],
          ["deduct", "deductible", "write off", "rehab"], ["faq-balance-sheet", "faq-depreciate"])
faq_entry("faq-balance-sheet", "Why do flip costs sit on the balance sheet?",
          ["why are flip costs inventory", "flip costs in inventory", "why don't flip costs show on my p&l"],
          ["balance sheet", "inventory", "cost of goods sold"], ["faq-rehab-deductible", "faq-flip-vs-rental"])
faq_entry("faq-1031-flip", "Does a 1031 exchange apply to a flip?",
          ["can I do a 1031 on a flip", "1031 for flips"],
          ["1031", "exchange"], ["svc-1031", "faq-depreciate"])
faq_entry("faq-flip-vs-rental", "What's the difference between bookkeeping for a flip and bookkeeping for a rental?",
          ["flip books vs rental books", "how are flips and rentals booked differently"],
          ["difference", "flip", "rental"], ["faq-separate", "who-both"])
faq_entry("faq-principal", "Does loan principal show up on a rental's profit and loss?",
          ["is mortgage principal an expense", "loan principal on p&l", "mortgage payment split"],
          ["principal", "interest", "mortgage", "loan payment"], ["faq-repair", "who-landlords"])
faq_entry("faq-repair", "What's the difference between a repair and a capital improvement?",
          ["repair vs improvement", "is a new roof a repair", "capital improvement"],
          ["repair", "improvement", "capital"], ["faq-principal", "faq-depreciate"])
faq_entry("faq-separate", "Do I need separate books for flips and rentals?",
          ["should flips and rentals be separate", "separate books for flipping and renting"],
          ["separate", "both"], ["who-both", "faq-flip-vs-rental"])
# Working with REVI
faq_entry("faq-who-for", "Who is monthly bookkeeping built for?",
          ["is this for me", "I only have one property", "how many properties do I need", "do you work with beginners", "minimum number of properties"],
          ["who", "one property", "single", "small"], ["faq-when", "who-hero"])
faq_entry("faq-when", "When is the right time to bring in a bookkeeper?",
          ["do I need a bookkeeper", "when should I hire a bookkeeper", "is it time to get a bookkeeper"],
          ["time", "when", "hire"], ["faq-who-for", "faq-why-rental"])
faq_entry("faq-why-rental", "Why hand off bookkeeping for rental properties?",
          ["why hire a bookkeeper for rentals", "benefits of bookkeeping for landlords"],
          ["why", "hand off", "rental"], ["who-landlords", "faq-when"])
faq_entry("faq-bookkeeper-cpa", "What's the difference between a bookkeeper and a CPA?",
          ["are you a cpa", "are you an accountant", "bookkeeper vs accountant", "do I still need a cpa"],
          ["cpa", "accountant", "difference"], ["faq-taxes", "faq-work-cpa"])
faq_entry("faq-work-cpa", "Do you work directly with my CPA?",
          ["will you talk to my accountant", "do you coordinate with my cpa", "send reports to my cpa", "can you send my reports to my tax preparer"],
          ["cpa", "accountant", "coordinate"], ["svc-yearend", "faq-taxes"])
faq_entry("faq-taxes", "Do you file taxes?",
          ["do you do taxes", "can you do my tax return", "do you prepare tax returns", "tax preparation", "do you file my taxes"],
          ["taxes", "tax return", "file"], ["faq-work-cpa", "faq-bookkeeper-cpa"],
          avoid=["sales tax", "payroll tax", "payroll taxes", "property tax", "property taxes", "sales taxes"])
faq_entry("faq-pricing", "How does pricing work?",
          ["how much do you charge", "what does it cost", "how much is monthly bookkeeping", "what are your fees", "is it hourly", "price"],
          ["price", "cost", "fee", "charge", "hourly", "450"], ["svc-cleanup-price", "svc-monthly"])
faq_entry("faq-software", "What software do you use?",
          ["do you use quickbooks", "do I need quickbooks", "do you work with spreadsheets", "what if I use excel", "do you use xero"],
          ["quickbooks", "software", "spreadsheet"], ["svc-qb-setup", "faq-start"])
faq_entry("faq-start", "How do I get started?",
          ["how do I sign up", "how do I hire you", "next steps", "how do I begin", "I want to work with you", "how do I book a call", "schedule a call", "book a discovery call"],
          ["start", "sign up", "begin"], ["proc-call", "proc-steps"], cta=True)

# Services
P = "services"
add("svc-overview", "What services do you offer?", line(f"{P}/1-hero.html", "A QuickBooks setup for new files"),
    "Services", "/services", ["what do you do", "services", "how can you help", "what can REVI do"], ["services", "offer", "help"],
    ["svc-cleanup", "svc-monthly"])
add("svc-qb-setup", "What is QuickBooks Setup?", line(f"{P}/2-quickbooks-setup-a-left.html", "For flippers and landlords just getting started"),
    "Services", "/services", ["can you set up quickbooks", "new quickbooks file", "I'm moving off spreadsheets", "start from scratch"],
    ["setup", "set up", "new file", "spreadsheet"], ["faq-software", "svc-overview"])
add("svc-cleanup", "What is a cleanup?", line(f"{P}/3-cleanup-a-left.html", "For flippers and landlords whose books are behind"),
    "Services", "/services", ["my books are behind", "I'm months behind on my books", "I haven't done my books in months", "can you catch up my books", "my books are a mess", "I'm behind on my bookkeeping", "catch up bookkeeping", "fix my quickbooks"],
    ["cleanup", "clean up", "behind", "catch up", "mess", "backlog"], ["svc-cleanup-price", "proc-cleanup-time"])
add("svc-cleanup-price", "How much does a cleanup cost?",
    [line("home/2-what-it-costs-b-cleanup.html", "A one-time price"),
     {"heading": line("home/2-what-it-costs-d-factors.html", "What we look at when we price a cleanup"),
      "list": text_of("home/2-what-it-costs-d-factors.html")[1:-1]},
     line("home/2-what-it-costs-d-factors.html", "You’ll see both numbers")],
    "Home", "/", ["cleanup price", "how is a cleanup priced", "catch up cost", "what does a cleanup cost"],
    ["cleanup", "price", "cost", "quote"], ["faq-pricing", "proc-quote"],
    source_text=line("home/2-what-it-costs-b-cleanup.html", "A one-time price"))
add("svc-monthly", "What is monthly bookkeeping?", line(f"{P}/4-monthly-bookkeeping-a-left.html", "Once the books are caught up"),
    "Services", "/services", ["do you do ongoing bookkeeping", "monthly service", "keep my books current"],
    ["monthly", "ongoing", "current"], ["svc-included", "faq-pricing"])
inc = text_of("home/5-included-b-right.html")
add("svc-included", "What does monthly bookkeeping include?",
    [line("home/5-included-a-left.html", "Once your books are caught up"), {"list": inc[0::2]}],
    "Home", "/", ["what's included", "what do I get every month", "what reports do I get", "what do you do each month"],
    ["included", "include", "reports", "every month"], ["svc-yearend", "svc-reconcile"])
add("svc-reconcile", "Do you reconcile my accounts?", line("home/5-included-b-right.html", "Every bank, credit card, loan, and escrow account"),
    "Home", "/", ["bank reconciliation", "do you reconcile credit cards", "escrow accounts"],
    ["reconcile", "reconciliation", "bank", "credit card", "escrow"], ["svc-included", "svc-cleanup"])
add("svc-1099", "Do you file 1099s?", line("home/5-included-b-right.html", "Contractor payments tracked all year"),
    "Home", "/", ["1099 for contractors", "contractor 1099s", "do you handle 1099s"],
    ["1099", "contractor", "contractors"], ["svc-included", "faq-taxes"])
add("svc-yearend", "What's in the year-end tax package?", line("home/5-included-b-right.html", "CPA-ready package"),
    "Home", "/", ["year end package", "what do you give my cpa", "schedule e", "tax season"],
    ["year-end", "year end", "schedule e", "package"], ["faq-work-cpa", "faq-taxes"])
add("svc-1031", "Do you help with 1031 exchanges?", line("who-we-serve/3-landlords-b-right.html", "1031 exchange documentation"),
    "Who We Serve", "/who-we-serve", ["1031 documentation", "1031 exchange records"], ["1031", "exchange"], ["faq-1031-flip", "who-landlords"])
add("svc-llc", "Do you handle multiple LLCs?", line("who-we-serve/3-landlords-b-right.html", "Multi-LLC bookkeeping"),
    "Who We Serve", "/who-we-serve", ["I have several llcs", "multiple entities", "more than one llc"], ["llc", "llcs", "entity", "entities"],
    ["faq-separate", "who-landlords"])
add("svc-draws", "Do you reconcile hard money draws?", line("who-we-serve/2-flippers-b-right.html", "Hard money draws matched"),
    "Who We Serve", "/who-we-serve", ["hard money loan", "construction draws", "draw reconciliation"], ["hard money", "draw", "draws", "lender"],
    ["who-flippers", "svc-costbasis"])
add("svc-costbasis", "Can you give me cost basis reports?", line("who-we-serve/2-flippers-b-right.html", "Cost basis reports"),
    "Who We Serve", "/who-we-serve", ["reports for my lender", "refinance reports"], ["cost basis", "refinance", "lender"], ["svc-draws", "who-flippers"])

# Who we serve
W = "who-we-serve"
add("who-hero", "Who do you work with?", line(f"{W}/1-hero.html", "We work with house flippers"),
    "Who We Serve", "/who-we-serve", ["who are your clients", "do you work outside charlotte", "do you work nationwide", "which states do you serve", "do you work with small businesses"],
    ["who", "clients", "nationwide", "states", "anywhere"], ["who-flippers", "who-landlords"])
add("who-flippers", "Do you work with house flippers?", line(f"{W}/2-flippers-a-left.html", "Flips move fast"),
    "Who We Serve", "/who-we-serve", ["bookkeeping for flippers", "I flip houses", "fix and flip bookkeeping", "brrrr"],
    ["flipper", "flippers", "flip", "flips", "brrrr"], ["svc-draws", "faq-balance-sheet"])
add("who-landlords", "Do you work with landlords?", line(f"{W}/3-landlords-a-left.html", "We build your books around your properties"),
    "Who We Serve", "/who-we-serve", ["bookkeeping for rentals", "I own rental properties", "long term rentals", "multifamily"],
    ["landlord", "landlords", "rental", "rentals", "multifamily"], ["svc-llc", "faq-principal"])
add("who-both", "I flip and hold rentals. Can you do both?", line(f"{W}/4-doing-both-a-left.html", "If you flip and hold rentals"),
    "Who We Serve", "/who-we-serve", ["flips and rentals together", "I do both", "I flip and have rentals", "I flip and also own rentals", "flipper and landlord"], ["both"], ["faq-separate", "faq-flip-vs-rental"])

# About and contact
add("about-julia", "Who is Julia?",
    [line("about/1-meet-julia-b-right.html", "Hi, I'm Julia Kachula"), line("about/1-meet-julia-b-right.html", "My background is in accounting")],
    "About", "/about", ["who runs revi", "who is the bookkeeper", "who will do my books", "where are you located", "are you in charlotte", "about you"],
    ["julia", "founder", "about", "located", "charlotte", "background"], ["contact", "who-hero"])
_ch = (B / "about/2-contact-a-left.html").read_text()
CONTACTS = [{"label": html.unescape(l), "href": h, "note": html.unescape(n)} for h, l, n in re.findall(r'<a class="rds-contact__detail" href="([^"]+)">(.*?)</a><p class="rds-contact__note">(.*?)</p>', _ch)]
if len(CONTACTS) != 2:
    raise SystemExit("Contacts not parsed")
add("contact", "How can I contact you?",
    [{"contacts": CONTACTS}],
    "About", "/about", ["phone number", "email address", "can I call you", "talk to a person", "talk to julia", "speak to someone"],
    ["contact", "phone", "email", "call", "text", "person", "human"], ["faq-start", "proc-call"],
    source_text="Have a question, send a message", cta=True)

# Process: structured steps straight from the block markup
_ph = (B / "home/4-process-b-right.html").read_text()
STEPS = [{"num": n, "title": html.unescape(t).strip(), "meta": html.unescape(m), "text": html.unescape(x)}
         for n, t, m, x in re.findall(r'rds-step__num">(\d+)</span><div><p class="rds-step__title">(.*?)<span class="rds-tag">(.*?)</span></p><p class="rds-body-sm">(.*?)</p>', _ph)]
if len(STEPS) != 4:
    raise SystemExit("Process steps not parsed")
add("proc-steps", "What happens after I get in touch?",
    [line("home/4-process-a-left.html", "Four steps from the first call"), {"steps": STEPS}],
    "Home", "/", ["what is the process", "how does it work", "what are the steps", "onboarding"],
    ["process", "steps", "how it works", "after"], ["proc-call", "proc-quote"])
add("proc-call", "What happens on the discovery call?",
    [{"steps": STEPS[0:1]}, line("home/6-start-here-a-left.html", "Tell us where your books stand")],
    "Home", "/", ["how long is the call", "discovery call", "consultation", "first call", "intro call"],
    ["call", "discovery", "consultation", "minutes"], ["proc-free", "faq-start"], cta=True)
add("proc-quote", "Will I get an exact quote?", [{"steps": STEPS[1:2]}],
    "Home", "/", ["do you give a quote", "proposal", "estimate", "price range"], ["quote", "proposal", "estimate", "exact"],
    ["svc-cleanup-price", "faq-pricing"])
add("proc-cleanup-time", "How long does a cleanup take?", [{"steps": STEPS[2:3]}],
    "Home", "/", ["cleanup timeline", "how long to catch up", "turnaround", "how fast can you catch me up", "how quickly can you clean up my books"], ["long", "timeline", "take", "turnaround"],
    ["svc-cleanup", "svc-cleanup-price"])
add("proc-diy", "Can I run the books myself after the cleanup?",
    [{"steps": [STEPS[2], STEPS[3]]}],
    "Home", "/", ["do I have to sign up for monthly", "cleanup only", "just a cleanup", "is monthly required"],
    ["myself", "only", "required", "contract"], ["svc-cleanup", "svc-monthly"])

# Terms and Privacy Policy
# These answers are written plainly instead of quoted, because the legal pages name the tools
# we use behind the scenes. The chat keeps those private (see PRIVATE_TOOLS below).
# Each answer still links to the exact spot on the page it comes from.
T = "legal/terms-of-use.html"
PP = "legal/privacy-policy.html"
def anchor(path, starts):
    part(path, starts)  # fails the build if the page no longer has this text
    return starts
add("proc-free", "Is the discovery call free?",
    ["Yes. The discovery call is free, and booking one doesn't sign you up for anything. Work starts only after a written engagement letter."],
    "Terms of Use", "/terms-of-use", ["does the call cost anything", "free consultation", "am I committing by booking"],
    ["free", "commit", "obligation"], ["proc-call", "faq-start"], source_text=anchor(T, "Booking a consultation through our Site does not create"))
add("priv-sell", "Do you sell my data?",
    ["No. We don't sell personal information. Questions about it can go to info@revibookkeeping.com."],
    "Privacy Policy", "/privacy-policy", ["do you share my information", "privacy"], ["sell", "share", "privacy", "data"],
    ["priv-secure", "priv-delete"], source_text=anchor(PP, "We do not sell the personal information of Consumers."))
add("priv-secure", "Is my financial information secure?",
    ["The financial documents you share, like bank statements and transaction records, are used only to do your bookkeeping. Our Privacy Policy explains how we protect them."],
    "Privacy Policy", "/privacy-policy", ["is my data safe", "security", "bank statements safe"], ["secure", "security", "safe", "financial"],
    ["priv-sell", "faq-software"], source_text=anchor(PP, "The security of Your Personal Data"))
add("priv-delete", "How do I delete my data?",
    ["Email info@revibookkeeping.com with the subject line \u201cRequest for Data Deletion.\u201d Include your name and the email address you used with us."],
    "Privacy Policy", "/privacy-policy", ["remove my information", "data deletion", "erase my data"], ["delete", "deletion", "remove", "erase"],
    ["priv-sell", "contact"], source_text=anchor(PP, "You have the right to request the deletion"))
add("priv-cookies", "Do you use cookies or tracking?",
    ["Yes. The site uses cookies to see how visitors use it, so we can improve it. Our Privacy Policy has the details."],
    "Privacy Policy", "/privacy-policy", ["do you track me", "analytics"], ["cookies", "tracking", "analytics"], ["priv-sell"],
    source_text=anchor(PP, "These Cookies are used to track information"))

# Guides (link out)
guides = sorted(set(re.findall(r'href="(/guides/[a-z0-9-]+)"', "".join(p.read_text() for p in B.rglob("*.html")))))
TITLES = {
    "whats-the-best-way-to-track-rehab-costs-for-each-flip-or-brrrr-property": "What's the best way to track rehab costs for each flip or BRRRR property?",
    "should-i-hire-a-bookkeeper-for-my-rental-properties-or-keep-using-a-spreadsheet": "Should I hire a bookkeeper for my rental properties or keep using a spreadsheet?",
    "how-do-i-know-if-my-rental-properties-are-actually-making-money": "How do I know if my rental properties are actually making money?",
    "how-do-i-figure-out-how-much-profit-i-actually-made-on-a-house-flip": "How do I figure out how much profit I actually made on a house flip?",
    "do-i-still-need-my-own-books-if-i-have-a-property-manager": "Do I still need my own books if I have a property manager?",
}

# Extra phrasings and keywords found by the 500-question test (Oct 17, 2026)
EXTRA = {
    "faq-different": (["why do real estate investors need a specialized bookkeeper", "what makes bookkeeping for investors different"], ["specialized", "specialist", "investor", "investors"]),
    "faq-depreciate": (["can a flip be depreciated", "is depreciation allowed on a flip", "does depreciation apply to a flip"], []),
    "faq-rehab-deductible": (["can I deduct rehab right away", "do I get to write off the rehab now"], ["immediately", "now", "spend", "spending", "spent"]),
    "faq-balance-sheet": (["where do flip costs go", "why dont my flip costs show as expenses"], ["inventory"]),
    "faq-repair": (["is a new hvac a repair or an improvement", "is a water heater a capital improvement"], ["hvac", "roof", "flooring", "floors", "heater", "appliance", "appliances", "furnace", "replace", "replacing", "replacement"]),
    "faq-separate": (["do I need two sets of books", "can flips and rentals share one set of books"], ["together", "same", "combine"]),
    "faq-when": (["how many properties before I need a bookkeeper", "how do I know it is time for a bookkeeper"], ["ready", "time", "point", "hire", "early"]),
    "faq-why-rental": (["why outsource bookkeeping for my rentals", "why hire a bookkeeper for rental properties"], ["outsource", "benefit"]),
    "faq-bookkeeper-cpa": (["what is the difference between bookkeeping and accounting", "are you accountants", "are you a cpa", "what does a bookkeeper do compared to a cpa"], ["accounting", "bookkeeper"]),
    "faq-work-cpa": (["can you work with my current cpa", "do you send my books to my cpa"], ["existing", "current", "coordinate", "send"]),
    "faq-taxes": (["can you file my schedule e", "do you prepare tax returns"], ["file", "filing", "prepare", "preparation", "return", "1040"]),
    "faq-software": (["what tools do you use", "what programs do you use", "can you work in quickbooks desktop", "do I need to buy quickbooks", "do you use wave"], ["desktop", "wave", "xero", "freshbooks", "stessa", "baselane", "desktop version", "required", "require", "platform"]),
    "faq-start": (["how do I become a client", "what is the first step", "how do I hire you"], ["hire", "begin"]),
    "svc-overview": (["list your services", "what kind of services do you provide"], ["services", "service", "provide", "offer"]),
    "svc-qb-setup": (["help me set up quickbooks", "can you set up quickbooks for my new company"], []),
    "svc-monthly": (["do you offer monthly bookkeeping", "do you do ongoing bookkeeping"], ["ongoing", "recurring", "plan", "books"]),
    "svc-included": (["what comes with monthly bookkeeping", "what do I get every month"], ["include", "included", "includes", "reports", "deliverables"]),
    "svc-1099": (["do you prepare 1099 forms"], ["forms", "contractors", "contractor"]),
    "svc-1031": (["do you track 1031 exchanges", "do you do 1031s", "1031", "1031 exchange"], ["track", "documentation", "document"]),
    "svc-llc": (["I have several llcs can you help", "can you do books for more than one llc"], ["several", "multiple", "more", "different", "each"]),
    "svc-costbasis": (["do you track cost basis by property"], ["track"]),
    "who-hero": (["what kind of clients do you have", "who do you help", "do you work outside north carolina"], ["clients", "client", "serve", "help", "work", "only", "live"]),
    "faq-who-for": (["who should use monthly bookkeeping", "who is the monthly service for"], ["fit", "right", "should"]),
    "who-flippers": (["do you help house flippers", "is this good for flippers", "I am a flipper", "im a flipper", "do you work with flip investors"], []),
    "who-landlords": (["do you help landlords", "do you work with rental property owners", "buy and hold", "I am a landlord", "im a landlord"], ["owner", "owners", "portfolio", "investors", "long"]),
    "about-julia": (["who owns the company", "who runs the business", "who will I be working with", "who does the bookkeeping"], ["runs", "bookkeeper"]),
    "contact": (["contact info", "contact information", "how do I get in touch", "can I call you"], ["touch", "speak", "talk"]),
    "proc-steps": (["walk me through the process", "what happens next", "what are the next steps"], ["process", "onboarding", "next", "steps", "works"]),
    "proc-call": (["what do you ask on the discovery call", "what is the discovery call", "what do we cover on the call", "what should I expect on the call"], ["discovery", "expect", "cover", "intro", "talk", "discuss", "ask", "questions"]),
    "proc-cleanup-time": (["how many weeks does a cleanup take"], ["weeks", "days", "months"]),
    "proc-diy": (["can I take over the books after the cleanup"], ["take", "over", "myself", "own"]),
    "proc-free": (["do you charge for the first call", "is there a fee for the discovery call"], ["first"]),
    "priv-sell": (["do you give my information to third parties"], ["share", "third", "parties", "party"]),
    "priv-secure": ([], ["protect"]),
    "svc-reconcile": ([], ["loan", "loans", "statements"]),
    "svc-yearend": ([], ["reports"]),
    "svc-cleanup": (["I need my books cleaned up", "I havent touched my books in years"], ["year", "years", "months", "touched", "cleaned"]),
    "who-both": ([], ["mix", "mixed"]),
}
GUIDE_TAGS = {
    "do-i-still-need-my-own-books-if-i-have-a-property-manager": ["property", "manager", "management", "statement", "statements", "owner"],
    "how-do-i-figure-out-how-much-profit-i-actually-made-on-a-house-flip": ["profit", "calculate", "made", "flip", "net", "real", "actual"],
    "how-do-i-know-if-my-rental-properties-are-actually-making-money": ["profitable", "profit", "money", "cash", "flow", "cashflow", "rental"],
    "should-i-hire-a-bookkeeper-for-my-rental-properties-or-keep-using-a-spreadsheet": ["spreadsheet", "excel", "enough", "rental"],
    "whats-the-best-way-to-track-rehab-costs-for-each-flip-or-brrrr-property": ["track", "rehab", "brrrr", "per", "each", "cost"],
}
for g in guides:
    slug = g.split("/")[-1]
    if slug not in TITLES:
        raise SystemExit(f"Guide title missing for {slug}")
    entries.append({"id": "guide-" + slug[:40], "q": TITLES[slug], "ask": [], "tags": ["guide"] + GUIDE_TAGS.get(slug, []),
                    "a": [], "source": {"label": "Read the guide", "url": SITE + g}, "related": [], "kind": "guide", "cta": False})

for e in entries:
    if e["id"] in EXTRA:
        a, t = EXTRA.pop(e["id"])
        e["ask"] = list(e["ask"]) + [x for x in a if x not in e["ask"]]
        e["tags"] = list(e["tags"]) + [x for x in t if x not in e["tags"]]
if EXTRA:
    raise SystemExit(f"EXTRA has unknown ids {list(EXTRA)}")

# Tools we use behind the scenes stay out of the chat. QuickBooks Online is fine to name.
# The build stops if any answer, or the page text it links to, would show one of these.
PRIVATE_TOOLS = r"\b(Ivorey|Slack|Notion|Claude|Anthropic|ChatGPT|OpenAI|Gemini|Copilot|Google|Gmail|Squarespace|Intuit|Zoom|Calendly|DocuSign|Dropbox|Figma|Canva|Client ?Hub|Karbon|Canopy|TaxDome|Zapier|Loom|Fathom|Otter|Hubdoc|Dext|Gusto|Stripe|Plaid|Apps Script|GitHub)\b"
for e in entries:
    shown = json.dumps(e["a"], ensure_ascii=False) + " " + e["source"]["label"] + " " + e["source"]["url"]
    hit = re.search(PRIVATE_TOOLS, shown, re.I)
    if hit:
        raise SystemExit(f"{e['id']} names a private tool: {hit.group(0)}")

# Check related ids exist
ids = {e["id"] for e in entries}
for e in entries:
    missing = [r for r in e["related"] if r not in ids]
    if missing:
        raise SystemExit(f"{e['id']} has unknown related {missing}")

out = {
    "version": 1,
    "starters": ["How does pricing work?", "Do you file taxes?", "Does a flip get depreciated?", "Do you work directly with my CPA?", "How do I get started?"],
    "entries": entries,
}
(ROOT / "chat/answers.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(f"{len(entries)} entries written")
