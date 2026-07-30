# Firebase Crashlytics for Web Apps - Setup Guide

> [!IMPORTANT]
> Crashlytics for Web Apps is currently in **Private Preview** and available only for enrolled EAP (Early Access Program) customers. If you are not yet enrolled, please fill out the [sign-up form](https://forms.gle/FYADWGcA2k924Nqt7) to request access before configuring your application.

We’re excited for you to try out Crashlytics for your web app and share your feedback!

Crashlytics for **Next.js, React, Angular, React Router, and TanStack Router apps** includes client-side error reporting, de-minified stack traces, and a dedicated dashboard in the Firebase Crashlytics Console.

Crashlytics for web apps uses Cloud Logging for telemetry storage and Cloud Storage for sourcemap storage under the hood, which are paid products with a generous free tier. Learn more about [Logging pricing](https://cloud.google.com/stackdriver/pricing) and [Storage pricing](https://cloud.google.com/storage/pricing).

As a private preview customer, your experience is incredibly valuable to our team. Please submit bugs, API feedback, or feature requests directly to our team by emailing [crashlytics-web@google.com](mailto:crashlytics-web@google.com) or filling out this [feedback form](https://forms.gle/).

---

## Table of Contents

- [Agent Setup Prompt](#agent-setup-prompt)
- [Step 1: Configure Firebase/Cloud Project](#step-1-configure-firebasecloud-project)
  - [Option 1: Using Firebase Console (Recommended)](#option-1-using-firebase-console-recommended)
  - [Option 2: Using gcloud CLI](#option-2-using-gcloud-cli)
- [Step 2: Core SDK Installation & Initialization](#step-2-core-sdk-installation--initialization)
- [Step 3: Framework-Specific Setup Guides](#step-3-framework-specific-setup-guides)
- [Additional Configuration & References](#additional-configuration--references)

---

## Agent Setup Prompt

You can ask your coding agent to do everything for you! Use our sample prompt below to set up Crashlytics for your web app automatically.

When you copy this into your coding agent, make sure to do the following before running:

1. Fill in the correct `apiKey` and `appId` for your web app in `firebaseConfig`, which can be found in the Firebase Console in **Settings > General**.
   *Note: This assumes you already have a Firebase project created with a web app within.*
2. Point your coding agent to the GitHub README files in `packages/crashlytics/`.

```markdown
I would like to onboard the Crashlytics JS SDK to my app. My firebase app config is as follows:

const firebaseConfig = {
  apiKey: "<YOUR_FIREBASE_API_KEY>",
  authDomain: "YOUR_PROJECT_NAME.firebaseapp.com",
  projectId: "YOUR_PROJECT_NAME",
  storageBucket: "YOUR_PROJECT_NAME.firebasestorage.app",
  appId: "<YOUR_FIREBASE_APP_ID>"
};

Follow the instructions in the Firebase Crashlytics Web Setup Guide GitHub READMEs for setting up the Crashlytics Web SDK. Start with the Cloud Project Setup (using the gcloud CLI), initialize the SDK, and then follow the Setup Guide for my app’s framework to enable automatic error collection. Do not set up programmatic error capturing for this project. Replace any of the "<SOME_VARIABLE>" values in the instructions with the appropriate values based on my Firebase app config above. Also make sure to set up source map uploading for stack trace de-obfuscation. If you encounter any issues during the setup process, please ask me and I can assist you further. Ensure that you have the necessary permissions to access the Firebase project and that you have the gcloud CLI installed and configured on your machine, logged in as me (ask me to log in on your behalf).
```

---

## Step 1: Configure Firebase/Cloud Project

Crashlytics for web leverages Google Cloud Logging, Error Reporting, and Storage under the hood. You can configure your project automatically using the Firebase Console (recommended), or manually using the `gcloud` CLI (useful when using coding agents).

> [!NOTE]
> If you are coming from an existing Google Cloud project and have not previously used Firebase with that project, you must accept the Firebase Terms of Service in the Firebase Console before proceeding with project setup.

### Option 1: Using Firebase Console (Recommended)

1. Navigate to the [Firebase Console Crashlytics page](https://firebase.corp.google.com/u/0/project/_/crashlytics).
2. Select your project.
3. Click **Set up** and follow the steps in the console.

---

### Option 2: Using gcloud CLI

If you prefer configuring your project via the command line or are relying on a coding agent to execute setup steps, do the following:

#### 1. User permissions and Billing

Ensure that you have **Owner** permissions to your Firebase/Cloud project. This is mandatory in order to be able to add roles and APIs in the subsequent steps.

Ensure your account has billing enabled. Crashlytics web support uses Cloud Logging for telemetry storage and Cloud Storage for sourcemap storage, which are paid products with a free tier. Learn more about [Logging pricing](https://cloud.google.com/stackdriver/pricing) and [Storage pricing](https://cloud.google.com/storage/pricing).

#### 2. Authentication and Project Selection

Authenticate with Google Cloud and select the correct project:

```bash
# Log in to Google Cloud CLI (opens a browser window for authentication)
gcloud auth login

# List all projects to locate the target Project ID
gcloud projects list

# Set the active project for subsequent commands
gcloud config set project <PROJECT_ID>
```

#### 3. Enable the Firebase Telemetry APIs

Enable the required API services in your Google Cloud project:

```bash
gcloud services enable firebasetelemetry.googleapis.com
gcloud services enable firebasetelemetryadmin.googleapis.com
```

> [!TIP]
> **Troubleshooting tip**: The Cloud Logging, Cloud Storage, Cloud Monitoring, and Cloud Telemetry APIs are also necessary and enabled by default. If you run into issues during setup, ensure these APIs are enabled.

#### 4. Restrict/Update the API Key

Find the API key used by your client app (e.g. **“Browser Key (auto created by Firebase)”**) and update its API restrictions to include `firebasetelemetry.googleapis.com`:

```bash
# 1. List all API keys in the project to find your key's ID/Name
gcloud services api-keys list

# 2. Inspect the key's current configuration to check for existing restrictions
gcloud services api-keys describe <KEY_ID>

# 3. Update the key to allow both the Telemetry API and any existing API targets
gcloud services api-keys update <KEY_ID> \
 $(gcloud services api-keys describe <KEY_ID> \
 --format="value(restrictions.apiTargets.service)" | sed 's/,/ /g' | awk '{print "--api-target=service=" $1}') \
 --api-target=service=firebasetelemetry.googleapis.com
```

#### 5. Enable Observability Analytics

Enable Observability Analytics for the `_Default` global bucket in order to view errors in the Firebase Console:

```bash
gcloud logging buckets update _Default --project=<PROJECT_ID> --location=global --enable-analytics
```

> [!NOTE]
> You must have an **Owner** role on the Cloud project or equivalent permission to do this.

---

## Step 2: Core SDK Installation & Initialization

Before configuring framework-specific integrations, complete the core package installation and Firebase App singleton setup:

### Install Packages

Install the core Firebase App package and the preview Crashlytics module:

```bash
npm install @firebase/app@eap-crashlytics @firebase/crashlytics@eap-crashlytics
```

### Initialize Firebase App Singleton

Create a central configuration utility file (`src/lib/firebase.ts`) using the credentials found in the Firebase Console under **Settings > General**. Both manual trackers and framework interfaces leverage this initialized `FirebaseApp` instance.

```typescript
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from '@firebase/app';

const firebaseConfig = {
  apiKey: "<YOUR_FIREBASE_API_KEY>",
  authDomain: "<YOUR_AUTH_DOMAIN>",
  projectId: "<YOUR_FIREBASE_PROJECT_ID>",
  storageBucket: "<YOUR_STORAGE_BUCKET>",
  messagingSenderId: "<YOUR_MESSAGING_SENDER_ID>",
  appId: "<YOUR_FIREBASE_APP_ID>"
};

// Guarantee singleton initialization
export const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();
```

---

## Step 3: Framework-Specific Setup Guides

> [!IMPORTANT]
> Make sure you have completed **Step 1 (Configure Firebase/Cloud Project)** and **Step 2 (Core SDK Installation & Initialization)** above before proceeding to your framework's setup guide below!

Select the guide matching your application framework:

- 🅰️ **[Angular Setup Guide](src/angular/README.md)**
- ⚛️ **[React Setup Guide](src/react/README.md)**
- 🛣️ **[React Router Setup Guide](src/react-router/README.md)**
- 🌼 **[TanStack Router Setup Guide](src/tanstack/README.md)**
- 🔺 **[Next.js Setup Guide](src/next/README.md)**

---

## Additional Configuration & References

For advanced usage options and project configuration details, consult the following guides:

- 🚀 **[Advanced Usage Guide](docs/ADVANCED_USAGE.md)**:
  - 🏷️ **[App Versioning](docs/ADVANCED_USAGE.md#app-versioning)**: Set up build script helpers to tag telemetry with commit hashes/versions.
  - ⚡ **[Programmatic Error Capturing](docs/ADVANCED_USAGE.md#programmatic-error-capturing)**: Manually record handled exceptions with custom metadata.
  - 🧹 **[Force Flushing](docs/ADVANCED_USAGE.md#force-flushing-telemetry-records-flush)**: Upload queued error telemetry immediately before unload.
  - 💡 **[Best Practices & Gotchas](docs/ADVANCED_USAGE.md#best-practices--gotchas)**: Guidelines on import paths and framework best practices.
- ⚙️ **[Configuration Guide](docs/CONFIGURATION.md)**:
  - 🔔 **[Alerting](docs/CONFIGURATION.md#alerting)**: Configure alerts in Error Reporting and advanced log-based metrics.
  - 🎚️ **[Sampling](docs/CONFIGURATION.md#sampling)**: Control telemetry volume and costs using the Admin API or Cloud Logging exclusion filters.
  - ⚙️ **[Enable/Disable Telemetry Collection](docs/CONFIGURATION.md#enabledisable-telemetry-collection)**: Programmatically turn telemetry collection on or off.
  - 📋 **[Log Schema](docs/CONFIGURATION.md#log-schema)**: Full reference for telemetry log fields and payload structures.
