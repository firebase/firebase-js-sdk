# Unreleased

## 0.7.1

### Patch Changes

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21

## 0.7.0

### Minor Changes

- [`ef33328f7`](https://github.com/firebase/firebase-js-sdk/commit/ef33328f7cb7d585a1304ed39649f5b69a111b3c) [#3904](https://github.com/firebase/firebase-js-sdk/pull/3904) - Add a useEmulator(host, port) method to Realtime Database

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

* [`602ec18e9`](https://github.com/firebase/firebase-js-sdk/commit/602ec18e92fd365a3a6432ff3a5f6a31013eb1f5) [#3968](https://github.com/firebase/firebase-js-sdk/pull/3968) - Updated the type definition for `ThenableReference` to only implement `then` and `catch`, which matches the implementation.

* Updated dependencies [[`ef33328f7`](https://github.com/firebase/firebase-js-sdk/commit/ef33328f7cb7d585a1304ed39649f5b69a111b3c), [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce), [`602ec18e9`](https://github.com/firebase/firebase-js-sdk/commit/602ec18e92fd365a3a6432ff3a5f6a31013eb1f5)]:
  - @firebase/database-types@0.6.0
  - @firebase/component@0.1.20
  - @firebase/util@0.3.3

## 0.6.13

### Patch Changes

- [`3d9b5a595`](https://github.com/firebase/firebase-js-sdk/commit/3d9b5a595813b6c4f7f6ef4e3625ae8856a9fa23) [#3736](https://github.com/firebase/firebase-js-sdk/pull/3736) - Fix detection of admin context in Realtime Database SDK

## 0.6.12

### Patch Changes

- [`d347c6ca1`](https://github.com/firebase/firebase-js-sdk/commit/d347c6ca1bcb7cd48ab2e4f7954cabafe761aea7) [#3650](https://github.com/firebase/firebase-js-sdk/pull/3650) - The SDK can now infer a default database URL if none is provided in the config.

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2

## 0.6.11

### Patch Changes

- Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089)]:
  - @firebase/util@0.3.1
  - @firebase/component@0.1.18

## 0.6.10

### Patch Changes

- [`ef348fed`](https://github.com/firebase/firebase-js-sdk/commit/ef348fed291338351706a697cbb9fb17a9d06ff4) [#3511](https://github.com/firebase/firebase-js-sdk/pull/3511) - Added interface `Database` which is implemented by `FirebaseDatabase`. This allows consumer SDKs (such as the Firebase Admin SDK) to export the database types as an interface.

- Updated dependencies [[`ef348fed`](https://github.com/firebase/firebase-js-sdk/commit/ef348fed291338351706a697cbb9fb17a9d06ff4)]:
  - @firebase/database-types@0.5.2

## 0.6.9

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17

## 0.6.8

### Patch Changes

- [`c2b737b2`](https://github.com/firebase/firebase-js-sdk/commit/c2b737b2187cb525af4d926ca477102db7835420) [#3228](https://github.com/firebase/firebase-js-sdk/pull/3228) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - [fix] Instead of using production auth, the SDK will use test credentials
  to connect to the Emulator when the RTDB SDK is used via the Firebase
  Admin SDK.

## 0.6.7

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
  - @firebase/logger@0.2.6
- [changed] Added internal HTTP header to the WebSocket connection.
- [feature] Added ServerValue.increment() to support atomic field value increments
  without transactions.
- [fixed] Fixed Realtime Database URL parsing bug to support domains with more than 3 components.

## 0.5.6

- [fixed] Fixed an issue that caused large numeric values with leading zeros to
  not always be sorted correctly.

## 0.5.3

- [changed] Internal cleanup to Node.JS support.

## 0.5.0

- [fixed] Fixed an issue that caused `.info/serverTimeOffset` events not to fire (#2043).
- [changed] Treat `ns` url query parameter as the default Realtime Database
  namespace name.

## 0.4.11

- [fixed] Fixed an issue where multi-byte UTF-8 characters would not be written correctly when using `firebase.js` or `firebase-database.js` (#2035).

## 0.4.0

- [changed] Improved consistency between the type annotations for `Query.on`/`Reference.on`,
  `Query.off`/`Reference.off` and `Query.once`/`Reference.once` (#1188, #1204).
