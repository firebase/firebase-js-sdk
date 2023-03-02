# Firebase-Auth for web - Auth Demo (Auth Next)

## Prerequisites

You need all the prerequisites mentioned in the [top-level README.](https://github.com/firebase/firebase-js-sdk#prerequisites)

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

Then copy and paste the Web snippet config found in the console (Project Settings -> Your apps -> SDK setup and Configuration)
in the `config.js` file.

## Deploy

Before deploying, you may need to build the auth package:
```bash
yarn
yarn build:deps
```

This can take some time, and you only need to do it if you've modified the auth package.

To run the app locally, simply issue the following command in the `auth/demo` directory:

```bash
yarn run demo
```

This will compile all the files needed to run Firebase Auth, and start a Firebase server locally at
[http://localhost:5000](http://localhost:5000).

The demo opens a page like this:

![image](https://user-images.githubusercontent.com/35932340/153662957-41ba6a82-ea15-4084-ad3a-9fd41083efd3.png)


This is a developer view of all the supported auth flows. Make sure that the auth flow you are testing is already enabled in your firebase project.
For example, if you are testing “Sign up with email/password”, your project should allow email/password as a provider. 
If not, you will see an “auth/operation-not-allowed” error message. 

You can check the enabled providers on the firebase console.

![image](https://user-images.githubusercontent.com/35932340/153662750-c0faf417-07b4-4f0e-93ab-5e0b82e3c793.png)


## Running against Auth Emulator

The demo page by default runs against the actual Auth Backend. To run against the Auth Emulator with mocked endpoints, do the following:

1. (Optional) If you are running against local changes to the Auth Emulator (see [Firebase CLI Contributing Guide](https://github.com/firebase/firebase-tools/blob/master/CONTRIBUTING.md)), make sure that your version of `firebase-tools` is executing against your `npm link`’d repository and that you've built your local emulator changes with `npm run build`.

2. From `auth/demo`, locally initialize a Firebase project by running `firebase init`. When asked "Which Firebase features do you want to set up for this directory?", select "Emulators". When asked "Which Firebase emulators do you want to set up?", select "Authentication Emulator". This will create a `firebase.json` file.

3. Change the constants `USE_AUTH_EMULATOR` and `AUTH_EMULATOR_URL` in `auth/demo/src/index.js` to `true` and `http://localhost:{port}` where the auth `port` can be found in the `firebase.json` file.

4. To run the app locally and against the Auth Emulator, simply issue the following command in the `auth/demo` directory:

```bash
yarn run demo:emulator
```

## Running against local changes to auth package

By default, the demo runs against the latest release of firebase-auth sdk. This can be modified by:

```
// packages/auth/demo/package.json
+  "@firebase/auth": "file:..",
-  "@firebase/auth": "0.18.0",
```

## Troubleshooting

### Errors about dependency not being installed, example `lerna: command not found`
  
  Ensure that you run `yarn` to install dependencies.

### `Failed to get Firebase project <project name>. Please make sure the project exists and your account has permission to access it.`

Logout, re-login and launch the demo

```bash
firebase logout && firebase login && yarn demo
```

### `Failed to list firebase projects` when running `firebase use --add`

Logout, re-login and add the project.

```bash
firebase logout && firebase login && firebase use --add
```

### `Access to localhost was denied` when accessing the demo app via http://localhost:5000

Most likely this means a different process is binding to localhost:5000.
You can access the demo app via http://127.0.0.1:5000 or use a different port using `yarn demo --port 5002`

Note - If you use 127.0.0.1 in your browser, you need to allowlist it as a domain for sign in, as shown below.

![image](https://user-images.githubusercontent.com/35932340/153659058-d669055f-b587-4bc2-9f32-323149df50c3.png)

### `hosting: Port 5000 is not open on localhost, could not start Hosting Emulator.`

This can happen when you run `yarn run demo:emulator` if port 5000 is taken.
Modify auth/demo/firebase.json with a custom port. Pick any port, this example picks 5091.

```
{
  //...
  "emulators": {
    "hosting": {
      "host": "",
      "port": "5091"
    }
  }
}
```

### Error message about functions

`The Cloud Functions emulator requires the module "firebase-admin" to be installed. This package is in your package.json, but it's not available. You probably need to run "npm install" in your functions directory.
i  functions: Your functions could not be parsed due to an issue with your node_modules (see above)
`

Run `npm install` inside the auth/demo/functions directory as mentioned in the error message.
