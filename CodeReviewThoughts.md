# Code Review Thoughts

Thoughts and observations recorded during code review of PR #10551.

## `ReadonlySqlClientState` and `MutableSqlClientState` simplification

- Status: Resolved
- File: `packages/sql/src/core/state.ts`
- Resolution: Renamed `MutableSqlClientState` to `SqlClientState`, deleted `ReadonlySqlClientState`, and replaced all usages of `ReadonlySqlClientState` with `Readonly<SqlClientState>`.

## Eliminate JavaScript private `#` property syntax

- Status: Resolved
- Scope: `packages/sql/src/api/FirebaseSql.ts`, `packages/sql/src/api/impl/FilterBuilderImpl.ts`, `packages/sql/src/api/impl/QueryBuilderImpl.ts`
- Resolution: Replaced all JavaScript private `#` fields and methods with standard TypeScript `private readonly _property` and `private _method` members across `FirebaseSql.ts`, `QueryBuilderImpl.ts`, and `FilterBuilderImpl.ts`.

## Export `UntypedRowValue`

- Status: Resolved
- File: `packages/sql/src/core/untypedSchema.ts`
- Resolution: Exported `UntypedRowValue` (`export type UntypedRowValue = ...`), allowing consumers and tests to import the row value type directly and matching other exported types in `untypedSchema.ts`.

## Verify `UntypedClientOptions.PostgrestVersion` value

- File: `packages/sql/src/core/untypedSchema.ts`
- `UntypedClientOptions` sets `PostgrestVersion: '13'`.
- Confirm whether `'13'` is the correct version for Firebase SQL, which only supports newer versions.

## Add `extends` or compile-time assignability checks to PostgREST untyped schemas

- Status: Resolved
- File: `packages/sql/src/core/untypedSchema.ts`
- Resolution: Added compile-time assignability type assertions in `packages/sql/src/core/untypedSchema.test.ts` verifying that `UntypedClientOptions` satisfies `PostgrestClientOptions` and the untyped schema types satisfy `PostgrestClient`'s generic constraints.

## Evaluate `any` vs `unknown` divergence from API proposal

- Status: Resolved
- Scope: `packages/sql/src/core/untypedSchema.ts`, `packages/sql/src/api/QueryBuilder.ts`, `packages/sql/src/api/FirebaseSql.ts`
- Resolution: Decided to retain `unknown` / `Record<string, unknown>` to uphold Google TypeScript type-safety standards over implicit `any`. Documented the rationale in JSDoc on `select()` and `rpc()`, guiding developers to `.returns<T>()` / `.overrideTypes<T>()` for strongly-typed results.

## Strengthen `isPlainRecord` check

- Status: Resolved
- File: `packages/sql/src/core/errorMapper.ts`
- Resolution: Strengthened `isPlainRecord` to check that `Object.getPrototypeOf(value)` is `null` or `Object.prototype`, and explicitly handled `rawError instanceof Error` in `status === 0` mapping to preserve Error message and stack.

## Deduplicate string normalization in `normalizeHint` and `normalizeDetails`

- Status: Resolved
- File: `packages/sql/src/core/errorMapper.ts`
- Resolution: Extracted `normalizeNonEmptyString(value: unknown): string | undefined` helper and reused it in `normalizeDetails` and `normalizeHint`.

## Cross-platform consistency of error mapping logic

- File: `packages/sql/src/core/errorMapper.ts`
- Investigate whether `mapPostgrestFailureToFirebaseSqlError` logic applies to other Firebase SQL platforms (e.g., Flutter, Android).
- All platforms consume HTTP REST / PostgREST endpoints and likely require identical error envelope parsing and category mappings.

## Document rationale for `String(name)` in `validateHeaderName`

- Status: Resolved
- File: `packages/sql/src/network/headers.ts`
- Resolution: Retained `String(name)` and documented the rationale in an inline comment, explaining that header validation serves as a security boundary against overriding protected wire headers and single coercion prevents untyped JS callers from bypassing checks via stateful `toString()` / `[Symbol.toPrimitive]` objects.

## Fix JSDoc line length in `headers.ts`

- Status: Resolved
- File: `packages/sql/src/network/headers.ts`
- Resolution: Wrapped the long `@throws` tags on `validateHeaderName` and `validateHeaders` across multiple indented lines to adhere to the 80-character line length limit.

## Document rationale for `Object.keys()` iteration in `validateHeaders`

- Status: Resolved
- File: `packages/sql/src/network/headers.ts`
- Resolution: Considered adding an explanatory comment, but decided to omit it. `Object.keys()` is universal idiomatic TypeScript for dictionary records, aligns with downstream `Object.assign({}, settings.headers)` copying behavior, and does not warrant extra commentary.

## Evaluate `@internal` JSDoc annotations on internal module exports

- Status: Resolved
- File: `packages/sql/src/network/headers.ts`
- Resolution: Decided to retain `@internal` annotations in `headers.ts` per general Firebase SDK conventions signaling non-public scope to IDEs and developers.

## Duplication between `postgrestFetch.ts` and earlier commit `a091cc6518a5`

- File: `packages/sql/src/network/postgrestFetch.ts`
- Compare with: commit `a091cc6518a5d0fb3138b8bba6aacff41c6213c9` (`packages/sql/src/network/transport.ts` and `packages/sql/src/network/headers.ts`).
- `postgrestFetch.ts` largely duplicates token retrieval, wire header injection, and 401 token-refresh retry logic from `transport.ts` and `headers.ts`, leaving `FirebaseSqlTransport` as dead code.
- See detailed audit report in [audit_postgrest_fetch_vs_commit_a091cc65.md](file:///usr/local/google/home/dconeybe/work/js/tree/audit_postgrest_fetch_vs_commit_a091cc65.md) for quantitative duplication analysis and structural comparison.

## Investigate how `FirebaseSql` uses custom `fetch()` implementation

- Status: Resolved
- Files: `packages/sql/src/api/FirebaseSql.ts`, `packages/sql/src/api/impl/FilterBuilderImpl.ts`, `packages/sql/src/network/postgrestFetch.ts`
- Resolution: Investigated and documented the architectural rationale: `PostgrestClient` is initialized without a static `fetch` because builders require an execution-isolated `BuilderExecutionTracker` closure. `FilterBuilderImpl` dynamically binds `fetch` synchronously right before `then()` so concurrent executions of the same builder instance do not share or corrupt error attribution. Documented in `FirebaseSql.ts` and `FilterBuilderImpl.ts`.

## Use concrete PostgREST class typing instead of custom delegate handles

- Status: Resolved
- Scope: `packages/sql/src/api/impl/QueryBuilderImpl.ts`, `packages/sql/src/api/impl/FilterBuilderImpl.ts`
- Resolution: Replaced manual structural `QueryDelegateHandle` and `FilterDelegateHandle` interfaces with concrete `PostgrestQueryBuilder` and `PostgrestFilterBuilder` class types from `@supabase/postgrest-js`, eliminating fragile manual signatures and ensuring compile-time check fidelity.

## Create `NonIterable` utility type for row type narrowing

- Status: Resolved
- Scope: `packages/sql/src/api/QueryBuilder.ts`, `packages/sql/src/api/impl/QueryBuilderImpl.ts`, `packages/sql/src/api/index.ts`
- Resolution: Defined and exported `NonIterable<T>` in `QueryBuilder.ts`, re-exported it in `packages/sql/src/api/index.ts`, and updated `insert`, `upsert`, and `update` signatures across `QueryBuilder` and `QueryBuilderImpl`.

## Remove redundant pre-emptive `state.active` check in `FilterBuilderImpl.#execute()`

- Status: Resolved
- File: `packages/sql/src/api/impl/FilterBuilderImpl.ts`
- Resolution: Removed pre-emptive `this.#state.active === null` check from `#execute()`, allowing the custom transport in `postgrestFetch.ts` to uniformly handle termination and populate `tracker.clientError`.

## Remove unused `private` property modifiers from `FirebaseSql` constructor parameters

- Status: Resolved
- File: `packages/sql/src/api/FirebaseSql.ts`
- Resolution: Removed `private` modifier from `authInternalProvider` and `appCheckInternalProvider` constructor parameters, keeping them as standard constructor arguments and avoiding unused instance fields on `FirebaseSql`.

## Omit redundant generic type arguments in `new PostgrestClient(...)` call

- Status: Resolved
- File: `packages/sql/src/api/FirebaseSql.ts`
- Resolution: Omitted the redundant generic type arguments from `new PostgrestClient(...)` call, relying on the type already explicitly declared on `#postgrestClient`.

## Audit public exports in `packages/sql/src/api/index.ts`

- Status: Resolved
- File: `packages/sql/src/api/index.ts`
- Resolution: Performed an audit of the public export surface; confirmed all exports are necessary for API Extractor rollup and consumer usability, and no internal transport or state implementations are leaked. Preserved all current exports as-is.
