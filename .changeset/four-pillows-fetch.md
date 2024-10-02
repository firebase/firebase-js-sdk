---
'@firebase/messaging': patch
---

The logging endpoint has been updated to ensure proper logging of WebPush entries. This resolves an issue where BigQuery logs were missing WebPush data. The payload structure has also been updated in alignment with the latest logging requirements as specified in go/firelog.
