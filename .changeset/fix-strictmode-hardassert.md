---
'@firebase/firestore': patch
'firebase': patch
---

Fix fatal `hardAssert` crash in `TargetState.recordTargetResponse()` when React 19 StrictMode causes overlapping target responses. The SDK now clamps `pendingResponses` to zero and logs a warning instead of permanently poisoning the Firestore instance.
