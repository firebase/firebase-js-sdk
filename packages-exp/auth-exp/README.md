# @firebase/auth-exp

This is the Firebase Authentication component of the Firebase JS SDK.

**This package is not intended for direct usage, and should only be used via the officially supported [firebase](https://www.npmjs.com/package/firebase) package.**

## Testing

The modular Auth SDK has both unit tests and integration tests, along with a
host of npm scripts to run these tests. The most important commands are:

| Command | Description |
| ------- | ----------- |
| `yarn test` | This will run lint, unit tests, and integration tests against the live environment|
| `yarn test:<platform>` | Runs all browser tests, unit and integration |
| `yarn test:<platform>:unit` | Runs only \<platform> unit tests |
| `yarn test:<platform>:unit:debug` | Runs \<platform> unit tests, auto-watching for file system changes |
| `yarn test:<platform>:integration` | Runs only integration tests against the live environment |
| `yarn test:<platform>:integration:local` | Runs all headless \<platform> integration tests against the emulator (more below) |

Where \<platform> is "browser" or "node". There are also cordova tests, but they
are not broken into such granular details. Check out `package.json` for more.

### Integration testing with the emulator

To test against the emulator, set up the Auth emulator
([instructions](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)).
The easiest way to run these tests is to use the `firebase emulators:exec`
command
([documentation](https://firebase.google.com/docs/emulator-suite/install_and_configure#startup)).
You can also manually start the emulator separately, and then point the tests
to it by setting the `GCLOUD_PROJECT` and `FIREBASE_AUTH_EMULATOR_HOST`
environmental variables. In addition to the commands listed above, the below
commands also run various tests:

  * `yarn test:integration:local` — Executes Node and browser emulator
    integration tests, as well as the Selenium WebDriver tests
  
  * `yarn test:webdriver` — Executes only the Selenium WebDriver
    integration tests

For example, to run all integration and WebDriver tests against the emulator,
you would simply execute the following command:

```sh
firebase emulators:exec --project foo-bar --only auth "yarn test:integration:local"
```

### Selenium Webdriver tests

These tests assume that you have both Firefox and Chrome installed on your
computer and in your `$PATH`. The tests will error out if this is not the case.
The WebDriver tests talk to the emulator, but unlike the headless integration
tests, these run in a browser robot environment; the assertions themselves run
in Node. When you run these tests a small Express server will be started to
serve the static files the browser robot uses.
