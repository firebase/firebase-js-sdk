## Next Navigation Tracking Setup - Firebase Crashlytics

This guide covers the incremental steps to enable automatic route navigation tracking (screen views) for Next.js App Router applications in the Firebase Crashlytics Session Breadcrumbs & Logs private preview.

### Step 1: Update your Client Provider

In your existing client-side provider component (e.g., `src/components/CrashlyticsProvider.tsx`), replace `<FirebaseCrashlytics>` with `<CrashlyticsRoutes>` from `@firebase/crashlytics/next-navigation`:

```diff
// src/components/CrashlyticsProvider.tsx
'use client';

import React from 'react';
-import { FirebaseCrashlytics } from '@firebase/crashlytics/react';
+import { CrashlyticsRoutes } from '@firebase/crashlytics/next-navigation';
import { app } from '../lib/firebase'; // Your existing Firebase App singleton

export function CrashlyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
-      <FirebaseCrashlytics firebaseApp={app} />
+      <CrashlyticsRoutes firebaseApp={app} />
      {children}
    </>
  );
}
```

### Step 2: Verify Root Layout Integration

Ensure your root layout (`src/app/layout.tsx`) wraps the application with `<CrashlyticsProvider>`:

```diff
// src/app/layout.tsx
import React from 'react';
+import { CrashlyticsProvider } from '../components/CrashlyticsProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
+        <CrashlyticsProvider>
+          {children}
+        </CrashlyticsProvider>
      </body>
    </html>
  );
}
```

**Note:** `<CrashlyticsRoutes>` hooks into Next.js's navigation lifecycle to automatically mask dynamic route parameters, ensuring paths like `/users/12345/profile` are recorded as `/users/[id]/profile` in session breadcrumbs without capturing sensitive user identifiers.
