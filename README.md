# ITPMS Log Encoder

Paste a screenshot of a chat, or the conversation as text, and get the six-field
ITPMS log entry for weekly monitoring:

```
[TYPE]; [MODULE ID]; [Description]; [DEPARTMENT ID]; [Challenge]; [Resolution]; NONE
```

One page, one job. No build step and no server — a static site on GitHub Pages.

**Live: https://more-thread.github.io/itpms-log-encoder/**

## Using it

Paste a screenshot with `Cmd/Ctrl + V`, drop an image on the box, or type the
conversation. Then choose **Encode**. The result appears as a single line you
can copy, with **Show fields** for a field-by-field breakdown.

Up to four screenshots per entry, so a thread split across several captures still
encodes as one record. Images are downscaled to a 2000px long edge and sent as
JPEG — small enough to be quick, large enough to stay readable.

## Two readers

**AI reader.** Handles screenshots and text. The model receives your encoding
standard verbatim, straight from the page, plus the allowed code lists, and
returns the six fields written as formal English. Needs a free API key.

**On-device reader.** Text only, no network. Picks the TYPE, MODULE ID and
DEPARTMENT ID by weighted keyword matching. It drafts rather than translates, so
Taglish comes through close to as written — cleaned of greetings and politeness
particles, with common `pa-` request forms mapped to their verb (`pacancel` →
`cancel`). It runs automatically when no key is set, and as the fallback whenever
an AI call fails, so the page never dead-ends. Screenshots have no offline path
and will say so.

## Setting up the AI reader

Open **AI reader → Set up** at the bottom of the page.

| Provider | Free tier | Get a key | Default model |
| --- | --- | --- | --- |
| Google AI Studio | Yes, no card required | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `gemini-2.5-flash` |
| OpenRouter | Models ending `:free` | [openrouter.ai/keys](https://openrouter.ai/keys) | `google/gemini-2.0-flash-exp:free` |

Paste the key, choose **Save key**, then **Test connection**. The model field is
editable — model names change, and if one is retired or rate-limited you can
point at another without touching code. For screenshots the model must support
image input; both defaults do.

**Where the key lives.** In this browser's `localStorage`, on your machine only.
Never committed, never sent anywhere except the provider you chose. Anyone who
can use this browser profile can read it, so do not set it up on a shared
machine. **Forget key** removes it.

**What gets sent.** Encoding sends the pasted text and any screenshots to the
provider. For conversations carrying employee numbers, names or case details that
is a real data-handling decision — check it against your own policy. Free tiers
in particular may use submitted content to improve models.

## Guarantees

- Semicolons typed inside a field become commas, so a stray `;` cannot add a
  seventh field.
- Newlines and repeated whitespace collapse to single spaces.
- The trailing `; NONE` is always appended.
- Module and department are constrained to a JSON schema whose enums are your
  actual codes. Anything outside the lists is rejected and the field is left
  empty with a note, so a plausible-sounding `CANTEEN` never lands in place of
  `CTN`. Codes the message does not support come back as `UNKNOWN` and stay
  empty rather than being guessed.
- Any failure — bad key, quota, timeout, blocked content — states the reason and
  falls back to the on-device reader when there is text to work with.

## Editing the code lists

`assets/data.js` holds everything specific to your organisation:

| Constant | What it holds |
| --- | --- |
| `MODULES` | The eight module IDs, their scope text, and match cues |
| `DEPARTMENT_GROUPS` | The 33 department IDs |
| `TYPES` | SUPPORT / INITIATIVE / MEETING and their cues |
| `AI_PROVIDERS` | Providers, default models and key links |

Each cue is `['phrase', weight]`, used only by the on-device reader. Weights are
8 for the code itself, 4–6 for a phrase only that entry uses, and 1–2 for a
supporting word. The AI reader instead gets the code lists as schema enums.

The encoding standard itself lives in `index.html` as `#promptSource` and is the
system prompt verbatim — edit it there and both readers follow.

One note on the standard: its second worked example encodes the department as
`RSG`, which is not in its own department list, so that code is rejected and the
field is left empty rather than forced.

## Deploying

`index.html` at the repo root is the whole site. Push to `main` and
`.github/workflows/pages.yml` publishes it; Pages is set to **GitHub Actions** as
the source.

## Files

```
index.html          markup, and the encoding standard as the system prompt
assets/styles.css   continuous-form ledger styling
assets/data.js      modules, departments, types, AI providers
assets/app.js       screenshot handling, both readers, result rendering
```
