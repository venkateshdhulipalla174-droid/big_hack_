# K-SMART API Contract v1
 
Status: **FROZEN after merge.** Any change needs a PR approved by all four members.
 
- Base URL (local): `http://localhost:8000`
- All bodies are JSON, UTF-8. Field names are `snake_case`.
- Missing values are `null`, never omitted.
- CORS: allow `http://localhost:5173` (Vite dev server).
- LLM provider: Gemini API. The API key lives **only** in the backend `.env` (`GEMINI_API_KEY`). It must never appear in frontend code or in a commit.
- Model ID is read from config (`GEMINI_MODEL` in `.env`). Never hardcode it in code or in this file.
---
 
## GET /api/v1/health
 
Response 200:
 
```json
{
  "status": "ok",
  "llm_reachable": true,
  "model": "<gemini-model-id>"
}
```
 
---
 
## POST /api/v1/chat
 
Runs the optimizer (if enabled), then sends the chosen prompt to Gemini.
 
### Request
 
```json
{
  "prompt": "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೇನು?",
  "optimize": true,
  "include_candidates": true
}
```
 
| Field                | Type    | Required | Notes                                                  |
|----------------------|---------|----------|--------------------------------------------------------|
| `prompt`             | string  | yes      | Non-empty, max 4000 characters                         |
| `optimize`           | boolean | no       | Default `true`. `false` = baseline run (experiment E0) |
| `include_candidates` | boolean | no       | Default `true`. `false` = smaller response             |
 
### Response 200
 
```json
{
  "original_prompt": "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೇನು?",
  "optimized_prompt": "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೇನು?",
  "chosen_candidate": "normalized",
  "candidates": [
    {
      "name": "original",
      "text": "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೇನು?",
      "tokens": 24,
      "guard_passed": true,
      "guard_failures": []
    },
    {
      "name": "normalized",
      "text": "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೇನು?",
      "tokens": 22,
      "guard_passed": true,
      "guard_failures": []
    }
  ],
  "tokens": {
    "tokenizer": "gemini-countTokens",
    "original_input": 24,
    "optimized_input": 22,
    "saved": 2,
    "saved_percent": 8.3,
    "llm_prompt_tokens": 40,
    "llm_output_tokens": 180,
    "llm_thinking_tokens": 0,
    "llm_total_tokens": 220
  },
  "response": "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಎಂದರೆ ...",
  "latency_ms": {
    "optimizer": 350,
    "llm": 1180,
    "total": 1530
  },
  "model": "<gemini-model-id>",
  "error": null
}
```
 
The numbers above are illustrative placeholders, **not** experimental results.
 
### Field notes
 
| Field                       | Source / meaning                                                                 |
|-----------------------------|----------------------------------------------------------------------------------|
| `chosen_candidate`          | Name of the winning candidate. `"original"` if nothing beat it or the guard rejected all others |
| `candidates[].tokens`       | Token count of that candidate's text from the Gemini `countTokens` API           |
| `candidates[].guard_failures` | Machine-readable reasons, e.g. `number_missing`, `negation_lost`, `name_changed`, `date_changed` |
| `tokens.original_input`     | `countTokens` on the raw original prompt only (no system prompt, no template)    |
| `tokens.optimized_input`    | `countTokens` on the chosen candidate only                                       |
| `tokens.saved_percent`      | `(original_input - optimized_input) / original_input * 100`, rounded to 1 decimal |
| `tokens.llm_prompt_tokens`  | `usage_metadata.prompt_token_count` from the generate call                       |
| `tokens.llm_output_tokens`  | `usage_metadata.candidates_token_count` (does **not** include thinking tokens)   |
| `tokens.llm_thinking_tokens`| `usage_metadata.thoughts_token_count`, `0` if the model does not report it       |
| `tokens.llm_total_tokens`   | `usage_metadata.total_token_count`                                               |
| `latency_ms.optimizer`      | Includes the network time of `countTokens` calls; report it separately from LLM time |
| `latency_ms.llm`            | Time of the generate call only                                                   |
 
When `optimize` is `false`: `optimized_prompt` equals `original_prompt`, `chosen_candidate` is `"original"`, and `candidates` contains only `original` (or is empty if `include_candidates` is `false`).
 
---
 
## POST /api/v1/optimize
 
Runs the optimizer only. **No LLM call.**
 
- Request: same as `/chat`.
- Response: same shape as `/chat`, except `response`, `latency_ms.llm`, and all `tokens.llm_*` fields are `null`.
- Used by the evaluation scripts, and by the UI for a "preview" before sending.
---
 
## Errors
 
Every non-2xx response uses this shape:
 
```json
{
  "error": {
    "code": "llm_timeout",
    "message": "Gemini did not respond in 60s",
    "retry_after_s": null
  }
}
```
 
| HTTP | `code`            | When                                                  |
|------|-------------------|-------------------------------------------------------|
| 422  | `invalid_request` | Empty or too long prompt, malformed JSON              |
| 429  | `rate_limited`    | Gemini quota exceeded. Set `retry_after_s` if known   |
| 500  | `optimizer_error` | Exception inside the `ksmart` core package            |
| 502  | `llm_unavailable` | Gemini API unreachable, bad key, or model not found   |
| 504  | `llm_timeout`     | Generate call exceeded 60 seconds                     |
 
---
 
## Rules
 
1. **Never mix token sources in one number.** `original_input`, `optimized_input` and `saved_percent` come from `countTokens` on the raw prompt. The `llm_*` fields come from the generate call's usage metadata and include any system instruction or template overhead. Do not subtract one from the other.
2. **Thinking tokens are reported separately.** Use the same thinking configuration for every experiment. If the model cannot be configured, say so in `docs/methodology.md`.
3. **Candidate names are fixed:** `original`, `normalized`, `numerals`, `concise`, `romanized`, `translated`. New names need a contract change.
4. **Selection rule:** choose the candidate with the fewest `tokens` among those with `guard_passed: true`. Ties go to the earlier candidate in the list above.
5. **Determinism:** use `temperature = 0` for all experiments. Outputs can still vary between runs, so keep a run ID in the logs.
6. **Rate limits:** retry `429` and `5xx` from Gemini with exponential backoff (max 3 attempts) inside the backend before returning an error.
7. **Caching:** `countTokens` results are cached by SHA-256 of the text, so repeated runs make no repeat calls.
8. **Logging:** the backend must never log the API key.
---
 
## Change log
 
| Version | Date | Change        |
|---------|------|---------------|
| v1      |      | Initial draft |
