# `@firebase/functions`

This is the functions component for the Firebase JS SDK. It has a peer
dependency on the [`@firebase/app`](https://npm.im) package on NPM. This package
is included by default in the [`firebase`](https://npm.im/firebase) wrapper
package.

## Installation

You can install this package by running the following in your project:

```bash
$ npm install @firebase/functions
```

## Usage

You can then use the firebase namespace exposed by this package as illustrated
below:

**ES Modules**

```javascript
import firebase from '@firebase/app';
import '@firebase/functions'

// Do stuff w/ `firebase` and `firebase.functions`
```

**CommonJS Modules**

```javascript
const firebase = require('@firebase/app').default;
require('@firebase/functions');

// Do stuff with `firebase` and `firebase.functions`
```

## Documentation

For comprehensive documentation please see the [Firebase Reference
Docs][reference-docs].

[reference-docs]: https://firebase.google.com/docs/reference/js/
