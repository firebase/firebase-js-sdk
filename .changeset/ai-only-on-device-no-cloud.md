---
'@firebase/ai': minor
'firebase': minor
---

Fixed `InferenceMode.ONLY_ON_DEVICE` sending requests to the cloud when the on-device model API isn't available (for example, in browsers without Chrome's `LanguageModel` API, or in Node). `generateContent()`, `generateContentStream()`, chat, and `initializeDeviceModel()` now throw an `AIError` with code `API_NOT_ENABLED`, and `countTokens()` throws its existing `UNSUPPORTED` error.

In `ONLY_ON_DEVICE` mode, inference methods also now throw an `AIError` with the new code `DEVICE_MODEL_NOT_INITIALIZED` if the on-device model needs to be downloaded and `initializeDeviceModel()` hasn't been called to start the download.
