---
'@firebase/crashlytics': minor
---

Add client-side session sampling: the SDK fetches the app's telemetry configuration, drops telemetry for unsampled sessions on-device, and stamps session.sampling.rate on exported logs and spans.
