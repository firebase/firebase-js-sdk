---
"firebase": patch
"@firebase/firestore": patch
---

[fixed] Removed a delay that may have prevented Firestore from immediately
reestablishing a network connection if a connectivity change occurred while
the app was in the background.
