# ITPMS Log Encoder

A single-page tool that turns an informal client message — a Viber thread, a
screenshot pasted as text, a one-line request in Taglish — into the six-field
ITPMS log entry used for weekly monitoring:

```
[TYPE]; [MODULE ID]; [Description]; [DEPARTMENT ID]; [Challenge]; [Resolution]; NONE
```

Everything runs in the browser. No build step, no server, no network calls, and
no message ever leaves the device.

## Using it

**Encode here.** Paste the message, choose **Read message**, and the six fields
fill with drafts. Drafted fields are badged so you know what to check. The tool
scores keywords to pick the TYPE, MODULE ID, and DEPARTMENT ID, and shows which
words drove each choice. Numbers, dates, and names it spots become chips you can
click to append to the description.

**Or hand it to an assistant.** For long threads and screenshots, use **Copy the
standard** in the last section and paste it into Claude or another assistant,
followed by the client message. The standard is the source of truth for both
routes; the page reproduces it verbatim.

Saved entries collect under *This week's entries* in `localStorage`, and export
as one block of lines or as CSV for the monitoring sheet.

## What the tool guarantees

- All six fields present, or it names the ones still missing.
- Semicolons typed inside a field become commas, so a stray `;` cannot silently
  add a seventh field.
- Newlines and repeated whitespace collapse to single spaces.
- The trailing `; NONE` is appended automatically and cannot be edited.

## What it does not do

It drafts; it does not translate. The keyword reader picks the right codes
reliably, but a Taglish sentence comes through close to as written — cleaned of
greetings and politeness particles, with common `pa-` request forms mapped to
their verb (`pacancel` → `cancel`). Rewriting into formal English is still the
encoder's judgment, which is why every auto-filled field is marked **drafted**.

## Deploying to GitHub Pages

The repo is already a working site at its root; `index.html` is the entry point.

**With the included workflow (recommended).** Push to `main`, then in
**Settings → Pages** set *Source* to **GitHub Actions**. `.github/workflows/pages.yml`
publishes the repo root on every push.

**Without Actions.** In **Settings → Pages**, set *Source* to **Deploy from a
branch**, branch `main`, folder `/ (root)`.

To create the repo and push:

```sh
gh repo create itpms-log-encoder --public --source=. --remote=origin --push
```

## Editing the code lists

`assets/data.js` holds everything specific to your organisation:

| Constant | What it holds |
| --- | --- |
| `MODULES` | The eight module IDs, their scope text, and match cues |
| `DEPARTMENT_GROUPS` | The 33 department IDs, grouped for browsing only |
| `TYPES` | SUPPORT / INITIATIVE / MEETING and their cues |
| `QUICK_CHALLENGES`, `QUICK_RESOLUTIONS` | One-click chip text |

Each cue is `['phrase', weight]`. Weights are 8 for the code itself, 4–6 for a
phrase only that entry uses, and 1–2 for a supporting word that could belong to
more than one entry. The highest total wins; nothing matching leaves the field
empty rather than guessing.

Two things worth knowing about the standard itself: its second worked example
encodes the department as `RSG`, which is not in its own department list, so the
page leaves the department empty and prompts rather than forcing a wrong code.
The department *groupings* here are navigational — the standard lists all 33
codes flat.

## Files

```
index.html          markup and the encoding standard, verbatim
assets/styles.css   continuous-form ledger styling
assets/data.js      modules, departments, types, chip text
assets/app.js       reader, validator, week log
```
