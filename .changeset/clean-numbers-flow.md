---
"@firebase/analytics": minor
"firebase": minor
---

Issue 2393 fix - analytics module

- Added a public method `isSupported` to Analytics module which returns true if current browser context supports initialization of analytics module.
- Added runtime checks to Analytics module that validate if cookie is enabled in current browser and if current browser environment supports indexedDB functionalities. 
