# @firebase/firestore

This is the [Cloud Firestore](https://firebase.google.com/docs/firestore/) component for the
Firebase Web SDK. The Cloud Firestore Web SDK provides tightly controlled end user access to your 
Cloud Firestore project. User identity is managed via
[Firebase Authentication](https://firebase.google.com/docs/auth/) and all document reads and writes 
are authorized via your [Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started).
With the Cloud Firestore Web SDK, you can build apps that access Cloud Firestore on
behalf of your end users.

The Cloud Firestore Web SDK even works while offline. All reads and writes are serialized and
document updates are immediately available in successive reads. With disk persistence, the
Cloud Firestore Web SDK allows you to retain a cached copy of your documents across application
restarts.

If you are developing a Node.js application that requires access to all your project’s data,
use the [`@google-cloud/firestore`](https://www.npmjs.com/package/@google-cloud/firestore) Server
SDK with your developer credentials.

## Installation

The Cloud Firestore Web SDK has a peer dependency on the 
[`@firebase/app`](https://npm.im/@firebase/app) package on NPM. This package **is not** included by
default in the [`firebase`](https://npm.im/firebase) wrapper package.

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
