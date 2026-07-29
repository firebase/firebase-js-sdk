# TanStack Router Setup Guide - Firebase Crashlytics

This guide details how to integrate Firebase Crashlytics into a React application using TanStack Router for automatic error reporting and stack trace de-obfuscation.

---

<!-- #include "../../docs/_initial_setup.md" -->
> [!NOTE]
> For core package installation and Firebase App singleton configuration, see [_initial_setup.md](../../docs/_initial_setup.md).

---

## Automatic Error Capturing

If you are using TanStack Router, register `recordError` in `defaultOnCatch`:

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

<!-- #include "../../docs/_programmatic_error_capturing.md" -->
> [!NOTE]
> For manually capturing handled exceptions with custom metadata, see [_programmatic_error_capturing.md](../../docs/_programmatic_error_capturing.md).

---

<!-- #include "../../docs/_force_flushing.md" -->
> [!NOTE]
> For force-flushing buffered telemetry records before unloads, see [_force_flushing.md](../../docs/_force_flushing.md).

---

## Stack Trace De-obfuscation (Source Map Uploading)

<!-- #include "../../docs/_sourcemap_cli_setup.md" -->
> [!NOTE]
> For Firebase CLI prerequisites and authentication steps, see [_sourcemap_cli_setup.md](../../docs/_sourcemap_cli_setup.md).

### Configure Build Tool for Source Maps

For Vite (TanStack), enable `sourcemap` in `vite.config.ts`:

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

<!-- #include "../../docs/_gotchas_dual_package.md" -->
> [!NOTE]
> For import standardization guidelines, see [_gotchas_dual_package.md](../../docs/_gotchas_dual_package.md).

### TypeScript: `verbatimModuleSyntax` Resolution

Vite and React templates often enforce strict `verbatimModuleSyntax: true` inside `tsconfig.json`. This requires explicit `import type` definitions for type-only imports.

```typescript
// ❌ Throws verbatim syntax compile errors
import { FirebaseApp } from 'firebase/app';

// ✅ Compiles successfully
import type { FirebaseApp } from '@firebase/app';
```

<!-- #include "../../docs/_custom_attribute_collection.md" -->
> [!NOTE]
> For logging custom attributes without a `log()` method, see [_custom_attribute_collection.md](../../docs/_custom_attribute_collection.md).
