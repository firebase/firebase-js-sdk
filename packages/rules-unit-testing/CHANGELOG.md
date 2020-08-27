# @firebase/rules-unit-testing

## 1.0.0
### Major Changes



- [`980c7d539`](https://github.com/firebase/firebase-js-sdk/commit/980c7d53964cd28d6c6ad2ab4b859580997a476c) [#3378](https://github.com/firebase/firebase-js-sdk/pull/3378)  - Release `@firebase/rules-unit-testing` to replace the `@firebase/testing` package. The new
  package is API compatible but has the following breaking behavior changes:
  
    * `assertFails()` will now only fail on `PERMISSION DENIED` errors, not any error.
    * `initializeAdminApp()` now relies on `firebase-admin` rather than imitating the Admin SDK.

### Patch Changes

- Updated dependencies [[`67501b980`](https://github.com/firebase/firebase-js-sdk/commit/67501b9806c7014738080bc0be945b2c0748c17e)]:
  - firebase@7.19.0
