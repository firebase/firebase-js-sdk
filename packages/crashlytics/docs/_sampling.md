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
