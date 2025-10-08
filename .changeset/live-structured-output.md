---
"@firebase/ai": minor
"firebase": minor
---

feat(ai): add structured output support to Live API via LiveGenerationConfig

- Add `responseMimeType` and `responseSchema` to `LiveGenerationConfig` so Live sessions can request structured output (e.g., `application/json` or `text/x.enum`).
- Mirrors non-live `GenerationConfig` behavior and forwards config through the WebSocket setup message.
- Includes unit test to validate that structured output fields are present in the Live setup payload.
