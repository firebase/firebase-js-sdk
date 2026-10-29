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

## Decision 2: Handling of `app.options.apiKey` on Outgoing PostgREST HTTP Requests

- **Question**: How should `@firebase/sql` handle `app.options.apiKey` on outgoing PostgREST HTTP requests?
- **Options Presented**:
  - `Omit` (Recommended): Do not send `app.options.apiKey` as either a header or query parameter.
  - `Header`: Send `x-goog-api-key: <apiKey>` when `app.options.apiKey` is non-empty and treat `x-goog-api-key` as reserved.
  - `QueryParam`: Append `?key=<apiKey>` when `app.options.apiKey` is non-empty, matching `@firebase/data-connect` REST.
- **Selected Option**: `Omit`
- **Relevant Discussion**: Investigated `@firebase/data-connect` (sends `?key=` on REST, unused on WebSocket), `@firebase/firestore` (`x-goog-api-key` on WebChannel/gRPC, `?key=` on Lite REST), `@firebase/functions` (unused), and `google3` `PostgrestService` (`allow_without_credential: true`, `active_developer_method: false`, `is_service_consumer: true` on `projects/{project}`). Confirmed `PostgrestService` does not require an API key, `go/firebasesql:sdk:headers` omits it, and appending `?key=` would break `GET`/`HEAD` `/rpc/*` calls because `postgrestservice/request/query.go` skips stripping unprefixed params on RPC endpoints.

## Decision 3: `DISALLOWED_HEADER_KEYS` Scope and `Builder.setHeader()` Enforcement

- **Question**: Which headers should `DISALLOWED_HEADER_KEYS` reject, and should `Builder.setHeader()` enforce the same synchronous check as `getSql()`?
- **Options Presented**:
  - `Both` (Recommended): Disallow all 10 headers (6 Reserved + 4 Forbidden) case-insensitively in `DISALLOWED_HEADER_KEYS`, throwing `FirebaseSqlError(INVALID_ARGUMENT, SQL_CLIENT)` synchronously in both `getSql()` and `Builder.setHeader()`.
  - `ReservedOnly`: Disallow only the 6 Reserved headers in `DISALLOWED_HEADER_KEYS` (enforced synchronously in both `getSql()` and `Builder.setHeader()`).
  - `SettingsOnly`: Disallow the 6 Reserved + 4 Forbidden headers in `DISALLOWED_HEADER_KEYS` for `getSql(settings)`, without validating `Builder.setHeader()`.
- **Selected Option**: `Both`
- **Relevant Discussion**: Prevents callers from supplying either Reserved headers (`x-goog-api-client`, `x-client-version`, `x-firebase-gmpid`, `x-firebase-auth-token`, `x-firebase-appcheck`, `authorization`) or Forbidden headers (`x-firebase-sqlconnect-affinity`, `x-goog-request-params`, `x-firebase-client`, `x-firebase-client-log-type`) via either client-level `SqlServiceSettings.headers` or per-request `Builder.setHeader()`.

## Decision 4: Error Mapping into `FirebaseSqlError` and `OperationResult`

- **Question**: How should builder execution map errors into `FirebaseSqlError` and `OperationResult` (categories, `.throwOnError()`, and HTTP `404` handling)?
- **Options Presented**:
  - `Preserve404` (Recommended): Preserve `@supabase/postgrest-js`'s exact execution and `404` behavior (`[]` -> `200`, `''` -> `204`, JSON error -> `OperationFailure`) and no-throw default semantics, while converting all errors into `FirebaseSqlError` (`sql-postgrest` for PostgREST/SQLSTATE `{ code, message, details, hint }` and `PGRST116`; `sql-platform` with mapped `Code` for OnePlatform `{ error: ... }` and non-PostgREST HTTP errors; `sql-client` with `status: 0` for network/`AbortSignal`/token failures), rejecting with `FirebaseSqlError` when `.throwOnError()` is enabled.
  - `SupabaseExact`: Same as `Preserve404`, except under `.throwOnError()` let raw `fetch` rejections (`AbortError`, `TypeError`) reject unwrapped.
  - `Classified`: Same as `Preserve404`, except override `postgrest-js`'s `404` -> `200`/`204` rewrite into `sql-platform` `OperationFailure`.
  - `RejectClient`: Same as `Classified`, except client/network/abort/token failures always reject even without `.throwOnError()`.
- **Selected Option**: `Preserve404`
- **Relevant Discussion**: User emphasized that matching `supabase-js` SDK semantics is a very high priority. Compared `PostgrestBuilder.ts`, `PostgrestError.ts`, and `lib/fetch.ts` in `supabase-js`: `Preserve404` keeps `supabase-js`'s no-throw default `OperationResult` contract and `404` behavior intact, unwraps nested Google OnePlatform `{ error: ... }` envelopes so `message`/`code` are not lost, and normalizes all `OperationFailure` and `.throwOnError()` errors to `FirebaseSqlError`.

## Decision 5: Packaging `@supabase/postgrest-js` (`2.118.0`) in `packages/sql`

- **Question**: How should `@supabase/postgrest-js` (`2.118.0`) be packaged in `packages/sql`?
- **Options Presented**:
  - `External` (Recommended): Add `"@supabase/postgrest-js": "2.118.0"` to `packages/sql/package.json` `dependencies` and keep it external in Rollup (matching how `@supabase/supabase-js` depends on `@supabase/postgrest-js` and how other `@firebase/*` packages declare runtime dependencies, with zero public TS/JS API leakage).
  - `Bundled`: Add `"@supabase/postgrest-js": "2.118.0"` to `devDependencies` and bundle it directly into `packages/sql/dist/*` via Rollup.
- **Selected Option**: `External`
- **Relevant Discussion**: Keeps `@supabase/postgrest-js` as a standard external runtime dependency in `packages/sql/package.json` (like `idb`/`re2js`/`web-vitals` in other `@firebase/*` packages and `@supabase/supabase-js`), while keeping wrapper implementations internal/private so zero `@supabase/postgrest-js` types or symbols appear in `.d.ts` or `api-extractor` reports.

## Decision 6: Public Type Re-Exports in `src/api/index.ts`

- **Question**: Which types should `src/api/index.ts` publicly re-export?
- **Options Presented**:
  - `CoreTypes` (Recommended): Re-export user-facing builder interfaces, response types, and option/operator types, while keeping internal type-level computation helpers (`MergeDeep`, `Simplify`, `CheckMatchingArrayTypes`, `NarrowResultColumn`, etc.) unexported from `index.ts`.
  - `AllTypes`: Re-export all `interface` and `type` declarations from `Builder.ts`, `QueryBuilder.ts`, `FilterBuilder.ts`, `TransformBuilder.ts`, and `FirebaseSqlRpcOptions` (eliminating all `ae-forgotten-export` warnings in `sql.api.md`), while keeping concrete wrapper classes unexported.
  - `Unchanged`: Leave `src/api/index.ts` unchanged.
- **Selected Option**: `AllTypes`
- **Relevant Discussion**: Exports every public type/interface across `Builder.ts`, `QueryBuilder.ts`, `FilterBuilder.ts`, `TransformBuilder.ts`, and `FirebaseSqlRpcOptions` so callers have full TypeScript type access and `api-extractor` (`common/api-review/sql.api.md`) has zero `ae-forgotten-export` warnings, while keeping concrete PostgREST wrapper classes completely internal/unexported.

## Decision 7: `terminate()` Lifecycle and Shared Internal `State` Object Design

- **Question**: How should `@firebase/sql` handle `terminate(sql)` across `FirebaseSql` methods and active builders?
- **Options / User Specification**:
  1. After `terminate(sql)` is called, all methods on that `FirebaseSql` instance (except `terminate()` / `_delete()` itself, which is re-entrant) throw `FirebaseSqlError(Code.NOT_INITIALIZED, ..., SQL_CLIENT)`.
  2. Any active builders (`QueryBuilder`, `FilterBuilder`, `TransformBuilder`, `Builder`) created before `terminate()` continue to function normally (chaining methods/modifiers) until the builder is executed (`await` / `.then()`), at which point execution unconditionally fails with `FirebaseSqlError(Code.NOT_INITIALIZED, ..., SQL_CLIENT)` respecting `.throwOnError()` (`OperationFailure` by default, rejected promise when `.throwOnError()` is enabled).
  3. Replace `FirebaseSql`'s `_isDeleted` boolean flag with an internal mutable `State` object exposed behind a `Readonly` interface to builders. Active runtime resources live on a nullable property of `State`; `terminate()` terminates token providers, sets that `State` property to `null`, and removes the service instance. Builders hold the `Readonly` `State` reference and check it upon execution, observing `null` and failing with `FirebaseSqlError(Code.NOT_INITIALIZED)`.

## Decision 8: Synchronous Validation Errors from `@supabase/postgrest-js`

- **Question**: How should `@firebase/sql` handle synchronous validation errors thrown by `@supabase/postgrest-js` (`from('')` and `.csv().stripNulls()`)?
- **Options Presented**:
  - `WrapSync` (Recommended): Catch `postgrest-js`'s plain `Error` on `from('')` and `.csv().stripNulls()` and rethrow as `FirebaseSqlError(Code.INVALID_ARGUMENT, err.message, SQL_CLIENT)`.
  - `RawSync`: Let `@supabase/postgrest-js`'s plain `Error` instances on `from('')` and `.csv().stripNulls()` propagate unwrapped.
  - `StrictSync`: Same as `WrapSync`, plus also throw synchronously on `rpc('')` and `.stripNulls().csv()`.
- **Selected Option**: `RawSync`
- **Relevant Discussion**: Explained that `stripNulls()` came up only because `.csv()` sets `Accept: text/csv` while PostgREST null-stripping is a JSON `Accept` parameter (`;nulls=stripped`), causing `PostgrestBuilder.stripNulls()` to throw a synchronous `Error` if `Accept === 'text/csv'`. User selected `RawSync` for verbatim `@supabase/postgrest-js` synchronous throw behavior.

## Decision 9: Merge Conflict Resolution for `fetch.ts`

- **Question**: How should the merge conflict in `packages/sql/src/network/fetch.ts` be resolved?
- **Options Presented**:
  - `TypedFetch` (Recommended): Adopt `export type Fetch = typeof fetch;` from `origin/tree/main` and use `Fetch` for the parameter and return types of `initializeFetch` and `getFetch`.
  - `InlineType`: Retain `HEAD`'s inline `typeof fetch` without exporting `Fetch`.
  - `Hybrid`: Export `type Fetch = typeof fetch;` to avoid breaking external imports, but keep inline `typeof fetch` annotations on `initializeFetch` and `getFetch`.
- **Selected Option**: `TypedFetch`
- **Relevant Discussion**: Standardizes on the reusable `Fetch` type alias introduced in `origin/tree/main` (PR #10523) and imported by `transport.ts`, while maintaining full type and runtime compatibility with `HEAD`.

## Decision 10: Merge Conflict Resolution for `network/index.ts`

- **Question**: How should the merge conflict in `packages/sql/src/network/index.ts` be resolved?
- **Options Presented**:
  - `Combine`: Re-export both `./transport` and `createBuilderFetch` (`export * from './transport'; export { createBuilderFetch } from './postgrestFetch';`).
  - `TransportOnly`: Keep only `export * from './transport';` matching `origin/tree/main`, and change `FirebaseSql.ts` to import `createBuilderFetch` directly from `'../network/postgrestFetch'`.
  - `ExportAll`: Export all internal network modules (`fetch`, `transport`, `headers`, and `postgrestFetch`).
- **Selected Option**: `TransportOnly`
- **Relevant Discussion**: Keeps `packages/sql/src/network/index.ts` matching `origin/tree/main` (`export * from './transport'`). `FirebaseSql.ts` will import `createBuilderFetch` directly from `'../network/postgrestFetch'`.

## Decision 11: Merge Conflict Resolution for `Builder.ts`

- **Question**: How should the merge conflict in `packages/sql/src/api/Builder.ts` (`MergePartialResult`) be resolved?
- **Options Presented**:
  - `ShortCircuitUnknown` (Recommended): Keep `HEAD`'s version with the `unknown extends Result$1` check.
  - `Main`: Revert to `origin/tree/main`'s simpler implementation without the `unknown` short-circuit guard.
  - `Hardened`: Adopt the comprehensive type guard from `code_review_report.md` (Finding 1) short-circuiting on `[Result$1] extends [never]` and `unknown extends Result$1`.
- **Selected Option**: `ShortCircuitUnknown`
- **Relevant Discussion**: Preserves the `unknown extends Result$1` guard in `MergePartialResult` so that untyped RPC return types do not degrade into plain object mappings over `Array.prototype` methods.

## Decision 12: Merge Conflict Resolution for `api/index.ts`

- **Question**: How should the merge conflict in `packages/sql/src/api/index.ts` be resolved?
- **Options Presented**:
  - `AllTypes` (Recommended): Keep `HEAD`'s exports (`Builder`, `FilterBuilder`, `FirebaseSqlRpcOptions`, `QueryBuilder`, `TransformBuilder`, and related option/result types).
  - `Main`: Revert to `origin/tree/main` (`export { FirebaseSql, getSql, terminate } from './FirebaseSql';`), hiding all builder interfaces and options from the package index.
  - `CoreTypesOnly`: Export only the primary interfaces and options, omitting internal type helpers such as `MergeDeep`, `Simplify`, and `NarrowResultColumn`.
- **Selected Option**: `AllTypes`
- **Relevant Discussion**: Preserves full TypeScript type exports for all builder interfaces, options, and response structures, consistent with Decision 6 in `ImplDecisions.md`.

## Decision 13: Merge Conflict Resolution for `settings.ts`

- **Question**: How should the merge conflict in `packages/sql/src/core/settings.ts` be resolved?
- **Options Presented**:
  - `KeepHeadWithValidation`: Keep `HEAD`'s version of `settings.ts`, preserving `DISALLOWED_HEADER_KEYS`, `validateHeaderName`, `validateHeaders`, and `normalizeHeaders` directly in `settings.ts`.
  - `MainMinimal`: Adopt `origin/tree/main`'s minimal `settings.ts` (importing `validateHeaders` from `../network/headers`).
  - `ReExportFromHeaders`: Keep `SqlServiceSettings` in `settings.ts`, import `validateHeaders` and `LOWERCASE_DISALLOWED_HEADER_KEYS` from `headers.ts`, and re-export aliases from `settings.ts`.
- **Selected Option**: `MainMinimal`
- **Relevant Discussion**: Standardizes `settings.ts` to `origin/tree/main`'s minimal design, importing `validateHeaders` from `../network/headers`. Subsequent conversation will update the dependent files (`FilterBuilderImpl.ts`, `postgrestFetch.ts`, `FirebaseSql.ts`, `settings.test.ts`, `Builders.test.ts`, and `FirebaseSql.test.ts`) to adapt to `headers.ts`.

## Decision 14: Header Name Validation in `FilterBuilderImpl.ts`

- **Question**: How should `packages/sql/src/api/impl/FilterBuilderImpl.ts` validate header names in `setHeader()`?
- **Options Presented**:
  - `Headers` (Recommended): Add and export `validateHeaderName(name: string): string` in `packages/sql/src/network/headers.ts` and import it into `FilterBuilderImpl.ts` from `../../network/headers`.
  - `Inline`: Import `LOWERCASE_DISALLOWED_HEADER_KEYS` from `../../network/headers` directly into `FilterBuilderImpl.ts` and perform the validation check directly inside `setHeader()`.
  - `Record`: Import `validateHeaders` from `../../network/headers` and invoke `validateHeaders({ [name]: value })` before calling `#delegate.setHeader(name, value)`.
- **Selected Option**: `Headers`
- **Relevant Discussion**: Centralizes header validation in `network/headers.ts`, preserves single-coercion and whitespace-trimming optimizations from Code Review Finding 7 with zero per-call object allocations, and updates `validateHeaders()` to reuse `validateHeaderName()`.

## Decision 15: Disallowed Header Keys in `postgrestFetch.ts`

- **Question**: How should `packages/sql/src/network/postgrestFetch.ts` be updated after `DISALLOWED_HEADER_KEYS` was removed from `settings.ts`?
- **Options Presented**:
  - `Import` (Recommended): Import `LOWERCASE_DISALLOWED_HEADER_KEYS` directly from `./headers` in `postgrestFetch.ts`, updating `buildRequestHeaders()` to check `!LOWERCASE_DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())`.
  - `Alias`: Export `DISALLOWED_HEADER_KEYS = LOWERCASE_DISALLOWED_HEADER_KEYS` from `packages/sql/src/network/headers.ts` and import `DISALLOWED_HEADER_KEYS` from `./headers`.
  - `Refactor`: Refactor `buildRequestHeaders()` in `postgrestFetch.ts` to delegate header filtering and merging to helpers in `./headers`.
- **Selected Option**: `Import`
- **Relevant Discussion**: Adopts canonical `LOWERCASE_DISALLOWED_HEADER_KEYS` from `./headers` directly without unnecessary aliases or changing the fetch request header construction flow.

## Decision 16: Merge Conflict Resolution for `FirebaseSql.ts`

- **Question**: How should `packages/sql/src/api/FirebaseSql.ts` be resolved?
- **Options Presented**:
  - `Adopt` (Recommended): Retain HEAD's full Supabase-backed `FirebaseSql` implementation (`PostgrestClient`, `_state`, `from()`, `rpc()`), import `createBuilderFetch` directly from `../network/postgrestFetch` (honoring Decision 10), adopt `normalizeInstanceIdentifierHeaders` and `logDebug` from `origin/tree/main` for `getInstanceIdentifier()` and `getSql()`, and remove the merge conflict markers.
  - `Local`: Retain HEAD's Supabase implementation and import `createBuilderFetch` from `../network/postgrestFetch`, but define `normalizeHeaders` locally within `FirebaseSql.ts` with its previous signature and behavior instead of adopting `origin/tree/main`'s `normalizeInstanceIdentifierHeaders` and `logDebug`.
  - `Utility`: Retain HEAD's Supabase implementation and import `createBuilderFetch` from `../network/postgrestFetch`, but move `normalizeHeaders` into a shared utility module (such as `../network/headers` or `../util/encoder`) and import it into `FirebaseSql.ts`.
- **Selected Option**: `Adopt`
- **Relevant Discussion**: Retains the complete Supabase client implementation, switches `createBuilderFetch` to `../network/postgrestFetch` per Decision 10, and adopts `normalizeInstanceIdentifierHeaders` and debug logging from `origin/tree/main`.

## Decision 17: Merge Conflict Resolution for `settings.test.ts`

- **Question**: How should `packages/sql/src/core/settings.test.ts` be resolved after `DISALLOWED_HEADER_KEYS`, `validateHeaderName`, and `normalizeHeaders` were removed from `settings.ts`?
- **Options Presented**:
  - `Retain`: Retain the full test suite in `settings.test.ts`, updating imports from `../network/headers` for header validation helpers and dropping `normalizeHeaders`.
  - `Split`: Keep only settings tests in `settings.test.ts` and move standalone header validation tests to `packages/sql/src/network/headers.test.ts`.
  - `Minimal`: Revert `settings.test.ts` to `origin/tree/main`'s minimal version, testing only `copySqlServiceSettings`.
- **Selected Option**: `Minimal`
- **Relevant Discussion**: Reverts `settings.test.ts` to match `origin/tree/main`, focusing `settings.test.ts` solely on testing `copySqlServiceSettings`.

## Decision 18: Disallowed Headers Assertion in `Builders.test.ts`

- **Question**: How should `packages/sql/src/api/Builders.test.ts` be updated after `DISALLOWED_HEADER_KEYS` was removed from `settings.ts`?
- **Options Presented**:
  - `Direct` (Recommended): Remove the unused `DISALLOWED_HEADER_KEYS` import and eliminate the mutating `hadAuthDisallowed` wrapper, directly asserting that `qb.select().setHeader('Authorization', 'Bearer secret')` throws `FirebaseSqlError(Code.INVALID_ARGUMENT, SQL_CLIENT)`.
  - `Iterate`: Import `LOWERCASE_DISALLOWED_HEADER_KEYS` from `../network/headers` and iterate over all keys in the set, asserting that `qb.select().setHeader(key, 'val')` throws `FirebaseSqlError` for each protected header.
  - `Alias`: Export a mutable `DISALLOWED_HEADER_KEYS` `Set` from `../network/headers` and update the import in `Builders.test.ts` to `../network/headers`.
- **Selected Option**: `Direct`
- **Relevant Discussion**: Eliminates obsolete mutation of `DISALLOWED_HEADER_KEYS` and directly asserts that setting `'Authorization'` on the builder throws `FirebaseSqlError`.

## Decision 19: Merge Conflict Resolution for `FirebaseSql.test.ts`

- **Question**: How should `packages/sql/src/api/FirebaseSql.test.ts` be resolved after `DISALLOWED_HEADER_KEYS` was moved to `headers.ts` and `normalizeInstanceIdentifierHeaders` was adopted?
- **Options Presented**:
  - `Combine` (Recommended): Retain HEAD's comprehensive test suite for `FirebaseSql`, update the import and loop to use `LOWERCASE_DISALLOWED_HEADER_KEYS` from `../network/headers`, incorporate the `normalizeInstanceIdentifierHeaders()` unit test suite from `origin/tree/main`, and remove the duplicate/obsolete skeleton tests and merge conflict markers.
  - `Head`: Retain only HEAD's test suite, updating `DISALLOWED_HEADER_KEYS` to `LOWERCASE_DISALLOWED_HEADER_KEYS` from `../network/headers`, and discard `origin/tree/main`'s `normalizeInstanceIdentifierHeaders()` unit tests along with all conflict markers.
  - `Main`: Revert entirely to `origin/tree/main`'s test suite, discarding all Supabase client, query builder, RPC, and terminate tests.
- **Selected Option**: `Combine`
- **Relevant Discussion**: Retains the full Supabase test coverage while testing `LOWERCASE_DISALLOWED_HEADER_KEYS` and adding `origin/tree/main`'s test cases for `normalizeInstanceIdentifierHeaders()`.
