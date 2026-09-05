---
'firebase': patch
'@firebase/firestore': patch
---

Fixed an issue where, on platforms without LocalStorage, every client was incorrectly considered "zombied" during primary lease arbitration, allowing a second persistence client to take over a live client's primary lease instead of failing with the exclusive-access error.
