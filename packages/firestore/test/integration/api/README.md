All tests in this directory are also run against our (minified)
firebase-firestore.js build (via 'yarn test:manual' under
firebase-js-sdk/integration/firestore/) and therefore must not have any
dependencies on src/ files.

API tests that need to use internal hooks (via src/ dependencies) should be
put in test/integration/api_internal instead.
