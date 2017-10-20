# @firebase/firestore

This is the Cloud Firestore component for the Firebase JS SDK. It has a peer
dependency on the [`@firebase/app`](https://npm.im/@firebase/app) package on NPM. This package
**is not** included by default in the [`firebase`](https://npm.im/firebase)
wrapper package.

## Installation

You can install this package by running the following in your project:

```bash
$ npm install @firebase/firestore
```

## Usage

You can then use the firebase namespace exposed by this package as illustrated
below:

**ES Modules**

```javascript
import firebase from '@firebase/app';
import '@firebase/firestore'

// Do stuff w/ `firebase` and `firebase.firestore`
```

**CommonJS Modules**

```javascript
const firebase = require('@firebase/app').default;
require('@firebase/firestore');

// Do stuff with `firebase` and `firebase.firestore`
```

## Documentation

For comprehensive documentation please see the [Firebase Reference
Docs][reference-docs].

[reference-docs]: https://firebase.google.com/docs/reference/js/

## Contributing
See [Contributing to the Firebase SDK](../../CONTRIBUTING.md) for general
information about contributing to the firebase-js-sdk repo and
[Contributing to the Cloud Firestore Component](./CONTRIBUTING.md) for
details specific to the Cloud Firestore code and tests.
