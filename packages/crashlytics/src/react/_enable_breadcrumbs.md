## React Breadcrumbs Setup - Firebase Crashlytics

This guide covers the incremental steps to enable Session Breadcrumbs & Logs for React applications in the Firebase Crashlytics private preview.

&nbsp;

In your root application component (typically `src/App.tsx`), define a `crashlyticsOptions` object with `enableTracing: true` and pass it to `<FirebaseCrashlytics>`:

&nbsp;

```diff
// src/App.tsx
import React from 'react';
import { FirebaseCrashlytics } from '@firebase/crashlytics/react';
import { app } from './lib/firebase'; // Your existing Firebase App singleton

+const crashlyticsOptions = { enableTracing: true };
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

&nbsp;

**Note:** Crashlytics must be initialized with the same options everywhere in your app. If you also set up [React Router navigation tracking](../react-router/_navigation_tracking.md), pass the same `crashlyticsOptions` object to `<CrashlyticsRoutes>`.
