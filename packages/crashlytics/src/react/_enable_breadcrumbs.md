## React Breadcrumbs Setup - Firebase Crashlytics

This guide covers the incremental steps to enable Session Breadcrumbs & Logs for React applications in the Firebase Crashlytics private preview.

In your root application component (typically `src/App.tsx`), define a `crashlyticsOptions` object with `features: [breadcrumbs()]` and pass it to `<FirebaseCrashlytics>`:

```diff
// src/App.tsx
import React from 'react';
+import { breadcrumbs } from '@firebase/crashlytics';
import { FirebaseCrashlytics } from '@firebase/crashlytics/react';
import { app } from './lib/firebase'; // Your existing Firebase App singleton

+const crashlyticsOptions = { features: [breadcrumbs()] };
+
export default function App() {
  return (
    <>
      <FirebaseCrashlytics
        firebaseApp={app}
+        crashlyticsOptions={crashlyticsOptions}
      />
      {/* Rest of your application components */}
    </>
  );
}
```

**Note:** Crashlytics must be initialized with the same options everywhere in your app. If you also set up [React Router navigation tracking](../react-router/_navigation_tracking.md), pass the same `crashlyticsOptions` object to `<CrashlyticsRoutes>`.
