---
"@firebase/firestore": patch
"@firebase/webchannel-wrapper": patch
---

Fix an issue where Firestore was incorrectly using XHR instead of fetch for streaming response.
