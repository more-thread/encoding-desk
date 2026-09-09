# Encoding Desk

Paste a screenshot of a chat, or the conversation as text, and get the six-field
log entry for weekly monitoring:

```
[TYPE]; [MODULE ID]; [Description]; [DEPARTMENT ID]; [Challenge]; [Resolution]; NONE
```

One page, one job. No build step and no server — a static site on GitHub Pages.

**Live: https://more-thread.github.io/encoding-desk/**

## Using it

Paste a screenshot with `Cmd/Ctrl + V`, drop an image on the box, or type the
conversation. Then choose **Encode**. The result appears as a single line you
can copy, with **Show fields** for a field-by-field breakdown.

Up to four screenshots per entry, so a thread split across several captures still
encodes as one record. Images are downscaled to a 2000px long edge and sent as
JPEG — small enough to be quick, large enough to stay readable.

## How it reads

The model receives your encoding standard verbatim, straight from the page, and
works out from context which module the request is about, whether it is a
SUPPORT, INITIATIVE or MEETING entry, and which department raised it. There is
no keyword matching and no second reader — you send the input, the model returns
the six fields, and the page checks and formats them.

An API key is therefore required. Without one the page says so and opens the
setup panel.

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
- When nothing in the message states an outcome, the model follows the worked
  example in the standard and writes `For weekly monitoring`. Change that
  example inside `#promptSource` if your sheet expects other wording.
- Module and department are constrained to a JSON schema whose enums are your
  actual codes. Anything outside the lists is rejected and the field is left
  empty with a note, so a plausible-sounding `CANTEEN` never lands in place of
  `CTN`. Codes the message does not support come back as `UNKNOWN` and stay
  empty rather than being guessed.
- Any failure — bad key, quota, timeout, blocked content — states the reason
  plainly instead of producing a half-filled entry.

## Editing the codes

The encoding standard in `index.html` (`#promptSource`) is the only place codes
are defined. It is the system prompt verbatim, and the page also reads the code
lists back out of it — every `- CODE: description` line under
`# Supported MODULE IDs` and `# Supported DEPARTMENT IDs` becomes an allowed
value in the response schema.

So adding a module means adding one line to that standard. Nothing else to keep
in step. If those headings are ever renamed the page disables **Encode** and
says why, rather than quietly accepting an empty list.

`assets/data.js` holds only the three log types and the provider list.

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
assets/data.js      log types and AI providers
assets/app.js       screenshot handling, the AI call, result rendering
```
