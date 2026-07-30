# Angular Setup Guide - Firebase Crashlytics

This guide details how to integrate Firebase Crashlytics into an Angular application for automatic error reporting, manual error tracking, and stack trace de-obfuscation.

---

> [!NOTE]
> For core package installation and Firebase App singleton configuration, see [Core SDK Installation & Initialization](../../README.md#step-2-core-sdk-installation--initialization).

---

## Automatic Error Capturing

### Step 1: Map the Firebase App Injection Token

To ensure robust token lifecycles, configure a modular singleton provider in `src/app/firebase.config.ts` that prevents component initialization conflicts:

```typescript
// src/app/firebase.config.ts
import { InjectionToken } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from '@firebase/app';

// Custom InjectionToken protects module resolution namespaces
export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp');

const firebaseConfig = {
  apiKey: "AIzaSyA...",
  projectId: "your-app-id",
  appId: "1:1234567890:web:abcdef123456",
  // ... rest of config options
};

export function provideFirebaseApp(): FirebaseApp {
  const apps = getApps();
  return apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
}
```

### Step 2: Register the Custom Error Handler

Integrate with Angular's global error-catching runtime. Overwrite Angular's default `ErrorHandler` in `src/app/app.config.ts` (or your root module) with `FirebaseErrorHandler`:

```typescript
// src/app/app.config.ts
import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FirebaseErrorHandler } from '@firebase/crashlytics/angular';
import { FIREBASE_APP, provideFirebaseApp } from './firebase.config';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Provide the core Firebase App dependency token
    {
      provide: FIREBASE_APP,
      useFactory: provideFirebaseApp
    },
    // Wire Angular runtime uncaught errors to Firebase Crashlytics
    {
      provide: ErrorHandler,
      useFactory: (app: FirebaseApp) => new FirebaseErrorHandler(app),
      deps: [FIREBASE_APP]
    }
  ]
};
```

> [!NOTE]
> The `FirebaseErrorHandler` tracks all zone crashes. It uses internal `Router` instances to build dynamic routes (like `/dashboard/user/:id`) rather than logging literal URLs, keeping telemetry free of personally identifiable information (PII).

---

<!-- #include "../../docs/ADVANCED_USAGE.md#programmatic-error-capturing" -->
> [!NOTE]
> For manually capturing handled exceptions with custom metadata, see [Advanced Usage: Programmatic Error Capturing](../../docs/ADVANCED_USAGE.md#programmatic-error-capturing).

---

<!-- #include "../../docs/ADVANCED_USAGE.md#force-flushing-telemetry-records-flush" -->
> [!NOTE]
> For force-flushing buffered telemetry records before unloads, see [Advanced Usage: Force Flushing Telemetry Records](../../docs/ADVANCED_USAGE.md#force-flushing-telemetry-records-flush).

---

## Stack Trace De-obfuscation (Source Map Uploading)

<!-- #include "../../docs/_sourcemap_cli_setup.md" -->
> [!NOTE]
> For Firebase CLI prerequisites and authentication steps, see [_sourcemap_cli_setup.md](../../docs/_sourcemap_cli_setup.md).

### Configure Angular Workspace for Source Maps

To enable source maps in Angular, configure the `sourceMap` option inside your `angular.json` workspace file:

#### [Option 1] Modify `angular.json` (Recommended)

Open your `angular.json` file and locate the specific build configuration you want to target (such as development or production). Set the `sourceMap` parameter under the `options` or `configurations` block:

```json
{
  "projects": {
    "your-app-name": {
      "architect": {
        "build": {
          "options": {
            "sourceMap": true
          },
          "configurations": {
            "production": {
              "sourceMap": {
                "scripts": true,
                "vendor": false
              }
            }
          }
        }
      }
    }
  }
}
```

#### [Option 2] Command Line Override

If you only need source maps for a one-off build or session, append the `--source-map` flag to your Angular CLI commands:

```bash
ng build --configuration production --source-map
```

### Upload Source Maps

Angular stores generated source maps within the `dist` folder in the project root directory. Run the upload command:

```bash
firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --debug dist
```

### Automate in Build Pipeline

Add two new scripts to your `package.json` and invoke them from your `build` command:

```json
{
  "name": "enterprise-web-app",
  "scripts": {
    "build": "ng build && npm run maps:upload && npm run maps:clean",
    "maps:upload": "firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --debug dist",
    "maps:clean": "node -e \"const fs = require('fs'); fs.readdirSync('dist', { recursive: true, withFileTypes: true }).forEach(f => { if(f.isFile() && f.name.endsWith('.map')) fs.rmSync(require('path').join(f.parentPath || f.path, f.name), { force: true }) })\""
  }
}
```

---

## Framework-Specific Best Practices & Gotchas

To ensure smooth integration during the private preview, review these essential best practices:

<!-- #include "../../docs/ADVANCED_USAGE.md#avoid-dual-package-hazards" -->
> [!NOTE]
> For import standardization guidelines, see [Advanced Usage: Avoid Dual Package Hazards](../../docs/ADVANCED_USAGE.md#avoid-dual-package-hazards).

<!-- #include "../../docs/ADVANCED_USAGE.md#custom-attributes" -->
> [!NOTE]
> For logging custom attributes without a `log()` method, see [Advanced Usage: Custom Attributes](../../docs/ADVANCED_USAGE.md#custom-attributes).
