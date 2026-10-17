/* Ask REVI, the website FAQ chat for revibookkeeping.com.
   Answers come only from chat/answers.json, which is built word for word from the site copy
   (chat/build_answers.py). No AI, no server, and nothing a visitor types leaves the page.

   Preview mode: the chat stays hidden unless the page is opened with ?askrevi=on (remembered in
   this browser) or the script tag has data-public="true". ?askrevi=off hides it again. */
(function () {
  "use strict";
  if (window.__askrevi) return;
  window.__askrevi = true;
  if (window.self !== window.top) return; // not inside the Squarespace editor

  var script = document.currentScript || document.querySelector('script[src*="chat.js"]');
  var BASE = script ? script.src.replace(/[^\/?#]*([?#].*)?$/, "") : "";
  var PUBLIC = !!(script && script.getAttribute("data-public") === "true");
  // Where questions are logged (Google Apps Script web app that writes to Notion). Empty = no logging.
  var LOG_URL = "https://script.google.com/macros/s/AKfycbyPJKhNUrO0o_-r23VJ2NNwXsSrLOBq01Uu20TEe8tKeqWC5CDoBFKJBNETt6fFprZ7/exec";
  var KEY = "askrevi-preview", STATE = "askrevi-state";

  function ls(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }
  function ss(fn) { try { return fn(window.sessionStorage); } catch (e) { return null; } }
  var qp = (location.search.match(/[?&]askrevi=(on|off)\b/) || [])[1];
  if (qp === "on") ls(function (s) { s.setItem(KEY, "1"); });
  if (qp === "off") ls(function (s) { s.removeItem(KEY); });
  var preview = qp === "on" || ls(function (s) { return s.getItem(KEY) === "1"; }) === true;
  if (!PUBLIC && !preview) return;
  if (/^\/(revi-fit-form|cart|checkout|commerce)/.test(location.pathname)) return;

  // ---------- Copy ----------
  var COPY = {
    title: "Ask REVI",
    subtitle: "Answers from our website",
    launcher: "Ask a question",
    welcome: "Ask about bookkeeping for flips and rentals, or about working with REVI. Answers come from our FAQs, Services page, and guides.",
    starters: "Common questions",
    related: "Related",
    noMatch: "That one isn't covered on our site, so it's a question for Julia. She can go through it with you on a discovery call.",
    handoffTitle: "Ask Julia directly",
    handoffBody: "Answer some questions about your portfolio and setup, then book a discovery call.",
    handoffButton: "Get in Touch",
    handoffUrl: "/revi-fit-form",
    guide: "We have a guide on this.",
    thanks: "Glad to help.",
    placeholder: "Type your question",
    foot: "General answers. Review your situation with your CPA.",
    saved: "We save questions asked here to improve our answers.",
    privacy: "Privacy Policy"
  };

  // ---------- Icons (Lucide, ISC license) and the REVI mark ----------
  function svg(paths, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + "</svg>";
  }
  var I = {
    chat: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/>', 24),
    x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 24),
    send: svg('<path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/>', 20),
    arrow: svg('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>', 16),
    mark: '<svg viewBox="0 0 224 145" fill="currentColor" aria-hidden="true" focusable="false"><path d="M157.87 116.728C154.059 116.728 151.01 113.681 151.01 109.872V88.9638C151.01 85.1547 154.059 82.1074 157.87 82.1074H210.719C211.227 81.007 211.227 73.3888 211.227 70.1722C211.227 66.9556 211.227 59.5067 210.042 58.0677L120.943 58.4063V103.269C120.943 109.448 116.878 114.612 110.865 116.135C104.852 117.659 98.8382 115.035 95.8739 109.533L86.4728 92.1804C84.779 89.0485 85.7953 85.2394 88.7596 83.2925C100.617 75.4203 107.392 61.8768 107.392 46.2172C107.392 16.4215 84.5249 0.338593 63.0125 0.338593H0V143.9C2.54083 145 10.7562 145 14.9062 145C19.0562 145 27.3562 145 29.8971 143.9V98.9521C29.8971 95.143 32.9461 92.0958 36.7573 92.0958H53.0186C55.6441 92.0958 57.9309 93.5348 59.1166 95.8202L78.8504 134.588C83.0286 141.529 90.7076 145 101.887 145H221.814C223.085 142.799 223.085 134.504 223.085 130.864C223.085 126.632 223.085 117.998 221.645 116.389L157.955 116.728H157.87ZM57.338 64.3316H36.7573C32.9461 64.3316 29.8971 61.2843 29.8971 57.4752V35.2131C29.8971 31.404 32.9461 28.3567 36.7573 28.3567H57.338C67.3319 28.3567 75.4626 36.3981 75.4626 46.3018C75.4626 56.2055 67.3319 64.2469 57.338 64.2469V64.3316Z"/><path d="M223 14.3053C223 10.1576 223 1.60829 221.56 0L120.943 0.423234V28.6106H222.322C223 27.2563 223 18.5377 223 14.39V14.3053Z"/></svg>'
  };

  // ---------- Matching ----------
  var STOP = ("a an the is are am was were be been do does did doing i im me my mine we us our ours you your yours to of for and or " +
    "in on at it its this that these those there their they them if as by from about any have has had get got can could would " +
    "should will shall what whats how when where why who whom which with just so not no yes please also than then into out up " +
    "much many some more most very really need want like know tell explain anyone someone thing things way ok okay hi hello hey thanks thank house houses home homes also guy guys too able gonna going yall all revi book books bookkeeping").split(" ");
  function dict() { return Object.create(null); }  // no inherited keys like "constructor"
  var STOPSET = dict(); STOP.forEach(function (w) { STOPSET[w] = 1; });
  var PHRASES = [
    [/\b(pricing|prices?|fees?) (set ?up|structured?|works?)\b/g, " price "], [/\bcertified public accountants?\b/g, " cpa "],
    [/\breach (out to )?(julia|you|someone|somebody|a person)\b/g, " contact "],
    [/\bhow much\b/g, " price "], [/\bfix (and|&|n) flip\w*/g, " flip "], [/\bp ?& ?l'?s?\b|\bp and l\b|\bpnl\b|\bprofit (and|&) loss\b/g, " pnl "],
    [/\bquick ?books\b|\bqbo\b|\bqb\b/g, " quickbooks "], [/\bset ?up\b/g, " setup "], [/\bclean ?up\b|\bcatch ?up\b|\bcaught up\b/g, " cleanup "],
    [/\byear ?end\b/g, " yearend "], [/\bhard money\b/g, " hardmoney "], [/\breal estate\b/g, " realestate "], [/\bsmall business\b/g, " smallbusiness "],
    [/\btax returns?\b/g, " taxes "], [/\bwrite ?offs?\b/g, " deduct "], [/\bsign ?up\b/g, " start "], [/\bget started\b/g, " start "],
    [/\bbalance sheet\b/g, " balancesheet "], [/\bcost of goods( sold)?\b|\bcogs\b/g, " cogs "], [/\bschedule e\b/g, " schedulee "],
    [/\bcost basis\b/g, " costbasis "], [/\bbuy (and|&) hold\b/g, " rental "], [/\b1099s?\b/g, " 1099 "], [/\b1031s?\b/g, " 1031 "],
    [/\bcapital improvements?\b/g, " improvement "], [/\bprincipal\b/g, " principal "],
    [/\btax (guy|gal|person|preparer|pro|professional|advisor|accountant)\b/g, " cpa "],
    [/\bhand(ing)? off (my |the |your )?(books|bookkeeping)\b|\boutsourc\w*/g, " outsource bookkeeping "],
    [/\b(two|2|one|1|same|different) sets? of books\b/g, " separate books "],
    [/\bcontact info(rmation)?\b|\bget in touch\b|\bcall (you|julia|revi)\b|\bphone number\b/g, " contact "],
    [/\b(talk|speak|chat) (to|with) (someone|somebody|a person|a human|a real person|julia|you|anyone)\b/g, " contact "],
    [/\bwho (owns|runs|started|founded|is behind|am i working with|will i (be )?work(ing)? with)\b/g, " julia "],
    [/\bcomes? with\b/g, " include "],
    [/\bsetting up\b/g, " setup "], [/\bbest way to\b/g, " "], [/\bfirst step\b|\bbecome a client\b/g, " start "],
    [/\b(every|each|per|a) month\b/g, " monthly "],
    [/\bwhat (will|would|does|do) (it|this|that) cost\b|\bcost (me|per)\b|\bballpark\b|\bprice list\b|\bset pricing\b|\bdo you cost\b/g, " price "],
    [/\b(different|separate|two|2) (books|quickbooks( files?)?)\b/g, " separate books "],
    [/\btrack(ing)? (me|visitors|users|people)\b/g, " cookies "],
    [/\bget going\b|\bget the ball rolling\b|\bonboard(ed)?\b/g, " start "],
    [/\bthird part(y|ies)\b/g, " share "],
    [/\bcash ?flow(ing)?\b|\bmaking money\b|\bprofitable\b/g, " profitable "],
    [/\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|out of state|another state|other states?)\b/g, " nationwide "]
  ];
  var CANON = dict();
  function group(canon, words) { words.split(" ").forEach(function (w) { CANON[w] = canon; }); }
  group("rehab", "rehab rehabs renovation renovations renovate remodel remodeling construction");
  group("flip", "flip flips flipper flippers flipping flipped");
  group("rental", "rental rentals landlord landlords rent renting tenant tenants ltr ltrs door doors");
  group("price", "price prices pricing priced fee fees charge charges rate rates expensive cheap afford affordable budget");
  group("cost", "cost costs");
  group("taxes", "tax taxes irs");
  group("cpa", "cpa cpas accountant accountants");
  group("quickbooks", "quickbooks software program app xero wave freshbooks stessa baselane");
  group("spreadsheet", "spreadsheet spreadsheets excel");
  group("llc", "llc llcs entity entities");
  group("depreciate", "depreciate depreciated depreciation depreciating depreciable");
  group("deduct", "deduct deductible deduction deductions expense expensed");
  group("call", "call calls consultation consult meeting");
  group("contact", "contact reach phone email number human person touch");
  group("delete", "delete deletion remove erase");
  group("secure", "secure security safe protected");
  group("data", "data information info");
  group("cleanup", "cleanup behind mess messy backlog disaster wreck neglected");
  group("reconcile", "reconcile reconciled reconciles reconciling reconciliation reconciliations match matching matched");
  group("monthly", "month monthly");
  group("julia", "julia founder owner");
  group("nationwide", "nationwide state states anywhere remote remotely country");
  group("located", "located location based charlotte local locally nearby");
  group("long", "long fast quick quickly soon turnaround timeline weeks week days");
  group("both", "both");
  group("draw", "draw draws");
  group("separate", "separate separately split");
  group("different", "different difference differences differ");
  group("services", "service services offer offers offering provide provides");
  group("client", "client clients customer customers");

  function norm(s) {
    s = String(s); if (s.normalize) s = s.normalize("NFKC");
    s = (" " + s.toLowerCase().replace(/[’']/g, "") + " ");
    PHRASES.forEach(function (p) { s = s.replace(p[0], p[1]); });
    return s.replace(/[^a-z0-9]+/g, " ").trim();
  }
  function stem(w) {
    if (CANON[w]) return CANON[w];
    if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
    else if (w.length > 4 && /ed$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
    if (CANON[w]) return CANON[w];
    if (CANON[w + "e"]) return CANON[w + "e"];
    if (w.length > 4 && /e$/.test(w)) w = w.slice(0, -1);
    return w;
  }
  var KEEPNUM = dict(); ["1099", "1031", "450", "1040"].forEach(function (n) { KEEPNUM[n] = 1; });
  function tokens(s) {
    var out = [];
    norm(s).split(" ").forEach(function (w) {
      if (!w || STOPSET[w]) return;
      if (/^\d+$/.test(w) && !KEEPNUM[w]) return;
      out.push(stem(w));
    });
    return out;
  }
  function lev1(a, b) { // true if edit distance <= 1
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, e = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++e > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return e + (a.length - i) + (b.length - j) <= 1;
  }
  function blockText(b) {
    if (typeof b === "string") return b;
    var t = [];
    if (b.heading) t.push(b.heading);
    (b.list || []).forEach(function (x) { t.push(x); });
    (b.steps || []).forEach(function (x) { t.push(x.title + " " + x.meta + " " + x.text); });
    (b.contacts || []).forEach(function (x) { t.push(x.label + " " + x.note); });
    return t.join(" ");
  }

  var DATA = null, INDEX = [], IDF = dict(), VOCAB = [], BYID = dict(), EXACT = dict();
  function buildIndex(d) {
    DATA = d; INDEX = []; BYID = dict(); EXACT = dict(); IDF = dict();
    var df = dict();
    d.entries.forEach(function (e) {
      BYID[e.id] = e;
      var f = dict();
      function put(list, w) { list.forEach(function (t) { if (!f[t] || f[t] < w) f[t] = w; }); }
      put(tokens(e.a.map(blockText).join(" ")), 0.3);
      put(tokens(e.tags.join(" ")), 0.8);
      put(tokens([e.q].concat(e.ask).join(" ")), 1);
      var keys = [e.q].concat(e.ask).map(function (x) { return tokens(x).join(" "); });
      [e.q].concat(e.ask).forEach(function (x) { EXACT[norm(x)] = e; });
      INDEX.push({ e: e, f: f, keys: keys });
      Object.keys(f).forEach(function (t) { df[t] = (df[t] || 0) + (f[t] >= 0.8 ? 1 : 0.25); });
    });
    var N = d.entries.length;
    Object.keys(df).forEach(function (t) { IDF[t] = Math.log(1 + N / df[t]); });
    VOCAB = Object.keys(df);
  }
  // Topics the site doesn't cover. These always go to Julia instead of a near-miss answer.
  var OFF_TOPIC = new RegExp("\\b(" + [
    "sales tax(es)?", "payroll", "property tax(es)?", "short term rentals?", "airbnb", "vrbo", "legal advice", "lawyer", "attorney",
    "get (me )?a loan", "lend me", "financing", "mortgage broker",
    "sell (my |your )?(house|home|propert(y|ies)|houses|homes)", "(do you )?sell houses", "realtor", "real estate agent",
    "what is an? (llc|brrrr|cap rate|hard money loan)", "(form|start|create|open) an llc", "valuations?", "appraisals?", "audit(s|ed|ing)?",
    "what time is it", "are you (an? )?(human|real( person)?|bot|robot|ai|chatgpt)", "is this (an? )?(bot|robot|ai|chatgpt)", "how much rent", "rent (should|to) (i )?charge",
    "(find|get|hire|recommend|know) (me )?an? (good )?(contractor|realtor|lender|agent|cpa|property manager)",
    "are you hiring", "job (openings?|applications?)", "looking for (a )?job", "careers?", "internships?", "work for you",
    "evict(ion)?", "buy( \\w+){0,2} (house|houses|home|homes|property|properties|rentals?|flips?)", "mortgage (loans?|rates?)", "insurance", "(how (do i|to)|want to|should i) invest", "get (me )?an? (hard money |construction |fix and flip )?loan", "(start|get into|begin) flipping", "how (to|do i) (start )?flip", "represent(ation)?", "cancel", "best (city|cities|market|markets|area|place)", "property management", "tenant screening", "manage my propert(y|ies)", "stock market", "stocks", "bitcoin", "crypto"
  ].join("|") + ")\\b");
  var UNKNOWN_W = 0.6;
  function match(q) {
    var nq = norm(q);
    var raw = (String(q).normalize ? String(q).normalize("NFKC") : String(q)).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ");
    if (OFF_TOPIC.test(nq) || OFF_TOPIC.test(raw)) return null;
    if (EXACT[nq]) return EXACT[nq];
    var qt = tokens(q), uniq = [];
    qt.forEach(function (t) { if (uniq.indexOf(t) < 0) uniq.push(t); });
    if (!uniq.length) return null;
    // map unknown tokens to a near spelling (typos)
    var mapped = uniq.map(function (t) {
      if (IDF[t] || t.length < 7) return t;
      for (var i = 0; i < VOCAB.length; i++) if (VOCAB[i].length >= 7 && lev1(t, VOCAB[i])) return VOCAB[i];
      for (var w in CANON) if (w.length >= 7 && lev1(t, w)) return CANON[w];
      return t;
    });
    var maxIdf = 0; for (var k in IDF) if (IDF[k] > maxIdf) maxIdf = IDF[k];
    var denom = 0; mapped.forEach(function (t) { denom += IDF[t] || maxIdf * UNKNOWN_W; });
    var qkey = mapped.join(" ");
    var best = null;
    INDEX.forEach(function (it) {
      if ((it.e.avoid || []).some(function (a) { return (" " + nq + " ").indexOf(" " + norm(a) + " ") >= 0; })) return;
      var s = 0, strong = 0;
      mapped.forEach(function (t) { var w = it.f[t] || 0; if (w) { s += w * IDF[t]; if (w >= 0.8) strong++; } });
      var cov = s / denom;
      if (it.keys.indexOf(qkey) >= 0) cov += 1;               // exact question or known phrasing
      if (it.e.kind === "guide") cov *= 0.9;                   // prefer a direct answer over a guide link
      if (strong === 0) cov = 0;                               // never answer on body text alone
      if (mapped.length === 1 && (it.f[mapped[0]] || 0) < 1) cov = 0;   // one-word questions must hit a question or phrasing
      if (!best || cov > best.cov) best = { e: it.e, cov: cov };
    });
    return best && best.cov >= 0.5 ? best.e : null;
  }

  // ---------- Small helpers ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function track(name, params) {
    if (!PUBLIC || typeof window.gtag !== "function") return;
    try { window.gtag("event", name, params || {}); } catch (e) {}
  }
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var phone = function () { return window.matchMedia && window.matchMedia("(max-width: 600px)").matches; };

  // ---------- Styles ----------
  var css = document.createElement("link");
  css.rel = "stylesheet"; css.href = BASE + "chat.css";
  document.head.appendChild(css);

  // ---------- DOM ----------
  var root = el("div", "askrevi");
  root.style.display = "none"; // stays hidden until chat.css has loaded, so nothing flashes unstyled
  css.addEventListener("load", function () { root.style.display = ""; });
  css.addEventListener("error", function () { root.remove(); });
  var launcher = el("button", "askrevi-launcher", I.chat + '<span class="askrevi-launcher-label">' + esc(COPY.launcher) + "</span>");
  launcher.type = "button";
  launcher.setAttribute("aria-label", COPY.title);
  launcher.setAttribute("aria-controls", "askrevi-panel");
  launcher.setAttribute("aria-expanded", "false");

  var panel = el("div", "askrevi-panel");
  panel.id = "askrevi-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", COPY.title);
  panel.innerHTML =
    '<div class="askrevi-header"><span class="askrevi-avatar is-lg">' + I.mark + '</span>' +
    '<div class="askrevi-titles"><p class="askrevi-title">' + esc(COPY.title) + '</p><p class="askrevi-subtitle">' + esc(COPY.subtitle) + "</p></div>" +
    '<button type="button" class="askrevi-close" aria-label="Close chat">' + I.x + "</button></div>" +
    '<div class="askrevi-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
    '<form class="askrevi-composer" novalidate><label class="askrevi-sr" for="askrevi-input">Your question</label>' +
    '<input id="askrevi-input" class="askrevi-input" type="text" autocomplete="off" maxlength="300" enterkeyhint="send" placeholder="' + esc(COPY.placeholder) + '">' +
    '<button type="submit" class="askrevi-send" aria-label="Send" disabled>' + I.send + "</button></form>" +
    '<p class="askrevi-foot">' + esc(COPY.foot) + (LOG_URL ? '<br>' + esc(COPY.saved) +
      ' <a href="/privacy-policy#ask-revi" class="askrevi-foot-link">' + esc(COPY.privacy) + "</a>" : "") + "</p>";
  root.appendChild(panel);
  root.appendChild(launcher);
  (document.body || document.documentElement).appendChild(root);

  var log = panel.querySelector(".askrevi-log");
  var form = panel.querySelector(".askrevi-composer");
  var input = panel.querySelector(".askrevi-input");
  var send = panel.querySelector(".askrevi-send");
  var closeBtn = panel.querySelector(".askrevi-close");

  // ---------- Conversation state (kept for this tab, so it survives page changes) ----------
  var history = ss(function (s) { return JSON.parse(s.getItem(STATE) || "null"); }) || { open: false, turns: [] };
  function save() { ss(function (s) { s.setItem(STATE, JSON.stringify(history)); }); }
  if (!history.visit) { history.visit = Math.random().toString(36).slice(2, 10); history.asked = 0; }

  // ---------- Logging questions (private, to Notion) ----------
  // Blank out anything that looks like an email, phone number, or account/ID number before it leaves the browser.
  function blank(q) {
    var out = q
      .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, "[email]")
      .replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]")
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[number]")
      .replace(/\d[\d\s-]{5,}\d/g, function (m) { return m.replace(/\D/g, "").length >= 6 ? "[number]" : m; });
    return { text: out, blanked: out !== q };
  }
  function logQuestion(q, t) {
    if (!LOG_URL) return;
    try {
      var b = blank(q), e = t.id && BYID[t.id];
      var body = JSON.stringify({
        v: 1, q: b.text, blanked: b.blanked,
        result: e ? "answered" : t.kind === "welcome" ? "greeting" : t.kind === "thanks" ? "thanks" : "nomatch",
        answerId: e ? e.id : "", answer: e ? e.q : "",
        page: location.pathname, device: phone() ? "phone" : "desktop",
        visit: history.visit, turn: ++history.asked, mode: PUBLIC ? "public" : "preview"
      });
      fetch(LOG_URL, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain" }, body: body }).catch(function () {});
    } catch (err) {}
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function botRow(content) {
    var row = el("div", "askrevi-row is-bot");
    row.appendChild(el("span", "askrevi-avatar is-sm", I.mark));
    var b = el("div", "askrevi-bubble");
    if (typeof content === "string") b.innerHTML = content; else b.appendChild(content);
    row.appendChild(b);
    log.appendChild(row);
    return b;
  }
  function visitorRow(text) {
    var row = el("div", "askrevi-row is-visitor");
    row.appendChild(el("div", "askrevi-bubble", esc(text)));
    log.appendChild(row);
  }
  function renderBlock(b) {
    if (typeof b === "string") return "<p>" + esc(b) + "</p>";
    var h = "";
    if (b.heading) h += "<p><strong>" + esc(b.heading) + "</strong></p>";
    if (b.list) h += '<ul class="askrevi-list">' + b.list.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    if (b.steps) h += '<ol class="askrevi-steps">' + b.steps.map(function (s) {
      return '<li><p class="askrevi-step-head">' + esc(s.num) + " " + esc(s.title) + ' <span class="askrevi-step-meta">' + esc(s.meta) + '</span></p><p class="askrevi-step-text">' + esc(s.text) + "</p></li>";
    }).join("") + "</ol>";
    if (b.contacts) h += '<ul class="askrevi-contacts">' + b.contacts.map(function (c) {
      return '<li><a class="askrevi-contact" href="' + esc(c.href) + '">' + esc(c.label) + '</a><span class="askrevi-contact-note">' + esc(c.note) + "</span></li>";
    }).join("") + "</ul>";
    return h;
  }
  function sourceLink(e) {
    return '<a class="askrevi-source" data-id="' + esc(e.id) + '" href="' + esc(e.source.url) + '">' + I.arrow + "<span>" + esc(e.source.label) + "</span></a>";
  }
  function chips(list, label) {
    if (!list.length) return;
    var w = el("div", "askrevi-suggest");
    if (label) w.appendChild(el("p", "askrevi-suggest-label", esc(label)));
    var c = el("div", "askrevi-chips");
    list.forEach(function (q) {
      var btn = el("button", "askrevi-chip", esc(q));
      btn.type = "button";
      btn.addEventListener("click", function () { ask(q); });
      c.appendChild(btn);
    });
    w.appendChild(c);
    log.appendChild(w);
  }
  function clearChips() { Array.prototype.forEach.call(log.querySelectorAll(".askrevi-suggest"), function (n) { n.remove(); }); }
  function handoff() {
    var card = el("div", "askrevi-handoff",
      '<p class="askrevi-handoff-title">' + esc(COPY.handoffTitle) + '</p><p class="askrevi-handoff-body">' + esc(COPY.handoffBody) + "</p>" +
      '<a class="askrevi-button" href="' + esc(COPY.handoffUrl) + '">' + esc(COPY.handoffButton) + "</a>");
    card.querySelector("a").addEventListener("click", function () { track("askrevi_handoff_click"); });
    log.appendChild(card);
  }

  function renderTurn(t) {
    if (t.role === "visitor") { visitorRow(t.text); return; }
    if (t.kind === "welcome") { botRow("<p>" + esc(COPY.welcome) + "</p>"); return; }
    if (t.kind === "thanks") { botRow("<p>" + esc(COPY.thanks) + "</p>"); return; }
    if (t.kind === "nomatch") { botRow("<p>" + esc(COPY.noMatch) + "</p>"); handoff(); return; }
    var e = BYID[t.id]; if (!e) return;
    if (e.kind === "guide") {
      botRow("<p>" + esc(COPY.guide) + "</p><p><strong>" + esc(e.q) + "</strong></p>" + sourceLink(e));
      return;
    }
    botRow(e.a.map(renderBlock).join("") + sourceLink(e));
    if (e.cta) handoff();
  }
  function followUps() {
    clearChips();
    var last = history.turns[history.turns.length - 1];
    if (!last || last.kind === "welcome") { chips(DATA.starters, COPY.starters); return; }
    if (last.id && BYID[last.id]) {
      var rel = BYID[last.id].related.map(function (r) { return BYID[r] && BYID[r].q; }).filter(Boolean).slice(0, 2);
      chips(rel, COPY.related);
    }
  }
  function renderAll() {
    log.innerHTML = "";
    history.turns.forEach(renderTurn);
    followUps();
    scrollDown();
  }

  // ---------- Asking ----------
  var busy = false;
  function reply(q) {
    if (/^\s*(thanks|thank you|thx|ty|great|perfect|awesome|got it|ok(ay)?|cool)\b[\s.!]*$/i.test(q)) return { role: "bot", kind: "thanks" };
    if (/^\s*(hi|hello|hey|hiya|good (morning|afternoon|evening))\b[\s.!,]*$/i.test(q)) return { role: "bot", kind: "welcome" };
    var e = match(q);
    if (e) { track("askrevi_answer", { answer_id: e.id }); return { role: "bot", id: e.id }; }
    track("askrevi_no_match");
    return { role: "bot", kind: "nomatch" };
  }
  function ask(q) {
    q = String(q || "").trim().slice(0, 300);
    if (!q || busy || !DATA) return;
    busy = true;
    clearChips();
    history.turns.push({ role: "visitor", text: q });
    visitorRow(q);
    input.value = ""; send.disabled = true;
    var dots = el("div", "askrevi-row is-bot");
    dots.appendChild(el("span", "askrevi-avatar is-sm", I.mark));
    dots.appendChild(el("div", "askrevi-typing", "<span></span><span></span><span></span>"));
    dots.setAttribute("aria-hidden", "true");
    log.appendChild(dots); scrollDown();
    setTimeout(function () {
      dots.remove();
      var t = reply(q);
      logQuestion(q, t);
      history.turns.push(t);
      if (history.turns.length > 60) history.turns = history.turns.slice(-60);
      save();
      renderTurn(t);
      followUps();
      // keep the start of a long answer in view
      var rows = log.querySelectorAll(".askrevi-row.is-visitor");
      var lastQ = rows[rows.length - 1];
      if (lastQ && log.scrollHeight - lastQ.offsetTop > log.clientHeight) log.scrollTop = lastQ.offsetTop - 16; else scrollDown();
      busy = false;
    }, reduced ? 150 : 650);
  }

  // ---------- Open and close ----------
  var loading = null;
  function load() {
    if (DATA) return Promise.resolve();
    if (loading) return loading;
    loading = fetch(BASE + "answers.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { buildIndex(d); });
    return loading;
  }
  function open(focus) {
    load().then(function () {
      if (!history.turns.length) { history.turns.push({ role: "bot", kind: "welcome" }); }
      renderAll();
    }).catch(function () {
      log.innerHTML = ""; botRow("<p>" + esc(COPY.noMatch) + "</p>"); handoff();
    });
    root.classList.add("is-open");
    panel.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close chat");
    launcher.innerHTML = I.x + '<span class="askrevi-launcher-label">' + esc(COPY.launcher) + "</span>";
    if (phone()) document.documentElement.style.overflow = "hidden";
    history.open = true; save();
    if (focus !== false) setTimeout(function () { input.focus({ preventScroll: true }); }, 50);
    track("askrevi_open");
  }
  function close() {
    root.classList.remove("is-open");
    panel.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", COPY.title);
    launcher.innerHTML = I.chat + '<span class="askrevi-launcher-label">' + esc(COPY.launcher) + "</span>";
    document.documentElement.style.overflow = "";
    history.open = false; save();
    launcher.focus({ preventScroll: true });
  }

  launcher.addEventListener("click", function () { panel.classList.contains("is-open") ? close() : open(); });
  closeBtn.addEventListener("click", close);
  panel.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { ev.preventDefault(); close(); } });
  input.addEventListener("input", function () { send.disabled = !input.value.trim(); });
  form.addEventListener("submit", function (ev) { ev.preventDefault(); ask(input.value); });
  log.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest(".askrevi-source");
    if (a) track("askrevi_source_click", { answer_id: a.getAttribute("data-id") });
  });

  // Reopen after a page change if it was open (desktop only, phones start closed)
  if (history.open && !phone()) open(false);

  // Handy for testing in the browser console
  window.askrevi = { open: open, close: close, ask: function (q) { return load().then(function () { var e = match(q); return e ? e.id : null; }); } };
})();
