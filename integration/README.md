# Integration Test Suites

These test suites are high level validation suites that are largely coupled to an environment. They will test things like:

- Service Worker Integration
- Compatability with Webpack/Browserify/Typescript etc
- High level UI testing
- Others with same kinds of environmental restriction

Each test suite is expected to be fully isolated so some small duplication of config files and such is expected.

Each suite also contains a `runner.sh` file that contains the logic to actually test the module. **Make no assumptions** as you write these tests as nothing is provided by default (e.g. the current codebase hasn't built yet, test config files may not exist, etc).

## `shared` Directory

The `shared` directory in this folder currently contains two files:
 
 - `namespaceDefinition.json`
 - `validator.js`

These two files can be used to validate the firebase namespace and currently serves as the base for many of our integration tests.

_NOTE: `validator.js` should only be used **after** initializing a test firebase app (i.e. make a call to `firebase.initializeApp` before validating the namespace)_

