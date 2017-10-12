# @firebase/polyfill

This is the a set of polyfills/shims used by the Firebase JS SDK. This package
is completely standalone and can be loaded to standardize environments for use
w/ the Firebase JS SDK. This package is included by default in the 
[`firebase`](https://npm.im/firebase) NPM package.

## Installation

You can install this package by running the following in your project:

```bash
$ npm install @firebase/polyfill
```

## Usage

You can then use the firebase namespace exposed by this package as illustrated
below:

**ES Modules**

```javascript
import '@firebase/polyfill'
```

**CommonJS Modules**

```javascript
require('@firebase/polyfill');
```

## Documentation

For comprehensive documentation please see the [Firebase Reference
Docs][reference-docs].

[reference-docs]: https://firebase.google.com/docs/reference/js/
