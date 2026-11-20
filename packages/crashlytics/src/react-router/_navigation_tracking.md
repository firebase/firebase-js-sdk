## React Router Navigation Tracking Setup - Firebase Crashlytics

This guide covers the incremental steps to enable automatic route navigation tracking (screen views) for React Router (v6+) applications in the Firebase Crashlytics Session Breadcrumbs & Logs private preview.

Navigation tracking needs only `routeChanges()` in the `capture` list of `breadcrumbs()`, as the example below shows. Without it, no route changes are recorded. If you already capture other breadcrumbs, keep your existing list and make sure it includes `routeChanges()`; `all()` already does (see [Choose what to capture](../../docs/ADD_BREADCRUMBS.md#choose-what-to-capture)).

### Step 1: Replace `<Routes>` with `<CrashlyticsRoutes>`

In your routing configuration (typically `src/App.tsx`), import `<CrashlyticsRoutes>` from `firebase/crashlytics/react-router` and use it in place of React Router's standard `<Routes>` component, passing `crashlyticsOptions` that capture `routeChanges()`:

```diff
// src/App.tsx
import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
+import { breadcrumbs, routeChanges } from 'firebase/crashlytics';
+import { CrashlyticsRoutes } from 'firebase/crashlytics/react-router';
import { app } from './lib/firebase';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Product from './pages/Product';

+const crashlyticsOptions = {
+  features: [breadcrumbs({ capture: [routeChanges()] })]
+};
+
export default function App() {
  return (
    <BrowserRouter>
+      <CrashlyticsRoutes firebaseApp={app} crashlyticsOptions={crashlyticsOptions}>
+        <Route path="/" element={<Home />} />
+        <Route path="/profile/:userId" element={<Profile />} />
+        <Route path="/products/:productId/details" element={<Product />} />
+      </CrashlyticsRoutes>
    </BrowserRouter>
  );
}
```

**Note:** `<CrashlyticsRoutes>` is a drop-in replacement for `<Routes>`. It matches active routes against your route patterns so session breadcrumbs and crash reports display parameterized routes (e.g. `/profile/:userId`) instead of raw URLs containing PII. Crashlytics must be initialized with the same options everywhere in your app, so if you also render `<FirebaseCrashlytics>`, pass it the same `crashlyticsOptions` object.
