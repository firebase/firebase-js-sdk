All tests in this directory are also run against our (minified)
firebase-firestore.js build (via 'yarn test:manual' under
firebase-js-sdk/integration/firestore/) and therefore must not have any
dependencies on src/ files.

API tests that need to use internal hooks (via src/ dependencies) should be
put in test/integration/api_internal instead.

The line "import * as firebaseExport from '../util/firebase_export';" is
replaced via the gulpfile in 'integration/firestore' and should not be
modified.


### Testing composite index query against production
1. Create a `project.json` file in the `firebase-js-sdk/packages/firestore` directory. This file should contain your target Firebase project's configuration.
2. If not already done, log in to your Google Cloud Platform (GCP) account using `gcloud auth application-default login`. You can check your logged-in accounts with `gcloud auth list`.
3. In the `firebase-js-sdk/packages/firestore`, run:
```
terraform init
terraform apply -var-file=project.json -auto-approve
```
Note: Index creation may occasionally encounter issues. If it fails due to concurrent operations, consider running the index creation process a second time. You can safely disregard error messages indicating that indexes have already been created.


### Adding new composite index query tests
1. create the new composite index by clicking on the link to firebase console in the error message.
2. Add the new composite index to the `firestore_index_config.tf` file. The "__name__" field is not required to be explicitly added to the file as the index creation will auto complete it on behalf.
