---
'@firebase/firestore': patch
'firebase': patch
---

Fixed an issue where Firestore stopped working with `INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)` after iOS closed the IndexedDB connection of a backgrounded page or WKWebView (for example, "Attempt to get a record from database without an in-progress transaction"). These errors are now reported as failed IndexedDB transactions, which Firestore retries or recovers from, instead of failing the AsyncQueue (#8250).
