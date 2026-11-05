---
'firebase': patch
---

Fixed the Crashlytics CDN bundle (`firebase-crashlytics.js`), which imported Node.js built-in modules such as `fs` and `zlib` and failed to load in browsers.
