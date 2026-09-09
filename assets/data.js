/* The module and department codes are not listed here — they are read out of
   the encoding standard in index.html (#promptSource), so that stays the single
   place to edit. Only the three log types and the providers live here. */

const TYPES = ['SUPPORT', 'INITIATIVE', 'MEETING'];

/* Free-tier AI providers. Keys live in the browser only — see the AI panel.
   Model names move fast; both fields are editable in the UI. */
const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google AI Studio (Gemini)',
    defaultModel: 'gemini-3.6-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    prefix: 'AIza',
    note: 'Free tier, no card required.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultModel: 'google/gemma-4-31b-it:free',
    keyUrl: 'https://openrouter.ai/keys',
    prefix: 'sk-or-',
    note: 'Models ending in :free cost nothing.'
  }
];

/* Model IDs get retired and a saved setting would then fail on every call with
   a message about the model, not the key. Map the old ID to its replacement so
   an existing setup keeps working. */
const RETIRED_MODELS = {
  'gemini-2.5-flash': 'gemini-3.6-flash',
  'gemini-2.0-flash': 'gemini-3.6-flash',
  'google/gemini-2.0-flash-exp:free': 'google/gemma-4-31b-it:free'
};
