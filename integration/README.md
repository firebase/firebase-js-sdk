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

## Authoring an Integration Test

The point of the integration tests is to be as flexible as possible. The only convention that I would recommend is supplying a `runner.sh` file to do the actual work of the test.

That said, if you are looking for a pattern to follow, the process that was followed for several of the tests, is outlined below:

- Copy the test files to a temporary working directory
- Setup an `EXIT` trap to cleanup the temporary directory at the end of the script
- Ensure that the SDK gets built if it doesn't already exist
- `npm install` the folder `dist/package`, this allows the test to function as if the SDK was installed from NPM
- (For tests that are only validating the firebase namespace) copy the `shared` directory above into the working directory

The tests are then ran with karma/mocha/webdriver.io/selenium or whatever else you need to accomplish the purpose of your test. Each of these runners requires their own config (and sometimes their own dependencies), supply these config files directly in the test directory (e.g. many of the suites have their own package.json) as the tests are meant to be isolated from each other as much as possible.