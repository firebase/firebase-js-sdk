# Next.js Setup Guide - Firebase Crashlytics

This guide details how to integrate Firebase Crashlytics into a Next.js application for automatic error reporting (client-side), manual error tracking, and stack trace de-obfuscation.

---

> [!NOTE]
> For core package installation and Firebase App singleton configuration, see [Core SDK Installation & Initialization](../../README.md#step-2-core-sdk-installation--initialization).

---

## Automatic Error Capturing

### Next.js 15.3+ (Recommended): Client Instrumentation (`instrumentation-client.ts`)

Next.js 15.3+ includes native client-side instrumentation via `instrumentation-client.ts` (or `instrumentation-client.js`). Next.js executes this file in the browser before React hydration begins.

Create `src/instrumentation-client.ts` (or `instrumentation-client.ts` in your project root if not using a `src/` directory) and initialize Crashlytics:

```typescript
// src/instrumentation-client.ts
import { getCrashlytics } from '@firebase/crashlytics';
import { app } from './lib/firebase'; // Shared initialization script

getCrashlytics(app);
```

This single file initializes Crashlytics before React hydration and automatically registers global error listeners (`error` and `unhandledrejection`) with zero modifications to `src/app/layout.tsx` or any React component.

### Next.js < 15.3: Client-Side / App Router Layout

For Next.js versions earlier than 15.3, `layout.tsx` is a Server Component by default. Because `FirebaseApp` is non-serializable, wrap `<FirebaseCrashlytics>` (from `@firebase/crashlytics/react` to initialize Crashlytics and capture uncaught errors) in a Client Component (e.g., `src/components/CrashlyticsProvider.tsx`) marked with the `"use client"` directive:

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
> If you have existing error boundary components in your application and would like to capture those errors in Crashlytics as well, make sure to follow the steps in [Programmatic Error Capturing](../../docs/ADVANCED_USAGE.md#programmatic-error-capturing) to add a call to `recordError`.

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

Update your `build` script in `package.json` to upload and delete source maps automatically using the `--clean` flag:

```json
{
  "name": "enterprise-web-app",
  "scripts": {
    "build": "next build && firebase crashlytics:sourcemap:upload --project <YOUR_FIREBASE_PROJECT_ID> --app <YOUR_FIREBASE_APP_ID> --clean --debug .next"
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

Next.js application templates often enforce strict `verbatimModuleSyntax: true` inside `tsconfig.json`. This configuration requires explicit `import type` definitions for type-only imports.

- **Resolution**: Adjust imports as shown below if you see `"FirebaseApp is a type and must be imported using a type-import"` errors:

```typescript
// ❌ Throws verbatim syntax compile errors
import { FirebaseApp } from 'firebase/app';

// ✅ Compiles successfully
import type { FirebaseApp } from '@firebase/app';
```

<!-- #include "../../docs/ADVANCED_USAGE.md#custom-attributes" -->
> [!NOTE]
> For logging custom attributes without a `log()` method, see [Advanced Usage: Custom Attributes](../../docs/ADVANCED_USAGE.md#custom-attributes).
