# Contributing to the Cloud Firestore Component

See [Contributing](../../CONTRIBUTING.md) for general information on
contributing to the Firebase JavaScript SDK (including Cloud Firestore).
Follow instructions there to install dependencies and set up the testing
environment.

## Setting up an account for testing

You will need a production project to test the Firestore SDK. You can create
a new project by visiting the [Firebase Console](https://console.firebase.google.com/).
Make sure that the project has Cloud Firestore enabled in the database section of the
console.

While setting up tests, you can choose the project manually, or specify the project directly:

```
yarn test:setup --projectId=<your-test-project>
```

## Running Firestore Tests

All commands must be run from this `packages/firestore/` directory.

```
# Come up to date on dependencies after performing git pull
(cd ../../; yarn && yarn build)

# Run all tests once (browser and node)
yarn test

# Run all browser tests once (unit and integration)
yarn test:browser

# Debug browser tests in Chrome and keep the browser open (and watch for file
# changes).
yarn test:browser:debug

# Run only the browser unit or integration tests
yarn test:browser --unit
yarn test:browser --integration

# Run browser integration tests against a Firestore server running on
# localhost:8080.
yarn test:browser --integration --local

# Run a subset of tests whose names match a filter.
yarn test:browser --grep 'SortedSet keeps elements in the right order'
yarn test:node --grep 'SortedSet keeps elements in the right order'
```
