---
'@firebase/installations': patch
---

Improved the detection of invalid `FirebaseOptions` values. During initialization of Firebase, your application must provide valid values for the following Firebase options: `API key` and `application ID`. If any required value is missing or if a provided value is invalid, `installations` throws a `FirebaseError`. For more details, visit [Troubleshoot initialization options](https://firebase.google.com/support/privacy/init-options).
