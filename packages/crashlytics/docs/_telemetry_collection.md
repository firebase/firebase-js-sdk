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
