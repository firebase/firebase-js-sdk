# Proposal: Contextual Errors in Data Connect

This document outlines how to implement **contextual error reporting** in the `@firebase/data-connect` package, following the pattern established in the Firestore package. This enriches errors with operational context (such as operation names, variables, and authentication information) to make debugging significantly easier for developers when `enableContextualErrors` is enabled in `@firebase/util`.

## Overview of Pattern

Instead of throwing separate detailed errors, the pattern utilizes `getContextualMsg` from `@firebase/util` to format error messages when contextual errors are enabled. The context is also stored in the `customData` field of the error object, allowing programmatic access.

---

## Proposed Changes

### 1. Update `packages/data-connect/src/core/error.ts`

#### 1.1 Define `DataConnectOperationContext` Interface

Add the following interface to hold the operational context:

```typescript
import { ErrorAuthInfo } from '@firebase/util';

export interface DataConnectOperationContext {
  operationName: string;
  variables?: Record<string, unknown>;
  serviceId?: string;
  locationId?: string;
  authInfo: ErrorAuthInfo | null;
}
```

#### 1.2 Update `DataConnectError`

Make `DataConnectError` support `customData` by updating its signature and passing it to the `super` constructor (`FirebaseError` supports this):

```typescript
export class DataConnectError<T = undefined> extends FirebaseError {
  readonly name: string = 'DataConnectError';

  constructor(code: Code, message: string, customData?: T) {
    super(code, message, customData);
    Object.setPrototypeOf(this, DataConnectError.prototype);
  }

  // ... existing methods ...
}
```

#### 1.3 Add `enrichDataConnectError` Helper

Add a helper function at the bottom of the file to handle the enrichment logic. Note that `getContextualMsg` internally checks if contextual errors are enabled, so no extra check is needed here. To avoid mutating the original error and using `any`, we return a new instance if enrichment is needed.

```typescript
import { getContextualMsg } from '@firebase/util';

export function enrichDataConnectError(
  err: Error,
  context: DataConnectOperationContext
): Error {
  if (err instanceof DataConnectError) {
    const msg = getContextualMsg(err.message, context);
    // Return a new instance with the enriched message and merged customData
    return new DataConnectError(err.code as Code, msg, {
      ...err.customData,
      ...context
    });
  }
  return err;
}
```

---

### 2. Update `packages/data-connect/src/network/transport/rest.ts`

In the transport layer, capture the context during request execution and apply the enrichment on failure.

#### 2.1 Capture Context in `invokeQuery`

Update `invokeQuery` to capture context and catch errors from `dcFetch`:

```typescript
import { parseIdTokenToAuthInfo } from '@firebase/util';

// ... inside invokeQuery ...
    const withAuth = this.withRetry(() => {
      const context: DataConnectOperationContext = {
        operationName: queryName,
        variables: body as Record<string, unknown>,
        serviceId: this._serviceName,
        locationId: this._location,
        authInfo: this._accessToken ? parseIdTokenToAuthInfo(this._accessToken) : null
      };

      return dcFetch<T, U>(
        // ... args ...
      ).catch(err => {
        throw enrichDataConnectError(err, context);
      });
    });
```

#### 2.2 Capture Context in `invokeMutation`

Similarly for `invokeMutation`:

```typescript
// ... inside invokeMutation ...
    const taskResult = this.withRetry(() => {
      const context: DataConnectOperationContext = {
        operationName: mutationName,
        variables: body as Record<string, unknown>,
        serviceId: this._serviceName,
        locationId: this._location,
        authInfo: this._accessToken ? parseIdTokenToAuthInfo(this._accessToken) : null
      };

      return dcFetch<T, U>(
        // ... args ...
      ).catch(err => {
        throw enrichDataConnectError(err, context);
      });
    });
```

---

### 3. Unit Tests

A new unit test file should be added to verify this behavior (e.g., `packages/data-connect/test/unit/errors.test.ts`).

Tests should verify:
1.  `enrichDataConnectError` correctly adds context to `customData`.
2.  `enrichDataConnectError` returns a new error with updated message when contextual errors are enabled.
3.  Operational context is correctly captured and attached during `invokeQuery` and `invokeMutation` failures.
