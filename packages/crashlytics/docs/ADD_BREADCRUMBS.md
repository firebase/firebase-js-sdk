## Crashlytics Logs and Breadcrumbs

### What’s New: Session Breadcrumbs & Logs

While standard Crashlytics captures errors and stack traces, **Session Breadcrumbs & Logs** automatically captures the chronological sequence of events leading up to an error:

- 🛣️ **Route Navigations (Screen Views)**: Automatically records page/route transitions tagged with parameterized route templates (e.g., `/products/:id` instead of raw URLs containing PII).
- 🖱️ **User Click Interactions**: Records DOM button and link clicks leading up to a crash.
- 🌐 **Network Requests**: Records outbound `fetch` and `XMLHttpRequest` calls with HTTP status codes and latencies.
- 👁️ **Page Lifecycle & Visibility**: Tracks tab switching, page hide/show, and document load spans.
- 📝 **Custom Breadcrumb Logs**: Attach structured domain logs (e.g. checkout step, cart size) via OpenTelemetry.
- 📊 **Dedicated Timeline View**: Visualized chronologically under each crash event in the Firebase Console in the **Logs & Breadcrumbs** tab.

Under the hood, network traces and session logs are stored in **Cloud Trace** and **Cloud Logging**. Both services include monthly free allotments: Cloud Trace includes the first 2.5 million spans per month at no charge, and Cloud Logging includes the first 50 GiB processed per month for free. Learn more about [Cloud Trace pricing](https://cloud.google.com/products/observability/pricing#trace-pricing-summary) and [Cloud Logging pricing](https://cloud.google.com/products/observability/pricing#logging-pricing-summary).

### Prerequisites

1. You are a current member of the Crashlytics for Web Private Preview
2. You have onboarded your web application with Crashlytics for Web

If you have not completed these steps, follow the [general onboarding instructions](../README.md) before continuing with Logs and Breadcrumbs setup.

**Don't want to do this manually?** Try pointing your agent at this doc to enable logs and breadcrumbs.

### Step 1: Enable Crashlytics Logs and Breadcrumbs

Run the following command using Firebase CLI v15.19.1+:

```sh
# Enable the logs breadcrumbs experiment and APIs
firebase experiments:enable crashlyticsWebTrace
```

**Note:** This command checks your existing setup, enables `cloudtrace.googleapis.com`, and provisions Cloud Trace storage for your project automatically.

### Step 2: Update SDK Packages

Update your dependencies to ensure you have the preview build containing the tracing and router modules:

```sh
npm install @firebase/app@eap-crashlytics @firebase/crashlytics@eap-crashlytics
```

### Step 3: Add Breadcrumbs to your initialization

Breadcrumbs are off by default. To turn them on, set `enableTracing: true` in the `CrashlyticsOptions` you pass when initializing Crashlytics. Follow the guide for your framework:

- 🔺 [Next.js Setup Guide](../src/next/_enable_breadcrumbs.md)
- ⚛️ [**React Setup Guide**](../src/react/_enable_breadcrumbs.md)
- 🅰️ [**Angular Setup Guide**](../src/angular/_enable_breadcrumbs.md)

If you initialize Crashlytics directly without a framework integration, pass the option to `getCrashlytics()`:

```diff
import { getCrashlytics } from '@firebase/crashlytics';

-const crashlytics = getCrashlytics(app);
+const crashlytics = getCrashlytics(app, { enableTracing: true });
```

**Note:** Crashlytics must be initialized with the same options everywhere in your app. Calling `getCrashlytics()` with different options for the same app throws an error.

### Step 4: Verify Logs & Breadcrumbs appear

1. Run your application locally or deploy your app.
2. Perform a few user actions:
   - Click a button or link.
   - Trigger an API network request (`fetch`).
3. Trigger a test crash by adding a button that throws an error:

```ts
throw new Error('Testing Breadcrumbs');
```

4. Open the [Firebase Console Crashlytics Dashboard](https://console.firebase.google.com/u/0/project/_/crashlytics).
5. Select your project to view the newly logged crash report, and open the **Logs & Breadcrumbs** tab under **Events**.
6. You will see a chronological event stream. For example:
   - 🖱️ `click`: `button#add-to-cart`
   - 🌐 `http_request`: `POST /api/cart` (200 OK, 142ms)
   - 💥 `error`: Uncaught Error: Testing Breadcrumbs

### (Optional) Step 5: Setup Navigation Tracking&nbsp;

By default, you will get activities like network tracing, click tracking, and document load times automatically. To enable navigation tracking, you will need to add framework specific configuration.

- 🔺 [Next.js Setup Guide](../src/next/_navigation_tracking.md)
- 🛣️ [**React Setup Guide**](../src/react-router/_navigation_tracking.md)
- 🅰️ [**Angular Setup Guide**](../src/angular/_navigation_tracking.md)

Repeat Step 3\. You should now see navigation events like

- 📍 `route_change`: `/products/:id` (Screen view)

### (Optional) Step 6: Add custom logs

In addition to automatic breadcrumbs (clicks, route changes, network requests, and page visibility events), you can emit custom diagnostic logs and attach key-value attributes anywhere in your application.

```ts
import { getCrashlytics, log } from '@firebase/crashlytics';

const crashlytics = getCrashlytics(app);

export function trackCheckoutStep(stepName: string, itemsCount: number) {
  log(crashlytics, `Checkout step reached: ${stepName}`, {
    'checkout.step': stepName,
    'checkout.items_count': itemsCount
  });
}
```

Repeat Step 3 triggering your custom log. You should now see custom log events in the Crashlytics Logs & Breadcrumbs tab\!

## Feedback & Support

As a private preview customer, your feedback directly shapes this feature before General Availability:

- ✉️ **Email us**: [crashlytics-web@google.com](mailto:crashlytics-web@google.com)
- 📝 **Feedback Form**: [Submit Feedback](https://forms.gle/Us8GM4YuYcYZyRNK9)
- 📚 **GitHub Documentation**:
  - [Advanced Usage Guide](https://github.com/firebase/firebase-js-sdk/blob/crashlytics2/packages/crashlytics/docs/ADVANCED_USAGE.md)
  - [Configuration Guide](https://github.com/firebase/firebase-js-sdk/blob/crashlytics2/packages/crashlytics/docs/CONFIGURATION.md)
