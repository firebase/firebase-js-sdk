---
'@firebase/firestore': patch
'firebase': patch
---

Fixed watch stream pending target bookkeeping to prevent crashes during rapid unlisten/listen cycles (e.g. React 19 StrictMode).
