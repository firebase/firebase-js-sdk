# Advanced Usage - Firebase Crashlytics

This guide covers advanced usage scenarios for Firebase Crashlytics in web applications, including programmatic error capturing, custom attributes, force flushing telemetry, and app versioning.

---

## Programmatic Error Capturing

While uncaught exceptions will be logged automatically by framework integrations, you can also record handled exceptions manually using `recordError()`.

```typescript
import { recordError, getCrashlytics } from 'firebase/crashlytics';
import { app } from './lib/firebase';

const crashlytics = getCrashlytics(app);

async function submitPaymentForm() {
  try {
    await api.processTransaction();
  } catch (error) {
    // Manually record handled errors with custom diagnostic context (key/value pairs)
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

## Force Flushing Telemetry Records (`flush()`)

By default, the telemetry engine batches logs into memory segments to preserve battery life and bandwidth. However, for short-lived operations (like Edge routines, cloud worker pathways, or right before a browser reloads or unloads), logs must be uploaded immediately.

Call the asynchronous `flush` command to send all queued errors to the backend:

```typescript
import { recordError, flush, getCrashlytics } from 'firebase/crashlytics';
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

Adding a version to your app is recommended, but not required. Crashlytics resolves an application version in precedence order:

1. Explicit `appVersion` passed to `getCrashlytics(app, { appVersion })` (or `provideCrashlytics(() => app, { appVersion })` in Angular)
2. Build-time environment variables (`NEXT_PUBLIC_CRASHLYTICS_APP_VERSION` or `CRASHLYTICS_APP_VERSION`)
3. `crashlytics-setconstants` in the Firebase CLI

### Next.js

Set `NEXT_PUBLIC_CRASHLYTICS_APP_VERSION` at build time (for example via `env` in `next.config.ts` or your CI environment) so cached Webpack and Turbopack rebuilds pick up new versions without clearing `.next/cache`:

```typescript
// next.config.ts
import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';

const getAppVersion = () => {
  try {
    // Replace with your app version logic
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    // Version may not be available in some build environments
    return 'unknown';
  }
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CRASHLYTICS_APP_VERSION: getAppVersion(),
  },
};

export default nextConfig;
```

### Vite, Webpack, and Rollup

Configure your bundler to replace `'process.env.CRASHLYTICS_APP_VERSION'` with a `JSON.stringify(...)` string literal at build time:

**Vite (`vite.config.ts`)**:

```typescript
// vite.config.ts
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

const getAppVersion = () => {
  try {
    // Replace with your app version logic
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    // Version may not be available in some build environments
    return 'unknown';
  }
};

export default defineConfig({
  define: {
    'process.env.CRASHLYTICS_APP_VERSION': getAppVersion(),
  },
});
```

> [!NOTE]
> `vite dev` pre-bundles dependencies into `node_modules/.vite/deps` and does not re-run `define` across restarts unless `vite --force` is used. For dev-server version updates, pass `appVersion` to `getCrashlytics(app, { appVersion })` or run `vite --force`.

**Webpack (`webpack.config.js`)**:

```javascript
// webpack.config.js
const { execSync } = require('node:child_process');
const webpack = require('webpack');

const getAppVersion = () => {
  try {
    // Replace with your app version logic
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    // Version may not be available in some build environments
    return 'unknown';
  }
};

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.CRASHLYTICS_APP_VERSION': getAppVersion(),
    }),
  ],
};
```

**Rollup (`rollup.config.js`)**: Pass `{ preventAssignment: true, values: { 'process.env.CRASHLYTICS_APP_VERSION': appVersion } }` to `@rollup/plugin-replace`.

### Angular

For Angular 17+ workspaces using the `application` builder (`@angular/build:application` or `@angular-devkit/build-angular:application`), pass `'process.env.CRASHLYTICS_APP_VERSION'` dynamically via `ng build --define`:

```bash
ng build --define process.env.CRASHLYTICS_APP_VERSION="\"$(git rev-parse HEAD 2>/dev/null || echo unknown)\""
```

String values passed to Angular's `define` option are substituted as expressions, so preserve the inner escaped quotes around the version string. To run this from `package.json`:

```json
{
  "scripts": {
    "build": "ng build --define process.env.CRASHLYTICS_APP_VERSION='\"'$(git rev-parse HEAD 2>/dev/null || echo unknown)'\"'"
  }
}
```

> [!NOTE]
> `ng serve` does not support the `--define` CLI flag. If you need an app version during local `ng serve`, set `options.define` in `angular.json` (for example, `"process.env.CRASHLYTICS_APP_VERSION": "\"dev\""`) or pass `appVersion` to `provideCrashlytics(() => app, { appVersion })`.
>
> Configuring `define` requires Angular 17+ (`@angular/build:application` or `@angular-devkit/build-angular:application`) and is **not supported** for legacy Angular versions (such as `@angular-devkit/build-angular:browser`). For legacy Angular versions, pass `appVersion` explicitly to `provideCrashlytics(() => app, { appVersion })`.

### `crashlytics-setconstants` CLI (uncached builds)

For legacy setups or other uncached single-app builds, Crashlytics provides the `crashlytics-setconstants` CLI helper, which resolves a version in precedence order (`--appVersion=<version>`, current Git commit hash, or `package.json` version):

```json
"dev": "npm run firebase-set-constants && <existing command>",
"build": "npm run firebase-set-constants && <existing command>",
"start": "npm run firebase-set-constants && <existing command>",
"firebase-set-constants": "crashlytics-setconstants"
```

> [!NOTE]
> `crashlytics-setconstants` writes directly into `node_modules/@firebase/crashlytics/dist/`, which persistent build caches (such as Next.js `.next/cache`, Vite `node_modules/.vite`, and Angular `.angular/cache`) and shared/immutable package stores (`pnpm`, Yarn PnP) ignore or reject across rebuilds. Use the configuration options above or pass `appVersion` directly to `getCrashlytics()` / `provideCrashlytics()` in those environments.
