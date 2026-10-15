## React Router Navigation Tracking Setup - Firebase Crashlytics

This guide covers the incremental steps to enable automatic route navigation tracking (screen views) for React Router (v6+) applications in the Firebase Crashlytics Session Breadcrumbs & Logs private preview.

### Step 1: Replace `<Routes>` with `<CrashlyticsRoutes>`

In your routing configuration (typically `src/App.tsx`), import `<CrashlyticsRoutes>` from `@firebase/crashlytics/react-router` and use it in place of React Router's standard `<Routes>` component:

```diff
// src/App.tsx
import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
+import { CrashlyticsRoutes } from '@firebase/crashlytics/react-router';
import { app } from './lib/firebase';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Product from './pages/Product';

export default function App() {
  return (
    <BrowserRouter>
+      <CrashlyticsRoutes firebaseApp={app}>
+        <Route path="/" element={<Home />} />
+        <Route path="/profile/:userId" element={<Profile />} />
+        <Route path="/products/:productId/details" element={<Product />} />
+      </CrashlyticsRoutes>
    </BrowserRouter>
  );
}
```

**Note:** `<CrashlyticsRoutes>` is a drop-in replacement for `<Routes>`. It matches active routes against your route patterns so session breadcrumbs and crash reports display parameterized routes (e.g. `/profile/:userId`) instead of raw URLs containing PII.
