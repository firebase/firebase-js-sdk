---
'@firebase/firestore': patch
'firebase': patch
---

Fixed an issue where reads could hang after a page navigation in Safari on iPad, in Safari with "Request Desktop Website" turned on, in Safari 17 and newer on macOS, and in iOS app web views. The IndexedDB workaround for WebKit bug 226547 now applies to every WebKit browser instead of only those whose user agent reports version 14, 15 or 16.
