## Next.js Breadcrumbs Setup - Firebase Crashlytics

This guide covers the incremental steps to enable Session Breadcrumbs & Logs for Next.js App Router applications in the Firebase Crashlytics private preview.

&nbsp;

In your existing client-side provider component (e.g., `src/components/CrashlyticsProvider.tsx`), define a `crashlyticsOptions` object with `enableTracing: true` and pass it to `<FirebaseCrashlytics>`:

&nbsp;

```diff
// src/components/CrashlyticsProvider.tsx
'use client';

import React from 'react';
import { FirebaseCrashlytics } from '@firebase/crashlytics/react';
import { app } from '../lib/firebase'; // Your existing Firebase App singleton

+const crashlyticsOptions = { enableTracing: true };
+
export function CrashlyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FirebaseCrashlytics
        firebaseApp={app}
+        crashlyticsOptions={crashlyticsOptions}
      />
      {children}
    </>
  );
}
```

&nbsp;

**Note:** Crashlytics must be initialized with the same options everywhere in your app. If you also set up [navigation tracking](./_navigation_tracking.md), pass the same `crashlyticsOptions` object to `<CrashlyticsRoutes>`.
