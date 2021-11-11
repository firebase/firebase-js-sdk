# Firebase-Auth for web - Auth Demo (Auth Next)

## Prerequisite

You need to have created a Firebase Project in the
[Firebase Console](https://firebase.google.com/console/) as well as configured a web app.

## Installation
Make sure you run `yarn` to install all dependencies in the root directory.

Enable the Auth providers you would like to offer your users in the console, under
Auth > Sign-in methods.

Run:

```bash
git clone https://github.com/firebase/firebase-js-sdk.git
cd firebase-js-sdk/packages/auth/demo
```

This will clone the repository in the current directory.

If you want to be able to deploy the demo app to one of your own Firebase Hosting instance,
configure it using the following command:

```bash
firebase use --add
```

Select the project you have created in the prerequisite, and type in `default` or
any other name as the alias to use for this project.

Copy `src/sample-config.js` to `src/config.js`:

```bash
cp src/sample-config.js src/config.js
```

Then copy and paste the Web snippet config found in the console (either by clicking "Add Firebase to
your web app" button in your Project overview, or clicking the "Web setup" button in the Auth page)
in the `config.js` file.

## Deploy

Before deploying, you may need to build the auth package:
```bash
yarn build:deps
```

This can take some time, and you only need to do it if you've modified the auth package.

To run the app locally, simply issue the following command in the `auth/demo` directory:

```bash
yarn run demo
```

This will compile all the files needed to run Firebase Auth, and start a Firebase server locally at
[http://localhost:5000](http://localhost:5000).

## Running against Auth Emulator

The demo page by default runs against the actual Auth Backend. To run against the Auth Emulator with mocked endpoints, do the following:

1. (Optional) If you are running against local changes to the Auth Emulator (see [Firebase CLI Contributing Guide](https://github.com/firebase/firebase-tools/blob/master/CONTRIBUTING.md)), make sure that your version of `firebase-tools` is executing against your `npm link`’d repository and that you've built your local emulator changes with `npm run build`.

2. From `auth/demo`, locally initialize a Firebase project by running `firebase init`. When asked "Which Firebase features do you want to set up for this directory?", select "Emulators". When asked "Which Firebase emulators do you want to set up?", select "Authentication Emulator". This will create a `firebase.json` file.

3. Change the constants `USE_AUTH_EMULATOR` and `AUTH_EMULATOR_URL` in `auth/demo/src/index.js` to `true` and `http://localhost:{port}` where the auth `port` can be found in the `firebase.json` file.

4. To run the app locally and against the Auth Emulator, simply issue the following command in the `auth/demo` directory:

```bash
yarn run demo:emulator
```

