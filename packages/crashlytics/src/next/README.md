# Next.js Setup Guide - Firebase Crashlytics

This guide details how to integrate Firebase Crashlytics into a Next.js application for automatic error reporting (client-side and server-side request instrumentation), manual error tracking, and stack trace de-obfuscation.

---

<!-- #include "../../docs/_initial_setup.md" -->
> [!NOTE]
> For core package installation and Firebase App singleton configuration, see [_initial_setup.md](../../docs/_initial_setup.md).

---

## Automatic Error Capturing

### Client-Side / App Router Layout

In Next.js App Router, `layout.tsx` is a Server Component by default. Because `FirebaseApp` is non-serializable, wrap `<FirebaseCrashlytics>` in a Client Component (e.g., `src/components/CrashlyticsProvider.tsx`) marked with the `"use client"` directive:

```tsx
// src/components/CrashlyticsProvider.tsx
'use client';

import React from 'react';
import { FirebaseCrashlytics } from '@firebase/crashlytics/react';
import { app } from '../lib/firebase'; // Shared initialization script

export function CrashlyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FirebaseCrashlytics firebaseApp={app} />
      {children}
    </>
  );
}
```

Then wrap your root layout with `<CrashlyticsProvider>`:

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

> [!NOTE]
> If you have existing error boundary components in your application and would like to capture those errors in Crashlytics as well, make sure to follow the steps in [Programmatic Error Capturing](#programmatic-error-capturing) to add a call to `recordError`.

### Server-Side / Request Error Instrumentation

Automatically report uncaught errors from server routes to Firebase Crashlytics by defining `onRequestError` in Next.js's [instrumentation file](https://nextjs.org/docs/app/guides/instrumentation):

```typescript
// instrumentation.ts
import { nextOnRequestError } from '@firebase/crashlytics';

export const onRequestError = nextOnRequestError();
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

### Configure Next.js / Turbopack for Source Maps

For Next.js / Turbopack, enable `productionBrowserSourceMaps` in `next.config.ts`:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
};

export default nextConfig;
```

### Upload Source Maps

Next.js stores generated source maps within the `.next` folder in the project root directory. Run the upload command:

```bash
firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --debug .next
```

### Automate in Build Pipeline

Add two new scripts to your `package.json` and invoke them from your `build` command:

```json
{
  "name": "enterprise-web-app",
  "scripts": {
    "build": "next build && npm run maps:upload && npm run maps:clean",
    "maps:upload": "firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --debug .next",
    "maps:clean": "node -e \"const fs = require('fs'); fs.readdirSync('.next', { recursive: true, withFileTypes: true }).forEach(f => { if(f.isFile() && f.name.endsWith('.map')) fs.rmSync(require('path').join(f.parentPath || f.path, f.name), { force: true }) })\""
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

Next.js application templates often enforce strict `verbatimModuleSyntax: true` inside `tsconfig.json`. This configuration requires explicit `import type` definitions for type-only imports.

- **Resolution**: Adjust imports as shown below if you see `"FirebaseApp is a type and must be imported using a type-import"` errors:

```typescript
// ❌ Throws verbatim syntax compile errors
import { FirebaseApp } from 'firebase/app';

// ✅ Compiles successfully
import type { FirebaseApp } from '@firebase/app';
```

<!-- #include "../../docs/_custom_attribute_collection.md" -->
> [!NOTE]
> For logging custom attributes without a `log()` method, see [_custom_attribute_collection.md](../../docs/_custom_attribute_collection.md).
