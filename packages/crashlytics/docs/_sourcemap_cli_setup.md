### Stack Trace De-obfuscation (Source Map Uploading) - Firebase CLI Setup

Web applications compile, minify, and scramble code names in production. Without source maps, crash reports in the Firebase Console show minified stack traces (e.g. `at a (main.min.js:1:284)`). You can upload source maps using the Firebase CLI to de-obfuscate stack traces in your error reports.

#### 1. CLI Prerequisites & Authentication

1. Ensure that you have **Firebase CLI v15.19.1 or later** installed. Follow the instructions at [firebase.google.com/docs/cli](https://firebase.google.com/docs/cli) to set up or update the CLI.
2. Log in to the CLI, enable the Crashlytics for Web experiment, and set your project (these steps only need to be run once):

```bash
firebase login
firebase experiments:enable crashlyticsWeb
firebase use <YOUR_FIREBASE_PROJECT_ID>
```

#### 2. Uploading Source Maps

Upload source maps using the following command:

```bash
firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --debug <DIRECTORY>
```

> [!NOTE]
> This command will recursively look for all source maps within the supplied `<DIRECTORY>` path.

> [!CAUTION]
> **Security Warning**: Generating source maps may expose them to the public, potentially causing your source code to be leaked. You can prevent this by configuring your server to deny access to `.js.map` files, or by deleting them after uploading to Firebase but before deploying.
