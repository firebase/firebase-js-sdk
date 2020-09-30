# @firebase/rules-unit-testing

## 1.0.5

### Patch Changes

- Updated dependencies [[`a6af7c279`](https://github.com/firebase/firebase-js-sdk/commit/a6af7c27925da47fa62ee3b7b0a267a272c52220)]:
  - firebase@7.22.0

## 1.0.4

### Patch Changes

- Updated dependencies [[`7bf73797d`](https://github.com/firebase/firebase-js-sdk/commit/7bf73797dfe5271b8f380ce4bd2497d8589f05d9)]:
  - firebase@7.21.1

## 1.0.3

### Patch Changes

- [`3d9b5a595`](https://github.com/firebase/firebase-js-sdk/commit/3d9b5a595813b6c4f7f6ef4e3625ae8856a9fa23) [#3736](https://github.com/firebase/firebase-js-sdk/pull/3736) - Fix detection of admin context in Realtime Database SDK

- Updated dependencies [[`f9004177e`](https://github.com/firebase/firebase-js-sdk/commit/f9004177e76f00fc484d30c0c0e7b1bc2da033f9)]:
  - firebase@7.21.0

## 1.0.2

### Patch Changes

- Updated dependencies [[`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/util@0.3.2
  - firebase@7.20.0

## 1.0.1

### Patch Changes

- [`e749ab8fc`](https://github.com/firebase/firebase-js-sdk/commit/e749ab8fcf8c371cd64fb7cfcaa8029bbacff849) [#3676](https://github.com/firebase/firebase-js-sdk/pull/3676) (fixes [#3671](https://github.com/firebase/firebase-js-sdk/issues/3671)) - Fix assertFails() logic of @firebase/rules-unit-testing

- Updated dependencies [[`61b4cd31b`](https://github.com/firebase/firebase-js-sdk/commit/61b4cd31b961c90354be38b18af5fbea9da8d5a3)]:
  - firebase@7.19.1

## 1.0.0

### Major Changes

- [`980c7d539`](https://github.com/firebase/firebase-js-sdk/commit/980c7d53964cd28d6c6ad2ab4b859580997a476c) [#3378](https://github.com/firebase/firebase-js-sdk/pull/3378) - Release `@firebase/rules-unit-testing` to replace the `@firebase/testing` package. The new
  package is API compatible but has the following breaking behavior changes:

  - `assertFails()` will now only fail on `PERMISSION DENIED` errors, not any error.
  - `initializeAdminApp()` now relies on `firebase-admin` rather than imitating the Admin SDK.

### Patch Changes

- Updated dependencies [[`67501b980`](https://github.com/firebase/firebase-js-sdk/commit/67501b9806c7014738080bc0be945b2c0748c17e)]:
  - firebase@7.19.0
