# @firebase/app

This is the primary entrypoint to the Firebase JS SDK. **All apps using firebase
will need this package**. Other `@firebase` packages are typically mounted on to
the namespaces exposed by this package.

## Installation

You can install this package by running the following in your project:

```bash
$ npm install @firebase/app
```

## Usage

You can then use the firebase namespace exposed by this package as illustrated
below:

**ES Modules**

### Referencing the `firebase` export:

```javascript
import { firebase } from '@firebase/app';

// Do stuff w/ `firebase`
```

### Referencing the default export:

```javascript
import firebase from '@firebase/app';

// Do stuff w/ `firebase`
```

**CommonJS Modules**

```javascript
const firebase = require('@firebase/app').default;

// Do stuff with `firebase`
```

## Documentation

For comprehensive documentation please see the [Firebase Reference
Docs][reference-docs].

[reference-docs]: https://firebase.google.com/docs/reference/js/
