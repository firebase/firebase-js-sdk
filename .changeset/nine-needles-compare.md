---
"@firebase/firestore": patch
---

The SDK no longer accesses IndexedDB during a page unload event on Safari 14. This aims to reduce the occurrence of an IndexedDB bug in Safari (https://bugs.webkit.org/show_bug.cgi?id=226547).
