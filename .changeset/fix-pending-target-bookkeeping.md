---
'@firebase/firestore': patch
---

Fix watch stream pending target bookkeeping to prevent fatal crash caused by React 19 StrictMode double-invoking effects during stream reconnection.
