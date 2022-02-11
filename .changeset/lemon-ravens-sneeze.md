---
"@firebase/firestore": patch
---

Queries are now send to the backend before the SDK starts local processing, which reduces overall Query latency.
