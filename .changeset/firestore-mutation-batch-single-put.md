---
'@firebase/firestore': patch
---

Write each mutation batch to IndexedDB once instead of once per document in the batch. Committing a large `WriteBatch` with persistence enabled no longer blocks the main thread for time proportional to the number of documents times the batch size.
