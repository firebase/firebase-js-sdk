All tests in this directory are also run against our (minified)
firebase-firestore.js build (via 'yarn test:manual' under
firebase-js-sdk/integration/firestore/) and therefore must not have any
dependencies on src/ files.

API tests that need to use internal hooks (via src/ dependencies) should be
put in test/integration/api_internal instead.

The line "import * as firebaseExport from '../util/firebase_export';" is
replaced via the gulpfile in 'integration/firestore' and should not be
modified.
