/* The module and department codes are not listed here — they are read out of
   the encoding standard in index.html (#promptSource), so that stays the single
   place to edit. Only the three log types and the providers live here. */

const TYPES = ['SUPPORT', 'INITIATIVE', 'MEETING'];

/* Providers. `kind` picks the request shape: 'gemini' uses generateContent,
   'openai' uses /chat/completions, which Groq, Mistral, Cerebras, Together and
   OpenRouter all speak. All of them allow browser calls, so a blocked provider
   can be swapped for a reachable one without touching code. */
const AI_PROVIDERS = [
  {
    id: 'gemini', kind: 'gemini', name: 'Google AI Studio (Gemini)',
    url: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.6-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    prefix: 'AIza', note: 'Free tier, no card required.'
  },
  {
    id: 'openrouter', kind: 'openai', name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'google/gemma-4-31b-it:free',
    keyUrl: 'https://openrouter.ai/keys',
    prefix: 'sk-or-', note: 'Models ending :free cost nothing.'
  },
  {
    id: 'groq', kind: 'openai', name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: '',
    keyUrl: 'https://console.groq.com/keys',
    prefix: 'gsk_', note: 'Free tier. Use List models to pick one that reads images.'
  },
  {
    id: 'mistral', kind: 'openai', name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: '',
    keyUrl: 'https://console.mistral.ai/api-keys',
    prefix: '', note: 'Free Experiment tier. Use List models to pick one.'
  },
  {
    id: 'custom', kind: 'openai', name: 'Custom (OpenAI-compatible)',
    url: '',
    defaultModel: '',
    keyUrl: '',
    prefix: '', note: 'Any endpoint that accepts POST /chat/completions.'
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
