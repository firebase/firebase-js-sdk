---
'@firebase/firestore': patch
'firebase': patch
---

Fixed an issue where `documentSnapshotFromJSON()` and `querySnapshotFromJSON()` threw an error when the snapshot data or document path contained multi-byte UTF-8 characters (such as em-dashes, emoji, or accented characters). ([#10557](https://github.com/firebase/firebase-js-sdk/issues/10557))
