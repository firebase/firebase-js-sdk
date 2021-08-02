<!-- TODO: Build/Test badges when available. -->

# Firebase - App success made simple

## Overview

[Firebase](https://firebase.google.com) provides the tools and infrastructure
you need to develop, grow, and earn money from your app. This package supports
web (browser), mobile-web, and server (Node.js) clients.

For more information, visit:

- [Firebase Realtime Database](https://firebase.google.com/docs/database/web/start) -
  The Firebase Realtime Database lets you store and query user data, and makes
  it available between users in realtime.
- [Cloud Firestore](https://firebase.google.com/docs/firestore/quickstart) -
  Cloud Firestore is a flexible, scalable database for mobile, web, and server
  development from Firebase and Google Cloud Platform.
- [Firebase Storage](https://firebase.google.com/docs/storage/web/start) -
  Firebase Storage lets you upload and store user generated content, such as
  files, and images.
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/js/client) -
  Firebase Cloud Messaging is a cross-platform messaging solution that lets you
  reliably deliver messages at no cost.
- [Firebase Authentication](https://firebase.google.com/docs/auth/web/manage-users) -
  Firebase helps you authenticate and manage users who access your application.
- [Create and setup your account](https://firebase.google.com/docs/web/setup) -
  Get started using Firebase for free.

This SDK is intended for end-user client access from environments such as the
Web, mobile Web (e.g. React Native, Ionic), Node.js desktop (e.g. Electron), or
IoT devices running Node.js. If you are instead interested in using a Node.js
SDK which grants you admin access from a privileged environment (like a server),
you should use the
[Firebase Admin Node.js SDK](https://firebase.google.com/docs/admin/setup/).

## Get the code (browser)

We recommend only installing the features you need. The individually installable services are:

- `firebase-app` - The core `firebase` client (required).
- `firebase-app-check` - Firebase App Check (optional).
- `firebase-analytics` - Firebase Analytics (optional).
- `firebase-auth` - Firebase Authentication (optional).
- `firebase-database` - The Firebase Realtime Database (optional).
- `firebase-firestore` - Cloud Firestore (optional).
- `firebase-storage` - Firebase Storage (optional).
- `firebase-messaging` - Firebase Cloud Messaging (optional).
- `firebase-functions` - Firebase Cloud Functions (optional).
- `firebase-remote-config` - Firebase Remote Config (optional).
- `firebase-performance` - Firebase Performance (optional).

### Script include
Include Firebase in your web application via `<script>` tags. Create a script tag for each of the individual services you use (include `firebase-app`
first):

```html
<!-- Always required. -->
<script src="https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js"></script>
<!-- Include only the services you use, for example auth and database below. -->
<script src="https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js"></script>
<!-- See above list for names of the other services. -->

<script>
  const app = firebase.initializeApp({
    apiKey: '<your-api-key>',
    authDomain: '<your-auth-domain>',
    databaseURL: '<your-database-url>',
    projectId: '<your-cloud-firestore-project>',
    storageBucket: '<your-storage-bucket>',
    messagingSenderId: '<your-sender-id>',
    appId: '<your-app-id>'
  });
  // ...
</script>
```

_Note: To get a filled in version of the above code snippet, go to the
[Firebase console](https://console.firebase.google.com/) for your app and click on "Add
Firebase to your web app"._

#### Alternative - all-in-one import

>This brings in all Firebase features. We recommend the method above to
>minimize download size by only including the scripts you need.

Include Firebase in your web application via a `<script>` tag:

```html
<script src="https://www.gstatic.com/firebasejs/${JSCORE_VERSION}/firebase.js"></script>

<script>
  const app = firebase.initializeApp({ ... });
  // ...
</script>
```

### NPM Bundler (Browserify, Webpack, Rollup, etc.)

Install the Firebase NPM module:
```
$ npm init
$ npm install --save firebase
```

In your code, you can import the services you use:

```js
// This import loads the firebase namespace along with all its type information.
import firebase from 'firebase/app';

// These imports load individual services into the firebase namespace.
import 'firebase/auth';
import 'firebase/database';
```

Or if using `require()`:

_Use the `.default` import from `firebase/app` in order for
typings to work correctly.
See [release notes for 8.0.0](https://firebase.google.com/support/release-notes/js#version_800_-_october_26_2020)._

```js
const firebase = require('firebase/app').default;
require('firebase/auth');
require('firebase/database');

const app = firebase.initializeApp({ ... });
```

_The type information from the import statement will include all of the SDKs,
not just the ones you have `required`, so you could get a runtime error if you
reference a non-required service._

#### Alternative - all-in-one import

>This brings in all Firebase features. We recommend the method above to
>minimize download size by only including the scripts you need.

```js
// This import loads all Firebase services, whether used in your code or not.
import firebase from 'firebase';
```

Or with `require()`:

```js
// This import loads all Firebase services, whether used in your code or not.
const firebase = require('firebase').default;
```

## Get the code (Node.js - server and command line)

### NPM

While you can write entire Firebase applications without any backend code, many
developers want to write server applications or command-line utilities using the
Node.js JavaScript runtime.

You can use the same npm module to use Firebase in the Node.js runtime (on a
server or running from the command line):

```
$ npm init
$ npm install --save firebase
```

In your code, you can access Firebase using:

```js
const firebase = require('firebase/app').default;
require('firebase/auth');
require('firebase/database');
const app = firebase.initializeApp({ ... });
// ...
```

If you are using native ES6 module with --experimental-modules flag (or Node 12+)
you should do:

```js
// This import loads the firebase namespace.
import firebase from 'firebase/app';

// These imports load individual services into the firebase namespace.
import 'firebase/auth';
import 'firebase/database';
```

_Known issue for typescript users with --experimental-modules: you have to set allowSyntheticDefaultImports to true in tsconfig.json to pass the type check. Use it with caution since it makes the assumption that all modules have a default export, which might not be the case for the other dependencies you have. And Your code will break if you try to import the default export from a module that doesn't have default export._

Firebase Cloud Messaging is not included in the server side Firebase npm module.
Instead, you can use the
[Firebase Cloud Messaging Rest API](https://firebase.google.com/docs/cloud-messaging/send-message).

## API definition

If you use the
[Closure Compiler](https://developers.google.com/closure/compiler/) or
compatible IDE, you can find API definitions for all the Firebase JavaScript API
in the included `/externs` directory in this package:

```
externs/
  firebase-app-externs.js
  firebase-auth-externs.js
  firebase-database-externs.js
  firebase-firestore-externs.js
  firebase-storage-externs.js
  firebase-messaging-externs.js
```

## Changelog

The Firebase changelog can be found at
[firebase.google.com](https://firebase.google.com/support/release-notes/js).

## Browser/environment compatibility

Please see [Environment Support](https://firebase.google.com/support/guides/environments_js-sdk).
