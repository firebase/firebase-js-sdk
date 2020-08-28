# @firebase/rules-unit-testing

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
