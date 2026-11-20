## Angular Breadcrumbs Setup - Firebase Crashlytics

This guide covers the incremental steps to enable Session Breadcrumbs & Logs for Angular applications in the Firebase Crashlytics private preview.

The example below uses `all()`, which records every automatic breadcrumb. To record only some of them, see [Choose what to capture](../../docs/ADD_BREADCRUMBS.md#choose-what-to-capture).

In `src/app/app.config.ts`, define a `CrashlyticsOptions` object with `features: [breadcrumbs({ capture: all() })]` and pass it to `provideCrashlytics`:

```diff
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
+import { breadcrumbs, all } from 'firebase/crashlytics';
import {
+  CrashlyticsOptions,
  provideCrashlytics
} from 'firebase/crashlytics/angular';
import { app } from '../lib/firebase';
import { routes } from './app.routes';

+const crashlyticsOptions: CrashlyticsOptions = {
+  features: [breadcrumbs({ capture: all() })]
+};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
-    provideCrashlytics(() => app)
+    provideCrashlytics(() => app, crashlyticsOptions)
  ]
};
```
