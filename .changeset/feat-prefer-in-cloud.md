---
"@firebase/ai": minor
"firebase": minor
---

Added a new `InferenceMode` option for the hybrid on-device capability: `prefer_in_cloud`. When this mode is selected, the SDK will attempt to use a cloud-hosted model first. If the call to the cloud-hosted model fails with a network-related error, the SDK will fall back to the on-device model, if it's available.
