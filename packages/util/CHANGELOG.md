# @firebase/util

## 0.3.3

### Patch Changes

- [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487) [#3932](https://github.com/firebase/firebase-js-sdk/pull/3932) - Point browser field to esm build. Now you need to use default import instead of namespace import to import firebase.

  Before this change

  ```
  import * as firebase from 'firebase/app';
  ```

  After this change

  ```
  import firebase from 'firebase/app';
  ```

* [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce) [#3946](https://github.com/firebase/firebase-js-sdk/pull/3946) - Write template data to a new `customData` field in`FirebaseError` instead of writing to the error object itself to avoid overwriting existing fields.

## 0.3.2

### Patch Changes

- [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290) [#2800](https://github.com/firebase/firebase-js-sdk/pull/2800) - Moved `calculateBackoffMillis()` exponential backoff function from remote-config to util,
  where it can be shared between packages.

## 0.3.1

### Patch Changes

- [`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089) [#3585](https://github.com/firebase/firebase-js-sdk/pull/3585) - Extended Usage of `isIndexedDBAvailable` to Service Worker

## 0.3.0

### Minor Changes

- [`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c) [#3472](https://github.com/firebase/firebase-js-sdk/pull/3472) - - Fix an error where an analytics PR included a change to `@firebase/util`, but
  the util package was not properly included in the changeset for a patch bump.

  - `@firebase/util` adds environment check methods `isIndexedDBAvailable`
    `validateIndexedDBOpenable`, and `areCookiesEnabled`.
