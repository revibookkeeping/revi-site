# Ask REVI, the website FAQ chat

A small chat window on revibookkeeping.com that answers questions using only the site's own copy.
No AI, no server, no subscriptions. Nothing a visitor types leaves their browser.

Design source: Figma, REVI Design System, Components page, "Website chat" section (light and dark).
Plumbing diagram: Figma, REVI SQS Website, Website page, REVI / CHATBOT section.

## Files

| File | What it is |
| --- | --- |
| `chat.js` | The chat window, the matching, and the preview switch |
| `chat.css` | Styles, built on the site tokens in `styles.css` and `dark.css`, so it follows light and dark mode |
| `answers.json` | Every question and answer the chat knows. Generated, don't edit by hand |
| `build_answers.py` | Builds `answers.json` word for word from the blocks in `blocks/`. Stops with an error if a quoted line is missing |

## On the site

One line in Squarespace, Settings > Advanced > Code Injection > Footer:

```html
<script src="https://revibookkeeping.github.io/revi-site/chat/chat.js" defer></script>
```

### Preview mode (the default)

The chat stays hidden for everyone until a browser opens the site with `?askrevi=on`, for example
`https://www.revibookkeeping.com/?askrevi=on`. That browser remembers it on every page after that.
`?askrevi=off` hides it again. Visitors never see it.

### Going public

Add `data-public="true"` to the same line. GA4 events start only in public mode:
`askrevi_open`, `askrevi_answer` (answer id), `askrevi_no_match`, `askrevi_source_click`, `askrevi_handoff_click`.
They never include what the visitor typed.

### Turning it off

Delete the line from Code Injection. Nothing else depends on it.

## Updating answers

1. Change the copy in Figma, then in the block file under `blocks/`, then in Squarespace (same as any copy change).
2. Run `python3 chat/build_answers.py` from the repo root.
3. Commit and push.
4. GitHub Pages publishes within a minute or two, and browsers keep a copy for 10 minutes, so changes show up
   on the site within about 15 minutes. Nothing to purge.

Why not jsDelivr: it held the old `@main` files after a purge (Oct 17, 2026) and tells browsers to keep them for 7 days.

New questions people ask in different words go in the `ask` list for that entry in `build_answers.py`,
or in the `EXTRA` table near the bottom of that file.
Topics the site doesn't cover (payroll, sales tax, short-term rentals, legal, loans) always go to the
Get in Touch card instead of a near-miss answer; that list is `OFF_TOPIC` in `chat.js`.

## Testing

`tests/questions.json` holds 765 visitor questions with the answer each should get (`null` means it should go to
the Get in Touch card). To run them on any page where the chat is loaded, paste this in the browser console:

```js
const c=(await fetch(document.querySelector('script[src*="chat.js"]').src.replace('chat.js','tests/questions.json')).then(r=>r.json())).cases;
let bad=[];for(const t of c){const g=await askrevi.ask(t.q);const ok=t.expect==='guide'?(g||'').startsWith('guide-'):g===t.expect;if(!ok)bad.push([t.q,g,t.expect]);}
console.log(c.length-bad.length+'/'+c.length);console.table(bad);
```

## Question log (private, in Notion)

Every question typed into the chat can be saved to the "Ask REVI Log" database in Notion
(Team REVI Bookkeeping > All Marketing Hub > Ask REVI: website chat questions). Nothing is stored in this repo.

- The chat blanks out emails, phone numbers and long numbers in the browser, then posts the question to a
  Google Apps Script web app (`logger/Code.gs`, deployed under julia@revibookkeeping.com).
- The script holds the Notion key in its Script Properties and adds one row per question. It stops after
  1,000 rows a day.
- `LOG_URL` near the top of `chat.js` holds the web app URL (deployed Oct 17, 2026). Empty it to stop logging. When it's on, the small
  print under the chat box says questions are saved and links to the Ask REVI section of the Privacy Policy.
- Setup steps and the privacy policy draft are on the Notion page.
