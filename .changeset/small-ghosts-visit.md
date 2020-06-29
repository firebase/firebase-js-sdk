---
"firebase": patch
"@firebase/firestore": patch
---

Removed internal wrapper around our public API that was meant to prevent incorrect SDK usage for JavaScript users, but caused our SDK to stop working in IE11.
