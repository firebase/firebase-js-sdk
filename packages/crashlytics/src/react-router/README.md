# React Router (v6+) Setup Guide - Firebase Crashlytics

This guide details how to integrate Firebase Crashlytics into a React application using React Router (v6+) or Tanstack Router for automatic error reporting, route templating, and stack trace de-obfuscation.

---

<!-- #include "../../partials/_initial_setup.md" -->
> [!NOTE]
> For core package installation and Firebase App singleton configuration, see [_initial_setup.md](../../partials/_initial_setup.md).

---

## Automatic Error Capturing

### React Router (v6+)

If you're using React Router (v6+) in your application instead of Next.js-based routing, replace React Router's `<Routes>` container with `<CrashlyticsRoutes>`. This handles uncaught rejections and exceptions across routes and tracks errors using templated path names (e.g. `/profile/:userId`).

```tsx
// src/App.tsx
import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { CrashlyticsRoutes } from '@firebase/crashlytics/react-router';
import { app } from './lib/firebase'; // Shared initialization script
import Home from './pages/Home';
import Profile from './pages/Profile';
import Product from './pages/Product';

export default function App() {
  return (
    <BrowserRouter>
      <CrashlyticsRoutes firebaseApp={app}>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/product/:productId/details" element={<Product />} />
      </CrashlyticsRoutes>
    </BrowserRouter>
  );
}
```

### Tanstack Router

If you are using Tanstack Router, register `recordError` in `defaultOnCatch`:

```typescript
import { recordError, getCrashlytics } from "@firebase/crashlytics";
import { app } from "./lib/firebase"; // shared initialization script
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultOnCatch: (error, errorInfo) => {
    recordError(getCrashlytics(app), error, errorInfo);
  },
});
```

---

<!-- #include "../../partials/_programmatic_error_capturing.md" -->
> [!NOTE]
> For manually capturing handled exceptions with custom metadata, see [_programmatic_error_capturing.md](../../partials/_programmatic_error_capturing.md).

---

<!-- #include "../../partials/_force_flushing.md" -->
> [!NOTE]
> For force-flushing buffered telemetry records before unloads, see [_force_flushing.md](../../partials/_force_flushing.md).

---

## Stack Trace De-obfuscation (Source Map Uploading)

<!-- #include "../../partials/_sourcemap_cli_setup.md" -->
> [!NOTE]
> For Firebase CLI prerequisites and authentication steps, see [_sourcemap_cli_setup.md](../../partials/_sourcemap_cli_setup.md).

### Configure Build Tool for Source Maps

For Vite (React / TanStack), enable `sourcemap` in `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
  },
});
```

### Upload Source Maps

Run the upload command targeting your build directory (e.g. `dist`):

```bash
firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --debug dist
```

### Automate in Build Pipeline

Add two new scripts to your `package.json` and invoke them from your `build` command:

```json
{
  "name": "enterprise-web-app",
  "scripts": {
    "build": "vite build && npm run maps:upload && npm run maps:clean",
    "maps:upload": "firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --debug dist",
    "maps:clean": "node -e \"const fs = require('fs'); fs.readdirSync('dist', { recursive: true, withFileTypes: true }).forEach(f => { if(f.isFile() && f.name.endsWith('.map')) fs.rmSync(require('path').join(f.parentPath || f.path, f.name), { force: true }) })\""
  }
}
```

---

## Framework-Specific Best Practices & Gotchas

To ensure smooth integration during the private preview, review these essential best practices:

<!-- #include "../../partials/_gotchas_dual_package.md" -->
> [!NOTE]
> For import standardization guidelines, see [_gotchas_dual_package.md](../../partials/_gotchas_dual_package.md).

### TypeScript: `verbatimModuleSyntax` Resolution

Vite and React templates often enforce strict `verbatimModuleSyntax: true` inside `tsconfig.json`. This requires explicit `import type` definitions for type-only imports.

```typescript
// ❌ Throws verbatim syntax compile errors
import { FirebaseApp } from 'firebase/app';

// ✅ Compiles successfully
import type { FirebaseApp } from '@firebase/app';
```

<!-- #include "../../partials/_gotchas_absence_of_log.md" -->
> [!NOTE]
> For logging custom attributes without a `log()` method, see [_gotchas_absence_of_log.md](../../partials/_gotchas_absence_of_log.md).
