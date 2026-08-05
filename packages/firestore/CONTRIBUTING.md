# Contributing to the Cloud Firestore Component

See [Contributing](../../CONTRIBUTING.md) for general information on
contributing to the Firebase JavaScript SDK (including Cloud Firestore).
Follow instructions there to install dependencies, build the SDK, and set up
the testing environment.

For a deep dive into the testing strategy and architecture, see [Testing Strategy](devdocs/testing.md).

## Integration Testing

### Setting up the Firestore emulator

Integration tests that run against the Firestore emulator expect
that it runs on port 8080.

- [Install the Firebase CLI](https://firebase.google.com/docs/cli/).
  ```bash
  npm install -g firebase-tools
  ```
- [Install the Firestore emulator](https://firebase.google.com/docs/firestore/security/test-rules-emulator#install_the_emulator).
  ```bash
  firebase setup:emulators:firestore
  ```
- Run the emulator:
  ```bash
  firebase emulators:start --only firestore
  ```

## Testing Firestore

Testing Firestore is organized along three dimensions:

1.  **Environment**: Where the code runs.
    - **Node.js**: Fast, V8-based testing using Mocha. Perfect for logic that doesn't require a browser.
    - **Browsers**: Uses Karma to run tests in real browser engines (Chrome, Firefox, WebKit). Essential for testing IndexedDB and WebChannels.
2.  **SDK Type**: Which version of the SDK is being tested.
    - **Full SDK**: Includes real-time listeners, offline persistence, and caching.
    - **Lite SDK**: A REST-only, lightweight version without persistence or real-time support.
3.  **Backend**: Which server the tests communicate with.
    - **Emulator**: Local server (default).
    - **Production**: The live Firebase backend.
    - **Nightly**: Pre-release backend for catching upcoming server changes.

### Running Tests

All commands must be run from the `packages/firestore/` directory.

```bash
# Full SDK - Node (Emulator)
yarn test:node

# Full SDK - Browser (Chrome Headless, Emulator)
yarn test:browser

# Lite SDK - Node (Emulator)
yarn test:lite

# Lite SDK - Browser (Chrome Headless, Emulator)
yarn test:lite:browser
```

### Environment Variables & Flags

Use these variables to change the target backend or database:

- **`FIRESTORE_TARGET_BACKEND`**: Set to `emulator`, `prod`, or `nightly`. `nightly` is only available to Googlers.
- **`FIRESTORE_TARGET_DB_ID`**: Targets a specific database ID (default is `(default)`).
- **`--firestoreEdition=enterprise`**: Enables enterprise-specific tests (sets `RUN_ENTERPRISE_TESTS=true`).
- **`BROWSERS`**: (Browser tests only) A comma-separated list of browsers: `ChromeHeadless`, `Firefox`, `WebkitHeadless`.
  - Example: `BROWSERS=Firefox,WebkitHeadless yarn test:browser`

### Persistence

- **Browsers**: Persistence (IndexedDB) is tested natively.
- **Node.js**: Node lacks a native database. Use `yarn test:node:persistence` to enable a mock persistence layer for testing offline logic in Node.

### Filtering Tests (Grep)

Use the `--grep` flag to run specific tests.

```bash
yarn test:node --grep 'SortedSet'
yarn test:browser --grep 'Query'
```

## Testing Firestore Pipelines

### Enterprise Edition & Database IDs

To test Pipeline features that require the Enterprise backend:

- **Named Databases**: Use a database ID other than `(default)`. In our automated tests, we typically use the ID `enterprise`.
- **Edition Flag**: Pass `--firestoreEdition=enterprise` to enable Enterprise-specific test cases and assertions.

Example: Running Pipeline integration tests against production with an enterprise database:

```bash
yarn test:node:prod:enterprise --grep 'Pipeline'
```

### Testing Environments for Pipelines

- **Emulator**: Supports basic pipeline structures and some aggregations.
- **Nightly**: Preferred for testing new Pipeline features before they reach Production. Use `FIRESTORE_TARGET_BACKEND=nightly`.
- **Production**: Used for final validation of released Pipeline features.

## Debugging

### CLI Debugging

We provide `:debug` scripts that wait for a debugger to attach:

- **Node**: `yarn test:node:debug` (uses `node --inspect-brk`).
- **Browser**: `yarn test:browser:debug` (keeps Chrome open and watches for file changes).

### VSCode Debugging

Use the **Run and Debug** pane in VSCode. Recommended configurations:

- **Firestore Unit Tests (Node)**: Fast debugging for Node logic.
- **Firestore Integration Tests (Node)**: Debugs against the emulator.
- **Firestore Integration Tests (Browser)**: Debugs in Chrome.
- **Firestore Enterprise Lite Tests**: Debugs Lite SDK against Nightly/Enterprise.

Most configurations will prompt you for a `grepString` to filter tests before starting.
