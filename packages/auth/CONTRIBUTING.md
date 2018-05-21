# @firebase/auth

This is the authentication component for the Firebase JS SDK. It has a peer 
dependency on the [`@firebase/app`](https://npm.im/@firebase/app) package on NPM. This package
is included by default in the [`firebase`](https://npm.im/firebase) wrapper
package.

## Table of Contents

1. [Developer Setup](#developer-setup)

## Developer Setup

### Dependencies

To set up a development environment to build Firebase-auth from source, you must
have the following installed:
- Node.js (>= 6.0.0)
- npm (should be included with Node.js)
- Java Runtime Environment

In order to run the tests, you must also have:
- Python (2.7)

Download the Firebase source and its dependencies with:

```bash
git clone https://github.com/firebase/firebase-js-sdk.git
cd firebase-js-sdk
yarn install
```

### Building Firebase-auth

To build the library, run:
```bash
cd packages/auth
yarn build
```

This will create output files in the `dist/` folder.

### Running unit tests.

All unit tests can be run on the command line (via Chrome and Firefox) with:

```bash
yarn test
```

Alternatively, the unit tests can be run manually by running

```bash
yarn run serve
```

Then, all unit tests can be run at: http://localhost:4000/buildtools/all_tests.html
You can also run tests individually by accessing each HTML file under
`generated/tests`, for example: http://localhost:4000/generated/tests/test/auth_test.html

### Run tests using SauceLabs

*You need a [SauceLabs](https://saucelabs.com/) account to run tests on
SauceLabs.*

Go to your SauceLab account, under "My Account", and copy paste the access key.
Now export the following variables, *in two Terminal windows*:

```bash
export SAUCE_USERNAME=<your username>
export SAUCE_ACCESS_KEY=<the copy pasted access key>
```

 Then, in one Terminal window, start SauceConnect:

 ```bash
./buildtools/sauce_connect.sh
```

Take note of the "Tunnel Identifier" value logged in the terminal, at the top. In
the other terminal that has the exported variables, run the tests:

```bash
yarn test -- --saucelabs --tunnelIdentifier=<the tunnel identifier>
```
