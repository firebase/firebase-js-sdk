---
'@firebase/firestore': patch
'firebase': patch
---

Check navigator.userAgent, in addition to navigator.appVersion, when determining whether to work around an IndexedDb bug in Safari. Add check for Mobile/# in addition to Version/# to include WKWebView safari versions in this check.
