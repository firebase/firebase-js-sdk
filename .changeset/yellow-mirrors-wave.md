---
'@firebase/messaging': minor
---

Fix delivery metrics Firelog flushing when BigQuery export is enabled by starting the logging service when toggling export on or staging a log event, and by scheduling the first flush immediately (next timer tick) instead of waiting a full LOG_INTERVAL_IN_MS.
