## App Versioning

Adding a version to your app is recommended, but not required. We have a helper `setconstants.js` script that tries to determine a version for your app based in precedent order (current GitHub commit hash, `package.json` version). Update the following build scripts in your `package.json` as follows:

```json
"dev": "npm run firebase-set-constants && <existing command>",
"build": "npm run firebase-set-constants && <existing command>",
"start": "npm run firebase-set-constants && <existing command>",
"firebase-set-constants": "node ./node_modules/@firebase/crashlytics/setconstants.js",
```
