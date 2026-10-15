## Angular Breadcrumbs Setup - Firebase Crashlytics

This guide covers the incremental steps to enable Session Breadcrumbs & Logs for Angular applications in the Firebase Crashlytics private preview.

In `src/app/app.config.ts`, define a `CrashlyticsOptions` object with `enableBreadcrumbs: true` and pass it to `FirebaseErrorHandler`:

```diff
// src/app/app.config.ts
import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FirebaseApp } from '@firebase/app';
import {
+  CrashlyticsOptions,
  FirebaseErrorHandler
} from '@firebase/crashlytics/angular';
import { FIREBASE_APP, provideFirebaseApp } from './firebase.config';
import { routes } from './app.routes';

+const crashlyticsOptions: CrashlyticsOptions = {
+  enableBreadcrumbs: true
+};

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
      useFactory: (app: FirebaseApp) =>
+        new FirebaseErrorHandler(app, crashlyticsOptions),
      deps: [FIREBASE_APP]
    }
  ]
};
```

**Note:** Crashlytics must be initialized with the same options everywhere in your app. If you also set up [navigation tracking](./_navigation_tracking.md), pass the same `crashlyticsOptions` object to `setupCrashlyticsRoutes`.
