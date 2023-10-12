All tests in this directory are also run against our (minified)
firebase-firestore.js build (via 'yarn test:manual' under
firebase-js-sdk/integration/firestore/) and therefore must not have any
dependencies on src/ files.

API tests that need to use internal hooks (via src/ dependencies) should be
put in test/integration/api_internal instead.

The line "import * as firebaseExport from '../util/firebase_export';" is
replaced via the gulpfile in 'integration/firestore' and should not be
modified.


## Testing composite index query against production

### Setting Up the Environment:
1. Create a `project.json` file in the `firebase-js-sdk/config` directory. This file should contain your target Firebase project's configuration.
2. If not already logged in, authenticate with your Google Cloud Platform (GCP) account using `gcloud auth application-default login`. You can check your logged-in accounts by running `gcloud auth list`.
3. Navigate to the `firebase-js-sdk/packages/firestore` directory, run:
```
terraform init
terraform apply -var-file=../../config/project.json -auto-approve
```
Note: If the index creation encounters issues, such as concurrent operations, consider running the index creation process again. Error messages indicating that indexes have already been created can be safely disregarded.


### Adding new composite index query tests
1. To create a new composite index for local development, click on the provided link in the test error message, which will direct you to the Firebase Console.
2. Add the newly created composite index to the `firestore_index_config.tf` file. The "__name__" field is not required to be explicitly added to the file, as the index creation will auto complete it on behalf.
