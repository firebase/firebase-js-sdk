## Angular Navigation Tracking Setup - Firebase Crashlytics

This guide covers automatic route navigation tracking (screen views) for Angular applications in the Firebase Crashlytics Session Breadcrumbs & Logs private preview.

Navigation tracking needs only `routeChanges()` in the `capture` list of `breadcrumbs()`, as the example below shows. Without it, no route changes are recorded. If you already capture other breadcrumbs, keep your existing list and make sure it includes `routeChanges()`; `all()` already does (see [Choose what to capture](../../docs/ADD_BREADCRUMBS.md#choose-what-to-capture)).

With `routeChanges()` captured, automatic route navigation tracking is enabled out of the box when you register Crashlytics using `provideCrashlytics()` in `src/app/app.config.ts`:

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { breadcrumbs, routeChanges } from 'firebase/crashlytics';
import {
  CrashlyticsOptions,
  provideCrashlytics
} from 'firebase/crashlytics/angular';
import { app } from '../lib/firebase';
import { routes } from './app.routes';

const crashlyticsOptions: CrashlyticsOptions = {
  features: [breadcrumbs({ capture: [routeChanges()] })]
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideCrashlytics(() => app, crashlyticsOptions)
  ]
};
```

**Note:** `provideCrashlytics()` automatically subscribes to Angular's `Router` navigation events, maps active route segments to parameterized path templates (e.g. `/users/:id`), records view boundary telemetry, and cleans up subscriptions automatically when the environment is destroyed (`DestroyRef`).
