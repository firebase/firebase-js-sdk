---
'@firebase/messaging': patch
---

Fix delivery metrics Firelog flushing when BigQuery export is enabled: schedule the first flush immediately (next timer tick) instead of waiting a full `LOG_INTERVAL_IN_MS`, start processing only when there are queued events (so enabling export with an empty queue does not arm a day-long idle timer that blocks later `stageLog` flushes), and ensure staging a log starts the service when needed. When export is disabled, clear any queued events and cancel pending flush timers immediately (rather than waiting for the background loop).
