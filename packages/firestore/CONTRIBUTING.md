# Contributing to the Cloud Firestore Component

See [Contributing](../../CONTRIBUTING.md) for general information on
contributing to the Firebase JavaScript SDK (including Cloud Firestore).
Follow instructions there to install dependencies, build the SDK, and set up
the testing environment.

## Integration Testing

### Setting up a project for testing

You will need a production project to test the Firestore SDK. You can create
a new project by visiting the 
[Firebase Console](https://console.firebase.google.com/). Make sure that the 
project has Cloud Firestore enabled in the database section of the console.

See 
[Automated Setup](https://github.com/firebase/firebase-js-sdk#automated-setup) 
for more details.

### Setting up the Firestore emulator

The integration tests require that the Firestore emulator is running
on port 8080, which is default when running it via CLI.

  * [Install the Firebase CLI](https://firebase.google.com/docs/cli/).
    ```
    npm install -g firebase-tools
    ```
  * [Install the Firestore
    emulator](https://firebase.google.com/docs/firestore/security/test-rules-emulator#install_the_emulator).
    ```
    firebase setup:emulators:firestore
    ```
  * Run the emulator
    ```
    firebase serve --only firestore
    ```

### Running Firestore Tests

All commands must be run from the `packages/firestore/` directory. 

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

# Run all node tests once (unit and integration) against the emulator.
yarn test:node

# Run a subset of tests whose names match a filter.
yarn test:browser --grep 'SortedSet keeps elements in the right order'
yarn test:node --grep 'SortedSet keeps elements in the right order'

# Run tests against the production backend.
yarn test:node:prod
yarn test:node:persistence:prod
```
