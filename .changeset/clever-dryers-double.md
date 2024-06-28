---
'@firebase/app': patch
'firebase': patch
---

Guard the use of `FinalizationRegistry` in `FirebaseServerApp` initialization based on the availability of `FinalizationRegistry` in the runtime.
