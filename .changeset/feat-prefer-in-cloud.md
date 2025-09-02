---
"@firebase/ai": minor
"firebase": minor
---

feat: Add `prefer_in_cloud` option for inference mode

This change introduces a new `InferenceMode` option, `prefer_in_cloud`. When this mode is selected, the SDK will attempt to use the cloud backend first. If the cloud call fails with a network-related error, it will fall back to the on-device model if available.

This also includes a refactoring of the logic for dispatching requests to either the on-device or cloud backends to improve clarity and remove duplication.
