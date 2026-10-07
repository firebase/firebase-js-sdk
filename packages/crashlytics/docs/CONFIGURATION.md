# Configuration - Firebase Crashlytics

This guide details configuration options for Firebase Crashlytics, including session sampling rates, enabling/disabling telemetry collection, setting up alerting, and understanding the log payload schema.

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

## Alerting

Crashlytics for Web supports **email alerts** to notify you when issues occur in your web app:

- **New issues**: Triggered when a new error group is detected in your app.
- **Regressed issues**: Triggered when a previously closed issue reoccurs.

Under the hood, Crashlytics uses **Google Cloud Monitoring** to provision app-scoped alert policies and attach your email address as a notification channel. Alert emails include Firebase branding, app and version metadata, the error type and message, and a direct link to investigate the issue in the Firebase Console.

> [!NOTE]
> - **Permissions**:
>   - Basic Google Cloud project **`Owner` (`roles/owner`)** or **`Editor` (`roles/editor`)** roles include all required permissions out of the box.
>   - **Firebase-scoped roles alone** (such as `Firebase Admin` (`roles/firebase.admin`), `Firebase Editor` (`roles/firebase.editor`), `Firebase Quality Admin` (`roles/firebase.qualityAdmin`), or `Firebase Crashlytics Admin` (`roles/firebasecrashlytics.admin`)) grant `firebasecrashlytics.config.update`, **but do not include the required Cloud Monitoring permissions**.
>   - If you use predefined or custom roles instead of project `Owner`/`Editor`, ensure your account has **both**:
>     1. **Crashlytics configuration access**: `roles/firebasecrashlytics.admin`, `roles/firebase.qualityAdmin`, `roles/firebase.editor`, or `roles/firebase.admin` (`firebasecrashlytics.config.get` and `firebasecrashlytics.config.update`).
>     2. **Cloud Monitoring alert & notification channel access**: `Monitoring Editor` (`roles/monitoring.editor`), or both `Monitoring AlertPolicy Editor` (`roles/monitoring.alertPolicyEditor`) and `Monitoring NotificationChannel Editor` (`roles/monitoring.notificationChannelEditor`) (`monitoring.alertPolicies.get`, `monitoring.alertPolicies.list`, `monitoring.alertPolicies.create`, `monitoring.alertPolicies.update`, `monitoring.notificationChannels.get`, `monitoring.notificationChannels.list`, `monitoring.notificationChannels.create`, and `monitoring.notificationChannels.update`).
> - **Language & Sender**: Alert emails are sent from `alerting-noreply@google.com` and are localized based on your Google Account language preference at the time the alert policy is created.
> - **Avoiding Duplicate Alerts**: If you previously enabled native notifications directly in **Google Cloud Error Reporting** during earlier testing, disable those native Error Reporting notifications to avoid receiving duplicate emails.

---

### Option 1: Set up email alerts in the Firebase Console (UI)

You can enable or manage email alerts either during initial project onboarding or at any time afterward in your Firebase project settings.

#### During project onboarding

1. Open the [Firebase Console Crashlytics dashboard](https://console.firebase.google.com/u/0/project/_/crashlytics) and start the Crashlytics web onboarding flow.
2. In the **Set Up Alerts (Optional)** step, select the email alerts you want to receive at your signed-in email address (**New issues** and **Regressed issues** are selected by default).
3. Click **Continue** to automatically create the Cloud Monitoring alert policies and subscribe your email address.

#### Anytime in project alert settings

1. From the [Firebase Console Crashlytics dashboard](https://console.firebase.google.com/u/0/project/_/crashlytics), click the **Manage alerts** button in the top-right corner, or navigate directly to **Project settings > Alerts** (`https://console.firebase.google.com/project/_/settings/alerts`).
2. Locate the **Crashlytics** card and select your web app from the **Select an app** dropdown.
3. For **New issues** and **Regressions**, open the **Select channels** dropdown and check **Email** (under **Personal settings**). Alerts will be sent to the email address associated with your signed-in Firebase Console account.

> [!TIP]
> You can temporarily mute or unmute all personal email notifications across the project using the **Receive email and in-console alerts for this project** toggle at the top of the **Alerts** page. Re-enabling this toggle automatically restores your previous web alert subscriptions.

---

### Option 2: Set up email alerts via the Firebase CLI

When onboarding your web app with the Firebase CLI, enable the `crashlyticsWebAlerts` experiment alongside `crashlyticsWeb` to configure email alerts directly from your terminal:

```bash
firebase experiments:enable crashlyticsWeb
firebase experiments:enable crashlyticsWebAlerts
firebase crashlytics:onboard:web <YOUR_FIREBASE_APP_ID> --project <YOUR_FIREBASE_PROJECT_ID>
```

During the interactive onboarding flow, you will be prompted to choose which email alerts to enable for your authenticated account (**New issues** and **Regressed issues** are selected by default):

```text
? Which email alerts would you like to enable? (Optional)
 ◉ New issues (Notify when a new issue is detected)
 ◉ Regressed issues (Notify when a closed issue reoccurs)
```

The CLI automatically generates the Cloud Monitoring alert policies for your web app, creates (or reuses) a Firebase-labeled email notification channel for your logged-in email address, and attaches it to the selected alert policies.

---

### Option 3: Set up email alerts via `gcloud` CLI & REST API

If you are configuring alerts non-interactively (for example, in a script or via an AI coding agent) or outside of the interactive onboarding flow, you can provision the Crashlytics alert policies and attach a Cloud Monitoring email notification channel using `gcloud` and `curl`.

#### 1. Configure environment variables

```bash
PROJECT_ID="your-firebase-project-id"
APP_ID="your-firebase-web-app-id" # e.g., 1:1234567890:web:abcdef1234567890
USER_EMAIL=$(gcloud config get-value account)
TOKEN=$(gcloud auth print-access-token)
```

#### 2. Generate the Crashlytics alert policies

Call the Crashlytics `projects.apps.generateAlertPolicy` endpoint for `ALERT_TYPE_NEW_ISSUE` and/or `ALERT_TYPE_REGRESSED_ISSUE`. This idempotently creates (or returns the existing) Cloud Monitoring alert policy for your web app:

```bash
# Generate (or retrieve) the "New Issues" AlertPolicy
NEW_ISSUE_POLICY_NAME=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType": "ALERT_TYPE_NEW_ISSUE"}' \
  "https://firebasecrashlytics.googleapis.com/v1alpha/projects/${PROJECT_ID}/apps/${APP_ID}:generateAlertPolicy" \
  | jq -r '.name')

# Generate (or retrieve) the "Regressed Issues" AlertPolicy
REGRESSED_ISSUE_POLICY_NAME=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType": "ALERT_TYPE_REGRESSED_ISSUE"}' \
  "https://firebasecrashlytics.googleapis.com/v1alpha/projects/${PROJECT_ID}/apps/${APP_ID}:generateAlertPolicy" \
  | jq -r '.name')
```

#### 3. Create an email notification channel in Cloud Monitoring

Create a Cloud Monitoring email notification channel with the `is_firebase_channel=true` user label so that the Firebase Console recognizes and syncs your subscription state:

```bash
CHANNEL_NAME=$(gcloud beta monitoring channels create \
  --project="${PROJECT_ID}" \
  --display-name="${USER_EMAIL} - for Firebase alerts" \
  --type=email \
  --channel-labels="email_address=${USER_EMAIL}" \
  --user-labels="is_firebase_channel=true" \
  --format="value(name)")
```

#### 4. Attach the notification channel to the alert policies

Subscribe your email channel to the generated alert policies using `gcloud alpha monitoring policies update`:

```bash
gcloud alpha monitoring policies update "${NEW_ISSUE_POLICY_NAME}" \
  --project="${PROJECT_ID}" \
  --add-notification-channels="${CHANNEL_NAME}"

gcloud alpha monitoring policies update "${REGRESSED_ISSUE_POLICY_NAME}" \
  --project="${PROJECT_ID}" \
  --add-notification-channels="${CHANNEL_NAME}"
```

---

### Advanced alerting in Google Cloud Monitoring

Because Crashlytics for Web alerts are built on Google Cloud Monitoring and Cloud Logging, you can also configure custom log-based metrics or attach additional project-level notification channels (such as Slack, PagerDuty, webhooks, or Pub/Sub) directly in **Google Cloud Console > Monitoring > Alerting**.

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
