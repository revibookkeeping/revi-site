/**
 * Ask REVI logger. Receives one question from the website chat and adds a row to the
 * "Ask REVI Log" database in Notion.
 *
 * Lives in Google Apps Script under julia@revibookkeeping.com. The Notion key is stored in
 * Project Settings > Script Properties as NOTION_TOKEN, never in this file or on the website.
 *
 * Deploy: Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 */

var DATABASE_ID = "139a6a3671df4b19b60ae60f090e0b09"; // Ask REVI Log (not secret)
var DAILY_CAP = 1000;   // stop writing after this many rows in a day (protects against spam)
var MAX_LEN = 300;      // the chat never sends longer questions than this

var RESULTS = { answered: "Answered", nomatch: "No match", greeting: "Greeting", thanks: "Thanks" };
var VISITORS = { "Flipper": 1, "Landlord": 1, "Both": 1, "Just looking": 1 };

function notion(method, path, body) {
  var res = UrlFetchApp.fetch("https://api.notion.com/v1/" + path, {
    method: method, contentType: "application/json", muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + token(), "Notion-Version": "2022-06-28" },
    payload: body ? JSON.stringify(body) : undefined
  });
  if (res.getResponseCode() >= 300) { console.error(res.getContentText()); return null; }
  return JSON.parse(res.getContentText());
}

// Thumbs up or down: find the row for this visit and question number, then set Helpful.
function saveFeedback(d) {
  if (typeof d.visit !== "string" || !d.visit || typeof d.turn !== "number" || typeof d.helpful !== "boolean") return "skip";
  if (!underCap()) return "cap";
  var q = { filter: { and: [
    { property: "Visit", rich_text: { equals: clip(d.visit, 40) } },
    { property: "Turn", number: { equals: d.turn } }
  ] }, page_size: 1 };
  for (var attempt = 0; attempt < 3; attempt++) {
    var found = notion("post", "databases/" + DATABASE_ID + "/query", q);
    if (found && found.results && found.results.length) {
      notion("patch", "pages/" + found.results[0].id, { properties: { "Helpful": { select: { name: d.helpful ? "Yes" : "No" } } } });
      return "ok";
    }
    Utilities.sleep(1500); // the question row may still be on its way
  }
  return "missing";
}

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (d.v === 1 && d.type === "feedback") return reply(saveFeedback(d));
    if (d.v !== 1 || typeof d.q !== "string" || !d.q.trim()) return reply("skip");
    if (!RESULTS[d.result]) return reply("skip");
    if (!underCap()) return reply("cap");

    var props = {
      "Question": { title: [{ text: { content: clip(d.q, MAX_LEN) } }] },
      "Result": { select: { name: RESULTS[d.result] } },
      "Answer ID": { rich_text: d.answerId ? [{ text: { content: clip(d.answerId, 80) } }] : [] },
      "Page": { rich_text: [{ text: { content: clip(d.page || "/", 200) } }] },
      "Device": { select: { name: d.device === "phone" ? "Phone" : "Desktop" } },
      "Visit": { rich_text: [{ text: { content: clip(d.visit || "", 40) } }] },
      "Turn": { number: typeof d.turn === "number" ? d.turn : null },
      "Mode": { select: { name: d.mode === "public" ? "Public" : "Preview" } },
      "Blanked": { checkbox: !!d.blanked }
    };
    if (d.answer) props["Answer"] = { select: { name: clip(d.answer, 100).replace(/,/g, "") } };
    if (VISITORS[d.visitor]) props["Visitor"] = { select: { name: d.visitor } };

    var res = UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + token(),
        "Notion-Version": "2022-06-28"
      },
      payload: JSON.stringify({ parent: { database_id: DATABASE_ID }, properties: props }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) console.error(res.getContentText());
    return reply("ok");
  } catch (err) {
    console.error(err);
    return reply("error");
  }
}

// Visiting the web app URL in a browser shows this, handy to check the deployment is live.
function doGet() { return reply("Ask REVI logger is running."); }

function underCap() {
  var key = "count-" + Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd");
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var store = PropertiesService.getScriptProperties();
    var n = Number(store.getProperty(key) || 0);
    if (n >= DAILY_CAP) return false;
    store.setProperty(key, String(n + 1));
    return true;
  } finally { lock.releaseLock(); }
}

function token() { return String(PropertiesService.getScriptProperties().getProperty("NOTION_TOKEN") || "").trim(); }

// One-time setup if the Script Properties screen won't save: paste the Notion key between the quotes,
// run saveKey once, then put the placeholder back.
function saveKey() {
  var key = "PASTE_KEY_HERE";
  if (key === "PASTE_KEY_HERE") throw new Error("Paste the Notion key between the quotes first.");
  PropertiesService.getScriptProperties().setProperty("NOTION_TOKEN", key.trim());
  checkKey();
}

// Says whether the saved key looks right, without printing it.
function checkKey() {
  var t = token();
  console.log("Key saved: " + (t ? "yes" : "no") + ", length " + t.length + ", starts like a Notion key: " + /^(ntn_|secret_)/.test(t));
}

function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n) : s; }
function reply(t) { return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.TEXT); }

// Run testLog, then testFeedback, from the editor to check the Notion connection.
function testFeedback() {
  console.log(saveFeedback({ v: 1, type: "feedback", visit: "test", turn: 1, helpful: true }));
}

// Run this once from the editor (select testLog, click Run) to check the Notion connection.
function testLog() {
  var out = doPost({ postData: { contents: JSON.stringify({
    v: 1, q: "Test from the Apps Script editor", result: "answered", answerId: "faq-pricing",
    answer: "How does pricing work?", page: "/", device: "desktop", visit: "test", turn: 1, mode: "preview", visitor: "Flipper"
  }) } });
  console.log(out.getContent());
}
