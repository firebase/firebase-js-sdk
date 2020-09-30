---
"firebase": patch
"@firebase/firestore-types": patch
"@firebase/firestore": patch
"@firebase/webchannel-wrapper": patch
---

Adds a new `experimentalAutoDetectLongPolling` to FirestoreSettings.  When
enabled, the SDK's underlying transport (WebChannel) automatically detects if 
long-polling should be used. This is very similar to 
`experimentalForceLongPolling`, but only uses long-polling if required.
