---
'@firebase/ai': patch
---

Fixed an issue where calling `getAI()` for an app and backend that already had an `AI` instance silently replaced that instance's options, so an instance created with `useLimitedUseAppCheckTokens: true` would start sending standard App Check tokens after a later `getAI()` call. `getAI()` now returns the existing instance unchanged when `useLimitedUseAppCheckTokens` is omitted or matches, and throws an `AIError` with code `already-initialized` when a different value is requested.
