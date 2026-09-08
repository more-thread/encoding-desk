# ITPMS Log Encoder

A single-page tool that turns an informal client message — a Viber thread, a
screenshot pasted as text, a one-line request in Taglish — into the six-field
ITPMS log entry used for weekly monitoring:

```
[TYPE]; [MODULE ID]; [Description]; [DEPARTMENT ID]; [Challenge]; [Resolution]; NONE
```

No build step and no server — it is a static page. It ships two readers: an
**AI reader** that calls a free model with your own API key, and an **offline
reader** that never makes a network request. Only the AI reader sends anything
anywhere, and only when you choose it.

## Using it

**Read with AI.** Paste the message and choose **Read with AI**. The model gets
the encoding standard verbatim — the same text this page displays — plus the
allowed code lists, and returns the six fields already written as formal
English. Fields it filled are badged *AI draft*. Needs a free API key, set up
once; see below.

**Read without AI.** A keyword reader that runs entirely offline. It picks the
TYPE, MODULE ID and DEPARTMENT ID by weighted cue matching and shows which words
drove each choice, but it drafts rather than translates — Taglish comes through
close to as written. This is also the automatic fallback whenever an AI call
fails, so the page never leaves you stuck.

**Copy the standard.** For long threads or screenshots you would rather paste
somewhere else, **Copy the standard** in the last section gives you the prompt
to use in any assistant.

Either reader fills the same six cells, which you correct before copying.
Numbers, dates and names spotted in the message become chips you can click to
append to the description. Saved entries collect under *This week's entries* in
`localStorage`, and export as one block of lines or as CSV.

## Setting up the AI reader

Open **AI reader → Set up** under the paste box.

| Provider | Free tier | Get a key | Default model |
| --- | --- | --- | --- |
| Google AI Studio | Yes, no card required | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `gemini-2.5-flash` |
| OpenRouter | Models ending `:free` | [openrouter.ai/keys](https://openrouter.ai/keys) | `google/gemini-2.0-flash-exp:free` |

Paste the key, choose **Save key**, then **Test connection** to confirm the model
answers in the right shape. The model field is editable — model names change, and
if one is retired or rate-limited you can point at another without touching code.

**Where the key lives.** In this browser's `localStorage`, on your machine only.
It is never committed to the repository and never sent anywhere except the
provider you chose. Anyone who can use this browser profile can read it, so do
not set it up on a shared machine. **Forget key** removes it.

**What gets sent.** Reading with AI sends the pasted message to the provider.
For messages carrying employee numbers, names or case details, that is a real
data-handling decision — check it against your own policy, and use *Read without
AI* when the message should not leave the device. Free tiers in particular may
use submitted content to improve models; read the provider's terms.

**Guardrails.** The model is constrained to a JSON schema whose module and
department fields are enums of your actual codes. Anything outside those lists is
rejected and the field is left empty with a note, so a plausible-sounding code
like `CANTEEN` never reaches the record in place of `CTN`. Codes the message does
not support come back as `UNKNOWN` and stay empty rather than being guessed. On
any error — bad key, quota, timeout, blocked content — the page states the reason
and falls back to the offline reader.

## What the tool guarantees

- All six fields present, or it names the ones still missing.
- Semicolons typed inside a field become commas, so a stray `;` cannot silently
  add a seventh field.
- Newlines and repeated whitespace collapse to single spaces.
- The trailing `; NONE` is appended automatically and cannot be edited.

## Limits of the offline reader

The offline reader drafts; it does not translate. It picks the codes reliably,
but a Taglish sentence comes through close to as written — cleaned of greetings
and politeness particles, with common `pa-` request forms mapped to their verb
(`pacancel` → `cancel`). Rewriting into formal English is what the AI reader is
for. Either way every auto-filled field carries a badge, because both readers
draft and neither decides.

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
| `AI_PROVIDERS` | Providers, default models and key links |

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
assets/app.js       readers (AI and offline), validator, week log
```
