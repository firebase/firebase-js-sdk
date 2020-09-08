---
'@firebase/analytics': minor
'@firebase/analytics-types': minor
'@firebase': minor
---

Analytics now dynamically fetches the app's Measurement ID from the Dynamic Config backend
instead of depending on the local Firebase config. It will fall back to any `measurementId`
value found in the local config if the Dynamic Config fetch fails.
