# Firebase Javascript SDK

<!-- BADGES -->
![Build Status](https://img.shields.io/github/workflow/status/firebase/firebase-js-sdk/Run%20All%20Tests.svg)
[![Build Status](https://saucelabs.com/buildstatus/firebase-oss)](https://saucelabs.com/u/firebase-oss)
[![Version](https://img.shields.io/npm/v/firebase.svg?label=version)](https://www.npmjs.com/package/firebase)
[![Coverage Status](https://coveralls.io/repos/github/firebase/firebase-js-sdk/badge.svg?branch=master)](https://coveralls.io/github/firebase/firebase-js-sdk?branch=master)
<!-- END BADGES -->

The Firebase JavaScript SDK implements the client-side libraries used by
applications using Firebase services. This SDK is distributed via:

- [CDN](https://firebase.google.com/docs/web/setup/#add-sdks-initialize)
- [npm package](https://www.npmjs.com/package/firebase)
- [Bower package](https://github.com/firebase/firebase-bower)

To get started using Firebase, see
[Add Firebase to your JavaScript Project](https://firebase.google.com/docs/web/setup).

[![Release Notes](https://img.shields.io/npm/v/firebase.svg?style=flat-square&label=Release%20Notes%20for&labelColor=039be5&color=666)](https://firebase.google.com/support/release-notes/js)

## Supported Environments
Please see [Environment Support](https://firebase.google.com/support/guides/environments_js-sdk).

## SDK Dev Workflow

### Prerequisites

#### Node.js

Before you can start working on the Firebase JS SDK, you need to have Node.js
installed on your machine. The currently supported versions are `10.15.0` or greater.

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

Your Node.js version should be `10.15.0` or greater, your `yarn` version should
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

Once you have installed all the dependencies, you can build the entire SDK by
running the following command the root of the SDK:

```bash
$ yarn build
```

## Testing the SDK

### Test Setup

A production project is required to test the Firebase JS SDK. You can create a
new project by visiting the [Firebase Console](https://console.firebase.google.com/).

#### Firestore Database Setup

Visit the "Database" section of the console and create a Cloud Firestore
database. When prompted to select the set of initial security rules, select
any option (e.g. "Start in Production Mode") since these permission settings
will be overwritten below.

#### Authentication Support

Visit the authentication config in your project and enable the `Anonymous`
sign-in provider to complete your project config.

#### Automated Setup

The tests need to be configured to use the Firebase production project that you
created in the "Test Setup" section above. To do this, run the `yarn test:setup`
command, as follows:


```bash
# Select the Firebase project via the text-based UI.
$ yarn test:setup

# Specify the Firebase project via the command-line arguments.
$ yarn test:setup --projectId=<test_firebase_project_id>
```

If you see an error like
```
HTTP Error: 404, Project '<test_firebase_project_id>' does not exist.
```
then make sure that you have created the database as specified in the "Firestore
Database Setup" section above.

### Running the tests

Each of the directories in the `integration` directory as well as the `packages`
directory have their own test suites. You will need to build the SDK before
running tests. Test suites can be run all together by running the following 
command at the root of the package:

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
$ yarn dev
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
