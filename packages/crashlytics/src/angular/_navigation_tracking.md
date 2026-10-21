## Angular Navigation Tracking Setup - Firebase Crashlytics

This guide covers automatic route navigation tracking (screen views) for Angular applications in the Firebase Crashlytics Session Breadcrumbs & Logs private preview.

Automatic route navigation tracking is enabled out of the box when you register Crashlytics using `provideCrashlytics()` in `src/app/app.config.ts`:

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideCrashlytics } from '@firebase/crashlytics/angular';
import { app } from '../lib/firebase';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideCrashlytics(() => app)
  ]
};
```

**Note:** `provideCrashlytics()` automatically subscribes to Angular's `Router` navigation events, maps active route segments to parameterized path templates (e.g. `/users/:id`), records view boundary telemetry, and cleans up subscriptions automatically when the environment is destroyed (`DestroyRef`).
