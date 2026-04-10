# How to Add Contextual Errors to Data Connect

This guide outlines a proposal and implementation plan for adding **contextual errors** to the `@firebase/data-connect` package. This pattern aims to enrich errors with operational context (such as operation names, variables, and service configuration) to make debugging significantly easier for developers.

This proposal draws inspiration from the `ContextualErrorTracker` pattern explored in the Firestore package.

---

## 1. Background & Rationale

Currently, the `data-connect` package defines `DataConnectError` and `DataConnectOperationError` in `src/core/error.ts`. While `DataConnectOperationError` captures GraphQL execution errors and their paths (returned by the backend), it does not automatically capture the client-side context that triggered the request, such as:

*   **Operation Name**: The specific query or mutation being executed.
*   **Variables**: The variables passed to the operation.
*   **Service Configuration**: `serviceId`, `locationId`, etc.

Adding this context to errors will allow for better logging, easier reproduction of issues, and more informative error messages.

---

## 2. Proposed Design

### A. Define `DataConnectOperationContext`

We should define an interface to represent the context of a Data Connect operation.

```typescript
export interface DataConnectOperationContext {
  operationName?: string;
  variables?: Record<string, unknown>;
  serviceId: string;
  locationId: string;
  auth: { uid?: string }; // Captured at request time
}
```

### B. Enrich `DataConnectError`

Update `DataConnectError` to optionally accept and store this context.

```typescript
export class DataConnectError extends FirebaseError {
  readonly name: string = 'DataConnectError';
  context?: DataConnectOperationContext;

  constructor(code: Code, message: string, context?: DataConnectOperationContext) {
    super(code, message);
    this.context = context;
    Object.setPrototypeOf(this, DataConnectError.prototype);
  }
}
```

### C. Create a Tracker / Wrapper Utility

To avoid boilerplate in every execution point, we can create a utility function or class to execute an operation and automatically wrap any thrown error with the provided context.

```typescript
export async function withErrorContext<T>(
  context: DataConnectOperationContext,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DataConnectError) {
      // Enrich the error with call-time context
      error.context = context;
      throw error;
    }
    // For non-DataConnect errors, we might want to wrap them
    throw new DataConnectError(
      Code.OTHER,
      `Error during ${context.operationName || 'operation'}: ${error.message}`,
      context
    );
  }
}
```

### D. Conditional Enrichment via `throwDetailedError`

To avoid leaking sensitive information (like variables or auth state) in production logs by default, we will use `throwDetailedError` from `@firebase/util`. 

However, since `throwDetailedError` returns a `FirebaseError` or `DetailedFirebaseError` (and not a `DataConnectError`), we need a specific workflow to preserve our custom error types while leveraging this central toggle:

1.  **Capture Context** at the transport layer.
2.  **Create a temporary `FirebaseErrorWithAuthInfo`** containing our context in `customData` (parsing the token first).
3.  **Call `throwDetailedError(app, errorWithToken)`**.
4.  **Check the result**:
    *   If it returns a `DetailedFirebaseError` (indicating detailed errors are enabled), we extract the detailed message.
    *   If it returns a standard `FirebaseError`, we use the standard message.
5.  **Construct a new `DataConnectError`** (or `DataConnectOperationError`) using the message obtained, and optionally attach the structured context if detailed errors are enabled.
6.  **Throw the new `DataConnectError`**.

Here is how this looks in code:

```typescript
// Inside the catch block of a transport layer operation
try {
  return await dcFetch(...);
} catch (error) {
  if (error instanceof DataConnectError) {
    const context: DataConnectOperationContext = { /* ... */ };
    
    // 2. Parse token and create temporary FirebaseErrorWithAuthInfo
    const authInfo = this._accessToken ? parseIdTokenToAuthInfo(this._accessToken) : null;
    const errorWithAuthInfo = new FirebaseErrorWithAuthInfo(
      new FirebaseError(error.code, error.message, { context }),
      authInfo
    );

    // 3. Call throwDetailedError
    const detailedErr = throwDetailedError(this.authProvider.app, errorWithAuthInfo);

    // 4 & 5. Construct new DataConnectError with the message from detailedErr
    const finalErr = new DataConnectError(error.code, detailedErr.message);

    // 5. Optionally attach structured context
    if (detailedErr instanceof DetailedFirebaseError) {
      finalErr.context = context;
    }

    // 6. Throw
    throw finalErr;
  }
  throw error;
}
```

This ensures that `error instanceof DataConnectError` remains true for callers, while respecting the `detailedErrors` setting.

---

## 3. Implementation Steps

### Step 1: Update `src/core/error.ts`

1.  Add the `DataConnectOperationContext` interface.
2.  Update `DataConnectError` to store the context.

### Step 2: Capture Context in the Transport Layer (All Implementations)

The most accurate place to capture the auth context is in the transport layer implementation (e.g., `RESTTransport` in `src/network/transport/rest.ts`), specifically right before the request is sent to the server. This ensures that the context reflects the state at the time of the request. All transport implementations should follow this pattern.

Example modification in `invokeQuery`:

```typescript
  invokeQuery: <T, U>(
    queryName: string,
    body?: U
  ) => Promise<DataConnectResponse<T>> = <T, U = unknown>(
    queryName: string,
    body: U
  ) => {
    const abortController = new AbortController();

    const withAuth = this.withRetry(() => {
      // 1. Capture auth context at the time of request
      const authContext = {
        uid: this.authProvider?.getCurrentUid() // Assuming a way to get current UID
      };

      const context: DataConnectOperationContext = {
        operationName: queryName,
        variables: body as Record<string, unknown>,
        serviceId: this._serviceName,
        locationId: this._location,
        auth: authContext
      };

      // 2. Execute fetch and enrich error if it fails
      return dcFetch<T, U>(
        addToken(`${this.endpointUrl}:executeQuery`, this.apiKey),
        {
          name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
          operationName: queryName,
          variables: body
        },
        abortController,
        this.appId,
        this._accessToken,
        this._appCheckToken,
        this._isUsingGen,
        this._callerSdkType,
        this._isUsingEmulator
      ).catch(error => {
        if (error instanceof DataConnectError) {
          // 3. Attach context to customData for throwDetailedError
          const customData = {
            ...error.customData,
            context
          };
          
          // Parse token and create temporary FirebaseErrorWithAuthInfo
          const authInfo = this._accessToken ? parseIdTokenToAuthInfo(this._accessToken) : null;
          const errorWithAuthInfo = new FirebaseErrorWithAuthInfo(
            new FirebaseError(error.code, error.message, customData),
            authInfo
          );
          
          // Call throwDetailedError to respect the central toggle
          // Imports from @firebase/util: throwDetailedError, FirebaseErrorWithAuthInfo, FirebaseError, DetailedFirebaseError, parseIdTokenToAuthInfo
          const detailedErr = throwDetailedError(this.authProvider.app, errorWithAuthInfo);
          
          // Preserving DataConnectError instance while using the detailed message
          const finalErr = new DataConnectError(error.code, detailedErr.message);
          
          // Optionally attach structured context if detailed errors are enabled
          if (detailedErr instanceof DetailedFirebaseError) {
            finalErr.context = context;
          }
          
          throw finalErr;
        }
        throw error;
      });
    });
    return withAuth;
  };
```

---

## 4. Open Questions & Future Considerations

> [!NOTE]
> Consider whether sensitive data in `variables` should be redacted before attaching to errors to prevent leaking PII in logs.

*   **Custom Claims**: Should we also attach specific custom claims to the auth context?
*   **Integration with Firebase Logger**: Ensure that the attached context is correctly serialized when passed to `console.error` or a logging service.
