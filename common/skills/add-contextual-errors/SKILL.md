# Skill: Add Contextual Errors to Firebase SDK Packages

## Goal
Enrich errors thrown by Firebase SDK packages with operational context (operation name, variables, resource paths, auth state) to improve debuggability, while respecting the central `detailedErrors` toggle to prevent information leakage in production.

## Applicability
This pattern applies to any package in the Firebase JS SDK that performs network operations (e.g., `firestore`, `functions`, `storage`, `data-connect`).

## Core Principles

1.  **Capture Auth Context**: Always capture the auth state (e.g., idToken) to understand who made the request.
2.  **No `any`**: Ensure all types are properly defined. Never use `any` to bypass type checks.
3.  **Capture at Request Time**: Capture the context (especially auth state) at the exact moment the network request is initiated, not when the high-level API function is called.
4.  **Respect `detailedErrors`**: Use `throwDetailedError` from `@firebase/util` to ensure context is only serialized into the error message if the user has enabled detailed errors via `setDetailedErrors`.
5.  **Preserve Custom Error Types**: Ensure that the thrown error remains an instance of the specific package's error class (e.g., `DataConnectError`, `FirestoreError`) so that `instanceof` checks still work for developers.
6. **Respect current API surface and do not modify it**: Ensure that all user-facing APIs are not affected. Usually this is listed in an `api.ts` file or using api-extractor.

---

## Steps to Apply

### Step 1: Define the Operation Context

Define an interface in the package to represent the context of an operation. This should include whatever client-side state is useful for debugging.

```typescript
export interface OperationContext {
  operationName?: string;
  variables?: Record<string, unknown>;
  // Add other package-specific context here (e.g. storage bucket, firestore path)
  auth: { uid?: string };
}
```

### Step 2: Update Custom Error Classes

Update the package's custom error class to optionally store this context. Ensure it is mutable or can be set in the constructor.

```typescript
export class MyPackageError extends FirebaseError {
  context?: OperationContext;

  constructor(code: string, message: string, context?: OperationContext) {
    super(code, message);
    this.context = context;
    Object.setPrototypeOf(this, MyPackageError.prototype);
  }
}
```

### Step 3: Identify Execution Points

Find the low-level methods in the package that actually send requests to the backend (e.g., in the transport layer or RPC invoker).

### Step 4: Implement Request-Time Capture and Enrichment

In the identified execution points, wrap the network call in a try/catch block and apply the enrichment workflow.

```typescript
// Inside a low-level network operation method
try {
  return await sendNetworkRequest(...);
} catch (error) {
  if (error instanceof MyPackageError) {
    // 1. Capture context at the exact time of request
    const context: OperationContext = {
      operationName: 'myOperation',
      variables: requestBody as Record<string, unknown>,
      auth: { uid: this.authProvider?.getCurrentUid() } // Capture current state
    };

    // 2. Attach context to customData for throwDetailedError
    const customData = {
      ...error.customData,
      context
    };
    
    // 3. Parse token and create temporary FirebaseErrorWithAuthInfo
    const authInfo = this._accessToken ? parseIdTokenToAuthInfo(this._accessToken) : null;
    const errorWithAuthInfo = new FirebaseErrorWithAuthInfo(
      new FirebaseError(error.code, error.message, customData),
      authInfo
    );
    
    // 4. Call throwDetailedError to respect the central toggle
    const detailedErr = throwDetailedError(this.authProvider.app, errorWithAuthInfo);
    
    // 5. Preserving Custom Error instance while using the detailed message
    const finalErr = new MyPackageError(error.code, detailedErr.message);
    
    // 6. Optionally attach structured context if detailed errors are enabled
    if (detailedErr instanceof DetailedFirebaseError) {
      finalErr.context = context;
    }
    
    throw finalErr;
  }
  throw error;
}
```

---

## Verification Plan

### Automated Tests
- Verify that errors thrown when `setDetailedErrors(app, false)` do NOT contain operation variables or decoded id token in the message.
- Verify that errors thrown when `setDetailedErrors(app, true)` DO contain operation variables and decoded id token in the message.
- Verify that `error instanceof MyPackageError` remains true in both cases.

