---
"@firebase/ai": minor
"firebase": minor
---

Added a new `InferenceMode` option, `prefer_in_cloud`. When this mode is selected, the SDK will attempt to use the cloud backend first. If the cloud call fails with a network-related error, it will fall back to the on-device model if available.
