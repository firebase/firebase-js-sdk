# `@firebase/sql` Implementation Decisions

## Decision 1: HTTP Transport, Auth/AppCheck Headers, and Protected Headers

- **Question**: HTTP Transport, Auth/AppCheck Headers, and Protected Headers — How should `FirebaseSql` wire `fetch` and outgoing headers into `PostgrestClient`?
- **Options Presented**:
  - `DataConnect` (Recommended): Custom `fetch` wrapper (calling `getFetch`) attaching `X-Firebase-Auth-Token`, `X-Firebase-AppCheck`, `x-firebase-gmpid`, `X-Goog-Api-Client`, `X-Client-Version`, and API key matching `@firebase/data-connect` (with 1x token-refresh retry on `401`), guarding SDK-managed headers in `DISALLOWED_HEADER_KEYS` and `Builder.setHeader`.
  - `Tokens`: Custom `fetch` attaching only `X-Firebase-Auth-Token` and `X-Firebase-AppCheck`, guarding them in `DISALLOWED_HEADER_KEYS`.
  - `Bearer`: Same as `Tokens`, except `Authorization: Bearer <token>` alongside `X-Firebase-AppCheck`.
  - `Passthrough`: Pass `getFetch`, `settings.headers`, and `settings.schemaName` directly to `PostgrestClient` with no token/platform header injection.
- **Selected Option**: Follow the header specification in tab `t.i3mxnwxhtblj` (`Firebase SQL Headers (Oct 2026)`) of `https://docs.google.com/document/d/1UlKp-42e2pasMaTHwIRk0LfuWixQ3zlk1V_ZpBrY6nI/edit?tab=t.i3mxnwxhtblj` plus 1x token-refresh retry on HTTP `401`.
- **Relevant Discussion / Specification Summary**:
  - **Custom `fetch` transport**: Wire a custom `fetch` wrapper (delegating to `getFetch()`) into `PostgrestClient` that injects the required Firebase SQL headers on outgoing HTTP requests and performs a single (`1x`) Auth token-refresh retry (`forceRefresh: true`) when a request receives an HTTP `401` response.
  - **Required Headers** (MUST be sent on every HTTP request, using the same value formats as the Firebase Data Connect JS SDK per tab `t.0` of the spec doc):
    - `x-goog-api-client`: `gl-js/ fire/<sdk-version>` (for the core JS SDK)
    - `x-client-version`: `web/<sdk-version>`
    - `x-firebase-gmpid`: `<app.options.appId>`
    - `x-firebase-auth-token`: `<auth-token>` (sent only if Firebase Auth provides a token)
    - `x-firebase-appcheck`: `<app-check-token>` (sent only if Firebase App Check provides a token)
  - **Forbidden Headers** (explicitly forbidden; MUST NOT be sent by Firebase SQL SDKs):
    - `x-firebase-sqlconnect-affinity` (GSLB soft stickiness for HTTP REST is achieved via URL path components)
    - `x-goog-request-params` (gRPC transport only)
    - `x-firebase-client` (not on the GFE CORS allowlist)
    - `x-firebase-client-log-type` (excluded due to `x-firebase-client` exclusion)
  - **Reserved Headers** (case-insensitive; MUST throw an exception synchronously at the point a caller attempts to set them, e.g., via `getSql()` `settings.headers` / `DISALLOWED_HEADER_KEYS` or `Builder.setHeader()`):
    - All headers in the **Required Headers** list (`x-goog-api-client`, `x-client-version`, `x-firebase-gmpid`, `x-firebase-auth-token`, `x-firebase-appcheck`)
    - `authorization` (the backend only supports `authorization` for non-Firebase clients such as Supabase SDKs and rejects requests with `INVALID_ARGUMENT` if both `authorization` and `x-firebase-auth-token` are present; Firebase SDKs must exclusively use `x-firebase-auth-token`)
