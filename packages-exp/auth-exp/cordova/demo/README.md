# Cordova Auth Demo App
This package contains a demo of the various Firebase Auth features bundled in
an Apache Cordova app.

## Dev Setup

Follow [this guide](https://cordova.apache.org/docs/en/10.x/guide/cli/) to run
set up Cordova CLI. tl;dr:

```bash
npm install -g cordova
cordova requirements
```

### Preparing the deps

At this point you should have a basic environment set up that can support
Cordova. Now you'll need to update some config files to make everything work.
First, read through steps 1 - 5, 7 in the
[Firebase Auth Cordova docs page](https://firebase.google.com/docs/auth/web/cordova)
so that you get a sense of the values you need to add / adjust.

Make a copy of `sample-config.xml` to `config.xml`, and replace the values
outlined in curly braces. Notably, you'll need the package name / bundle ID
of a registered app in the Firebase Console. You'll also need the Auth Domain
that comes from the Web config.

Next, you'll need to make a copy of `src/sample-config.js` to `src/config.js`,
and you'll need to supply a Firebase JS SDK configuration in the form of that
file.

Once all this is done, you can get the Cordova setup ready in this specific
project:

```bash
cordova prepare
```

Work through any issues until no more errors are printed.

## Building and running the demo

The app consists of a bundled script, `www/dist/bundle.js`. This script is built
from the `./src` directory. To change it, modify the source code in
`src` and then rebuild the bundle:

```bash
# Build the deps the first time, and subsequent times if changing the core SDK
npm run build:deps
npm run build:js
```

### Android

You can now build and test the app on Android Emulator:

```bash
cordova build android
cordova emulate android

# Or
cordova run android
```

TODO: Any tips or gotchas?

### iOS

```bash
cordova build ios
cordova emulate ios
```

Please ignore the command-line output mentioning `logPath` -- that file
[will not actually exist](https://github.com/ios-control/ios-sim/issues/167) and
won't contain JavaScript console logs. The Simulator app itself does not
expose console logs either (System Log won't help).

The recommended way around this is to use the remote debugger in Safari. Launch
the Safari app on the same MacBook, and then go to Safari menu > Preferences >
Advanced and check the "Show Develop menu in menu bar" option. Then, you should
be able to see the Simulator under the Safari `Developer` menu and choose the
app web view (Hello World > Hello World). This only works when the Simulator has
already started and is running the Cordova app. This gives you full access to
console logs AND uncaught errors in the JavaScript code.

WARNING: This may not catch any JavaScript errors during initialization (or
before the debugger was opened). If nothing seems working, try clicking the
Reload Page button in the top-left corner of the inspector, which will reload
the whole web view and hopefully catch the error this time.

#### Xcode

If you really want to, you can also start the Simulator via Xcode. Note that
this will only give you access to console log but WON'T show JavaScript errors
-- for which you still need the Safari remote debugger.

```bash
cordova build ios
open ./platforms/ios/HelloWorld.xcworkspace/
```

Select/add a Simulator through the nav bar and click on "Run" to start it. You
can then find console logs in the corresponding Xcode panel (not in the
Simulator window itself).

If you go this route,
[DO NOT edit files in Xcode IDE](https://cordova.apache.org/docs/en/10.x/guide/platforms/ios/index.html#open-a-project-within-xcode).
Instead, edit files in the `www` folder and run `cordova build ios` to copy the
changes over (and over).

### Notes

You may need to update the cordova-universal-links-plugin `manifestWriter.js`
to point to the correct Android manifest. For example:

```js
var pathToManifest = path.join(cordovaContext.opts.projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
```
