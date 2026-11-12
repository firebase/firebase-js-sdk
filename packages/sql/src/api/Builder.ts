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

/** Common HTTP status metadata returned on every operation response. */
export interface OperationBase {
  /** HTTP status code returned by the server (or `0` for client-side errors). */
  status: number;
  /** HTTP status text returned by the server. */
  statusText: string;
}

/** Successful operation response containing `data` and optional row `count`. */
export interface OperationSuccess<T> extends OperationBase {
  /** Indicates that the operation succeeded. */
  success: true;
  /** Always `null` when `success` is `true`. */
  error: null;
  /** Deserialized response payload (`null` when no representation is returned). */
  data: T;
  /** Total or affected row count when requested via `count` options, or `null`. */
  count: number | null;
}

/** Failed operation response containing a structured `FirebaseSqlError`. */
export interface OperationFailure extends OperationBase {
  /** Indicates that the operation failed. */
  success: false;
  /** Structured error describing the failure. */
  error: FirebaseSqlError;
  /** Always `null` when `success` is `false`. */
  data: null;
  /** Always `null` when `success` is `false`. */
  count: null;
}

/** Discriminated union returned when awaiting a builder without `.throwOnError()`. */
export type OperationResult<T> = OperationSuccess<T> | OperationFailure;

/** Evaluates to `true` when `T` is a known type that includes `null`. */
export type ContainsNull<T> = unknown extends T
  ? false
  : null extends T
    ? true
    : false;

/** Error marker returned at the type level when a select query string cannot be parsed. */
export type SelectQueryError<Message extends string> = {
  /** Flag indicating a select query type error. */
  error: true;
} & Message;

/** Validates that a custom result type preserves array vs. single-object cardinality. */
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

/** Enforces matching array or single-object cardinality for `.returns()` and `.overrideTypes()`. */
export type CheckMatchingArrayTypes<T, NewResult> =
  T extends SelectQueryError<string>
    ? NewResult
    : IsValidResultOverride<
          T,
          NewResult,
          {
            Error: 'Type mismatch: Cannot cast array result to a single object. Use .overrideTypes<Array<YourType>> or .returns<Array<YourType>> (deprecated) for array results or .single() to convert the result to a single object';
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

/** Flattens intersected object types for readable IDE hover tooltips in `.overrideTypes()`. */
export type Simplify<T> = T extends object
  ? {
      [K in keyof T]: T[K];
    }
  : T;

/** Keys of `T` declared as named properties rather than an index signature. */
export type ExplicitKeys<T> = {
  [K in keyof T]: string extends K ? never : K;
}[keyof T];

/** Type-level predicate matching object types other than arrays. */
export type IsPlainObject<T> = T extends unknown[]
  ? false
  : T extends object
    ? true
    : false;

/** Merges explicit keys from `New` into `Row`, recursively merging nested objects and arrays. */
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

/** Deeply merges `New` into `Row` while preserving any string index signature on `Row`. */
export type MergeDeep<New, Row> = Simplify<
  MergeExplicit<New, Row> &
    (string extends keyof Row
      ? {
          [K: string]: Row[string];
        }
      : {})
>;

/** Merges or replaces `Result$1` with `NewResult` according to the `.overrideTypes()` `merge` option. */
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

/** Awaitable terminal builder for executing a Firebase SQL operation and typing or configuring the response. */
export interface Builder<
  T,
  ThrowOnError extends boolean = false
> extends PromiseLike<
  ThrowOnError extends true ? OperationSuccess<T> : OperationResult<T>
> {
  /**
   * Throw a `FirebaseSqlError` when the operation fails instead of returning it in `result.error`.
   *
   * @example Throw on query failure
   * ```ts
   * const { data } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .throwOnError()
   *   .returns<Task[]>();
   * ```
   */
  throwOnError(): Builder<T, true>;

  /**
   * Omit `null` properties from JSON row objects returned by the server.
   *
   * @example Strip null fields from returned rows
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text, notes text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs', NULL);
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title, notes')
   *   .stripNulls()
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  stripNulls(): this;

  /**
   * Set a custom HTTP header on this request.
   *
   * @remarks
   * Throws a `FirebaseSqlError` (`'invalid-argument'`) if `name` is a protected auth or SDK header (such as `'authorization'`).
   *
   * @param name - HTTP header name.
   * @param value - HTTP header value.
   */
  setHeader(name: string, value: string): this;

  /**
   * Enable or disable automatic retry with backoff for transient failures on this request.
   *
   * @param enabled - Pass `false` to disable retries for non-idempotent operations, or `true` to enable retries.
   */
  retry(enabled: boolean): this;

  /**
   * Replace the TypeScript result type for `result.data`.
   *
   * @remarks
   * Array vs. single-object cardinality must match the query shape (use `Row[]` for multi-row queries or `Row` after `.single()`).
   *
   * @example Type a query result
   * ```sql
   * CREATE TABLE tasks (id int8 PRIMARY KEY, title text);
   * INSERT INTO tasks VALUES
   *   (1, 'Write docs');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('tasks')
   *   .select('id, title')
   *   .returns<Task[]>();
   * // data: [{ id: 1, title: 'Write docs' }]
   * ```
   */
  returns<NewResult>(): Builder<
    CheckMatchingArrayTypes<T, NewResult>,
    ThrowOnError
  >;

  /**
   * Override or merge the TypeScript result type for `result.data`.
   *
   * @remarks
   * By default (`{ merge: true }`), `NewResult` fields are merged into the current row type; set `{ merge: false }` for a full type replacement.
   *
   * @example Override specific column types
   * ```sql
   * CREATE TABLE orders (id int8 PRIMARY KEY, metadata jsonb);
   * INSERT INTO orders VALUES
   *   (1, '{"priority":"high"}');
   * ```
   * ```ts
   * const { data, error } = await sql
   *   .from('orders')
   *   .select('id, metadata')
   *   .overrideTypes<Array<{ metadata: { priority: string } }>>();
   * // data: [{ id: 1, metadata: { priority: 'high' } }]
   * ```
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
    ThrowOnError
  >;
}
