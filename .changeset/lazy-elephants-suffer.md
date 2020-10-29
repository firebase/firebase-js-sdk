---
'@firebase/rules-unit-testing': minor
---

Add withFunctionTriggersDisabled function which runs a user-provided setup function with emulated Cloud Functions triggers disabled. This can be used to import data into the Realtime Database or Cloud Firestore emulators without triggering locally emulated Cloud Functions. This method only works with Firebase CLI version 8.13.0 or higher.
