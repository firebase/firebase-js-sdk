# @firebase/firestore

This is the [Cloud Firestore](https://firebase.google.com/docs/firestore/) component of the
[Firebase JS SDK](https://www.npmjs.com/package/firebase).

**This package is not intended for direct usage, and should only be used via the officially
supported [firebase](https://www.npmjs.com/package/firebase) package.**

If you are developing a Node.js application that requires administrative access to Cloud Firestore,
use the [`@google-cloud/firestore`](https://www.npmjs.com/package/@google-cloud/firestore) Server
SDK with your developer credentials.

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
