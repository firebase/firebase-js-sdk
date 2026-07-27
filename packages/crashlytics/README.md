# Firebase Crashlytics for Web Apps - Setup Guide

We’re excited for you to try out Crashlytics for your web app and share your feedback!

Crashlytics for **Next.js, React, and Angular apps** includes client-side error reporting, de-minified stack traces, and a dedicated dashboard in the Firebase Crashlytics Console.

Crashlytics for web apps uses Cloud Logging for telemetry storage and Cloud Storage for sourcemap storage under the hood, which are paid products with a generous free tier. Learn more about [Logging pricing](https://cloud.google.com/stackdriver/pricing) and [Storage pricing](https://cloud.google.com/storage/pricing).

As a private preview customer, your experience is incredibly valuable to our team. Please submit bugs, API feedback, or feature requests directly to our team by emailing [crashlytics-web@google.com](mailto:crashlytics-web@google.com) or filling out this [feedback form](https://forms.gle/).

---

## Framework-Specific Setup Guides

To get started with manual app setup for your specific framework, select one of the following setup guides:

- 🅰️ **[Angular Setup Guide](src/angular/README.md)**
- ⚛️ **[React Setup Guide](src/react/README.md)**
- 🛣️ **[React Router Setup Guide](src/react-router/README.md)**
- 🔺 **[Next.js Setup Guide](src/next/README.md)**

---

## Table of Contents

- [Agent Setup Prompt](#agent-setup-prompt)
- [Configure Firebase/Cloud Project](#configure-firebasecloud-project)
  - [Using gcloud CLI](#using-gcloud-cli)
  - [Using Cloud Console UI](#using-cloud-console-ui)
- [App Versioning](#app-versioning)
- [Alerting](#alerting)
  - [Set up alerts in Error Reporting](#set-up-alerts-in-error-reporting)
  - [Advanced Alerting with Log-based Metrics](#advanced-alerting-with-log-based-metrics)
- [Sampling](#sampling)
  - [Option 1: Set Sample rate in the Firebase Telemetry Admin API](#option-1-set-sample-rate-in-the-firebase-telemetry-admin-api)
  - [Option 2: Create an Exclusion Filter in Cloud Logging](#option-2-create-an-exclusion-filter-in-cloud-logging)
- [Enable/Disable Telemetry Collection](#enabledisable-telemetry-collection)
- [Log Schema](#log-schema)
- [Feedback & Support](#feedback--support)

---

## Agent Setup Prompt

You can ask your coding agent to do everything for you! Use our sample prompt below to set up Crashlytics for your web app automatically.

When you copy this into your coding agent, make sure to do the following before running:

1. Fill in the correct `apiKey` and `appId` for your web app in `firebaseConfig`, which can be found in the Firebase Console in **Settings > General**.
   *Note: This assumes you already have a Firebase project created with a web app within.*
2. Download the Setup Guide doc as a PDF (**File -> Download -> PDF Document (.pdf)** -> set Tab drop-down to **All Tabs -> Export**), then place it at the root of your project folder or prompt.

```javascript
const firebaseConfig = {
  apiKey: "<YOUR_FIREBASE_API_KEY>",
  authDomain: "YOUR_PROJECT_NAME.firebaseapp.com",
  projectId: "YOUR_PROJECT_NAME",
  storageBucket: "YOUR_PROJECT_NAME.firebasestorage.app",
  appId: "<YOUR_FIREBASE_APP_ID>"
};
```

> *I would like to onboard the Crashlytics JS SDK to my app. My firebase app config is as follows:*
> ```javascript
> const firebaseConfig = {
>   apiKey: "<YOUR_FIREBASE_API_KEY>",
>   authDomain: "YOUR_PROJECT_NAME.firebaseapp.com",
>   projectId: "YOUR_PROJECT_NAME",
>   storageBucket: "YOUR_PROJECT_NAME.firebasestorage.app",
>   appId: "<YOUR_FIREBASE_APP_ID>"
> };
> ```
> *Follow the instructions in "Crashlytics Web Private Preview - Setup Guide.pdf" for setting up the Crashlytics Web SDK. Start with the Cloud Project Setup (using the gcloud CLI), and then follow the Setup Guide for my app’s framework to enable automatic error collection. Do not set up programmatic error capturing for this project. Replace any of the "<SOME_VARIABLE>" values in the instructions with the appropriate values based on my Firebase app config above. Also make sure to set up source map uploading for stack trace de-obfuscation. If you encounter any issues during the setup process, please ask me and I can assist you further. Ensure that you have the necessary permissions to access the Firebase project and that you have the gcloud CLI installed and configured on your machine, logged in as me (ask me to log in on your behalf).*

---

## Configure Firebase/Cloud Project

Crashlytics for web leverages Cloud Logging, Error Reporting, and Storage under the hood, so we need to enable these APIs and grant roles/permissions in Google Cloud in order to write error logs to Crashlytics. You can choose to follow the steps using the `gcloud` CLI or the Cloud Console UI.

### Using gcloud CLI

Once you have a Firebase/Cloud project created, do the following:

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

### Using Cloud Console UI

Once you have a Firebase project created, do the following:

1. Ensure that you have **Owner** permissions to your Firebase/Cloud project. This is mandatory in order to be able to add roles and APIs in the subsequent steps.
2. Enable the **Firebase Telemetry API** for your project here:
   `https://console.cloud.google.com/apis/library/firebasetelemetry.googleapis.com`
   And the **Firebase Telemetry Admin API** for your project here:
   `https://console.cloud.google.com/apis/library/firebasetelemetryadmin.googleapis.com`
   *Troubleshooting tip: The Cloud Logging, Cloud Storage, Cloud Monitoring, and Cloud Telemetry APIs are also necessary and enabled by default. If you run into issues during setup, ensure these APIs are enabled.*
3. Navigate to the **APIs & Services -> Credentials** page, then:
   a. Click on **“Browser Key (auto created by Firebase)”**.
      *Note: This should be the same API key that you’ll use during initial setup in the next step.*
   b. Add **Firebase Telemetry API** to the list of allowed APIs.
   c. Click **“Save”**.
4. Enable **Observability Analytics**, which powers key metrics such as Errors per Session.
   Navigate to the Observability Analytics page, and then:
   a. Click on the **“Upgrade log buckets”** button in the top banner.
   b. Select the **“_Default”** bucket in the “Upgrade log bucket” sidebar.
   c. Click **“Upgrade”**.
   *Note: You must have an “Owner” role on the Cloud project or equivalent permission to do this.*

---

## App Versioning

Adding a version to your app is recommended, but not required. We have a helper `setconstants.js` script that tries to determine a version for your app based in precedent order (current GitHub commit hash, `package.json` version). Update the following build scripts in your `package.json` as follows:

```json
"dev": "npm run firebase-set-constants && <existing command>",
"build": "npm run firebase-set-constants && <existing command>",
"start": "npm run firebase-set-constants && <existing command>",
"firebase-set-constants": "node ./node_modules/@firebase/crashlytics/setconstants.js",
```

---

## Alerting

### Set up alerts in Error Reporting

If you want to be notified when a new or regressed error group appears, similar to your existing Crashlytics alerts, you can add alerts in Google Cloud Error Reporting. Crashlytics uses Cloud Error Reporting under the hood, making it simple to set up alerts.

1. Start by navigating to **Configure alerts in Cloud Error Reporting** in the top right corner of the Crashlytics console.
2. This opens Google Cloud Error Reporting in a new page. In the top right corner, click **Configure Notifications**.
3. From here, you can turn on alerts for any notification channel: mobile device, slack, webhook, and email.

### Advanced Alerting with Log-based Metrics

If you would like to configure advanced alerts, check out Cloud Alerting where you can create log-based metrics to alert on errors from a specific page, label, or custom metric.

---

## Sampling

You may decide to sample a proportion of your sessions to control volume and costs. This can be accomplished with the Firebase Telemetry Admin API or by creating an Exclusion Filter in Cloud Logging.

### Option 1: Set Sample rate in the Firebase Telemetry Admin API

You can use the Firebase Telemetry Admin REST API (`firebasetelemetryadmin.googleapis.com/v1alpha`) to manage telemetry collection settings for your Firebase applications.

#### API Setup & Variables

You can configure the following variables in your terminal to run the `curl` commands below:

```bash
PROJECT_ID="your-gcp-project-id"
LOCATION="global"
APP_ID="your-firebase-app-id" # e.g., 1:1234567890:android:abcdef1234567890
TOKEN=$(gcloud auth application-default print-access-token)
```

#### 1. Find your Config ID

Telemetry settings are managed via a Config resource. To find the specific Config ID for your app, list the configs in your project and filter by your `APP_ID`.

The `curl -G` and `--data-urlencode` flags ensure the AIP-160 filter string is correctly URL-encoded.

```bash
curl -G \
 -H "Authorization: Bearer $TOKEN" \
 --data-urlencode "filter=app_id=\"${APP_ID}\"" \
 "https://firebasetelemetryadmin.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/configs"
```

In the JSON response, locate the `name` field for your app. It will look like `projects/.../configs/<CONFIG_ID>`. Extract that ID and set your final variables:

```bash
CONFIG_ID="your-config-id-from-response"
CONFIG_NAME="projects/${PROJECT_ID}/locations/${LOCATION}/configs/${CONFIG_ID}"
```

#### 2. Set the Sampling Rate

To adjust the sampling rate, use the standard `PATCH` method to update the `sampling_rate` field. You must specify `updateMask=sampling_rate` in the query parameters. The sampling rate is a double value representing a percentage (e.g., `0.25` for 25%).

*Note: You must have an “Owner” role on the Cloud project or equivalent permission to do this.*

```bash
# Example: Set sampling rate to 25%
curl -X PATCH \
 -H "Authorization: Bearer $TOKEN" \
 -H "Content-Type: application/json" \
 -d '{
  "sampling_rate": 0.25,
  "app_id": "'"${APP_ID}"'"
  }' \
 "https://firebasetelemetryadmin.googleapis.com/v1alpha/${CONFIG_NAME}?updateMask=sampling_rate"
```

---

### Option 2: Create an Exclusion Filter in Cloud Logging

#### Step 1: Navigate to the Logs Router

1. Open the Google Cloud Console.
2. Go to **Logging > Log Router**.
3. Locate the **_Default** sink (this is the default bucket where your application logs are stored and billed).
4. Click the three vertical dots (**Actions**) on that row and select **Edit sink**.

#### Step 2: Create an LQL Exclusion Filter

1. Scroll down to the **Choose logs to filter out of sink** section.
2. Click **Add Exclusion**.
3. Provide a clear name for the filter (e.g., `exclude-debug-web-errors`).
4. In the **Build an exclusion filter** box, enter your LQL query statement to drop unnecessary logs.

#### Step 3: Write Your LQL Filter Expression to Sample a Percentage of Logs

You can use the built-in console settings to drop a specific **Exclusion Percentage** (e.g., drop 50% of error logs to maintain visibility while slashing costs in half).

```javascript
// Exclude (drop) 50% of ERROR logs
severity=(ERROR) AND sample(insert_id, 0.5)
```

#### Step 4: Save and Monitor

1. Click **Update Sink** to apply the filter.
2. Any logs matching your LQL query will now be dropped *before* ingestion, avoiding storage and indexing fees.
3. Head over to the **Log Storage** page in the console over the next few days to track your reduced volume usage!

> [!TIP]
> Always test your LQL query in the **Logs Explorer** first to make sure it matches the exact logs you want to throw away before adding it to your live exclusion filter!

---

## Enable/Disable Telemetry Collection

If you need to enable or disable telemetry collection after you have set up and installed the Crashlytics SDK, you can manage telemetry collection using the Firebase Telemetry Admin API.

### Enable/Disable Telemetry Collection using the Firebase Telemetry Admin API

You can use the Firebase Telemetry Admin REST API (`firebasetelemetryadmin.googleapis.com/v1alpha`) to manage telemetry collection settings for your Firebase applications.

#### API Setup & Variables

You can configure the following variables in your terminal to run the `curl` commands below:

```bash
PROJECT_ID="your-gcp-project-id"
LOCATION="global"
APP_ID="your-firebase-app-id" # e.g., 1:1234567890:android:abcdef1234567890
TOKEN=$(gcloud auth application-default print-access-token)
```

#### 1. Find your Config ID

Telemetry settings are managed via a Config resource. To find the specific Config ID for your app, list the configs in your project and filter by your `APP_ID`.

The `curl -G` and `--data-urlencode` flags ensure the AIP-160 filter string is correctly URL-encoded.

```bash
curl -G \
 -H "Authorization: Bearer $TOKEN" \
 --data-urlencode "filter=app_id=\"${APP_ID}\"" \
 "https://firebasetelemetryadmin.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/configs"
```

In the JSON response, locate the `name` field for your app. It will look like `projects/.../configs/<CONFIG_ID>`. Extract that ID and set your final variables:

```bash
CONFIG_ID="your-config-id-from-response"
CONFIG_NAME="projects/${PROJECT_ID}/locations/${LOCATION}/configs/${CONFIG_ID}"
```

#### 2. Disable Telemetry Collection

Telemetry collection is enabled by default. To disable telemetry collection, use the `:disable` custom method:

```bash
curl -X POST \
 -H "Authorization: Bearer $TOKEN" \
 -H "Content-Type: application/json" \
 -d '{}' \
 "https://firebasetelemetryadmin.googleapis.com/v1alpha/${CONFIG_NAME}:disable"
```

This can then be re-enabled by using the `:enable` method:

```bash
curl -X POST \
 -H "Authorization: Bearer $TOKEN" \
 -H "Content-Type: application/json" \
 -d '{}' \
 "https://firebasetelemetryadmin.googleapis.com/v1alpha/${CONFIG_NAME}:enable"
```

---

## Log Schema

Here is the schema from a sample log with all of the fields that you can expect to see:

```json
{
  "insertId": "insert_id",
  "jsonPayload": {
    "exception.stacktrace": "stacktrace",
    "exception.message": "test error",
    "exception.type": "Error"
  },
  "httpRequest": {
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36,gzip(gfe)"
  },
  "resource": {
    "type": "firebasetelemetry.googleapis.com/App",
    "labels": {
      "resource_container": "projects/YOUR_PROJECT_ID",
      "location": "global",
      "app_id": "YOUR_APP_ID",
      "app_version": ""
    }
  },
  "timestamp": "2026-06-25T21:19:44.619Z",
  "severity": "ERROR",
  "labels": {
    "attr": "value",
    "app.installation.id": "YOUR_INSTALLATION_ID",
    "exception.type": "Error",
    "service.name": "YOUR_APP_ID",
    "app_id": "YOUR_APP_ID",
    "location": "global",
    "session.id": "YOUR_SESSION_ID",
    "exception.stacktrace": "stacktrace",
    "gcp.resource_type": "firebasetelemetry.googleapis.com/App",
    "exception.message": "test error",
    "gcp.telemetry_type": "standard",
    "service.version": "",
    "cloud.resource.id": "//firebasetelemetry.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/",
    "gcp.project.id": "projects/YOUR_PROJECT_ID",
    "user_agent.version": "150",
    "gcp.project_id": "YOUR_PROJECT_ID",
    "resource_container": "projects/YOUR_PROJECT_ID",
    "os.version": "10_15_7",
    "browser.platform": "macintosh",
    "gcp.telemetry_config.service": "firebasetelemetry.googleapis.com",
    "os.name": "intel mac os x",
    "user_agent.name": "chrome",
    "app.build_id": "unset"
  },
  "logName": "projects/YOUR_PROJECT_ID/logs/firebasetelemetry.googleapis.com%2Fevents",
  "receiveTimestamp": "2026-06-25T21:19:45.105200710Z",
  "errorGroups": [
    {
      "id": "error_group_id"
    }
  ],
  "otel": {
    "resource": {
      "attributes": {
        "gcp.resource_type": "firebasetelemetry.googleapis.com/App",
        "service.version": "",
        "user_agent.version": "150",
        "cloud.resource.id": "//firebasetelemetry.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/",
        "gcp.project.id": "projects/YOUR_PROJECT_ID",
        "os.version": "10_15_7",
        "gcp.project_id": "YOUR_PROJECT_ID",
        "resource_container": "projects/YOUR_PROJECT_ID",
        "browser.platform": "macintosh",
        "os.name": "intel mac os x",
        "user_agent.name": "chrome",
        "app.build_id": "",
        "service.name": "firebase_telemetry_service",
        "app_id": "YOUR_APP_ID",
        "location": "global",
        "user_agent.original": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36,gzip(gfe)"
      }
    }
  }
}
```

---

## Feedback & Support

As a private preview customer, your experience and feedback is incredibly valuable to our team. Please reach out with questions and submit bugs, API feedback, or feature requests directly to our team by emailing [crashlytics-web@google.com](mailto:crashlytics-web@google.com) or filling out this [feedback form](https://forms.gle/).
