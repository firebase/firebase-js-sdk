---
'@firebase/functions': patch
---

Fixed a callable whose request fails before any HTTP response (connection lost, offline, blocked response) being reported as `functions/internal` with the message `internal`. It is now reported as `functions/unavailable` with the browser's own message (e.g. `Failed to fetch`, `Load failed`), so a lost connection can be told apart from a server failure.
