---
"@firebase/firebase": patch
"@firebase/analytics": patch 
---

Added Browser Extension check for Firebase Analytics. analytics.isSupported() will now return Promise<false> for extension environments. 
