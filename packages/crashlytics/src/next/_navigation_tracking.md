## Next Navigation Tracking Setup - Firebase Crashlytics

This guide covers the incremental steps to enable automatic route navigation tracking (screen views) for Next.js App Router applications in the Firebase Crashlytics Session Breadcrumbs & Logs private preview.

To track route changes with parameterized dynamic route templates (e.g. `/users/:id` instead of raw URLs containing user identifiers), use `<CrashlyticsRoutes>` from `@firebase/crashlytics/next-navigation`.

### Step 1: Create or Update your Client Provider

In `src/components/CrashlyticsProvider.tsx`, mount `<CrashlyticsRoutes>` from `@firebase/crashlytics/next-navigation` (replacing `<FirebaseCrashlytics>` if you already created this provider for Next.js < 15.3):

```tsx
// src/components/CrashlyticsProvider.tsx
'use client';

import React from 'react';
import { breadcrumbs } from '@firebase/crashlytics';
import { CrashlyticsRoutes } from '@firebase/crashlytics/next-navigation';
import { app } from '../lib/firebase'; // Your existing Firebase App singleton

const crashlyticsOptions = { features: [breadcrumbs()] };

export function CrashlyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CrashlyticsRoutes
        firebaseApp={app}
        crashlyticsOptions={crashlyticsOptions}
      />
      {children}
    </>
  );
}
```

### Step 2: Verify Root Layout Integration

Ensure your root layout (`src/app/layout.tsx`) wraps the application with `<CrashlyticsProvider>`:

```tsx
// src/app/layout.tsx
import React from 'react';
import { CrashlyticsProvider } from '../components/CrashlyticsProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CrashlyticsProvider>
          {children}
        </CrashlyticsProvider>
      </body>
    </html>
  );
}
```

**Note:** `<CrashlyticsRoutes>` hooks into Next.js's navigation lifecycle to automatically mask dynamic route parameters, ensuring paths like `/users/12345/profile` are recorded as `/users/:id/profile` in session breadcrumbs without capturing sensitive user identifiers. If you initialized Crashlytics in `src/instrumentation-client.ts`, pass the same `crashlyticsOptions` to `<CrashlyticsRoutes>` or manage initialization via `<CrashlyticsRoutes>`.
