---
"@firebase/firestore": patch
---

Fix internal assertion due to Buffer value not evaluating to instanceof Uint8Array, encountered when testing with jsdom.
