# Advanced Usage - Firebase Crashlytics

This guide covers advanced usage scenarios for Firebase Crashlytics in web applications, including programmatic error capturing, custom attributes, force flushing telemetry, app versioning, and best practices.

---

## Programmatic Error Capturing

While uncaught exceptions will be logged automatically by framework integrations, you can also record handled exceptions manually using `recordError()`.

```typescript
import { recordError, getCrashlytics } from '@firebase/crashlytics';
import { app } from './lib/firebase';

const crashlytics = getCrashlytics(app);

async function submitPaymentForm() {
  try {
    await api.processTransaction();
  } catch (error) {
    // Manually record handled errors with custom diagnostic context
    recordError(crashlytics, error, {
      userTier: 'Premium Gold',
      checkoutStage: 'BillingAddressVerification',
      transactionCode: 'tx_8412_err',
      retryAttempts: 2
    });

    showFallbackBanner(error);
  }
}
```

---

## Custom Attributes

Unlike native iOS and Android SDK architectures, the JavaScript Web SDK does **not** expose a standalone `log()` API (e.g. `crashlytics.log()`).

- **Resolution**: Log user activities, session states, and diagnostic details directly as key-value custom attributes using the optional metadata parameter in `recordError()`:

```typescript
// Custom metadata takes the place of typical logging streams
recordError(crashlytics, error, {
  breadcrumb: "User opened shopping cart",
  lastAction: "Click Checkout Button"
});
```

---

## Force Flushing Telemetry Records (`flush()`)

By default, the telemetry engine batches logs into memory segments to preserve battery life and bandwidth. However, for short-lived operations (like Edge routines, cloud worker pathways, or right before a browser reloads or unloads), logs must be uploaded immediately.

Call the asynchronous `flush` command to send all queued errors to the backend:

```typescript
import { recordError, flush, getCrashlytics } from '@firebase/crashlytics';
import { app } from './lib/firebase';

const crashlytics = getCrashlytics(app);

async function handleApplicationCrash(error: Error) {
  // Capture the error
  recordError(crashlytics, error, { priority: 'IMMEDIATE' });

  // Force an immediate upload before the process terminates or reloads
  await flush(crashlytics);

  // Safe to terminate the current execution context
  window.location.reload();
}
```

---

## App Versioning

Adding a version to your app is recommended, but not required. We have a helper `setconstants.js` script that tries to determine a version for your app based in precedent order (current GitHub commit hash, `package.json` version). Update the following build scripts in your `package.json` as follows:

```json
"dev": "npm run firebase-set-constants && <existing command>",
"build": "npm run firebase-set-constants && <existing command>",
"start": "npm run firebase-set-constants && <existing command>",
"firebase-set-constants": "node ./node_modules/@firebase/crashlytics/setconstants.js"
```

---

## Best Practices & Gotchas

To ensure smooth integration during the private preview, review these essential best practices:

### Avoid Dual Package Hazards

Do not mix imports from the main `firebase` umbrella package (e.g. `firebase/app`) and individual `@firebase/*` sub-packages. Doing so can duplicate registration tokens and throw runtime errors like `Component app-check has not been registered yet`.

- **Resolution**: Since the Crashlytics subpackage is available via `@firebase/crashlytics` during private preview, standardize your imports to exclusively use the scoped sub-packages throughout the project:

```typescript
// ❌ Avoid mixing import styles
import { initializeApp } from "firebase/app";
import { recordError } from "@firebase/crashlytics";

// ✅ Import consistently
import { initializeApp } from '@firebase/app';
import { recordError } from '@firebase/crashlytics';
```
