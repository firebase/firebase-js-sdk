# Change summary: Implements PostgREST-backed `from()` and `rpc()` builders, custom Firebase Auth/App Check HTTP transport with 1x `401` token-refresh retry, `terminate()` lifecycle state management, and `FirebaseSqlError` mapping for `@firebase/sql`.

## File: packages/sql/src/api/Builder.ts
### Finding 1: (line 146): [HIGH] `MergePartialResult` distributes over `never` on nullable/mutation builders and maps `MergeDeep` over prototype methods on `readonly` arrays and primitives.

On mutation builders (`insert()`, `upsert()`, `update()`, `delete()`, where `T = null`) and `.insert(...).single()` (`T = never`), `overrideTypes` passes `NonNullable<null>` (`never`) or `never` as `Result$1`. Because `Result$1` is a naked type parameter in `Result$1 extends unknown[]`, conditional type distribution over `never` evaluates `MergePartialResult` to `never`, collapsing `MergePartialResult<NewResult, NonNullable<null>, { merge: true }> | null` back to `null` and discarding `NewResult`. In addition, when `Result$1` is a `readonly` array (`readonly Row[] extends unknown[]` is `false`) or when either `Result$1` (e.g., `string` after `.csv()`) or `NewResult` (e.g., a scalar RPC return) is a primitive, evaluation falls through to `Simplify<MergeDeep<NewResult, Result$1>>`, mapping `ExplicitKeys` over `ReadonlyArray.prototype`, `String.prototype`, or `Number.prototype` methods. Also reflected in `common/api-review/sql.api.md` (line 265).

Suggested change:
```ts
 export type MergePartialResult<NewResult, Result$1, Options> = Options extends {
   merge: true;
 }
-  ? // Short-circuit when Result$1 is `unknown` (e.g. untyped `rpc()`): there are no
-    // known fields to merge, and falling through to `MergeDeep<NewResult, unknown>`
-    // would turn an array `NewResult` into a plain object of `Array` prototype keys.
-    unknown extends Result$1
+  ? // Short-circuit when Result$1 is `never` (e.g. `NonNullable<null>` on mutations)
+    // or `unknown` (e.g. untyped `rpc()`): there are no known fields to merge.
+    [Result$1] extends [never]
     ? NewResult
-    : Result$1 extends unknown[]
-      ? NewResult extends unknown[]
-        ? Array<Simplify<MergeDeep<NewResult[number], Result$1[number]>>>
-        : never
-      : Simplify<MergeDeep<NewResult, Result$1>>
+    : unknown extends Result$1
+      ? NewResult
+      : Result$1 extends readonly unknown[]
+        ? NewResult extends readonly unknown[]
+          ? NewResult extends unknown[]
+            ? Array<Simplify<MergeDeep<NewResult[number], Result$1[number]>>>
+            : ReadonlyArray<
+                Simplify<MergeDeep<NewResult[number], Result$1[number]>>
+              >
+          : never
+        : Result$1 extends object
+          ? Result$1 extends string | number | boolean | bigint | symbol
+            ? NewResult
+            : NewResult extends readonly unknown[]
+              ? never
+              : NewResult extends object
+                ? NewResult extends
+                    string | number | boolean | bigint | symbol
+                  ? NewResult
+                  : Simplify<MergeDeep<NewResult, Result$1>>
+                : NewResult
+          : NewResult
   : NewResult;
```

#### Resolution
- **Decision:** Skipped to preserve exact `MergePartialResult` type-level parity with `@supabase/postgrest-js` (`2.118.0`), keeping only the `unknown extends Result$1` guard required for `any`-free `rpc()`.
- **Commit:** N/A

## File: packages/sql/src/api/FirebaseSql.ts
### Finding 2: (line 62): [HIGH] Duplicated untyped schema definitions and partial structural delegate handles rely on unchecked constructor downcasts.

`UntypedClientOptions` (including hardcoded `PostgrestVersion: '13'`), `UntypedRelationship`, `UntypedTable`, `UntypedFunction`, and `UntypedSchema` are duplicated across four files: `packages/sql/src/api/FirebaseSql.ts` (lines L62–L94), `packages/sql/src/api/impl/QueryBuilderImpl.ts` (lines L38–L66), `packages/sql/src/api/impl/FilterBuilderImpl.ts` (lines L58–L86), and `packages/sql/src/api/Builders.test.ts` (lines L48–L76). Because `QueryDelegateHandle` (`QueryBuilderImpl.ts` lines L75–L81) omits all 5 query methods (`select`, `insert`, `upsert`, `update`, `delete`) and `FilterDelegateHandle` (`FilterBuilderImpl.ts` lines L99–L105) declares only 5 of the 48 delegated methods while omitting `PromiseLike`, both wrapper constructors rely on unchecked `as InternalPostgrestQueryBuilder` / `as InternalPostgrestFilterBuilder` downcasts (lines L95 and L124) that silently bypass compile-time verification if `@supabase/postgrest-js` signatures drift. Declaring complete structural delegate contracts on `QueryDelegateHandle` and `FilterDelegateHandle` eliminates both the duplicated `Untyped*` types in the wrapper modules and the unsafe casts.

Suggested change:
```ts
// In packages/sql/src/api/impl/FilterBuilderImpl.ts (and corresponding 5-method
// QueryDelegateHandle in packages/sql/src/api/impl/QueryBuilderImpl.ts):
+export type PostgrestDelegateResponse =
+  | {
+      readonly success: true;
+      readonly error: null;
+      readonly data: unknown;
+      readonly count: number | null;
+      readonly status: number;
+      readonly statusText: string;
+    }
+  | {
+      readonly success: false;
+      readonly error: unknown;
+      readonly data: null;
+      readonly count: null;
+      readonly status: number;
+      readonly statusText: string;
+    };
+
+export interface FilterDelegateHandle
+  extends PromiseLike<PostgrestDelegateResponse> {
+  stripNulls(): unknown;
+  setHeader(name: string, value: string): unknown;
+  retry(enabled: boolean): unknown;
+  returns<NewResult>(): unknown;
+  overrideTypes<
+    NewResult,
+    Options extends { merge?: boolean | undefined } = { merge: true }
+  >(): unknown;
+  select(columns?: string | undefined): unknown;
+  order(column: string, options?: Readonly<TransformOrderOptions> | undefined): unknown;
+  limit(rows: number, options?: Readonly<TransformLimitOptions> | undefined): unknown;
+  range(from: number, to: number, options?: Readonly<TransformRangeOptions> | undefined): unknown;
+  abortSignal(signal: AbortSignal): unknown;
+  single(): unknown;
+  maybeSingle(): unknown;
+  csv(): unknown;
+  geojson(): unknown;
+  explain(options?: Readonly<TransformExplainOptions> | undefined): unknown;
+  rollback(): unknown;
+  maxAffected(rows: number): unknown;
+  eq(column: string, value: NonNullable<unknown>): unknown;
+  neq(column: string, value: unknown): unknown;
+  gt(column: string, value: unknown): unknown;
+  gte(column: string, value: unknown): unknown;
+  lt(column: string, value: unknown): unknown;
+  lte(column: string, value: unknown): unknown;
+  like(column: string, pattern: string): unknown;
+  likeAllOf(column: string, patterns: readonly string[]): unknown;
+  likeAnyOf(column: string, patterns: readonly string[]): unknown;
+  ilike(column: string, pattern: string): unknown;
+  ilikeAllOf(column: string, patterns: readonly string[]): unknown;
+  ilikeAnyOf(column: string, patterns: readonly string[]): unknown;
+  regexMatch(column: string, pattern: string): unknown;
+  regexIMatch(column: string, pattern: string): unknown;
+  is(column: string, value: boolean | null): unknown;
+  isDistinct(column: string, value: unknown): unknown;
+  in(column: string, values: readonly unknown[]): unknown;
+  notIn(column: string, values: readonly unknown[]): unknown;
+  contains(column: string, value: string | readonly unknown[] | Record<string, unknown>): unknown;
+  containedBy(column: string, value: string | readonly unknown[] | Record<string, unknown>): unknown;
+  rangeGt(column: string, range: string): unknown;
+  rangeGte(column: string, range: string): unknown;
+  rangeLt(column: string, range: string): unknown;
+  rangeLte(column: string, range: string): unknown;
+  rangeAdjacent(column: string, range: string): unknown;
+  overlaps(column: string, value: string | readonly unknown[]): unknown;
+  textSearch(column: string, query: string, options?: Readonly<FilterTextSearchOptions> | undefined): unknown;
+  match(query: Record<string, unknown>): unknown;
+  not(column: string, operator: string, value: unknown): unknown;
+  or(filters: string, options?: Readonly<FilterOrOptions> | undefined): unknown;
+  filter(column: string, operator: string, value: unknown): unknown;
+}
```

### Finding 3: (line 109): [HIGH] `FirebaseSql._state` uses TypeScript `private` instead of `#state`, leaking `_state` into `sql-public.d.ts` and onto runtime `FirebaseSql` instances.

Declaring `private readonly _state: MutableSqlClientState;` without an ECMAScript `#` private field (and without `@internal`) causes API Extractor to emit `private readonly _state;` in `packages/sql/dist/sql-public.d.ts` and exposes `this._state` as an enumerable own property on every `FirebaseSql` instance (`Object.keys(sql)`, `JSON.stringify(sql)`). That runtime property exposes `authTokenProvider` and `appCheckTokenProvider` (including static `FirebaseServerApp` `authIdToken` and `appCheckToken` strings) and allows callers to mutate `_state.active` directly without executing `_delete()` cleanup. Also update `this._state` references on lines L136, L160–L162, L175, L185, L202, L212, and L220.

Suggested change:
```ts
 export class FirebaseSql {
   /** @internal */
   readonly _postgrestUrl: string;
 
-  private readonly _state: MutableSqlClientState;
+  readonly #state: MutableSqlClientState;
 
   readonly #postgrestClient: PostgrestClient<
```

#### Resolution
- **Decision:** Addressed via `/** @internal */` on `private readonly _state` in `packages/sql/src/api/FirebaseSql.ts` so API Extractor strips `_state` from `sql-public.d.ts` (matching the other `@internal` fields on `FirebaseSql`).
- **Commit:** `33f95557e`

### Finding 4: (line 182): [HIGH] Unencoded `table` and `fn` names allow URL path traversal and query injection on the shared PostgREST origin.

`FirebaseSql.from(table)` (line L182) and `FirebaseSql.rpc(fn, ...)` (line L214) pass `table` and `fn` directly into `PostgrestClient`, which interpolates ``new URL(`${this.url}/${relation}`)`` and ``new URL(`${this.url}/rpc/${fn}`)``. Because all projects, locations, services, and v1 REST endpoints share the `firebasedataconnect.googleapis.com` origin while `createBuilderFetch` attaches live `x-firebase-auth-token` and `x-firebase-appcheck` credentials, dynamic inputs containing `/`, `..`, `?`, or `#` can escape `/v1/projects/{project}/locations/{location}/services/{service}/postgrest`, rewrite an RPC call like `sql.rpc('../users', payload)` into a direct table `POST` mutation, or inject unintended PostgREST query parameters. Note that `encodeURIComponent` leaves `.` and `..` unencoded, so dot-segments must be rejected explicitly while leaving blank strings untouched so `from('')` preserves its raw synchronous `Error`.

Suggested change:
```ts
+  #encodeResourceSegment(segment: string, preserveBlank: boolean): string {
+    if (segment === '.' || segment === '..') {
+      throw new FirebaseSqlError(
+        Code.INVALID_ARGUMENT,
+        `Invalid resource name "${segment}".`,
+        FirebaseSqlErrorCategory.SQL_CLIENT
+      );
+    }
+    if (
+      typeof segment !== 'string' ||
+      segment.length === 0 ||
+      (preserveBlank && segment.trim() === '')
+    ) {
+      return segment;
+    }
+    return encodeURIComponent(segment);
+  }
+
   from(table: string): QueryBuilder {
     if (this._state.active === null) {
       throw new FirebaseSqlError(
         Code.NOT_INITIALIZED,
         'FirebaseSql instance has been terminated.',
         FirebaseSqlErrorCategory.SQL_CLIENT
       );
     }
-    const delegate = this.#postgrestClient.from(table);
+    const delegate = this.#postgrestClient.from(
+      this.#encodeResourceSegment(table, true)
+    );
     return new QueryBuilderImpl(
       delegate,
       this._state,
       createBuilderFetch,
       mapPostgrestFailureToFirebaseSqlError
     );
   }
```
```ts
     const tracker: BuilderExecutionTracker = { clientError: null };
     this.#postgrestClient.fetch = createBuilderFetch(this._state, tracker);
     const delegate = this.#postgrestClient.rpc(
-      fn,
+      this.#encodeResourceSegment(fn, false),
       params as Record<string, unknown> | undefined,
       options
     );
```

#### Resolution
- **Decision:** Addressed in `FirebaseSql.from()` and `FirebaseSql.rpc()` in `packages/sql/src/api/FirebaseSql.ts` via `#encodeResourceSegment()`, rejecting `.` and `..` with `Code.INVALID_ARGUMENT` and `encodeURIComponent`-encoding non-blank resource segments while preserving raw `Error` throws on blank `from('')` inputs (with unit tests in `packages/sql/src/api/FirebaseSql.test.ts`).
- **Commit:** `44b10088e`

## File: packages/sql/src/api/impl/QueryBuilderImpl.ts
### Finding 5: (line 108): [MEDIUM] Repeated `#delegate.fetch` mutation boilerplate leaves per-request tracker closures retained on long-lived builders and clients.

All five operation methods in `QueryBuilderImpl` (`select` at lines L108–L116, `insert` at L129–L140, `upsert` at L153–L164, `update` at L177–L188, and `delete` at L194–L202) and `FirebaseSql.rpc()` (`packages/sql/src/api/FirebaseSql.ts` lines L211–L223) repeat the same tracker allocation, `.fetch = ...` assignment, and `FilterBuilderImpl` construction without clearing `.fetch` afterward. Long-lived `QueryBuilderImpl` and `FirebaseSql` instances retain the most recent operation's `tracker` closure (and any captured `FirebaseSqlError` on `tracker.clientError`) in memory, and `this.#postgrestClient.from(table)` copies stale RPC `fetch` closures onto subsequent `PostgrestQueryBuilder` instances.

Suggested change:
```ts
+  #createFilterBuilder<T, Method>(
+    buildDelegate: () => FilterDelegateHandle
+  ): FilterBuilder<T, Method> {
+    // Reassign #delegate.fetch with a fresh tracker per operation: PostgrestQueryBuilder
+    // copies `this.fetch` by value into each newly constructed PostgrestFilterBuilder,
+    // isolating clientError state across concurrent queries built from the same QueryBuilder.
+    const tracker: BuilderExecutionTracker = { clientError: null };
+    this.#delegate.fetch = this.#createFetch(this.#state, tracker);
+    try {
+      return new FilterBuilderImpl<T, Method>(
+        buildDelegate(),
+        this.#state,
+        tracker,
+        this.#mapError
+      );
+    } finally {
+      this.#delegate.fetch = undefined;
+    }
+  }
+
   select(
     columns?: string | undefined,
     options?: Readonly<QuerySelectOptions> | undefined
   ): FilterBuilder<Array<Record<string, unknown>>, 'GET'> {
-    // Reassign #delegate.fetch with a fresh tracker per operation: PostgrestQueryBuilder
-    // copies `this.fetch` by value into each newly constructed PostgrestFilterBuilder,
-    // isolating clientError state across concurrent queries built from the same QueryBuilder.
-    const tracker: BuilderExecutionTracker = { clientError: null };
-    this.#delegate.fetch = this.#createFetch(this.#state, tracker);
-    const pgFilterBuilder = this.#delegate.select(columns, options);
-    return new FilterBuilderImpl<Array<Record<string, unknown>>, 'GET'>(
-      pgFilterBuilder,
-      this.#state,
-      tracker,
-      this.#mapError
-    );
+    return this.#createFilterBuilder(() =>
+      this.#delegate.select(columns, options)
+    );
   }
```

#### Resolution
- **Decision:** Addressed across Finding 9 (`3836d278c`), which moved per-execution tracker allocation and `.fetch` binding out of `QueryBuilderImpl` and `FirebaseSql.rpc()` into `FilterBuilderImpl.#execute()`, and `af567fa7d`, which clears `#delegate.fetch = undefined` in a `finally` block immediately after `#delegate.then(...)` snapshots `this.fetch` synchronously in `packages/sql/src/api/impl/FilterBuilderImpl.ts` and deduplicates `new FilterBuilderImpl(...)` construction via `QueryBuilderImpl.#wrap()` in `packages/sql/src/api/impl/QueryBuilderImpl.ts` (with unit tests in `packages/sql/src/api/Builders.test.ts`).
- **Commit:** `af567fa7d`

## File: packages/sql/src/api/impl/FilterBuilderImpl.ts
### Finding 6: (line 110): [MEDIUM] `FilterBuilderImpl` exposes an unsound `ThrowOnError` class type parameter while hardcoding `#shouldThrowOnError = false`.

`FilterBuilderImpl<T, Method = unknown, ThrowOnError extends boolean = false>` accepts `ThrowOnError` as a class type parameter, yet its constructor always initializes `#shouldThrowOnError = false` (line L116) with no parameter to enable throwing. Instantiating `new FilterBuilderImpl<Row[], 'GET', true>(...)` compiles cleanly and types `await builder` as `OperationSuccess<Row[]>`, while `#fail()` (lines L548–L561) returns an `OperationFailure` cast to `OperationSuccess<Row[]>`. Removing `ThrowOnError` from `FilterBuilderImpl` (`implements FilterBuilder<T, Method, false>`, plus dropping the third type argument in `packages/sql/src/api/FirebaseSql.ts` line L218) makes construction sound and removes conditional `ThrowOnError` casts in `then()`, `#fail()`, and `#execute()` (lines L523–L566, L632–L634).

Suggested change:
```ts
 export class FilterBuilderImpl<
   T,
-  Method = unknown,
-  ThrowOnError extends boolean = false
-> implements FilterBuilder<T, Method, ThrowOnError> {
+  Method = unknown
+> implements FilterBuilder<T, Method, false> {
   readonly #delegate: InternalPostgrestFilterBuilder;
```

#### Resolution
- **Decision:** Addressed by removing the `ThrowOnError` class type parameter from `FilterBuilderImpl` in `packages/sql/src/api/impl/FilterBuilderImpl.ts` (`implements FilterBuilder<T, Method, false>`), simplifying `then()`, `#fail()`, and `#execute()` to use `OperationResult<T>` directly, and dropping the third type argument in `FirebaseSql.rpc()` in `packages/sql/src/api/FirebaseSql.ts`.
- **Commit:** `70d7d3800`

### Finding 7: (line 148): [MEDIUM] `setHeader()` coerces `name` twice, skips whitespace trimming during disallowed-header checks, and allocates temporary sets/objects per call.

`validateHeaders({ [name]: value })` coerces `name` to a property key once (while rebuilding a fresh lowercase `Set` and `Object.entries` array) and `this.#delegate.setHeader(name, value)` coerces `name` a second time, allowing a non-primitive object with a stateful `toString()` / `[Symbol.toPrimitive]` to pass validation and write a reserved or forbidden header on `#delegate`. In addition, surrounding whitespace (such as `' authorization'` or `'x-firebase-auth-token '`) misses `DISALLOWED_HEADER_KEYS` in `validateHeaders`, surfacing an unmapped `TypeError` from `Headers.set` instead of `FirebaseSqlError(Code.INVALID_ARGUMENT)` or bypassing validation in environments with lenient `Headers` polyfills.

Suggested change:
```ts
-import { validateHeaders } from '../../core/settings';
+import { DISALLOWED_HEADER_KEYS } from '../../core/settings';
```
```ts
   setHeader(name: string, value: string): this {
-    validateHeaders({ [name]: value });
-    void this.#delegate.setHeader(name, value);
+    const headerName = String(name);
+    if (DISALLOWED_HEADER_KEYS.has(headerName.trim().toLowerCase())) {
+      throw new FirebaseSqlError(
+        Code.INVALID_ARGUMENT,
+        `Cannot set protected header ${headerName}.`,
+        FirebaseSqlErrorCategory.SQL_CLIENT
+      );
+    }
+    void this.#delegate.setHeader(headerName, value);
     return this;
   }
```

#### Resolution
- **Decision:** Addressed in both `validateHeaders()` and `FilterBuilderImpl.setHeader()` via a shared `validateHeaderName()` helper in `packages/sql/src/core/settings.ts` that coerces `name` once, trims surrounding whitespace, and checks `DISALLOWED_HEADER_KEYS` directly.
- **Commit:** `400984bb6`

### Finding 8: (line 540): [MEDIUM] `async #execute()` and `await this.#delegate` add extra `Promise` allocations and pre-flight microtask hops on every query execution.

Because `this.#delegate` (`PostgrestFilterBuilder`) is a custom Thenable (`PromiseLike`) rather than a native `Promise`, `const raw = await this.#delegate` (line L596) allocates an intermediate `Promise` and enqueues a `NewPromiseResolveThenableJob` microtask *before* `PostgrestBuilder.then()` begins token acquisition and `fetch`. Wrapping that inside `async #execute()` and unconditionally chaining `.then(onfulfilled, onrejected)` at line L540 adds two extra `Promise` allocations and microtask hops per query. Calling `this.#delegate.then(raw => ...)` directly starts `PostgrestBuilder.then()` synchronously in the caller's turn.

Suggested change:
```ts
   ): PromiseLike<TResult1 | TResult2> {
-    return this.#execute().then(onfulfilled, onrejected);
+    const result = this.#execute();
+    return onfulfilled || onrejected
+      ? result.then(onfulfilled, onrejected)
+      : (result as PromiseLike<TResult1 | TResult2>);
   }
```

### Finding 9: (line 568): [HIGH] Sharing a single mutable `BuilderExecutionTracker` across concurrent executions of the same `FilterBuilderImpl` corrupts `clientError` attribution.

`FilterBuilderImpl` is a reusable lazy `PromiseLike`, yet shares one `{ clientError: FirebaseSqlError | null }` tracker allocated at builder construction time across all `.then()` / `#execute()` calls (lines L568 and L612–L614). When the same builder instance is awaited concurrently (e.g., `Promise.all([query, query])` or retrying after a `Promise.race` timeout while an earlier execution is still pending):
1. Resetting `this.#tracker.clientError = null` at line L568 in a second execution overwrites a `clientError` recorded by an in-flight first execution before it resumes from `await this.#delegate`, causing the first execution to miss line L612 and fall through to `#mapError` on the synthetic `AbortError` (`Code.OTHER` with a cancellation hint).
2. Conversely, if a sibling execution sets `this.#tracker.clientError` while another execution receives `200 OK`, line L612 (`if (this.#tracker.clientError !== null)`) discards the valid `200 OK` result and fails with the sibling's error.

Pass `CreateBuilderFetch` into `FilterBuilderImpl` (also updating `QueryBuilderImpl.ts` lines L108–L202 and `FirebaseSql.ts` lines L211–L223) and bind a fresh per-execution `BuilderExecutionTracker` synchronously before invoking `this.#delegate.then(...)`, which snapshots `const _fetch = this.fetch` synchronously on entry.

Suggested change:
```ts
     const tracker: BuilderExecutionTracker = { clientError: null };
     (this.#delegate as unknown as { fetch: typeof fetch }).fetch =
       this.#createFetch(this.#state, tracker);
     const pending = this.#delegate.then(res => res);
     const raw = await pending;

     if (this.#state.active === null) {
       return this.#fail(
         new FirebaseSqlError(
           Code.NOT_INITIALIZED,
           'FirebaseSql instance has been terminated.',
           FirebaseSqlErrorCategory.SQL_CLIENT
         ),
         0,
         ''
       );
     }

-    if (this.#tracker.clientError !== null) {
-      return this.#fail(this.#tracker.clientError, 0, '');
+    if (tracker.clientError !== null) {
+      return this.#fail(tracker.clientError, 0, '');
     }
```

#### Resolution
- **Decision:** Addressed by passing `CreateBuilderFetch` into `FilterBuilderImpl` in `packages/sql/src/api/impl/FilterBuilderImpl.ts` (updating `QueryBuilderImpl` in `packages/sql/src/api/impl/QueryBuilderImpl.ts` and `FirebaseSql.rpc()` in `packages/sql/src/api/FirebaseSql.ts`) and allocating a fresh per-execution `BuilderExecutionTracker` synchronously before `this.#delegate.then(...)`, with concurrent same-builder execution tests in `packages/sql/src/api/Builders.test.ts`.
- **Commit:** `3836d278c`

### Finding 10: (line 583): [MEDIUM] Direct `getFetch()` call in `FilterBuilderImpl.#execute()` breaks the `CreateBuilderFetch` injection boundary and maps fallback errors inconsistently.

`FilterBuilderImpl.#execute()` (lines L31 and L582–L594) calls the global `../../network/fetch` `getFetch()` singleton directly even though transport creation is injected via `CreateBuilderFetch` and `createBuilderFetch` in `packages/sql/src/network/postgrestFetch.ts` (lines L104–L109) already calls `getFetch()` before token retrieval. Calling `getFetch()` in `#execute()` runs the lookup twice per request, couples unit tests with injected `CreateBuilderFetch` stubs to global `initializeFetch` state, and wraps non-`FirebaseSqlError` throws as `Code.NOT_SUPPORTED` (line L589) whereas `postgrestFetch.ts` wraps them as `Code.OTHER` (line L66).

Suggested change:
```ts
-    try {
-      getFetch();
-    } catch (err) {
-      const sqlError =
-        err instanceof FirebaseSqlError
-          ? err
-          : new FirebaseSqlError(
-              Code.NOT_SUPPORTED,
-              err instanceof Error ? err.message : String(err),
-              FirebaseSqlErrorCategory.SQL_CLIENT
-            );
-      return this.#fail(sqlError, 0, '');
-    }
-
     const raw = await this.#delegate;
```

#### Resolution
- **Decision:** Addressed by removing the direct `getFetch()` import and pre-check from `FilterBuilderImpl.#execute()` in `packages/sql/src/api/impl/FilterBuilderImpl.ts` so `createBuilderFetch` in `packages/sql/src/network/postgrestFetch.ts` handles `getFetch()` lookup and error mapping in one place without coupling injected `CreateBuilderFetch` stubs to global `initializeFetch` state (verified in `packages/sql/src/api/Builders.test.ts`).
- **Commit:** `980a41d97`

### Finding 11: (line 596): [HIGH] Unguarded `await this.#delegate` rejects with raw `TypeError`s in default no-throw mode when `PostgrestBuilder.then()` throws synchronously.

`PostgrestBuilder.then()` executes synchronous `this.headers.set('Accept-Profile', this.schema)` / `this.headers.set('Content-Profile', this.schema)` calls before entering `executeWithRetry()` and its `.catch(...)` handler. Because `SqlServiceSettings.schemaName` is not validated as an HTTP header value in `getSql()`, any `schemaName` containing non-ISO-8859-1 characters or disallowed HTTP header bytes (`\r`, `\n`, `\0`) causes `Headers.prototype.set` to throw a raw `TypeError` synchronously during `await this.#delegate`. That unhandled rejection leaks `@supabase/postgrest-js` stack frames, rejects even when `.throwOnError()` was not enabled (violating the non-throwing `OperationResult<T>` contract), and bypasses wrapping into `FirebaseSqlError` when `.throwOnError()` is enabled.

Suggested change:
```ts
-    const raw = await this.#delegate;
+    let raw: Awaited<InternalPostgrestFilterBuilder>;
+    try {
+      raw = await this.#delegate;
+    } catch (err) {
+      if (this.#state.active === null) {
+        return this.#fail(
+          new FirebaseSqlError(
+            Code.NOT_INITIALIZED,
+            'FirebaseSql instance has been terminated.',
+            FirebaseSqlErrorCategory.SQL_CLIENT
+          ),
+          0,
+          ''
+        );
+      }
+      if (this.#tracker.clientError !== null) {
+        return this.#fail(this.#tracker.clientError, 0, '');
+      }
+      const sqlError =
+        err instanceof FirebaseSqlError
+          ? err
+          : new FirebaseSqlError(
+              Code.OTHER,
+              err instanceof Error ? err.message : String(err),
+              FirebaseSqlErrorCategory.SQL_CLIENT
+            );
+      return this.#fail(sqlError, 0, '');
+    }
```

### Finding 12: (line 616): [HIGH] Non-2xx HTTP error responses with a JSON `null` body resolve as `OperationSuccess` and bypass `.throwOnError()`.

In `@supabase/postgrest-js`, `PostgrestBuilder.processResponse` parses non-2xx bodies via `error = JSON.parse(body)` and sets `success: error === null`. When an upstream gateway, proxy, or RPC endpoint returns a non-2xx status (e.g., `400`, `401`, `403`, `404`, `500`, `503`) with a JSON `"null"` body, `raw.error` is `null` and `raw.success` is `true` while `raw.status` remains the failing HTTP status (whereas legitimate `Preserve404` rewrites normalize `raw.status` to `200` or `204`). Because line L616 only checks `!raw.success || raw.error !== null`, the failing response resolves as `OperationSuccess<T>` with `data: null` and fails to reject when `.throwOnError()` is enabled.

Suggested change:
```ts
-    if (!raw.success || raw.error !== null) {
+    if (
+      !raw.success ||
+      raw.error !== null ||
+      raw.status < 200 ||
+      raw.status >= 300
+    ) {
       return this.#fail(
         this.#mapError(raw.error, raw.status, raw.statusText),
         raw.status,
         raw.statusText
       );
     }
```

#### Resolution
- **Decision:** Addressed in `FilterBuilderImpl.#execute()` in `packages/sql/src/api/impl/FilterBuilderImpl.ts` by treating non-2xx `raw.status` (`< 200 || >= 300`) as failures even when `raw.error` is `null` (with unit tests in `packages/sql/src/api/Builders.test.ts`).
- **Commit:** `79bd902b6`

## File: packages/sql/src/core/errorMapper.ts
### Finding 13: (line 37): [MEDIUM] Unguarded `JSON.stringify(details)` in `normalizeDetails` throws `TypeError` on `BigInt` or circular values.

`mapPostgrestFailureToFirebaseSqlError` accepts `rawError: unknown` and is called from `FilterBuilderImpl.#execute()` outside any `try`/`catch`. If `rawError.details` (or `inner.details`) contains a `BigInt` or circular reference (for example, from a custom fetch interceptor on `status === 0`), `JSON.stringify(details)` throws a synchronous `TypeError`, rejecting the builder promise with a raw `TypeError` even in default no-throw mode.

Suggested change:
```ts
   // PostgREST PGRST201 (ambiguous embedding) and Google OnePlatform RPC errors
   // emit structured object/array details rather than strings.
   if (typeof details === 'object' && details !== null) {
-    return JSON.stringify(details);
+    try {
+      const serialized: string | undefined = JSON.stringify(
+        details,
+        (_key, value: unknown) =>
+          typeof value === 'bigint' ? value.toString() : value
+      );
+      return serialized && serialized.length > 0 ? serialized : undefined;
+    } catch {
+      return String(details);
+    }
   }
   return undefined;
```

#### Resolution
- **Decision:** Skipped (not addressed; `JSON.parse` HTTP error payloads do not contain `BigInt` or circular references).
- **Commit:** N/A (no code change).

### Finding 14: (line 108): [HIGH] Non-PostgREST JSON error shapes (`[{ error: { ... } }]`, `{ error: "<string>" }`, unnested `{ code, status }` RPC errors, and JSON string/array bodies) are misclassified or lose error messages.

`PostgrestBuilder.processResponse` parses any non-2xx JSON body directly via `JSON.parse(body)`, exposing three gaps in `mapPostgrestFailureToFirebaseSqlError`:
1. Google ESF / OnePlatform chunked HTTP transcoding can emit single-element array envelopes (`[{ error: { code, message, status, details } }]`); `isPlainRecord(rawError)` rejects arrays, losing `inner.message`, `inner.details`, and `inner.status` (`UNIMPLEMENTED` -> `Code.NOT_SUPPORTED`) and collapsing the message to `"HTTP Error <status>"` under HTTP/2 where `statusText` is empty.
2. OAuth/IAP/proxy JSON errors with a string `error` field (`{ error: "invalid_token", error_description: "Token expired" }`) or unnested RPC status objects (`{ code: "UNAVAILABLE", status: "UNAVAILABLE", message: "..." }`) skip `isPlainRecord(rawError.error)`; when `code` is a string they are misclassified as `SQL_POSTGREST` instead of `SQL_PLATFORM`, and otherwise `error` / `error_description` are ignored.
3. Unlike the `status === 0` branch on line L87, the `status > 0` fallback (lines L144–L155) ignores `typeof rawError === 'string'` and `Array.isArray(rawError)`, dropping JSON string error messages (e.g., `"Too Many Requests"`) and structured array details.

Suggested change:
```ts
+  const envelopeCandidate =
+    Array.isArray(rawError) && rawError.length === 1 ? rawError[0] : rawError;
+
   // Google OnePlatform / ESF pre-adapter rejections wrap errors under a top-level
-  // `error` envelope (`{ error: { code, message, status, details } }`), which
-  // @supabase/postgrest-js leaves nested via raw JSON.parse.
-  if (isPlainRecord(rawError) && isPlainRecord(rawError.error)) {
-    const inner = rawError.error;
+  // `error` envelope (`{ error: { code, message, status, details } }` or single-element
+  // array `[{ error: { ... } }]`), which @supabase/postgrest-js leaves nested via raw JSON.parse.
+  if (
+    isPlainRecord(envelopeCandidate) &&
+    isPlainRecord(envelopeCandidate.error)
+  ) {
+    const inner = envelopeCandidate.error;
     const code = mapPlatformStatusToCode(status, inner.status);
     const message =
       typeof inner.message === 'string' && inner.message.length > 0
         ? inner.message
         : statusText || `HTTP Error ${status}`;
     return new FirebaseSqlError(
       code,
       message,
       FirebaseSqlErrorCategory.SQL_PLATFORM,
       normalizeDetails(inner.details),
       normalizeHint(inner.hint),
       normalizedStatus
     );
   }
 
+  if (
+    isPlainRecord(rawError) &&
+    typeof rawError.error === 'string' &&
+    rawError.error.length > 0
+  ) {
+    const message =
+      typeof rawError.error_description === 'string' &&
+      rawError.error_description.length > 0
+        ? rawError.error_description
+        : typeof rawError.message === 'string' && rawError.message.length > 0
+          ? rawError.message
+          : rawError.error;
+    return new FirebaseSqlError(
+      mapPlatformStatusToCode(status, rawError.status),
+      message,
+      FirebaseSqlErrorCategory.SQL_PLATFORM,
+      normalizeDetails(rawError.details),
+      normalizeHint(rawError.hint),
+      normalizedStatus
+    );
+  }
+
   if (
     isPlainRecord(rawError) &&
     typeof rawError.code === 'string' &&
-    rawError.code.length > 0
+    rawError.code.length > 0 &&
+    typeof rawError.status !== 'string'
   ) {
     const message =
       typeof rawError.message === 'string' && rawError.message.length > 0
         ? rawError.message
         : statusText || rawError.code;
     return new FirebaseSqlError(
       rawError.code,
       message,
       FirebaseSqlErrorCategory.SQL_POSTGREST,
       normalizeDetails(rawError.details),
       normalizeHint(rawError.hint),
       normalizedStatus
     );
   }
 
   const fallbackMessage =
     isPlainRecord(rawError) &&
     typeof rawError.message === 'string' &&
     rawError.message.length > 0
       ? rawError.message
-      : statusText || `HTTP Error ${status}`;
+      : typeof rawError === 'string' && rawError.length > 0
+        ? rawError
+        : statusText || `HTTP Error ${status}`;
   const fallbackDetails = isPlainRecord(rawError)
     ? normalizeDetails(rawError.details)
-    : undefined;
+    : Array.isArray(rawError)
+      ? normalizeDetails(rawError)
+      : undefined;
   const fallbackHint = isPlainRecord(rawError)
     ? normalizeHint(rawError.hint)
     : undefined;
 
   return new FirebaseSqlError(
-    mapPlatformStatusToCode(status),
+    mapPlatformStatusToCode(
+      status,
+      isPlainRecord(rawError) ? rawError.status : undefined
+    ),
     fallbackMessage,
     FirebaseSqlErrorCategory.SQL_PLATFORM,
     fallbackDetails,
     fallbackHint,
     normalizedStatus
   );
```

#### Resolution
- **Decision:** Addressed in `mapPostgrestFailureToFirebaseSqlError` in `packages/sql/src/core/errorMapper.ts` by unwrapping single-element array envelopes (`[{ error: { ... } }]`), classifying `{ error: "<string>" }` payloads and unnested `{ code, status }` RPC error objects as `SQL_PLATFORM` with `mapPlatformStatusToCode(status, rawError.status)`, and preserving JSON string messages and array details in the `status > 0` `SQL_PLATFORM` fallback (with unit tests in `packages/sql/src/core/errorMapper.test.ts`).
- **Commit:** `11ce82bd1`

## File: packages/sql/src/network/postgrestFetch.ts
### Finding 15: (line 72): [HIGH] `copyHeadersInit` preserves case-sensitive keys on `{}` without stripping `DISALLOWED_HEADER_KEYS`, merging duplicate tuples, or preserving `Request` headers.

`copyHeadersInit` and header injection in `createBuilderFetch` (lines L130–L141) copy incoming headers onto a prototype-inheriting `{}` object without normalizing key casing or filtering `DISALLOWED_HEADER_KEYS`:
1. Mixed-case protected headers (e.g., `X-Firebase-Auth-Token` or `Authorization` passed via direct `FirebaseSql` construction or custom `CreateBuilderFetch` callers) survive alongside lowercase SDK headers (`mergedHeaders['x-firebase-auth-token']`)—causing `fetch` to comma-join both headers or transmit spoofed headers when unauthenticated—and a `'__proto__'` header name invokes `Object.prototype.__proto__`.
2. Tuple arrays (`Array<[string, string]>`) overwrite `merged[key] = value` instead of appending repeated header names per the Fetch `Headers` specification, and when `input` is a `Request` with `init?.headers === undefined`, passing `headers: mergedHeaders` wipes all headers on `input.headers`.

Suggested change:
```ts
+import { DISALLOWED_HEADER_KEYS } from '../core/settings';
```
```ts
-function copyHeadersInit(
-  headersInit: HeadersInit | undefined
+function buildRequestHeaders(
+  input: RequestInfo | URL,
+  headersInit: HeadersInit | undefined,
+  appId: string | undefined,
+  authToken: string | null,
+  appCheckToken: string | null
 ): Record<string, string> {
-  const merged: Record<string, string> = {};
-  if (!headersInit) {
-    return merged;
-  }
-  if (headersInit instanceof Headers) {
-    headersInit.forEach((value, key) => {
-      merged[key] = value;
+  const headers = new Headers();
+  const source =
+    headersInit !== undefined
+      ? headersInit
+      : typeof Request !== 'undefined' && input instanceof Request
+        ? input.headers
+        : undefined;
+  if (source instanceof Headers) {
+    source.forEach((value, key) => {
+      if (!DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())) {
+        headers.append(key, value);
+      }
     });
-  } else if (Array.isArray(headersInit)) {
-    for (const [key, value] of headersInit) {
-      merged[key] = value;
+  } else if (Array.isArray(source)) {
+    for (const [key, value] of source) {
+      if (!DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())) {
+        headers.append(key, value);
+      }
     }
-  } else {
-    for (const [key, value] of Object.entries(headersInit)) {
+  } else if (source) {
+    for (const [key, value] of Object.entries(source)) {
       if (
         value !== undefined &&
         !DISALLOWED_HEADER_KEYS.has(key.trim().toLowerCase())
       ) {
-        merged[key] = value;
+        headers.append(key, value);
       }
     }
   }
+  headers.set('x-goog-api-client', 'gl-js/ fire/' + SDK_VERSION);
+  headers.set('x-client-version', 'web/' + SDK_VERSION);
+  if (appId) {
+    headers.set('x-firebase-gmpid', appId);
+  }
+  if (authToken) {
+    headers.set('x-firebase-auth-token', authToken);
+  }
+  if (appCheckToken) {
+    headers.set('x-firebase-appcheck', appCheckToken);
+  }
+  const merged: Record<string, string> = Object.create(null);
+  headers.forEach((value, key) => {
+    merged[key] = value;
+  });
   return merged;
 }
```

### Finding 16: (line 114): [HIGH] `AbortSignal` is ignored before and during token acquisition and `401` refresh, and custom abort reasons trigger 3x `fetchWithRetry` retries.

`createBuilderFetch` awaits `authTokenProvider.getToken()` and `appCheckTokenProvider.getToken()` (lines L114–L117) and `authTokenProvider.getToken({ forceRefresh: true })` on HTTP `401` (lines L151–L153) without checking `init?.signal` (or `input.signal`) or subscribing to `'abort'` events:
1. Pre-aborted signals still invoke Auth and App Check token providers (including network `forceRefresh: true`), and if `getToken()` rejects while offline on an already-aborted call, `throwTrackedClientError` masks the abort and drops `PostgrestBuilder`'s abort diagnostic / `urlLengthLimit` hint.
2. Mid-flight aborts and `AbortSignal.timeout(ms)` cannot cancel a request stalled inside token acquisition or `401` refresh.
3. When a caller aborts via `controller.abort(customReason)` with a custom `Error` or string reason, `@supabase/postgrest-js`'s `fetchWithRetry` (which only skips retries on `AbortError` or `TimeoutError`) executes 3 extra GET/HEAD retries and formats string reasons as `"FetchError: undefined"`.

Suggested change:
```ts
+function getEffectiveSignal(
+  input: RequestInfo | URL,
+  init: RequestInit | undefined
+): AbortSignal | undefined {
+  if (init?.signal !== undefined) {
+    return init.signal ?? undefined;
+  }
+  if (typeof Request !== 'undefined' && input instanceof Request) {
+    return input.signal;
+  }
+  return undefined;
+}
+
+function toAbortError(signal: AbortSignal, thrown?: unknown): Error {
+  const reason: unknown = thrown !== undefined ? thrown : signal.reason;
+  if (
+    reason instanceof Error &&
+    (reason.name === 'AbortError' || reason.name === 'TimeoutError')
+  ) {
+    return reason;
+  }
+  const message =
+    reason instanceof Error
+      ? reason.message
+      : reason !== undefined
+        ? String(reason)
+        : 'The operation was aborted.';
+  const abortError = new Error(message);
+  abortError.name = 'AbortError';
+  return abortError;
+}
+
+function raceWithAbort<T>(
+  promise: Promise<T>,
+  signal: AbortSignal | undefined
+): Promise<T> {
+  if (!signal) {
+    return promise;
+  }
+  if (signal.aborted) {
+    return Promise.reject(toAbortError(signal));
+  }
+  return new Promise<T>((resolve, reject) => {
+    const onAbort = (): void => {
+      reject(toAbortError(signal));
+    };
+    signal.addEventListener('abort', onAbort, { once: true });
+    promise.then(
+      value => {
+        signal.removeEventListener('abort', onAbort);
+        resolve(value);
+      },
+      err => {
+        signal.removeEventListener('abort', onAbort);
+        reject(signal.aborted ? toAbortError(signal) : err);
+      }
+    );
+  });
+}
```

### Finding 17: (line 143): [HIGH] Missing `state.active` checks around `baseFetch` allow post-`terminate()` retries/backoff delays, and unreplayable `Request`/`ReadableStream` bodies throw `TypeError` on `401` retry.

`createBuilderFetch` does not re-check `state.active === null` when `baseFetch` settles/rejects (lines L143–L146 and L170–L176) or after draining the `401` body (line L169), and does not guard one-shot request bodies before retrying:
1. If `terminate(sql)` runs during `401` body cleanup at line L169, line L170 still dispatches a second HTTP request (including `POST`/`PATCH`/`DELETE`/`RPC` mutations) after termination; if `terminate(sql)` runs while an idempotent `GET`/`HEAD` request fails with a network error or `503`/`520`, `fetchWithRetry` stalls behind exponential backoff (`1s`+) or `Retry-After` instead of aborting immediately with `Code.NOT_INITIALIZED`.
2. When `input` is a `Request` with a body (not cloned prior to the initial `baseFetch`) or `init?.body` is a `ReadableStream`, retrying `baseFetch` on `401` throws a `TypeError` (`status: 0`, `Code.OTHER`) on the locked/consumed stream instead of returning the `401` response.

Suggested change:
```ts
+    const isRequestInput =
+      typeof Request !== 'undefined' && input instanceof Request;
+    const canReplayBody =
+      !(
+        typeof ReadableStream !== 'undefined' &&
+        init?.body instanceof ReadableStream
+      ) && !(isRequestInput && init?.body === undefined && input.bodyUsed);
+    const retryInput =
+      canReplayBody &&
+      isRequestInput &&
+      init?.body === undefined &&
+      input.body !== null
+        ? input.clone()
+        : null;
+
+    const executeFetch = async (
+      targetInput: RequestInfo | URL,
+      requestHeaders: Record<string, string>
+    ): Promise<Response> => {
+      if (state.active === null) {
+        throwTrackedClientError(tracker, createTerminatedError());
+      }
+      let res: Response;
+      try {
+        res = await baseFetch(targetInput, {
+          ...init,
+          headers: requestHeaders
+        });
+      } catch (err) {
+        if (state.active === null) {
+          throwTrackedClientError(tracker, createTerminatedError());
+        }
+        throw err;
+      }
+      if (state.active === null) {
+        void res.body?.cancel().catch(() => {});
+        throwTrackedClientError(tracker, createTerminatedError());
+      }
+      return res;
+    };
```

### Finding 18: (line 148): [HIGH] HTTP `401` refresh retry can replay in-flight requests across different Auth principals.

The `401` retry branch runs even when `authToken === null` and never compares the Auth UID that initiated the request against the UID active after `getToken({ forceRefresh: true })`. If a user signs in or switches accounts while an anonymous or prior user's request/mutation is in flight and receives HTTP `401`, `refreshedAuthToken !== authToken` evaluates to `true` and replays the prior principal's operation under the newly signed-in user's JWT.

Suggested change:
```ts
     let authToken: string | null = null;
     let appCheckToken: string | null = null;
+    let initialUid: string | null | undefined;
     try {
       const [authTokenData, appCheckTokenResult] = await Promise.all([
         active.authTokenProvider.getToken({ forceRefresh: false }),
         active.appCheckTokenProvider.getToken({ forceRefresh: false })
       ]);
       authToken = authTokenData?.accessToken ? authTokenData.accessToken : null;
       appCheckToken = appCheckTokenResult?.token
         ? appCheckTokenResult.token
         : null;
+      initialUid = active.authTokenProvider.getAuth()?.getUid();
     } catch (err) {
       throwTrackedClientError(tracker, resolveClientError(state, err));
     }
```
```ts
-    if (response.status === 401 && state.active !== null) {
+    if (
+      response.status === 401 &&
+      authToken !== null &&
+      state.active !== null
+    ) {
```
```ts
-      if (refreshedAuthToken !== null && refreshedAuthToken !== authToken) {
+      const refreshedUid = active.authTokenProvider.getAuth()?.getUid();
+      if (
+        refreshedAuthToken !== null &&
+        refreshedAuthToken !== authToken &&
+        refreshedUid === initialUid
+      ) {
```

#### Resolution
- **Decision:** Addressed in `createBuilderFetch` in `packages/sql/src/network/postgrestFetch.ts` by capturing `initialUid` during initial token retrieval, gating the HTTP `401` refresh block on `authToken !== null`, and verifying `refreshedUid === initialUid` before replaying with `refreshedAuthToken` (with principal-isolation unit tests in `packages/sql/src/network/postgrestFetch.test.ts`).
- **Commit:** `0e296ed2e`

### Finding 19: (line 151): [MEDIUM] Staggered concurrent HTTP `401` responses trigger redundant `forceRefresh: true` Auth token refreshes.

`AbstractTokenProvider.getToken({ forceRefresh: true })` only deduplicates `forceRefresh` calls that are simultaneously in flight. When `N` parallel queries start with the same expired cached `authToken` and their HTTP `401` responses arrive on separate network ticks after an earlier sibling's refresh has already settled, every subsequent `401` unconditionally invokes `getToken({ forceRefresh: true })` again at line L151, issuing up to `N` sequential STS token refreshes instead of checking whether `getToken({ forceRefresh: false })` already holds a newer token.

Suggested change:
```ts
       try {
-        const refreshedTokenData = await active.authTokenProvider.getToken({
-          forceRefresh: true
+        const cachedTokenData = await active.authTokenProvider.getToken({
+          forceRefresh: false
         });
-        refreshedAuthToken = refreshedTokenData?.accessToken
-          ? refreshedTokenData.accessToken
+        refreshedAuthToken = cachedTokenData?.accessToken
+          ? cachedTokenData.accessToken
           : null;
+        if (refreshedAuthToken === null || refreshedAuthToken === authToken) {
+          const refreshedTokenData = await active.authTokenProvider.getToken({
+            forceRefresh: true
+          });
+          refreshedAuthToken = refreshedTokenData?.accessToken
+            ? refreshedTokenData.accessToken
+            : null;
+        }
       } catch (err) {
```

### Finding 20: (line 158): [HIGH] Discarded HTTP `401` responses leak unconsumed body streams on refresh failure/termination and buffer the entire payload via `response.text()` on retry.

When the `401` token refresh rejects (line L158) or `state.active` becomes `null` during refresh (line L162), `throwTrackedClientError` abandons `response` without cancelling `response.body`, leaking the unconsumed `ReadableStream` and pinning the underlying HTTP connection in Node.js (`undici`). On the retry path (line L169), `await response.text().catch(() => {})` downloads, buffers in memory, and UTF-8-decodes the entire discarded `401` payload before issuing the retry request instead of cancelling the stream immediately via `response.body?.cancel()`.

Suggested change:
```ts
       } catch (err) {
+        await response.body?.cancel().catch(() => {});
         throwTrackedClientError(tracker, resolveClientError(state, err));
       }
 
       if (state.active === null) {
+        await response.body?.cancel().catch(() => {});
         throwTrackedClientError(tracker, createTerminatedError());
       }
 
       // Only retry when force-refresh yields a non-null token distinct from the
       // initial attempt; avoids redundant round-trips on anonymous RLS 401s or
       // non-Auth 401 rejections (such as invalid App Check tokens).
       if (refreshedAuthToken !== null && refreshedAuthToken !== authToken) {
-        await response.text().catch(() => {});
+        await response.body?.cancel().catch(() => {});
         return baseFetch(input, {
```
