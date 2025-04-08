The README file for the `nodoubtz/firebase-js-sdk` repository is already quite comprehensive. Here is the updated README with some minor improvements for better clarity and structure:

````markdown
# Firebase JavaScript SDK

![Build Status](https://img.shields.io/github/actions/workflow/status/firebase/firebase-js-sdk/test-all.yml)
[![Version](https://img.shields.io/npm/v/firebase.svg?label=version)](https://www.npmjs.com/package/firebase)
[![Coverage Status](https://coveralls.io/repos/github/firebase/firebase-js-sdk/badge.svg?branch=main)](https://coveralls.io/github/firebase/firebase-js-sdk?branch=main)

The Firebase JavaScript SDK implements the client-side libraries used by applications using Firebase services. This SDK is distributed via:

- [CDN](https://firebase.google.com/docs/web/setup/#add-sdks-initialize)
- [npm package](https://www.npmjs.com/package/firebase)

To get started using Firebase, see [Add Firebase to your JavaScript Project](https://firebase.google.com/docs/web/setup).

[![Release Notes](https://img.shields.io/npm/v/firebase.svg?style=flat-square&label=Release%20Notes%20for&labelColor=039be5&color=666)](https://firebase.google.com/support/release-notes/js)

## Upgrade to Version 9

Version 9 has a redesigned API that supports tree-shaking. Read the [Upgrade Guide](https://firebase.google.com/docs/web/modular-upgrade) to learn more.

## Supported Environments

Please see [Environment Support](https://firebase.google.com/support/guides/environments_js-sdk).

## SDK Dev Workflow

### Prerequisites

#### Node.js

Before you can start working on the Firebase JS SDK, you need to have Node.js installed on your machine. As of April 19th, 2024, the team has been testing with Node.js version `20.12.2`, but the required version of Node.js may change as we update our dependencies.

To download Node.js visit [Node.js Downloads](https://nodejs.org/en/download/).

_NOTE: You can use a tool like [`NVM`](https://github.com/creationix/nvm) or [`N`](https://github.com/tj/n) to install and manage multiple node versions_

#### Yarn

In addition to Node.js, we use `yarn` to facilitate multi-package development.

To install `yarn` follow the instructions listed on their website: [Yarn Installation](https://yarnpkg.com/en/docs/install).

This repo currently supports building with yarn `1.x`. For instance, after installing yarn, run:

```bash
$ yarn set version 1.22.11
```

#### Java

The closure compiler requires a modern Java installation. Java 11+ should be installed: [Java Downloads](https://www.oracle.com/java/technologies/downloads/#java11)

#### Verify Prerequisites

You can verify your setup by running the following commands in your terminal:

```bash
$ node -v
$ yarn -v
$ java -version
```

Your `node` version should be `20.12.2`, your `yarn` version should be between `1.0.0` and `1.22.11`, and your `java` version should be `11.0` or greater.

_NOTE: We will update the documentation as new versions are required, however for continuing development on the SDK, staying up to date on the stable versions of these packages is advised_

### Install Dependencies

Once you have Node.js and `yarn` installed on your machine and have validated that you are running the proper version, you can set up the development environment by running the following at the root of the SDK:

```bash
$ yarn
```

Once you have installed all the dependencies, you can build the entire SDK by running the following command at the root of the SDK:

```bash
$ yarn build
```

## Testing the SDK

### Test Setup

A production project is required to test the Firebase JS SDK. You can create a new project by visiting the [Firebase Console](https://console.firebase.google.com/).

#### Web App Setup

Visit the "Project Overview" and select "Add app" under your project name. Register the app with a nickname and click through the remaining steps. Without performing this step, you will encounter the error in the test setup:

```
FirebaseError: There are no WEB apps associated with this Firebase project
```

#### Firestore Database Setup

Visit the "Firestore Database" section of the console and create a Cloud Firestore database. When prompted to select the set of initial security rules, select any option (e.g., "Start in Production Mode") since these permission settings will be overwritten below.

#### Realtime Database Setup

Visit the "Realtime Database" section of the console and create a realtime database. When prompted to select the set of initial security rules, select any option (e.g., "Start in Locked Mode") since these permission settings will be overwritten below.

#### Storage Setup

Visit the "Storage" section of the console and create a storage bucket. In order to run the tests, you will need to update your bucket's CORS rules.

1. Create a new file called `cors.json` with the contents:
    ```json
    [
        {
            "origin": ["http://localhost:8089"],
            "method": ["GET"],
            "maxAgeSeconds": 3600
        }
    ]
    ```
2. Install `gsutil` from [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs/gsutil_install)
3. You will need to log in if this is your first time using `gsutil`. Run `gcloud auth login` and follow the instructions to log in.
4. Run `gsutil cors set cors.json gs://<your-cloud-storage-bucket>`

For more information, visit [CORS Configuration](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)

#### Authentication Support

Visit the authentication config in your project and enable the `Anonymous` sign-in provider to complete your project config.

#### Automated Setup

The tests need to be configured to use the Firebase production project that you created in the "Test Setup" section above. To do this, run the `yarn test:setup` command, as follows:

```bash
# Select the Firebase project via the text-based UI. This will run tools/config.js
# and deploy from config/ to your Firebase project.
$ yarn test:setup

# Specify the Firebase project via the command-line arguments.
$ yarn test:setup --projectId=<test_firebase_project_id>
```

If you see an error like:

```
HTTP Error: 404, Project '<test_firebase_project_id>' does not exist.
```

then make sure that you have created the database as specified in the "Firestore Database Setup" section above.

### Running the tests

Each of the directories in the `integration` directory as well as the `packages` directory has its own test suites. You will need to build the SDK before running tests. Test suites can be run all together by running the following command at the root of the package:

```bash
$ yarn test
```

In addition, you can run any of the tests individually by running `yarn test` in an individual package directory.

## Building the SDK

### Introduction

The Firebase JS SDK is built with a series of individual packages that are all contained in this repository. Development is coordinated via [yarn workspaces](https://yarnpkg.com/blog/2017/08/02/introducing-workspaces/) and [Lerna](https://lerna.js.org/) (a monorepo management tool).

Each package in the `packages` directory constitutes a piece of our implementation. The SDK is built via a combination of all of these packages which are published under the [`firebase` scope](https://www.npmjs.com/search?q=scope%3Afirebase) on NPM.

### Testing the SDK Locally

Please be sure your product's package has been built before proceeding any further. (If you haven't built this repo before, make sure to run `yarn build` at the root)

In order to manually test your SDK changes locally, you must use [yarn link](https://classic.yarnpkg.com/en/docs/cli/link):

```shell
$ cd packages/firebase
$ yarn link # initialize the linking to the other folder
$ cd ../<my-product> # Example: $ cd ../firestore
$ yarn link # link your product to make it available elsewhere
$ cd <my-test-app-dir> # cd into your personal project directory
$ yarn link firebase @firebase/<my-product> # tell yarn to use the locally built firebase SDK instead
```

This will create a symlink and point your `<my-test-app-dir>` to the locally built version of the firebase SDK.

### Helper Scripts

Each package in the `packages` directory exposes a `dev` script. This script will set up a watcher for development on the individual piece of the SDK. In addition, there is a top-level `dev` script that can be run to start all of the watch tasks as well as a sandbox server.

You can run the dev script by running the following at the root of the package:

```bash
$ yarn dev
```

### Prepush Hooks

As part of this repo, we use the NPM package [`husky`](https://npm.im/husky) to implement git hooks. We leverage the prepush hook to do two things:

- Automated code styling (using [`prettier`](https://npm.im/prettier))
- Automated LICENSE header insertion

## Contributing

See [Contributing](./CONTRIBUTING.md) for more information on contributing to the Firebase JavaScript SDK.

### Big Thanks

Cross-browser Testing Platform and Open Source ❤️ Provided by [Sauce Labs][homepage].

[homepage]: https://saucelabs.com

---

This updated README includes all the necessary information for getting started, development, testing, and contributing to the Firebase JavaScript SDK. If you have any additional changes or specific sections you'd like to add, please let me know!
````

You can view the updated README [here](https://github.com/nodoubtz/firebase-js-sdk/blob/main/README.md).
