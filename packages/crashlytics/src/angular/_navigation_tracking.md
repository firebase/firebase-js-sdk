## Angular Navigation Tracking Setup - Firebase Crashlytics

This guide covers the incremental steps to enable automatic route navigation tracking (screen views) for Angular applications in the Firebase Crashlytics Session Breadcrumbs & Logs private preview.

### Step 1: Initialize `setupCrashlyticsRoutes` in `app.config.ts`

In `src/app/app.config.ts`, import `setupCrashlyticsRoutes` from `@firebase/crashlytics/angular` and register it using `provideEnvironmentInitializer`:

&nbsp;

```diff
// src/app/app.config.ts
import {
  ApplicationConfig,
  DestroyRef,
  ErrorHandler,
  inject,
+  provideEnvironmentInitializer // We use an environment initializer to setup route tracking
} from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import {
  FirebaseErrorHandler,
+  setupCrashlyticsRoutes // Add Crashlytics route setup
} from '@firebase/crashlytics/angular';
import { FIREBASE_APP, provideFirebaseApp } from './firebase.config';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: FIREBASE_APP,
      useFactory: provideFirebaseApp
    },
    {
      provide: ErrorHandler,
      useFactory: (app: FirebaseApp) => new FirebaseErrorHandler(app),
      deps: [FIREBASE_APP]
    },
+    // Initialize automatic route navigation tracking
+    provideEnvironmentInitializer(() => {
+      setupCrashlyticsRoutes({
+        firebaseApp: inject(FIREBASE_APP),
+        router: inject(Router),
+        destroyRef: inject(DestroyRef)
+      });
+    })
  ]
};
```

&nbsp;

**Note:** `setupCrashlyticsRoutes` subscribes to Angular's `Router` navigation events, maps active route segments to parameterized path templates (e.g. `/users/:id`), and cleans up subscriptions automatically when the environment is destroyed (`DestroyRef`).
