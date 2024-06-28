---
'firebase': minor
'@firebase/app': minor
---

The `FirebaseServerAppSettings.name` field inherited from `FirebaseAppSettings` is now omitted
instead of overloading the value as `undefined`. This fixes a TypeScript compilation error. For more
information, see [GitHub Issue #8336](https://github.com/firebase/firebase-js-sdk/issues/8336).
