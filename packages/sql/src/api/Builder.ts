/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FirebaseSqlError } from '../core/error';

/**
 * HTTP status metadata shared by both {@link OperationSuccess} and {@link OperationFailure}.
 *
 * @example
 * Log HTTP status metadata from any operation result:
 * ```ts
 * import type { OperationBase } from 'firebase/sql';
 *
 * function logHttpStatus(meta: OperationBase): void {
 *   console.log(`HTTP ${meta.status}`);
 * }
 *
 * const res = await sql.from('venues').select('id').limit(1);
 * logHttpStatus(res);
 * ```
 *
 * @public
 */
export interface OperationBase {
  /**
   * HTTP response status code (such as `200`, `201`, `204`, `406`, `409`), or `0` when the request
   * failed locally before receiving an HTTP response (network error, `AbortSignal`, circular JSON
   * body, missing `fetch`, or terminated client).
   */
  status: number;

  /**
   * Status text reported by `fetch` (often `''` over HTTP/2, or `''` when `status` is `0`) or
   * synthesized client-side (`'OK'`, `'No Content'`, `'Not Acceptable'`); do not branch application
   * logic on `statusText`.
   */
  statusText: string;
}

/**
 * Successful response envelope resolved when awaiting a {@link Builder} (`success === true`).
 *
 * @typeParam T - Deserialized response payload type.
 *
 * @example
 * Handle a narrowed `OperationSuccess` envelope:
 * ```ts
 * import type { OperationSuccess } from 'firebase/sql';
 *
 * interface VenueRow {
 *   id: string;
 *   name: string;
 * }
 *
 * const res = await sql
 *   .from('venues')
 *   .select('id, name', { count: 'exact' })
 *   .returns<VenueRow[]>();
 *
 * if (res.success) {
 *   const ok: OperationSuccess<VenueRow[]> = res;
 *   console.log(`Fetched ${ok.data.length} of ${ok.count ?? 0} venues`);
 * }
 * ```
 *
 * @public
 */
export interface OperationSuccess<T> extends OperationBase {
  /**
   * Discriminator literal `true` when no error was reported. Note that an HTTP `404` response with
   * an empty body (such as a `HEAD` request against a nonexistent table) is normalized to
   * `status: 204` with `success: true`, `data: null`, and `count: null`, and an HTTP `404` with a
   * JSON array body is normalized to `status: 200` with `data: []`.
   */
  success: true;
  /** Always `null` on a successful operation. */
  error: null;
  /** Deserialized response payload (`null` for mutations without `.select()` or `HEAD` requests). */
  data: T;
  /** Total row count when `count` (`'exact'`, `'planned'`, or `'estimated'`) was requested and returned by the server; otherwise `null`. */
  count: number | null;
}

/**
 * Failure response envelope resolved when awaiting a {@link Builder} in default (`ThrowOnError = false`) mode.
 *
 * @example
 * Inspect structured `FirebaseSqlError` fields on an `OperationFailure`:
 * ```ts
 * import type { OperationFailure } from 'firebase/sql';
 *
 * function reportFailure(failure: OperationFailure): void {
 *   console.error(
 *     `[${failure.status}] ${failure.error.category}/${failure.error.code}: ${failure.error.message}`
 *   );
 * }
 *
 * const res = await sql.from('venues').select('id').eq('slug', 'missing').single();
 * if (!res.success) {
 *   reportFailure(res);
 * }
 * ```
 *
 * @public
 */
export interface OperationFailure extends OperationBase {
  /** Discriminator literal `false` indicating a client, platform, or PostgREST error occurred. */
  success: false;
  /** Structured {@link FirebaseSqlError} describing the failure origin (`category`), `code`, `details`, and `hint`. */
  error: FirebaseSqlError;
  /** Always `null` on a failed operation. */
  data: null;
  /** Always `null` on a failed operation. */
  count: null;
}

/**
 * Discriminated union (`success: true | false`) resolved when awaiting any {@link Builder} in its
 * default non-throwing mode (`ThrowOnError = false`).
 *
 * @remarks
 * Narrow using `if (!result.success)` or destructured `const { data, error } = await ...; if (error)`
 * before reading `data`. Never narrow with `if (!data)` on `.maybeSingle()`, `head: true`, or
 * mutations without `.select()`, because `data` is legitimately `null` on success (leaving `error`
 * possibly `null` in the `if (!data)` branch).
 *
 * To reject with {@link FirebaseSqlError} instead of resolving an `OperationFailure`, chain
 * {@link Builder.throwOnError | .throwOnError()}.
 *
 * @typeParam T - Expected `data` payload type on {@link OperationSuccess}.
 *
 * @example
 * Narrow `OperationResult` via `result.success`:
 * ```ts
 * import type { OperationResult } from 'firebase/sql';
 *
 * interface EventItem {
 *   id: string;
 *   code: string;
 *   title: string;
 * }
 *
 * const result: OperationResult<EventItem[]> = await sql
 *   .from('events')
 *   .select('id, code, title')
 *   .eq('status', 'published')
 *   .returns<EventItem[]>();
 *
 * if (!result.success) {
 *   console.error(result.error.code, result.error.message);
 * } else {
 *   console.log(result.data);
 * }
 * ```
 *
 * @public
 */
export type OperationResult<T> = OperationSuccess<T> | OperationFailure;

/**
 * Type-level predicate evaluating to `true` when `T` explicitly includes `null` (and is not `unknown`), or `false` otherwise.
 *
 * @remarks
 * Used internally by {@link Builder.overrideTypes} and {@link CheckMatchingArrayTypes} to preserve `| null` optionality after {@link TransformBuilder.maybeSingle}.
 *
 * @typeParam T - Type to inspect for `null` membership.
 *
 * @example
 * Check whether a `maybeSingle()` result type includes `null`:
 * ```ts
 * import type { ContainsNull } from 'firebase/sql';
 *
 * type HasNull = ContainsNull<{ id: string } | null>; // true
 * type NonNull = ContainsNull<{ id: string }>; // false
 * ```
 *
 * @public
 */
export type ContainsNull<T> = unknown extends T
  ? false
  : null extends T
    ? true
    : false;

/**
 * Compile-time error marker retained as a type-compatibility guard inside {@link CheckMatchingArrayTypes} and {@link MergeExplicit}.
 *
 * @remarks
 * `firebase/sql` operates on an untyped schema (`Record<string, unknown>`) and does not parse
 * `select()` projection strings at compile time; use {@link Builder.returns} (for full types) or
 * {@link Builder.overrideTypes} (for partial field overrides) to assign static row types.
 *
 * @typeParam Message - Diagnostic message string literal.
 *
 * @example
 * Type-compatibility error marker checked by `CheckMatchingArrayTypes`:
 * ```ts
 * import type { SelectQueryError } from 'firebase/sql';
 *
 * type Marker = SelectQueryError<'Invalid column reference'>;
 * ```
 *
 * @public
 */
export type SelectQueryError<Message extends string> = {
  error: true;
} & Message;

/**
 * Type-level validator checking that `NewResult` matches the array-vs-object cardinality of `T`.
 *
 * @remarks
 * Evaluates to `true` when `T` is `unknown`, when both `T` and `NewResult` are arrays, or when neither is an array; otherwise returns `ErrorResult` (when `T` is an array and `NewResult` is non-array) or `ErrorNewResult` (when `T` is non-array and `NewResult` is an array).
 *
 * @typeParam T - Current builder result type prior to overriding.
 * @typeParam NewResult - Candidate override type supplied to {@link Builder.overrideTypes} or {@link Builder.returns}.
 * @typeParam ErrorResult - Fallback type returned when `T` is an array and `NewResult` is not an array.
 * @typeParam ErrorNewResult - Fallback type returned when `T` is not an array and `NewResult` is an array.
 *
 * @example
 * Validate array-vs-object override compatibility at compile time:
 * ```ts
 * import type { IsValidResultOverride } from 'firebase/sql';
 *
 * type ValidList = IsValidResultOverride<Array<Record<string, unknown>>, Array<{ id: string }>, 'err_arr', 'err_obj'>; // true
 * type InvalidSingle = IsValidResultOverride<Array<Record<string, unknown>>, { id: string }, 'err_arr', 'err_obj'>; // 'err_arr'
 * ```
 *
 * @public
 */
export type IsValidResultOverride<T, NewResult, ErrorResult, ErrorNewResult> =
  unknown extends T
    ? true
    : T extends unknown[]
      ? NewResult extends unknown[]
        ? true
        : ErrorResult
      : NewResult extends unknown[]
        ? ErrorNewResult
        : true;

/**
 * Type-level guard enforcing array-vs-object cardinality compatibility in {@link Builder.overrideTypes} and {@link Builder.returns}, while preserving `| null` when `T` is nullable.
 *
 * @remarks
 * Produces a descriptive `{ Error: 'Type mismatch: ...' }` diagnostic object type if an array type is passed after `.single()` / `.maybeSingle()` or if a non-array object type is passed on a list query.
 *
 * @typeParam T - Current builder result type.
 * @typeParam NewResult - Target result type requested by the caller.
 *
 * @example
 * Preserve `| null` on valid single-row overrides and surface mismatch errors:
 * ```ts
 * import type { CheckMatchingArrayTypes } from 'firebase/sql';
 *
 * type MaybeVenue = CheckMatchingArrayTypes<Record<string, unknown> | null, { id: string; slug: string }>;
 * // { id: string; slug: string } | null
 * ```
 *
 * @public
 */
export type CheckMatchingArrayTypes<T, NewResult> =
  T extends SelectQueryError<string>
    ? NewResult
    : IsValidResultOverride<
          T,
          NewResult,
          {
            Error: 'Type mismatch: Cannot cast array result to a single object. Use .returns<Array<YourType>> or .overrideTypes<Array<YourType>> for array results or .single() to convert the result to a single object';
          },
          {
            Error: 'Type mismatch: Cannot cast single object to array type. Remove Array wrapper from return type or make sure you are not using .single() up in the calling chain';
          }
        > extends infer ValidationResult
      ? ValidationResult extends true
        ? ContainsNull<T> extends true
          ? NewResult | null
          : NewResult
        : ValidationResult
      : never;

/**
 * Flattens intersected object types (`A & B`) into a single mapped object type for cleaner IDE hover tooltips.
 *
 * @typeParam T - Type to flatten when `T` is an object.
 *
 * @example
 * Flatten an intersection of event fields into a single object type:
 * ```ts
 * import type { Simplify } from 'firebase/sql';
 *
 * type FlatEvent = Simplify<{ id: string } & { code: string; title: string }>;
 * // { id: string; code: string; title: string }
 * ```
 *
 * @public
 */
export type Simplify<T> = T extends object
  ? {
      [K in keyof T]: T[K];
    }
  : T;

/**
 * Extracts the literal property keys of `T` when `T` has no `string` index signature; evaluates to
 * `never` when `T` includes a `[key: string]` index signature (because `string` absorbs literal keys in `keyof T`).
 *
 * @typeParam T - Object type whose property keys are inspected.
 *
 * @example
 * Extract literal keys from closed vs. index-signature object types:
 * ```ts
 * import type { ExplicitKeys } from 'firebase/sql';
 *
 * type ClosedKeys = ExplicitKeys<{ id: string; slug: string }>; // 'id' | 'slug'
 * type IndexedKeys = ExplicitKeys<{ id: string; [key: string]: unknown }>; // never
 * ```
 *
 * @public
 */
export type ExplicitKeys<T> = {
  [K in keyof T]: string extends K ? never : K;
}[keyof T];

/**
 * Type-level predicate evaluating to `true` when `T` is a non-array `object`, or `false` for arrays and primitives.
 *
 * @typeParam T - Type to test.
 *
 * @example
 * Distinguish plain row objects from arrays:
 * ```ts
 * import type { IsPlainObject } from 'firebase/sql';
 *
 * type ObjCheck = IsPlainObject<{ id: string }>; // true
 * type ArrCheck = IsPlainObject<Array<{ id: string }>>; // false
 * ```
 *
 * @public
 */
export type IsPlainObject<T> = T extends unknown[]
  ? false
  : T extends object
    ? true
    : false;

/**
 * Recursively merges explicit (non-index-signature) properties of `New` onto `Row`, giving `New` precedence on overlapping keys.
 *
 * @typeParam New - Partial override object type supplying refined property types.
 * @typeParam Row - Base row object type being overridden.
 *
 * @example
 * Override a `metadata` field type while retaining other explicit row properties:
 * ```ts
 * import type { MergeExplicit } from 'firebase/sql';
 *
 * type MergedEvent = MergeExplicit<
 *   { metadata: { track: string } },
 *   { id: string; title: string; metadata: unknown }
 * >;
 * // { id: string; title: string; metadata: { track: string } }
 * ```
 *
 * @public
 */
export type MergeExplicit<New, Row> = {
  [K in ExplicitKeys<New> | ExplicitKeys<Row>]: K extends keyof New
    ? K extends keyof Row
      ? Row[K] extends SelectQueryError<string>
        ? New[K]
        : New[K] extends unknown[]
          ? Row[K] extends unknown[]
            ? Array<
                Simplify<
                  MergeDeep<
                    NonNullable<New[K][number]>,
                    NonNullable<Row[K][number]>
                  >
                >
              >
            : New[K]
          : IsPlainObject<NonNullable<New[K]>> extends true
            ? IsPlainObject<NonNullable<Row[K]>> extends true
              ? ContainsNull<New[K]> extends true
                ? Simplify<
                    MergeDeep<NonNullable<New[K]>, NonNullable<Row[K]>>
                  > | null
                : Simplify<MergeDeep<New[K], NonNullable<Row[K]>>>
              : New[K]
            : New[K]
      : New[K]
    : K extends keyof Row
      ? Row[K]
      : never;
};

/**
 * Deep-merges `New` onto `Row` via {@link MergeExplicit} while preserving any `[K: string]` index signature present on `Row`.
 *
 * @typeParam New - Override object type.
 * @typeParam Row - Base row object type (potentially carrying a `Record<string, unknown>` index signature).
 *
 * @example
 * Deep-merge refined nested fields onto a base row type:
 * ```ts
 * import type { MergeDeep } from 'firebase/sql';
 *
 * type EventWithTypedStatus = MergeDeep<
 *   { status: 'draft' | 'published' },
 *   { id: string; status: string }
 * >;
 * // { id: string; status: 'draft' | 'published' }
 * ```
 *
 * @public
 */
export type MergeDeep<New, Row> = Simplify<
  MergeExplicit<New, Row> &
    (string extends keyof Row
      ? {
          [K: string]: Row[string];
        }
      : {})
>;

/**
 * Computes the resulting `data` type for {@link Builder.overrideTypes} based on `Options` (`{ merge: true }` vs. replacement).
 *
 * @remarks
 * When `Options` extends `{ merge: true }` (the default when `Options` is omitted on
 * `overrideTypes`), short-circuits to `NewResult` if `Result$1` is `unknown` (such as untyped
 * `rpc()`), or applies {@link MergeDeep} across object or array elements. When `Options` is anything
 * other than `{ merge: true }` (such as `{ merge: false }` or `{}`), evaluates directly to
 * `NewResult` (discarding `Result$1`'s `Record<string, unknown>` index signature).
 *
 * @typeParam NewResult - Target override type supplied to {@link Builder.overrideTypes}.
 * @typeParam Result$1 - Current `NonNullable` builder result type.
 * @typeParam Options - Merge configuration (`{ merge: true }` to deep-merge; any other type such as `{ merge: false }` replaces `Result$1`).
 *
 * @example
 * Compare `{ merge: false }` replacement against `{ merge: true }` merging:
 * ```ts
 * import type { MergePartialResult } from 'firebase/sql';
 *
 * type ExactVenues = MergePartialResult<
 *   Array<{ id: string; slug: string }>,
 *   Array<Record<string, unknown>>,
 *   { merge: false }
 * >;
 * // Array<{ id: string; slug: string }>
 * ```
 *
 * @public
 */
export type MergePartialResult<NewResult, Result$1, Options> = Options extends {
  merge: true;
}
  ? // Short-circuit when Result$1 is `unknown` (e.g. untyped `rpc()`): there are no
    // known fields to merge, and falling through to `MergeDeep<NewResult, unknown>`
    // would turn an array `NewResult` into a plain object of `Array` prototype keys.
    unknown extends Result$1
    ? NewResult
    : Result$1 extends unknown[]
      ? NewResult extends unknown[]
        ? Array<Simplify<MergeDeep<NewResult[number], Result$1[number]>>>
        : never
      : Simplify<MergeDeep<NewResult, Result$1>>
  : NewResult;

/**
 * Terminal `PromiseLike` builder interface providing execution modifiers (`throwOnError`,
 * `stripNulls`, `setHeader`, `retry`) and static result-type overrides (`returns`, `overrideTypes`).
 *
 * @remarks
 * Lazy execution and non-cached re-execution: no HTTP request is issued until the builder is
 * `await`ed or `.then()` is called. Each `await` or `.then()` call sends a new HTTP request built
 * from the builder's current state; results are never cached. Awaiting the same builder twice
 * (sequentially or via `Promise.all([q, q])`) executes it twice—harmless for reads, but it
 * duplicates writes for `insert()`, `upsert()`, `update()`, `delete()`, and write `rpc()` builders.
 * Await each mutation builder at most once.
 *
 * Builder progression: `Builder` is the base interface of {@link TransformBuilder} and
 * {@link FilterBuilder}. Once a chain narrows to `Builder` (via `.single()`, `.maybeSingle()`,
 * `.csv()`, `.geojson()`, `.explain()`, `.overrideTypes()`, or `Builder.returns()`), filter and
 * transform methods are no longer available—only `Builder` methods and `await` remain.
 *
 * @typeParam T - Expected resolved `data` payload type.
 * @typeParam Method - HTTP/RPC operation discriminator (`'GET'`, `'POST'`, `'PATCH'`, `'DELETE'`, `'RPC'`). Defaults to `unknown`.
 * @typeParam ThrowOnError - When `false` (default), resolves to {@link OperationResult}; when `true`, resolves to {@link OperationSuccess} or rejects with {@link FirebaseSqlError}.
 *
 * @example
 * Configure execution modifiers and static result types on a terminal `Builder`:
 * ```ts
 * interface VenueDetail {
 *   id: string;
 *   slug: string;
 *   name: string;
 *   city: string;
 * }
 *
 * const res = await sql
 *   .from('venues')
 *   .select('id, slug, name, city')
 *   .eq('slug', 'moscone-west')
 *   .single()
 *   .setHeader('x-request-trace', 'venue-detail-lookup')
 *   .returns<VenueDetail>();
 *
 * if (res.success) {
 *   console.log(res.data.name);
 * }
 * ```
 *
 * @public
 */
export interface Builder<
  T,
  out Method = unknown,
  ThrowOnError extends boolean = false
> extends PromiseLike<
  ThrowOnError extends true ? OperationSuccess<T> : OperationResult<T>
> {
  /**
   * Configures this builder to reject its promise with a {@link FirebaseSqlError} on HTTP,
   * PostgREST, platform, or network failures instead of resolving an {@link OperationFailure},
   * narrowing the resolved envelope to {@link OperationSuccess}.
   *
   * @remarks
   * When to use: `try / catch` workflows, helper functions, or data-fetching hooks (such as React
   * Query or SWR) that expect failed promises to reject.
   *
   * Do not use in code paths that prefer exhaustive discriminated-union checking (`if (!res.success)`)
   * without `try / catch`; omit `throwOnError()` to receive {@link OperationResult}. Note that a
   * `serviceConfig.schemaName` containing invalid HTTP header characters always rejects with a `TypeError`
   * when setting the profile header, regardless of `throwOnError()`.
   *
   * Behavior and side effects: even with `throwOnError()`, awaiting the builder resolves to
   * `{ success: true, data: T, count, error: null, status, statusText }` ({@link OperationSuccess}),
   * not raw `T`—always destructure `const { data } = await query.throwOnError()`. Mutates this
   * builder's error-handling flag in place without network I/O. Can be chained at any stage
   * (`FilterBuilder`, `TransformBuilder`, or `Builder`), and `ThrowOnError = true` is preserved
   * across `.select()`, `.single()`, `.maybeSingle()`, `.returns()`, and `.overrideTypes()`.
   *
   * @returns This builder narrowed to `ThrowOnError = true` (resolving to {@link OperationSuccess} or rejecting with {@link FirebaseSqlError}).
   *
   * @example
   * Destructure `{ data }` from `OperationSuccess` inside `try / catch` with `throwOnError()`:
   * ```ts
   * import { FirebaseSqlError } from 'firebase/sql';
   *
   * try {
   *   const { data } = await sql
   *     .from('venues')
   *     .select('id, name, city')
   *     .eq('slug', 'moscone-west')
   *     .single()
   *     .returns<{ id: string; name: string; city: string }>()
   *     .throwOnError();
   *
   *   console.log(data.name);
   * } catch (err) {
   *   if (err instanceof FirebaseSqlError) {
   *     console.error(err.category, err.code, err.message);
   *   }
   * }
   * ```
   *
   * @public
   */
  throwOnError(): Builder<T, Method, true>;

  /**
   * Instructs PostgREST to omit keys whose value is `null` from returned JSON row objects (`Accept: application/vnd.pgrst.array+json;nulls=stripped` or `application/vnd.pgrst.object+json;nulls=stripped`).
   *
   * @remarks
   * When to use: reducing JSON payload size when rows contain sparse nullable columns (such as
   * `events.venue_id` or `registrations.checked_in_at`). Stripped keys become `undefined` at
   * runtime, so declare optional properties (`prop?: Type`) in your {@link Builder.returns | .returns()}
   * or {@link Builder.overrideTypes | .overrideTypes()} interface.
   *
   * Do not use after {@link TransformBuilder.csv | .csv()}—calling `.csv().stripNulls()` throws a
   * synchronous `Error('stripNulls() cannot be used with csv()')`. Calling `.stripNulls()` before
   * `.csv()`, `.geojson()`, or `.explain()` has no effect because `nulls=stripped` is only applied
   * when `Accept` is JSON or `application/vnd.pgrst.object+json`.
   *
   * Preconditions: requires PostgREST 11.2.0 or newer on the backend.
   *
   * @returns This builder for continued chaining.
   *
   * @throws `Error` synchronously if `Accept` is already `'text/csv'` (after calling {@link TransformBuilder.csv | .csv()}).
   *
   * @example
   * Omit `null` properties from returned registration JSON objects:
   * ```ts
   * interface SparseRegistration {
   *   id: string;
   *   attendee_email: string;
   *   checked_in_at?: string;
   * }
   *
   * const res = await sql
   *   .from('registrations')
   *   .select('id, attendee_email, checked_in_at')
   *   .stripNulls()
   *   .returns<SparseRegistration[]>();
   * ```
   *
   * @public
   */
  stripNulls(): this;

  /**
   * Sets a custom HTTP header on this single request, overriding any client-level header of the same name configured via {@link FirebaseSql.setHeaders}.
   *
   * @remarks
   * When to use: attaching per-request correlation, tracing, or custom application headers (see
   * {@link FirebaseSql.setHeaders} for client-wide static headers).
   *
   * Do not use for authentication, App Check, or Firebase telemetry headers—passing any protected
   * header name (matched case-insensitively after trimming: `'authorization'`,
   * `'x-firebase-auth-token'`, `'x-firebase-appcheck'`, `'x-goog-api-client'`,
   * `'x-client-version'`, `'x-firebase-gmpid'`, `'x-firebase-client'`,
   * `'x-firebase-client-log-type'`, `'x-goog-request-params'`, `'x-firebase-sqlconnect-affinity'`)
   * synchronously throws a {@link FirebaseSqlError}. Firebase Auth and App Check tokens are
   * injected automatically by the SDK transport.
   *
   * Behavior and side effects: clones this builder's internal `Headers` map, calls
   * `Headers.set(name, value)`, and returns `this` without network I/O.
   *
   * @param name - Valid HTTP header token name (no spaces or control characters, and not a protected Firebase or `Authorization` header).
   * @param value - Valid HTTP header ByteString value (Latin-1 characters with no CR or LF).
   * @returns This builder for continued chaining.
   *
   * @throws {@link FirebaseSqlError} synchronously with `code: 'invalid-argument'` ({@link (Code:variable) | Code.INVALID_ARGUMENT}) and `category: 'sql-client'` if `name` is a protected Firebase or `Authorization` header.
   * @throws `TypeError` synchronously if `name` or `value` is rejected by `Headers.set(name, value)` (for example, spaces in `name`, CR/LF, or non-Latin-1 characters).
   *
   * @example
   * Attach a trace ID header to a single query:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .setHeader('x-trace-id', 'req-9c4b2e10');
   * ```
   *
   * @public
   */
  setHeader(name: string, value: string): this;

  /**
   * Enables or disables automatic transient-failure retries for `GET` and `HEAD` HTTP requests on this builder.
   *
   * @remarks
   * Default behavior (`enabled = true`): retries are enabled by default on every builder, but only
   * execute for `GET` and `HEAD` requests (such as `select()`, `rpc(..., { get: true })`, and
   * `rpc(..., { head: true })` when `params` contains no plain object values or arrays of objects;
   * primitive array arguments like `{ ids: [1, 2] }` stay `HEAD` and are retried, whereas plain
   * objects or arrays containing objects fall back to `POST` and are not retried).
   *
   * Requests using `POST`, `PATCH`, or `DELETE` (including `insert()`, `upsert()`, `update()`,
   * `delete()`, and `POST`-mode `rpc()`) and requests cancelled via `AbortSignal` are never retried
   * even when `enabled` is `true`.
   *
   * Eligible requests retry up to `3` times (`4` total attempts) on network `fetch` rejections or
   * HTTP status `503` / `520`, backing off exponentially (`1s`, `2s`, `4s`, or honoring the
   * server's `Retry-After` header on `503` / `520`) and sending an `X-Retry-Count` header on retry
   * attempts. Note that Firebase Auth `getToken()` rejections on `GET` or `HEAD` surface as `fetch`
   * rejections and are retried with the same `1s`, `2s`, `4s` backoff before failing.
   *
   * Calling `retry(false)` disables PostgREST backoff retries on `503`/`520`/network errors,
   * whereas the Firebase transport's single HTTP `401` Auth token refresh-and-retry remains active
   * whenever Firebase Auth is attached.
   *
   * When to use: pass `false` on latency-sensitive `select()` queries where failing fast on the
   * first transient error is preferred over waiting through backoff delays.
   *
   * @param enabled - `false` to disable automatic retries for this request; `true` to re-enable default `GET`/`HEAD` retry behavior.
   * @returns This builder for continued chaining.
   *
   * @example
   * Fail fast without backoff retries on an interactive autocomplete query:
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .ilike('title', 'fire%')
   *   .limit(5)
   *   .retry(false);
   * ```
   *
   * @public
   */
  retry(enabled: boolean): this;

  /**
   * Replaces the static TypeScript type of `result.data` with `NewResult` at compile time without performing runtime validation.
   *
   * @remarks
   * When to use: assigning a full static row, array, or scalar payload type on a terminal
   * {@link Builder} (such as after {@link TransformBuilder.single | .single()},
   * {@link TransformBuilder.maybeSingle | .maybeSingle()}, or
   * {@link TransformBuilder.geojson | .geojson()}; on {@link FilterBuilder} or
   * {@link TransformBuilder} chains, {@link TransformBuilder.returns} provides the same full-type
   * replacement while keeping transform methods available). Unlike
   * {@link Builder.overrideTypes | .overrideTypes()}, `returns<NewResult>()` replaces the untyped
   * `Record<string, unknown>` base type directly with a single type parameter—no `{ merge: false }`
   * option is needed to shed `[K: string]: unknown`. When you instead want to partially override or
   * refine specific fields on an already-typed builder while keeping all other properties intact,
   * use {@link Builder.overrideTypes}.
   *
   * Do not chain after {@link TransformBuilder.explain | .explain()}—`explain()` returns a union of
   * array and `string` builders that rejects both array and non-array overrides; narrow `res.data`
   * with `typeof res.data === 'string'` instead.
   *
   * Match array cardinality: pass `MyRow[]` for array results and `MyRow` (non-array) after
   * `.single()` or `.maybeSingle()` (enforced at compile time via {@link CheckMatchingArrayTypes}).
   * When called after `.maybeSingle()`, `| null` is preserved automatically (`MyRow | null`).
   *
   * Behavior and side effects: compile-time type cast only; performs no network I/O or runtime
   * schema parsing, and preserves `Method` and `ThrowOnError`.
   *
   * @typeParam NewResult - Full replacement TypeScript type matching the array/object cardinality of `T` (pass `MyRow` without `| null` after `.maybeSingle()`).
   * @returns This {@link Builder} with `data` statically typed as `CheckMatchingArrayTypes<T, NewResult>`.
   *
   * @example
   * Assign a full `Venue` type after `.single()`:
   * ```ts
   * interface Venue {
   *   id: string;
   *   slug: string;
   *   name: string;
   *   city: string;
   *   capacity: number;
   * }
   *
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name, city, capacity')
   *   .eq('slug', 'moscone-west')
   *   .single()
   *   .returns<Venue>();
   *
   * if (res.success) {
   *   const venue: Venue = res.data;
   * }
   * ```
   *
   * @example
   * Type a `.maybeSingle()` lookup (`| null` preserved automatically):
   * ```ts
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title')
   *   .eq('code', 'FIREBASE-SUMMIT-2026')
   *   .maybeSingle()
   *   .returns<{ id: string; code: string; title: string }>();
   * // res.data is typed as { id: string; code: string; title: string } | null on success
   * ```
   *
   * @public
   */
  returns<NewResult>(): Builder<
    CheckMatchingArrayTypes<T, NewResult>,
    Method,
    ThrowOnError
  >;

  /**
   * Overrides or deep-merges the static TypeScript type of `result.data` at compile time without performing runtime validation.
   *
   * @remarks
   * When to use: partially overriding or refining specific fields (such as narrowing a `jsonb`
   * column or a status literal union) on an already-typed builder via default `{ merge: true }`
   * deep-merging—for example, chaining
   * `.returns<EventRow[]>().overrideTypes<Array<{ metadata: EventMetadata }>>()` preserves every
   * other `EventRow` property while refining `metadata`. When specifying the complete row, array,
   * or scalar type from scratch, prefer {@link Builder.returns | .returns()} (or
   * {@link TransformBuilder.returns}) so you do not need to pass `{ merge: false }`.
   *
   * Do not use mid-chain before `.eq()`, `.order()`, `.limit()`, or `.single()`—`overrideTypes()`
   * returns a base {@link Builder} that does not expose filter or transform methods. Always place
   * `overrideTypes()` after filters, transforms, and {@link TransformBuilder.single | .single()} /
   * {@link TransformBuilder.maybeSingle | .maybeSingle()}.
   *
   * Do not chain after {@link TransformBuilder.explain | .explain()}—`explain()` returns a union of
   * array and `string` builders that rejects both array and non-array overrides; narrow `res.data`
   * with `typeof res.data === 'string'` instead.
   *
   * Match array cardinality: pass `Array<PartialRow>` for list queries and `PartialRow` (non-array)
   * after `.single()` or `.maybeSingle()` (passing an array after `.single()`, or a non-array on a
   * list query, produces a compile-time `{ Error: 'Type mismatch: ...' }` type). When called after
   * `.maybeSingle()`, `| null` is preserved automatically.
   *
   * Choosing `Options` (default `{ merge: true }` vs. `{ merge: false }`): by default
   * (`{ merge: true }`), {@link MergeDeep} deep-merges `NewResult` onto `T` while preserving
   * existing properties and any `[K: string]` index signature on `T`. On an untyped table query
   * (`T = Array<Record<string, unknown>>`), `{ merge: true }` therefore retains
   * `[K: string]: unknown` alongside your overridden fields (and if `NewResult` itself carries a
   * `[key: string]` index signature, {@link ExplicitKeys} collapses merged explicit keys). Pass
   * `{ merge: false }` to discard `T` completely instead of merging, or use
   * {@link Builder.returns | .returns()} for full-type replacement with a single type parameter. On
   * direct {@link FirebaseSql.rpc | sql.rpc()} chains where `T` is `unknown`, `{ merge: true }`
   * short-circuits directly to `NewResult`.
   *
   * Behavior and side effects: compile-time type cast only; performs no network I/O or runtime schema parsing, and preserves `Method` and `ThrowOnError`.
   *
   * @typeParam NewResult - Partial field override type (with default `{ merge: true }`) or full target type (with `{ merge: false }`).
   * @typeParam Options - `{ merge?: boolean }` controlling whether `NewResult` is deep-merged with `T` (`{ merge: true }`, default when `Options` is omitted) or replaces `T` (any other type, such as `{ merge: false }`).
   * @returns This {@link Builder} with `data` statically typed according to `NewResult` and `Options`.
   *
   * @example
   * Partially refine a `jsonb` `metadata` column on a typed `EventRow[]` query (`{ merge: true }` default):
   * ```ts
   * interface EventRow {
   *   id: string;
   *   code: string;
   *   title: string;
   *   metadata: unknown;
   * }
   *
   * interface EventMetadata {
   *   track: 'backend' | 'web' | 'mobile';
   *   level: 100 | 200 | 300;
   * }
   *
   * const res = await sql
   *   .from('events')
   *   .select('id, code, title, metadata')
   *   .eq('status', 'published')
   *   .returns<EventRow[]>()
   *   .overrideTypes<Array<{ metadata: EventMetadata }>>();
   *
   * if (res.success) {
   *   // id, code, and title are preserved from EventRow; metadata is narrowed to EventMetadata
   *   console.log(res.data[0]?.title, res.data[0]?.metadata.track);
   * }
   * ```
   *
   * @example
   * Replace an untyped table result completely using `{ merge: false }` (equivalent to `.returns<Venue[]>()`):
   * ```ts
   * interface Venue {
   *   id: string;
   *   slug: string;
   *   name: string;
   * }
   *
   * const res = await sql
   *   .from('venues')
   *   .select('id, slug, name')
   *   .overrideTypes<Venue[], { merge: false }>();
   * ```
   *
   * @public
   */
  overrideTypes<
    NewResult,
    Options extends {
      merge?: boolean | undefined;
    } = {
      merge: true;
    }
  >(): Builder<
    IsValidResultOverride<T, NewResult, false, false> extends true
      ? ContainsNull<T> extends true
        ? MergePartialResult<NewResult, NonNullable<T>, Options> | null
        : MergePartialResult<NewResult, T, Options>
      : CheckMatchingArrayTypes<T, NewResult>,
    Method,
    ThrowOnError
  >;
}
