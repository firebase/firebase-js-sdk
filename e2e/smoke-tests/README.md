# Firebase JS SDK E2E Tests

This directory contains end-to-end tests for the Firebase JS SDK package as well as minimal quick start sample apps for debugging and development.

## E2E Tests

### Setup

Before running the tests, you will need:

- a project config
- a test user with an email/password login which has read/write privileges for Storage, Realtime Database, and Firestore
- an App Check debug token
- to deploy the `callTest` Cloud Function

#### Project Config and Test User

Create a file named `firebase-config.js` in the top level of this `e2e/smoke-tests` directory. The contents of the file should be:

```javascript
// A config for a project
export const config = {
  apiKey: ************,
  authDomain: ************,
  databaseURL: ************,
  projectId: ************,
  storageBucket: ************,
  messagingSenderId: ************,
  appId: ************,
  measurementId: ************
};
 *
// A user account with read/write privileges in that project
// for storage, database, firestore
export const testAccount = {
  email: ************,
  password: ************
}
```

#### App Check Debug Token

Create an App Check debug token in the Firebase Console. Assign it to an environment variable in your shell named `APP_CHECK_DEBUG_TOKEN`.

#### Deploy `callTest` Cloud Function

From the top level of the firebase repo, ensure you have the Firebase CLI (`firebase-tools`) installed (if not, `npm install -g firebase-tools`).

Ensure you are logged in using the CLI (`firebase login`);

Then deploy the function with:
`firebase deploy --only functions:callTest --project YOUR_PROJECT_ID`

### Running the Tests

To run the tests on the default modular API:

```
yarn test:modular
```

To run the tests on the compat API:

```
yarn test:compat
```

## Sample Apps

Two minimal sample apps are provided for quick debugging and development. These apps import and initialize every product in the SDK and call some basic methods. Products can easily be commented out to focus on one or more products you are interested in looking at.

### Setup

The setup is the same as for the E2E tests above. Certain tests can be skipped if you are commenting out that product (e.g, no need to deploy the Cloud Function if you are commenting out the `callFunctions()` line in the sample app, and no need to set the App Check debug token env variable if not using App Check).

### Running Sample Apps

To run the modular sample app (uses current default version of the API):

```
yarn start:modular
```

Then open `localhost:8080` in a browser.

To run the compat sample app (uses current compat version of the API):

```
yarn start:compat
```

Then open `localhost:8080` in a browser.