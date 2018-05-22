# Firebase Javascript SDK

<!-- BADGES -->
[![Build Status](https://travis-ci.org/firebase/firebase-js-sdk.svg?branch=master)](https://travis-ci.org/firebase/firebase-js-sdk)
[![Build Status](https://saucelabs.com/buildstatus/firebase-oss)](https://saucelabs.com/u/firebase-oss)
<!-- END BADGES -->

The Firebase JavaScript SDK implements the client-side libraries used by
applications using Firebase services. This SDK is distributed via:

- CDN (`<script src="https://www.gstatic.com/firebasejs/4.0.0/firebase.js"></script>`)
- [npm package](https://www.npmjs.com/package/firebase)
- [Bower package](https://github.com/firebase/firebase-bower)

To get started using Firebase, see
[Add Firebase to your JavaScript Project](https://firebase.google.com/docs/web/setup).

Current [Release Notes](https://firebase.google.com/support/release-notes/js)

## SDK Dev Workflow

### Prerequisites

#### Node.js

Before you can start working on the Firebase JS SDK, you need to have Node.js
`8.0.0` or greater installed on your machine. 

To download Node.js visit https://nodejs.org/en/download/.

_NOTE: You can use a tool like [`NVM`](https://github.com/creationix/nvm)
or [`N`](https://github.com/tj/n) to install and manage multiple node versions_

#### Yarn

In addition to Node.js we use `yarn` to facilitate multi package development.

To install `yarn` follow the instructions listed on their website: 
https://yarnpkg.com/en/docs/install

#### Java

The closure compiler requires a modern Java installation. Java 8+ should be installed: http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html

#### Verify Prerequisites

You can verify your setup by running the following commands in your terminal:

```bash
$ node -v
$ yarn -v
$ java -version
```

Your Node.js version should be `8.0.0` or greater, your `yarn` version should
be `1.0.0` or greater, and your `java` version should be `1.8.0` or greater.

_NOTE: We will update the documentation as new versions are required, however
for continuing development on the SDK, staying up to date on the stable versions
of these packages is advised_

### Install Dependencies

Once you have Node.js and `yarn` installed on your machine and have validated
that you are running the proper version, you can set up the development environment
by running the following at the root of the SDK:

```bash
$ yarn
```

## Testing the SDK

### Test Setup

A production project is required to test the Firebase JS SDK. You can create a
new project by visiting the [Firebase Console](https://console.firebase.google.com/).

#### Firestore Support

Visit the database section of the console and enable the Cloud Firestore Beta.
You can select either of the default permissions settings as we will overwrite
them below.

#### Authentication Support

Visit the authentication config in your project and enable the `Anonymous` 
sign-in provider to complete your project config.

#### Automated Setup

The remainder of the test setup can be done by running the following command at
the root of the package:

```bash
yarn test:setup
```

### Running the tests

Each of the directories in the `integration` directory as well as the `packages`
directory have their own test suites. These can be run altogether by running the
following command at the root of the package:

```bash
$ yarn test
```

In addition, you can run any of the tests individually by running `yarn test` in
an individual package directory.

## Building the SDK

### Introduction

The Firebase JS SDK is built with a series of individual packages that are all
contained in this repository. Development is coordinated via [yarn 
workspaces](https://yarnpkg.com/blog/2017/08/02/introducing-workspaces/) and 
[Lerna](https://lernajs.io/) (a monorepo management tool).

Each package in the `packages` directory, constitute a piece of our
implementation. The SDK is built via a combination of all of these packages
which are published under the [`firebase` 
scope](https://www.npmjs.com/search?q=scope%3Afirebase) on NPM.

### Helper Scripts

Each package in the `packages` directory exposes a `dev` script. This script
will set up a watcher for development on the individual piece of the SDK. In
addition, there is a top level `dev` script that can be run to start all of the
watch tasks as well as a sandbox server.

You can run the dev script by running the following at the root of the package:

```bash
yarn dev
```

### Prepush Hooks

As part of this repo, we use the NPM package [`husky`](https://npm.im/husky) to 
implement git hooks. We leverage the prepush hook to do two things:

- Automated code styling (using [`prettier`](https://npm.im/prettier))
- Automated LICENSE header insertion

## Contributing

See [Contributing](./CONTRIBUTING.md) for more information on contributing to the Firebase
JavaScript SDK.

### Big Thanks

Cross-browser Testing Platform and Open Source <3 Provided by [Sauce Labs][homepage]

[homepage]: https://saucelabs.com
