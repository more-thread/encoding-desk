#!/bin/sh
# Which AI providers can this network reach?
# Run on the machine you will actually encode from:  sh check-providers.sh

printf '%-14s %-9s %s\n' PROVIDER REACHABLE ENDPOINT
printf '%-14s %-9s %s\n' -------- --------- --------

check() {
  name=$1; url=$2
  code=$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)
  case "$code" in
    000|"") state="no" ;;
    *)      state="yes" ;;
  esac
  printf '%-14s %-9s %s\n' "$name" "$state" "$url"
}

check Gemini     https://generativelanguage.googleapis.com
check OpenRouter https://openrouter.ai/api/v1/chat/completions
check Groq       https://api.groq.com/openai/v1/chat/completions
check Mistral    https://api.mistral.ai/v1/chat/completions
check Cerebras   https://api.cerebras.ai/v1/chat/completions
check Together   https://api.together.xyz/v1/chat/completions

echo
echo 'Any row marked "yes" can be used. In the page: AI reader -> Set up,'
echo 'pick the provider (or Custom for one not listed), paste the key,'
echo 'then List models to choose one that reads images.'
