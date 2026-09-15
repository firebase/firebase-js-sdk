---
'@firebase/remote-config': patch
'firebase': patch
---

Suppress false-positive `CONFIG_UPDATE_STREAM_ERROR` events emitted by `onConfigUpdated` when the application enters the background.
