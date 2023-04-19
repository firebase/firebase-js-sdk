---
'@firebase/analytics': minor
'firebase': minor
---

Add method `getGoogleAnalyticsClientId()` to retrieve an unique identifier for a web client. This allows users to log purchase and other events from their backends using Google Analytics 4 Measurement Protocol and to have those events be connected to actions taken on the client within their Firebase web app. `getGoogleAnalyticsClientId()` will simplify this event recording process.
