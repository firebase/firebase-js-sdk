---
'@firebase/rules-unit-testing': minor
---

Release `@firebase/rules-unit-testing` to replace the `@firebase/testing` package. The new
package is API compatible but has the following breaking behavior changes:

  * `assertFails()` will now only fail on `PERMISSION DENIED` errors, not any error.
  * `initializeAdminApp()` now relies on `firebase-admin` rather than imitating the Admin SDK.
