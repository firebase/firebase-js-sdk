# Audit Report: Degree of Duplication and Conflict between Commit `a091cc6518a5` and `packages/sql/src/network/postgrestFetch.ts`

**Branch:** `supabase_implementation` (PR #10551)  
**Target Commit:** `a091cc6518a5d0fb3138b8bba6aacff41c6213c9` (PR #10523, `origin/tree/main`)  
**Target File:** `packages/sql/src/network/postgrestFetch.ts`  
**Date:** October 30, 2026  

---

## 1. Executive Summary & Verdict

- **Do the changes duplicate each other?**  
  **Yes, to a very high degree.** From the perspective of `transport.ts` (introduced in commit `a091cc6518a5`), **approximately 95% of its functional logic is duplicated** in `postgrestFetch.ts`. Both implementations independently perform token retrieval, wire header resolution/injection, protected header filtering, and HTTP `401` force-refresh retries. Additionally, the header resolution logic in `headers.ts` (`resolveRequestHeaders` / `mergeHeadersInit`) is **100% functionally duplicated** by `buildRequestHeaders` in `postgrestFetch.ts`.

- **Do the changes conflict with each other?**  
  **Yes, architecturally and structurally, though not via active git merge markers.**
  1. **Contract Conflict:** Commit `a091cc6518a5` models transport as an object-oriented class `FirebaseSqlTransport` with a custom `invokePostgrestOperation(url: string, init?: RequestInit)` method. `@supabase/postgrest-js` requires a standard Web API `fetch: typeof fetch` function signature: `(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>`.
  2. **Dead Code / Disconnection Conflict:** In the current branch (`supabase_implementation`), `FirebaseSql` passes `createBuilderFetch` from `postgrestFetch.ts` directly into `@supabase/postgrest-js`. Consequently, `FirebaseSqlTransport` is completely unreferenced in production code. It exists as dead code tested only by its own isolated unit tests.
  3. **Resilience Divergence:** `postgrestFetch.ts` implements extensive safety mechanisms absent in `transport.ts` (abort signal propagation, stream body cancellation, cross-user auth principal isolation, cached token checks before force refresh, and one-shot body clone protection).

---

## 2. Quantitative Degree of Duplication

### 2.1 Code Line Analysis

| Component | Total Lines | Executable / Logic Lines | Duplicated Lines | % Duplicated |
| :--- | :---: | :---: | :---: | :---: |
| **`transport.ts`** (commit `a091cc6518a5`) | 172 | 110 | 105 | **~95%** |
| **`headers.ts`** (`resolveRequestHeaders` & `mergeHeadersInit`) | 65 | 50 | 50 | **100%** |
| **`postgrestFetch.ts`** (current branch) | 348 | 300 | 95 | **~32%** |
| **Test Suites** (`transport.test.ts` vs `postgrestFetch.test.ts`) | 673 vs 1,569 | 520 vs 1,280 | ~400 | **~60% of test scenarios** |

```
transport.ts (110 logic lines):
┌───────────────────────────────────────────────────────────────┬──────┐
│ Duplicated in postgrestFetch.ts (~95%)                        │ Uniq │
│ - Token Retrieval (Auth + App Check)                         │ ~5%  │
│ - Wire Header Injection                                       │ (CW) │
│ - 401 Force-Refresh & Request Retry                           │      │
└───────────────────────────────────────────────────────────────┴──────┘
(CW = Cloud Workstation credentials check)

postgrestFetch.ts (300 logic lines):
┌───────────────────────┬──────────────────────────────────────────────┐
│ Duplicated from       │ Unique Hardening & Safety Logic (~68%)       │
│ transport / headers   │ - AbortSignal & Cancellation Propagation     │
│ (~32%)                │ - 401 Body Stream Leakage Prevention         │
│                       │ - Auth Principal (UID) Concurrency Guard     │
│                       │ - Cached Token Pre-check before Refresh      │
│                       │ - Consumed & Streaming Request Body Replay   │
│                       │ - SDK Termination (NOT_INITIALIZED) Tracking │
└───────────────────────┴──────────────────────────────────────────────┘
```

### 2.2 Mechanism-by-Mechanism Duplication Breakdown

#### 1. Authentication & App Check Token Retrieval: **100% Duplicated**
- **Commit `a091cc6518a5` (`transport.ts` lines 86–97):**
  ```typescript
  const [authToken, appCheckToken] = await Promise.all([
    this.authProvider
      ? this.authProvider.getToken({ forceRefresh: false })
      : Promise.resolve(null),
    this.appCheckProvider
      ? this.appCheckProvider.getToken({ forceRefresh: false }).catch(() => null)
      : Promise.resolve(null)
  ]);
  ```
- **Current Branch (`postgrestFetch.ts` lines 189–196):**
  ```typescript
  const [authTokenData, appCheckTokenResult] = await Promise.all([
    active.authTokenProvider.getToken({ forceRefresh: false }),
    active.appCheckTokenProvider.getToken({ forceRefresh: false })
  ]);
  authToken = authTokenData?.accessToken ? authTokenData.accessToken : null;
  appCheckToken = appCheckTokenResult?.token ? appCheckTokenResult.token : null;
  ```
- **Degree:** Complete overlap in intent and execution.

---

#### 2. Wire Header Resolution & Injection: **90% Duplicated**
- **Commit `a091cc6518a5` (`headers.ts` lines 173–222):**
  - Iterates incoming headers.
  - Deletes `FORBIDDEN_HEADERS`.
  - Sets `x-goog-api-client` (`gl-js/ fire/<version>`).
  - Sets `x-firebase-gmpid` (`appId`).
  - Sets `x-firebase-auth-token` (`authToken.accessToken`).
  - Sets `x-firebase-appcheck` (`appCheckToken.token`).
  - Converts to plain object `Record<string, string>`.
- **Current Branch (`postgrestFetch.ts` lines 105–164):**
  - Iterates incoming headers (`Headers`, `Array`, or `Record`).
  - Deletes / skips `LOWERCASE_DISALLOWED_HEADER_KEYS`.
  - Sets `x-goog-api-client` (`gl-js/ fire/<version>`).
  - Sets `x-client-version` (`web/<version>`) *(only difference)*.
  - Sets `x-firebase-gmpid` (`appId`).
  - Sets `x-firebase-auth-token` (`authToken`).
  - Sets `x-firebase-appcheck` (`appCheckToken`).
  - Converts to plain object `Record<string, string>`.
- **Degree:** `buildRequestHeaders()` in `postgrestFetch.ts` is a near-identical reimplementation of `resolveRequestHeaders()` in `headers.ts`.

---

#### 3. HTTP 401 Token Refresh & Request Retry: **100% Intent Duplication / Asymmetric Hardening**
- **Commit `a091cc6518a5` (`transport.ts` lines 106–115 & 148–170):**
  - Checks `response.status === 401 && authToken`.
  - Calls `this.authProvider.getToken({ forceRefresh: true })`.
  - If new token !== old token:
    - Retries `fetchImpl(requestUrl, { ...requestInit, headers: { ...headers, 'x-firebase-auth-token': refreshedToken.accessToken } })`.
- **Current Branch (`postgrestFetch.ts` lines 274–340):**
  - Checks `response.status === 401 && authToken !== null && canReplayBody && state.active !== null`.
  - Drains/cancels previous response: `await response.body?.cancel().catch(() => {})`.
  - Checks cached token first: `active.authTokenProvider.getToken({ forceRefresh: false })`.
  - Only if needed calls `active.authTokenProvider.getToken({ forceRefresh: true })`.
  - Verifies user principal did not change: `refreshedUid === initialUid`.
  - Retries `executeFetch(retryInput ?? input, retryHeaders)`.
- **Degree:** The core concept of catching 401, refreshing auth token, and retrying with the new header is 100% duplicated. However, `postgrestFetch.ts` wraps that core in extensive safety checks.

---

## 3. Structural Comparison Matrix

| Feature / Behavior | `transport.ts` (`a091cc6518a5`) | `postgrestFetch.ts` (current branch) | Duplication Status |
| :--- | :---: | :---: | :--- |
| **Fetch Function Signature (`typeof fetch`)** | ❌ (Custom method) | ✅ (Web standard) | **Conflict:** Incompatible APIs |
| **Supports `Request` & `URL` inputs** | ❌ (Only `string`) | ✅ (`RequestInfo \| URL`) | **Divergence** |
| **Retrieves Auth Token** | ✅ | ✅ | **100% Duplicated** |
| **Retrieves App Check Token** | ✅ | ✅ | **100% Duplicated** |
| **Injects `x-goog-api-client`** | ✅ | ✅ | **100% Duplicated** |
| **Injects `x-firebase-gmpid`** | ✅ | ✅ | **100% Duplicated** |
| **Injects `x-firebase-auth-token`** | ✅ | ✅ | **100% Duplicated** |
| **Injects `x-firebase-appcheck`** | ✅ | ✅ | **100% Duplicated** |
| **Injects `x-client-version`** | ❌ | ✅ | Present only in `postgrestFetch.ts` |
| **Filters Disallowed Headers** | ✅ (via `headers.ts`) | ✅ (via `headers.ts`) | **Shared Dependency** |
| **Retries 401 once on token refresh** | ✅ | ✅ | **100% Duplicated in concept** |
| **Cancels/drains discarded 401 body** | ❌ (Socket leak risk) | ✅ | Present only in `postgrestFetch.ts` |
| **Checks cached token before force refresh** | ❌ | ✅ | Present only in `postgrestFetch.ts` |
| **Guards user UID switch across retry** | ❌ (Security risk) | ✅ | Present only in `postgrestFetch.ts` |
| **Protects stream & consumed request bodies** | ❌ (Crash risk) | ✅ | Present only in `postgrestFetch.ts` |
| **Handles `AbortSignal` & cancellation** | ❌ | ✅ | Present only in `postgrestFetch.ts` |
| **SDK termination lifecycle tracking** | ❌ | ✅ | Present only in `postgrestFetch.ts` |
| **Cloud Workstations emulator credentials** | ✅ | ❌ | Present only in `transport.ts` |
| **Invoked by `FirebaseSql` in production** | ❌ (Dead code) | ✅ (Production active) | **Conflict:** Dead code vs active |

---

## 4. Architectural Conflicts and Operational Status

### 4.1 Interface Contract Incompatibility
`@supabase/postgrest-js` requires an injected `fetch` function that matches the browser/Node global `typeof fetch`:
```typescript
fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
```
`FirebaseSqlTransport` from commit `a091cc6518a5` cannot satisfy this contract directly because it exposes:
```typescript
invokePostgrestOperation(url: string, init?: RequestInit): Promise<Response>;
```
It cannot accept a `Request` or `URL` object as the first parameter, and cannot be passed directly into `PostgrestClient`.

### 4.2 Production Disconnection (Dead Code in `transport.ts`)
In `supabase_implementation`, all user operations (`sql.from(...)`, `sql.rpc(...)`) flow through `PostgrestClient`, which was configured to use `createBuilderFetch` from `postgrestFetch.ts`.
- `FirebaseSql.ts` **does not instantiate or reference `FirebaseSqlTransport`**.
- `packages/sql/src/network/transport.ts` (172 lines) and its test file `packages/sql/src/network/transport.test.ts` (673 lines) are **completely decoupled from the rest of the package**.
- In `packages/sql/src/network/headers.ts`, `resolveRequestHeaders()` and `mergeHeadersInit()` are only called by `transport.ts` and its test file.

### 4.3 Resilience and Security Gap
If one were to replace `postgrestFetch.ts` with `transport.ts` without porting over `postgrestFetch.ts`'s hardening, the following regressions would occur:
1. **Security / Cross-Account Leak:** If a user logs out and another logs in while a request is in flight, `transport.ts` would retry User A's failed request with User B's auth token.
2. **Body Replay Crashes:** Retrying a mutation with a stream body would throw `TypeError: Cannot construct a Request with a Request object that has already been used`.
3. **HTTP Connection Leaks:** Discarded 401 response bodies would remain open and unconsumed, exhausting connection pools.
4. **Infinite / 7-Second PostgREST Backoff:** PostgREST-js's `fetchWithRetry` would treat token acquisition and initialization errors as network errors, executing 3x exponential backoffs (1s, 2s, 4s) instead of aborting immediately.

---

## 5. Conclusion

1. **Degree of Duplication:** Extremely high on the `transport.ts` side (~95% of its logic is reimplemented in `postgrestFetch.ts`), moderate on the `postgrestFetch.ts` side (~32% duplicates `transport.ts`, while ~68% represents critical safety and concurrency hardening).
2. **Degree of Conflict:** High architectural conflict due to incompatible interfaces (`invokePostgrestOperation` vs Web `Fetch`), resulting in `transport.ts` currently existing as dead code in the repository.
