---
"@firebase/firestore-types": minor
"@firebase/firestore": minor
"@firebase/webchannel-wrapper": minor
---

Adds a new `experimentalAutoDetectLongPolling` to FirestoreSettings.  When
enabled, the SDK's underlying transport (WebChannel) automatically detects if 
long-polling should be used. This is very similar to 
`experimentalForceLongPolling`, but only uses long-polling if required.
