# React Router (v6+) Setup Guide - Firebase Crashlytics

This guide details how to integrate Firebase Crashlytics into a React application using React Router (v6+) for automatic error reporting, route templating, and stack trace de-obfuscation.

---

> [!NOTE]
> For core package installation and Firebase App singleton configuration, see [Core SDK Installation & Initialization](../../README.md#step-2-core-sdk-installation--initialization).

---

## Automatic Error Capturing

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

---

<!-- #include "../../docs/ADVANCED_USAGE.md#programmatic-error-capturing" -->
> [!NOTE]
> For manually capturing handled exceptions with custom metadata, see [Advanced Usage: Programmatic Error Capturing](../../docs/ADVANCED_USAGE.md#programmatic-error-capturing).

---

<!-- #include "../../docs/ADVANCED_USAGE.md#force-flushing-telemetry-records-flush" -->
> [!NOTE]
> For force-flushing buffered telemetry records before unloads, see [Advanced Usage: Force Flushing Telemetry Records](../../docs/ADVANCED_USAGE.md#force-flushing-telemetry-records-flush).

---

## Stack Trace De-obfuscation (Source Map Uploading)

<!-- #include "../../docs/_sourcemap_cli_setup.md" -->
> [!NOTE]
> For Firebase CLI prerequisites and authentication steps, see [_sourcemap_cli_setup.md](../../docs/_sourcemap_cli_setup.md).

### Configure Build Tool for Source Maps

For Vite (React), enable `sourcemap` in `vite.config.ts`:

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

<!-- #include "../../docs/ADVANCED_USAGE.md#avoid-dual-package-hazards" -->
> [!NOTE]
> For import standardization guidelines, see [Advanced Usage: Avoid Dual Package Hazards](../../docs/ADVANCED_USAGE.md#avoid-dual-package-hazards).

### TypeScript: `verbatimModuleSyntax` Resolution

Vite and React templates often enforce strict `verbatimModuleSyntax: true` inside `tsconfig.json`. This requires explicit `import type` definitions for type-only imports.

```typescript
// ❌ Throws verbatim syntax compile errors
import { FirebaseApp } from 'firebase/app';

// ✅ Compiles successfully
import type { FirebaseApp } from '@firebase/app';
```

<!-- #include "../../docs/ADVANCED_USAGE.md#custom-attributes" -->
> [!NOTE]
> For logging custom attributes without a `log()` method, see [Advanced Usage: Custom Attributes](../../docs/ADVANCED_USAGE.md#custom-attributes).
