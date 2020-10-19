# Firebase-Auth for web - Auth Demo (Auth Compatibility Layer)

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
cd firebase-js-sdk/packages-exp/auth-compat-exp/demo
```

This will clone the repository in the current directory.

If you want to be able to deploy the demo app to one of your own Firebase Hosting instance,
configure it using the following command:

```bash
firebase use --add
```

Select the project you have created in the prerequisite, and type in `default` or
any other name as the alias to use for this project.

Copy `public/sample-config.js` to `public/config.js`:

```bash
cp public/sample-config.js public/config.js
```

Then copy and paste the Web snippet config found in the console (either by clicking "Add Firebase to
your web app" button in your Project overview, or clicking the "Web setup" button in the Auth page)
in the `config.js` file.

In the `functions` folder you'll need to install the admin SDK:

```bash
cd functions
yarn install
```

## Deploy

Before deploying, you may need to build the auth-exp package:
```bash
yarn build:deps
```

You'll also need to build a fully resolved firebase-app.js and firebase-auth.js from auth-compat-exp:

```bash
yarn build
```

This can take some time, and you only need to do it if you've modified the auth-exp or auth-compta-exp packages.

To run the app locally, simply issue the following command in the `auth-compat-exp/demo` directory:

```bash
yarn run demo
```

This will compile all the files needed to run Firebase Auth, and start a Firebase server locally at
[http://localhost:5000](http://localhost:5000).

