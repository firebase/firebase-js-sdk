# Firebase-Auth for web - Auth Demo

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

Copy `public/sample-config.js` to `public/config.js`:

```bash
cp public/sample-config.js public/config.js
```

Then copy and paste the Web snippet config found in the console (either by clicking "Add Firebase to
your web app" button in your Project overview, or clicking the "Web setup" button in the Auth page)
in the `config.js` file.

## Deploy

### Option 1: Compile and use local Firebase Auth files

To deploy the demo app, run the following command in the root directory of Firebase Auth (use `cd ..`
first if you are still in the `demo/` folder):

```bash
yarn run demo
```

This will compile all the files needed to run Firebase Auth, and start a Firebase server locally at
[http://localhost:5000](http://localhost:5000).

### Option 2: Use CDN hosted Firebase files

If you would prefer to use a CDN instead of locally compiled Firebase Auth files, you can instead
locate the following in the `<head>` tag of `public/index.html`:

```html
    <script src="dist/firebase-app.js"></script>
    <script src="dist/firebase-auth.js"></script>
    <script src="dist/firebase-database.js"></script>
```

Then replace that with the public CDN:

```html
    <script src="https://www.gstatic.com/firebasejs/4.6.0/firebase.js"></script>
```

Finally, ensure you are in the `demo/` folder (and not the root directory of Firebase Auth package),
and run:

```bash
yarn run demo
```

This will start a Firebase server locally at [http://localhost:5000](http://localhost:5000).
