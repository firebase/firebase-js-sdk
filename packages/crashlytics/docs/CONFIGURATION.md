# Configuration - Firebase Crashlytics

This guide details configuration options for Firebase Crashlytics, including session sampling rates, enabling/disabling telemetry collection, setting up alerting, and understanding the log payload schema.

---

## Sampling

If your app receives a large volume of traffic, we recommend taking advantage of the sampling rate configuration to control telemetry volume and Cloud Logging costs. The sampling rate indicates the proportion of user sessions for which telemetry data is collected.

You can configure the sampling rate for your web app to a value from **0% to 100%** (`0.0` to `1.0`), where **100%** means Crashlytics collects telemetry from all user sessions. The default is **100%**. Collecting fewer sessions reduces your Cloud Logging ingestion costs and client network usage, though it also reduces the number of individual error occurrences you can inspect.

> [!NOTE]
> Regardless of your sampling rate, the charts and issue counts shown in the Crashlytics dashboard in the Firebase Console are automatically extrapolated from the recorded session sampling rates so that they always reflect the true estimated volume of traffic.

### How Session Sampling Works

- **Per-session consistency**: Sampling decisions are made per session on the client device using a deterministic hash of the session ID and app ID. A session is either collected completely or discarded completely on the device before network transmission.
- **Rate update propagation**:
  - **Lowering the sampling rate** is enforced on the server **immediately** to stop unwanted ingestion costs right away, and propagates to active client devices within **15 minutes**.
  - **Raising the sampling rate** takes up to **15 minutes** to propagate to client devices and applies only to newly created sessions.

---

### Option 1: Configure Sampling in the Firebase Console (Recommended)

1. Open the [Firebase Console Crashlytics dashboard](https://console.firebase.google.com/u/0/project/_/crashlytics) and select your web app.
2. Click **Configure sampling** in the top action bar.
3. In the **Configure sampling for your app** dialog, use the slider or enter a value from **0% to 100%** to set the percentage of events and sessions collected from clients. Changes take effect automatically.

---

### Option 2: Set Sampling Rate in the Firebase Telemetry Admin API

You can use the Firebase Telemetry Admin REST API (`firebasetelemetryadmin.googleapis.com/v1alpha`) to programmatically manage telemetry collection settings for your Firebase applications.

#### API Setup & Variables

You can configure the following variables in your terminal to run the `curl` commands below:

```bash
PROJECT_ID="your-gcp-project-id"
LOCATION="global"
APP_ID="your-firebase-app-id" # e.g., 1:1234567890:web:abcdef1234567890
TOKEN=$(gcloud auth application-default print-access-token)
```

#### 1. Find your Config ID

Telemetry settings are managed via a `Config` resource. To find the specific Config ID for your app, list the configs in your project and filter by your `APP_ID`.

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

To adjust the sampling rate, use the standard `PATCH` method to update the `sampling_rate` field. You must specify `updateMask=sampling_rate` in the query parameters. The sampling rate is a `double` value from `0.0` to `1.0` representing the proportion of sessions to sample (e.g., `0.25` for 25%).

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

### Option 3: Create an Exclusion Filter in Cloud Logging

> [!IMPORTANT]
> Unlike configuring the Crashlytics sampling rate (Options 1 and 2 above), Cloud Logging exclusion filters drop logs **after** they are sent over the network by client devices and **will not** be extrapolated in the Crashlytics dashboard metrics. Use exclusion filters primarily when you want to filter out specific log patterns or severities at ingestion time.

#### Step 1: Navigate to the Logs Router

1. Open the Google Cloud Console.
2. Go to **Logging > Log Router**.
3. Locate the **_Default** sink (or your `firebase-telemetry` sink where your application logs are stored and billed).
4. Click the three vertical dots (**Actions**) on that row and select **Edit sink**.

#### Step 2: Create an LQL Exclusion Filter

1. Scroll down to the **Choose logs to filter out of sink** section.
2. Click **Add Exclusion**.
3. Provide a clear name for the filter (e.g., `exclude-debug-web-errors`).
4. In the **Build an exclusion filter** box, enter your LQL query statement to drop unnecessary logs.

#### Step 3: Write Your LQL Filter Expression to Sample a Percentage of Logs

You can use the built-in console settings to drop a specific **Exclusion Percentage** (e.g., drop 50% of error logs to maintain visibility while cutting storage costs in half).

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

### Force 100% Sampling for Debugging (Overrides)

When reproducing or investigating a specific issue during local development or QA testing, you can override the app's configured sampling rate and force **100% telemetry collection** for the current browser session by setting the `FIREBASE_TELEMETRY_DEBUG` flag in code or in the browser developer console:

```javascript
self.FIREBASE_TELEMETRY_DEBUG = true;
```

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

## Alerting

### Set up alerts in Error Reporting

If you want to be notified when a new or regressed error group appears, similar to your existing Crashlytics alerts, you can add alerts in Google Cloud Error Reporting. Crashlytics uses Cloud Error Reporting under the hood, making it simple to set up alerts.

1. Start by navigating to **Configure alerts in Cloud Error Reporting** in the top right corner of the Crashlytics console.
2. This opens Google Cloud Error Reporting in a new page. In the top right corner, click **Configure Notifications**.
3. From here, you can turn on alerts for any notification channel: mobile device, slack, webhook, and email.

### Advanced Alerting with Log-based Metrics

If you would like to configure advanced alerts, check out Cloud Alerting where you can create log-based metrics to alert on errors from a specific page, label, or custom metric.

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
