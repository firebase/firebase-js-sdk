---
"firebase": patch
---

Escape unicodes when generating CDN scripts, so they work correctly in environments that requires UTF-8, for example, in Chrome extension.
