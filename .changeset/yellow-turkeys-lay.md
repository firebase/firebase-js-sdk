---
"firebase": patch
"@firebase/firestore-types": patch
"@firebase/firestore": patch
"@firebase/webchannel-wrapper": patch
---

Adding experimentalAutoDetectLongPolling to FirestoreSettings.  It configures the SDK's 
underlying transport (WebChannel) to automatically detect if long-polling should be used.
This is very similar to `experimentalForceLongPolling`, but only uses long-polling if
required.
