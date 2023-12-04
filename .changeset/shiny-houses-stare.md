---
'@firebase/app-check': patch
---

Prevent App Check from logging "uncaught" cancelled promises. The cancelled promises are part of App Check's expected behavior, and their cancellation wasn't intended to produce errors or warnings. See issue #7805.
