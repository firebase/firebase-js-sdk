# Configuration - Firebase Crashlytics

This guide details configuration options for Firebase Crashlytics, including session sampling rates, enabling/disabling telemetry collection, setting up alerting, and understanding the log payload schema.

---

## Sampling

If your app receives a large volume of traffic, we recommend taking advantage of the sampling rate configuration to control telemetry volume and Cloud Logging costs. The sampling rate indicates the proportion of user sessions for which telemetry data is collected.

You can configure the sampling rate for your web app to a value from **0% to 100%** (`0.0` to `1.0`), where **100%** means Crashlytics collects telemetry from all user sessions. The default is **100%**. Collecting fewer sessions reduces your Cloud Logging ingestion costs and client network usage, though it also reduces the number of individual error occurrences you can inspect.

> [!NOTE]
> Regardless of your sampling rate, the charts and issue counts shown in the Crashlytics dashboard in the Firebase Console are automatically extrapolated from the recorded session sampling rates so that they always reflect the true estimated volume of traffic.

### How Session Sampling Works

- **Whole sessions, decided on the device**: When a session first exports telemetry, the SDK decides whether to keep it, using a deterministic hash of the session ID: `MurmurHash3(session.id) % 10000 / 10000 < sampling_rate`. The decision is saved in `sessionStorage` and kept until the session ends (when the tab is closed), including across page reloads. Telemetry from unsampled sessions is dropped on the device and never sent.
- **Sampling attributes**: Every log record and span from a sampled session carries `session.sampling.rate`, the rate the session was sampled at. Crashlytics weights each event by `1 / session.sampling.rate` to extrapolate dashboard metrics. Debug sessions also carry `session.sampling.forced = true` (see [Force 100% Sampling for Debugging](#force-100-sampling-for-debugging-overrides)).
- **Configuration**: The SDK fetches the sampling configuration with an unauthenticated `GET` request to the Firebase Telemetry API (`firebasetelemetry.googleapis.com`, or `firebasetelemetry.{region}.rep.googleapis.com` when you set a `region`) and caches it in `localStorage`. The request itself is never recorded as telemetry. It fetches when the SDK starts and right before a session's decision, and refreshes periodically while the page is visible until that decision is made. Your app is never blocked: only the session's first export waits for the configuration, for at most 2 seconds. Until a configuration is available, every session is collected; if a fetch fails, the last known configuration stays in effect.
- **Rate changes**: Configuration responses can be cached for up to 16 minutes (15 minutes plus 1 minute of revalidation), so a new rate applies to sessions that start about 16 minutes after you change it. Sessions in progress keep their decision.
  - **Lowering the rate** also takes effect immediately on the server, which re-checks the same hash against the new rate and drops sessions that no longer qualify.
  - **Raising the rate** applies only to sessions that start after the change reaches the device.
- **Pausing or disabling collection**: At a rate of `0.0`, or when telemetry collection is disabled, the server drops incoming telemetry right away, and new sessions stop sending once the change reaches the device. Debug sessions are still collected at a rate of `0.0`, but not when collection is disabled.

---

### Option 1: Configure Sampling in the Firebase Console (Recommended)

1. Open the [Firebase Console Crashlytics dashboard](https://console.firebase.google.com/u/0/project/_/crashlytics) and select your web app.
2. Click **Configure sampling** in the top action bar.
3. In the **Configure sampling for your app** dialog, use the slider or enter a value from **0% to 100%** to set the percentage of events and sessions collected from clients. Changes reach your app within about 16 minutes (see [How Session Sampling Works](#how-session-sampling-works)).

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

As with the console, the new rate reaches your app within about 16 minutes (see [How Session Sampling Works](#how-session-sampling-works)).

---

### Option 3: Create an Exclusion Filter in Cloud Logging

> [!IMPORTANT]
> Unlike configuring the Crashlytics sampling rate (Options 1 and 2 above), Cloud Logging exclusion filters drop logs **after** they are sent over the network by client devices and **won't** be projected in the Crashlytics dashboard metrics. Use exclusion filters primarily when you want to filter out specific log patterns or severities at ingestion time.

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

To reproduce or investigate an issue during development or QA testing, you can collect **all** of the current browser session's telemetry, regardless of the configured sampling rate:

- **In code or in the browser developer console**:

  ```javascript
  self.FIREBASE_TELEMETRY_DEBUG = true;
  ```

- **For a user's session**: ask them to open your app with the `firebase_telemetry_debug=true` query parameter, for example `https://example.com/?firebase_telemetry_debug=true`. The SDK remembers it in `sessionStorage` for the rest of the browser session, including after in-app navigation.

The override applies from the session's next export, even mid-session, and the session stays fully collected until it ends, even if you turn the override off. Telemetry dropped before then isn't recovered. Debug sessions are sent with `session.sampling.rate = 1.0` and `session.sampling.forced = true`, so the server keeps them in full instead of re-sampling them. This applies even at a sampling rate of `0.0`, but not when telemetry collection is disabled.

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

The server drops the app's telemetry right away, and devices stop sending for new sessions within about 16 minutes (see [How Session Sampling Works](#how-session-sampling-works)).

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

Crashlytics for Web supports **email alerts** to notify you when issues occur in your web app:

- **New issues**: Triggered when a new error group is detected in your app.
- **Regressed issues**: Triggered when a previously closed issue reoccurs.

Under the hood, Crashlytics uses **Google Cloud Monitoring** to provision app-scoped alert policies and attach your email address as a notification channel. Alert emails include Firebase branding, app and version metadata, the error type and message, and a direct link to investigate the issue in the Firebase Console.

> - You need the following permissions to set up alerting:
>   - Basic Google Cloud project **`Owner` (`roles/owner`)** or **`Editor` (`roles/editor`)** roles include all required permissions out of the box.
>   - **Firebase-scoped roles alone** (such as `Firebase Admin` (`roles/firebase.admin`), `Firebase Editor` (`roles/firebase.editor`), `Firebase Quality Admin` (`roles/firebase.qualityAdmin`), or `Firebase Crashlytics Admin` (`roles/firebasecrashlytics.admin`)) grant `firebasecrashlytics.config.update`, **but do not include the required Cloud Monitoring permissions**.
>   - If you use predefined or custom roles instead of project `Owner`/`Editor`, ensure your account has **both**:
>     1. **Crashlytics configuration access**: `roles/firebasecrashlytics.admin`, `roles/firebase.qualityAdmin`, `roles/firebase.editor`, or `roles/firebase.admin`:
>        - `firebasecrashlytics.config.get`
>        - `firebasecrashlytics.config.update`
>     2. **Cloud Monitoring alert & notification channel access**: `Monitoring Editor` (`roles/monitoring.editor`), or both `Monitoring AlertPolicy Editor` (`roles/monitoring.alertPolicyEditor`) and `Monitoring NotificationChannel Editor` (`roles/monitoring.notificationChannelEditor`):
>        - `monitoring.alertPolicies.get`
>        - `monitoring.alertPolicies.list`
>        - `monitoring.alertPolicies.create`
>        - `monitoring.alertPolicies.update`
>        - `monitoring.notificationChannels.get`
>        - `monitoring.notificationChannels.list`
>        - `monitoring.notificationChannels.create`
>        - `monitoring.notificationChannels.update`
> - **Language & Sender**: Alert emails are sent from `alerting-noreply@google.com` and are localized based on your Google Account language preference at the time the alert policy is created. If you later change your account language, the alert language will not update automatically. To update it, disable and re-enable the alert.
> - **Avoiding Duplicate Alerts**: If you previously enabled native notifications directly in **Google Cloud Error Reporting** during earlier testing, disable those native Error Reporting notifications to avoid receiving duplicate emails.

---

### Option 1: Set up email alerts in the Firebase Console (UI)

You can enable or manage email alerts either during initial project setup or at any time afterward in your Firebase project settings.

#### During project setup

1. Open the [Firebase Console Crashlytics dashboard](https://console.firebase.google.com/u/0/project/_/crashlytics) and start the Crashlytics web setup flow.
2. In the **Set Up Alerts (Optional)** step, select the email alerts you want to receive at your signed-in email address (**New issues** and **Regressed issues** are selected by default).
3. Click **Continue** to automatically create the Cloud Monitoring alert policies and subscribe your email address.

#### Project alert settings

1. From the [Firebase Console Crashlytics dashboard](https://console.firebase.google.com/u/0/project/_/crashlytics), click the **Manage alerts** button in the top-right corner, or navigate directly to **Project settings > Alerts** (`https://console.firebase.google.com/project/_/settings/alerts`).
2. Locate the **Crashlytics** card and select your web app from the **Select an app** dropdown.
3. For **New issues** and **Regressed issues**, open the **Select channels** dropdown and check **Email** (under **Personal settings**). Alerts will be sent to the email address associated with your signed-in Firebase Console account.

> [!TIP]
> You can temporarily mute or unmute all personal email notifications across the project using the **Receive email and in-console alerts for this project** toggle at the top of the **Alerts** page. Re-enabling this toggle automatically restores your previous web alert subscriptions.

---

### Option 2: Set up email alerts via the Firebase CLI

Configure email alerts directly from your terminal during setup:

```bash
firebase crashlytics:setup <YOUR_FIREBASE_APP_ID> --project <YOUR_FIREBASE_PROJECT_ID>
```

During the interactive setup flow, you will be prompted to choose which email alerts to enable for your authenticated account (**New issues** and **Regressed issues** are selected by default):

```text
? Which email alerts would you like to enable? (Optional)
 ◉ New issues (Notify when a new issue is detected)
 ◉ Regressed issues (Notify when a closed issue reoccurs)
```

---

### Advanced alerting in Google Cloud Monitoring

Because Crashlytics for Web alerts are built on Google Cloud Monitoring and Cloud Logging, you can also configure custom log-based metrics or attach additional project-level notification channels (such as Slack, PagerDuty, webhooks, or Pub/Sub) directly in **Google Cloud Console > Monitoring > Alerting**.

---

## Log Schema

Here is the schema from a sample log with all of the fields that you can expect to see. With session sampling, `labels` also includes `session.sampling.rate`, plus `session.sampling.forced` for debug sessions:

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
    "cloud.resource.id": "//clienttelemetry.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/",
    "gcp.project.id": "projects/YOUR_PROJECT_ID",
    "user_agent.version": "150",
    "gcp.project_id": "YOUR_PROJECT_ID",
    "resource_container": "projects/YOUR_PROJECT_ID",
    "os.version": "10_15_7",
    "browser.platform": "macintosh",
    "gcp.telemetry_config.service": "clienttelemetry.googleapis.com",
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
        "cloud.resource.id": "//clienttelemetry.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/",
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
