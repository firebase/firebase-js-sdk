## Angular Breadcrumbs Setup - Firebase Crashlytics

This guide covers the incremental steps to enable Session Breadcrumbs & Logs for Angular applications in the Firebase Crashlytics private preview.

In `src/app/app.config.ts`, define a `CrashlyticsOptions` object with `features: [breadcrumbs()]` and pass it to `provideCrashlytics`:

```diff
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
+import { breadcrumbs } from '@firebase/crashlytics';
import {
+  CrashlyticsOptions,
  provideCrashlytics
} from '@firebase/crashlytics/angular';
import { app } from '../lib/firebase';
import { routes } from './app.routes';

+const crashlyticsOptions: CrashlyticsOptions = {
+  features: [breadcrumbs()]
+};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
-    provideCrashlytics(() => app)
+    provideCrashlytics(() => app, crashlyticsOptions)
  ]
};
```
