## Next.js Breadcrumbs Setup - Firebase Crashlytics

This guide covers the incremental steps to enable Session Breadcrumbs & Logs for Next.js App Router applications in the Firebase Crashlytics private preview.

The examples below use `all()`, which records every automatic breadcrumb. To record only some of them, see [Choose what to capture](../../docs/ADD_BREADCRUMBS.md#choose-what-to-capture).

### Next.js 15.3+: Client Instrumentation (`instrumentation-client.ts`)

In `src/instrumentation-client.ts`, pass `features: [breadcrumbs({ capture: all() })]` to `getCrashlytics`:

```diff
// src/instrumentation-client.ts
-import { getCrashlytics } from 'firebase/crashlytics';
+import { getCrashlytics, breadcrumbs, all } from 'firebase/crashlytics';
import { app } from './lib/firebase';

-getCrashlytics(app);
+getCrashlytics(app, { features: [breadcrumbs({ capture: all() })] });
```

### Next.js < 15.3: Client Component Layout

In your existing client-side provider component (e.g., `src/components/CrashlyticsProvider.tsx`), define a `crashlyticsOptions` object with `features: [breadcrumbs({ capture: all() })]` and pass it to `<FirebaseCrashlytics>`:

```diff
// src/components/CrashlyticsProvider.tsx
'use client';

import React from 'react';
+import { breadcrumbs, all } from 'firebase/crashlytics';
import { FirebaseCrashlytics } from 'firebase/crashlytics/react';
import { app } from '../lib/firebase'; // Your existing Firebase App singleton

+const crashlyticsOptions = { features: [breadcrumbs({ capture: all() })] };
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

**Note:** Crashlytics must be initialized with the same options everywhere in your app. If you also set up [navigation tracking](./_navigation_tracking.md), pass the same `crashlyticsOptions` object to `<CrashlyticsRoutes>`.
