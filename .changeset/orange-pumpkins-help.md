---
'@firebase/remote-config': patch
'firebase': patch
---

Suppress false-positive `CONFIG_UPDATE_STREAM_ERROR` events emitted by `onConfigUpdated` when the application enters the background, stop recording a connection backoff penalty for these expected closes, and reconnect if the application returns to the foreground before the connection finishes closing.
