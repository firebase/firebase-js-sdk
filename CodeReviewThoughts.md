# Code Review Thoughts

Thoughts and observations recorded during code review of PR #10551.

## `ReadonlySqlClientState` and `MutableSqlClientState` simplification

- File: `packages/sql/src/core/state.ts`
- Consider renaming `MutableSqlClientState` to `SqlClientState`.
- Consider replacing all usages of `ReadonlySqlClientState` with `Readonly<SqlClientState>`.
- Consider deleting `ReadonlySqlClientState`.

## Eliminate JavaScript private `#` property syntax

- Scope: `packages/sql/src/api/FirebaseSql.ts`, `packages/sql/src/api/impl/FilterBuilderImpl.ts`, `packages/sql/src/api/impl/QueryBuilderImpl.ts`
- Replace all private `#` fields/methods with standard TypeScript `private` properties (e.g., `private readonly _delegate` instead of `#delegate`).
- JS `#` private elements cause issues for downstream dependers (bundling, downleveling, prototyping).

## Export `UntypedRowValue`

- File: `packages/sql/src/core/untypedSchema.ts`
- `type UntypedRowValue` is referenced in exported `UntypedTable.Row` (`Record<string, UntypedRowValue>`), but `UntypedRowValue` itself is unexported.
- Export `UntypedRowValue`.

## Verify `UntypedClientOptions.PostgrestVersion` value

- File: `packages/sql/src/core/untypedSchema.ts`
- `UntypedClientOptions` sets `PostgrestVersion: '13'`.
- Confirm whether `'13'` is the correct version for Firebase SQL, which only supports newer versions.

## Add `extends` or compile-time assignability checks to PostgREST untyped schemas

- File: `packages/sql/src/core/untypedSchema.ts`
- Consider having untyped schema types explicitly extend PostgREST types where appropriate (e.g., `UntypedClientOptions extends ClientServerOptions`) to clarify purpose.
- Alternatively, add compile-time type assertions verifying assignability of `Untyped*` types to PostgREST types.

## Evaluate `any` vs `unknown` divergence from API proposal

- Scope: `packages/sql/src/core/untypedSchema.ts` and builder types
- Reference: go/fsql-postgrest-js-sdk
- API proposal uses `any` in several places where the implementation substitutes `unknown`.
- Evaluate impacts of `unknown` on source compatibility and developer ergonomics with `@supabase/postgrest-js`.

## Strengthen `isPlainRecord` check

- File: `packages/sql/src/core/errorMapper.ts`
- `isPlainRecord` only checks `typeof value === 'object' && value !== null && !Array.isArray(value)`.
- Look into more robust validation: checking for `Object.prototype` or null prototype, ensuring it is non-iterable (not `Symbol.iterator`), and verifying string property keys.

## Deduplicate string normalization in `normalizeHint` and `normalizeDetails`

- File: `packages/sql/src/core/errorMapper.ts`
- Non-empty string check (`typeof x === 'string' && x.length > 0 ? x : undefined`) is duplicated in `normalizeDetails` and `normalizeHint`.
- Factor out into a shared helper function.

## Cross-platform consistency of error mapping logic

- File: `packages/sql/src/core/errorMapper.ts`
- Investigate whether `mapPostgrestFailureToFirebaseSqlError` logic applies to other Firebase SQL platforms (e.g., Flutter, Android).
- All platforms consume HTTP REST / PostgREST endpoints and likely require identical error envelope parsing and category mappings.

## Document rationale for `String(name)` in `validateHeaderName`

- File: `packages/sql/src/network/headers.ts`
- Line: `const headerName = String(name);`
- Appears to be a no-op given `name: string` parameter typing.
- Add a comment explaining rationale (e.g., defensive coercion for untyped JS callers) or remove if redundant.

## Fix JSDoc line length in `headers.ts`

- Status: Resolved
- File: `packages/sql/src/network/headers.ts`
- Resolution: Wrapped the long `@throws` tags on `validateHeaderName` and `validateHeaders` across multiple indented lines to adhere to the 80-character line length limit.

## Document rationale for `Object.keys()` iteration in `validateHeaders`

- File: `packages/sql/src/network/headers.ts`
- Line: `for (const key of Object.keys(headers))`
- Add an inline comment explaining why `Object.keys()` is used instead of `for (const key in headers)` (e.g., ignoring prototype-inherited properties or linter constraints).

## Evaluate `@internal` JSDoc annotations on internal module exports

- File: `packages/sql/src/network/headers.ts`
- Multiple functions and constants are tagged with `@internal` despite being in an internal network module not exposed via public entry points.
- Determine if `@internal` is required (e.g., API Extractor tooling) or superfluous.

## Duplication between `postgrestFetch.ts` and earlier commit `a091cc6518a5`

- File: `packages/sql/src/network/postgrestFetch.ts`
- Compare with: commit `a091cc6518a5d0fb3138b8bba6aacff41c6213c9` (`packages/sql/src/network/transport.ts` and `packages/sql/src/network/headers.ts`).
- `postgrestFetch.ts` largely duplicates token retrieval, wire header injection, and 401 token-refresh retry logic from `transport.ts` and `headers.ts`, leaving `FirebaseSqlTransport` as dead code.
- See detailed audit report in [audit_postgrest_fetch_vs_commit_a091cc65.md](file:///usr/local/google/home/dconeybe/work/js/tree/audit_postgrest_fetch_vs_commit_a091cc65.md) for quantitative duplication analysis and structural comparison.

## Investigate how `FirebaseSql` uses custom `fetch()` implementation

- Files: `packages/sql/src/api/FirebaseSql.ts`, `packages/sql/src/api/impl/FilterBuilderImpl.ts`, `packages/sql/src/network/postgrestFetch.ts`
- Investigate if and how `FirebaseSql` wires the custom `fetch` implementation.
- Note: `FirebaseSql` does not pass `fetch` into the `PostgrestClient` constructor; instead, `createBuilderFetch` is passed to `FilterBuilderImpl`, which dynamically mutates and clears `this.#delegate.fetch` via `Reflect.set` during `#execute()`.

## Use concrete PostgREST class typing instead of custom delegate handles

- Scope: `packages/sql/src/api/impl/QueryBuilderImpl.ts`, `packages/sql/src/api/impl/FilterBuilderImpl.ts`
- Replace `QueryDelegateHandle` and `FilterDelegateHandle` with concrete PostgREST class types (e.g., `PostgrestQueryBuilder`, `PostgrestFilterBuilder`).
- Maintaining structural interfaces manually is fragile: if upstream PostgREST signatures drift, compile-time checks will not catch discrepancies, causing confusing runtime errors.

## Create `NonIterable` utility type for row type narrowing

- Scope: `packages/sql/src/api/impl/QueryBuilderImpl.ts`
- Extract `{ readonly [Symbol.iterator]?: never }` into a named utility type (e.g., `type NonIterable<T> = T & { readonly [Symbol.iterator]?: never }`).
- Improves readability and avoids noisy inline intersection (`&`) syntax at mutation method signatures (`insert`, `upsert`, `update`).

## Remove redundant pre-emptive `state.active` check in `FilterBuilderImpl.#execute()`

- File: `packages/sql/src/api/impl/FilterBuilderImpl.ts`
- Lines 593–603 pre-emptively check `this.#state.active === null` before executing `#delegate`.
- Transport (`postgrestFetch.ts`) already checks `state.active === null` and records the termination error in `tracker.clientError`.
- Evaluate removing this pre-emptive check to eliminate duplicated termination error construction and branching without impacting correctness.

## Remove unused `private` property modifiers from `FirebaseSql` constructor parameters

- File: `packages/sql/src/api/FirebaseSql.ts`
- Constructor parameters `private authInternalProvider` and `private appCheckInternalProvider` (lines 95–98) are only referenced during constructor initialization.
- Remove the `private` modifier so they remain regular constructor parameters rather than unused instance properties.

## Omit redundant generic type arguments in `new PostgrestClient(...)` call

- File: `packages/sql/src/api/FirebaseSql.ts`
- Line 116 repeats `<UntypedDatabase, UntypedClientOptions, string, UntypedSchema>` already declared on `#postgrestClient` (lines 80–85).
- Evaluate omitting the explicit generic parameters in `new PostgrestClient(...)` to reduce visual noise.

## Audit public exports in `packages/sql/src/api/index.ts`

- File: `packages/sql/src/api/index.ts`
- Perform an audit of all exported types and symbols to ensure the public export surface is correct, complete, and does not unintentionally expose internal utilities or omit desired types.
