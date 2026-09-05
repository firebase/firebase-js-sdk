---
'@firebase/messaging': patch
'firebase': patch
---

Remove the window `message` event listener and reset message handlers when the
messaging service is deleted, so a deleted instance is no longer retained in
memory.
