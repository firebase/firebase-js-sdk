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

import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../../core/error';
import type {
  BuilderExecutionTracker,
  CreateBuilderFetch,
  MapPostgrestError,
  SqlClientState
} from '../../core/state';
import type {
  UntypedClientOptions,
  UntypedSchema
} from '../../core/untypedSchema';
import { validateHeaderName } from '../../network/headers';
import { composeSignals } from '../../network/transport';
import type {
  Builder,
  CheckMatchingArrayTypes,
  ContainsNull,
  IsValidResultOverride,
  MergePartialResult,
  OperationFailure,
  OperationResult,
  OperationSuccess
} from '../Builder';
import type {
  FilterBuilder,
  FilterOperator,
  FilterOrOptions,
  FilterTextSearchOptions,
  NarrowResultColumn
} from '../FilterBuilder';
import type {
  InvalidMethodError,
  TransformBuilder,
  TransformExplainOptions,
  TransformLimitOptions,
  TransformOrderOptions,
  TransformRangeOptions
} from '../TransformBuilder';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyPostgrestFilterBuilder =
  | PostgrestFilterBuilder<any, any, any, any, any>
  | PostgrestFilterBuilder<
      UntypedClientOptions,
      UntypedSchema,
      never,
      any,
      any,
      any,
      any,
      any
    >;
/* eslint-enable @typescript-eslint/no-explicit-any */

export class FilterBuilderImpl<T, Method = unknown> implements FilterBuilder<
  T,
  Method,
  false
> {
  private readonly _delegate: AnyPostgrestFilterBuilder;
  private readonly _state: Readonly<SqlClientState>;
  private readonly _createFetch: CreateBuilderFetch;
  private readonly _mapError: MapPostgrestError;
  private _shouldThrowOnError = false;

  constructor(
    delegate: AnyPostgrestFilterBuilder,
    state: Readonly<SqlClientState>,
    createFetch: CreateBuilderFetch,
    mapError: MapPostgrestError
  ) {
    this._delegate = delegate;
    this._state = state;
    this._createFetch = createFetch;
    this._mapError = mapError;
  }

  throwOnError(): FilterBuilder<T, Method, true> {
    // Keep _delegate in its default shouldThrowOnError = false mode so `await this._delegate`
    // always resolves with HTTP status/statusText intact instead of throwing a PostgrestError
    // that discards them, allowing _execute() to map all errors to FirebaseSqlError first.
    this._shouldThrowOnError = true;
    return this as unknown as FilterBuilder<T, Method, true>;
  }

  stripNulls(): this {
    // Delegate without catching so synchronous validation errors (e.g. `.csv().stripNulls()`)
    // propagate unwrapped as raw Error instances matching @supabase/postgrest-js.
    // `void` is used across synchronous builder mutations because PostgrestFilterBuilder is a lazy
    // PromiseLike that only executes when `.then()` is invoked, satisfying no-floating-promises.
    void this._delegate.stripNulls();
    return this;
  }

  setHeader(name: string, value: string): this {
    const headerName = validateHeaderName(name);
    void this._delegate.setHeader(headerName, value);
    return this;
  }

  retry(enabled: boolean): this {
    void this._delegate.retry(enabled);
    return this;
  }

  returns<NewResult>(): TransformBuilder<
    CheckMatchingArrayTypes<T, NewResult>,
    Method,
    false
  > {
    void this._delegate.returns();
    return this as unknown as TransformBuilder<
      CheckMatchingArrayTypes<T, NewResult>,
      Method,
      false
    >;
  }

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
    false
  > {
    void this._delegate.overrideTypes();
    return this as unknown as Builder<
      IsValidResultOverride<T, NewResult, false, false> extends true
        ? ContainsNull<T> extends true
          ? MergePartialResult<NewResult, NonNullable<T>, Options> | null
          : MergePartialResult<NewResult, T, Options>
        : CheckMatchingArrayTypes<T, NewResult>,
      false
    >;
  }

  select(
    columns?: string | undefined
  ): FilterBuilder<
    Method extends 'RPC'
      ? unknown extends T
        ? T
        : T extends readonly unknown[]
          ? Array<Record<string, unknown>>
          : Record<string, unknown>
      : Array<Record<string, unknown>>,
    Method,
    false
  > {
    void this._delegate.select(columns);
    return this as unknown as FilterBuilder<
      Method extends 'RPC'
        ? unknown extends T
          ? T
          : T extends readonly unknown[]
            ? Array<Record<string, unknown>>
            : Record<string, unknown>
        : Array<Record<string, unknown>>,
      Method,
      false
    >;
  }

  order(
    column: string,
    options?: Readonly<TransformOrderOptions> | undefined
  ): this {
    void this._delegate.order(column, options);
    return this;
  }

  limit(
    rows: number,
    options?: Readonly<TransformLimitOptions> | undefined
  ): this {
    void this._delegate.limit(rows, options);
    return this;
  }

  range(
    from: number,
    to: number,
    options?: Readonly<TransformRangeOptions> | undefined
  ): this {
    void this._delegate.range(from, to, options);
    return this;
  }

  abortSignal(signal: AbortSignal): this {
    void this._delegate.abortSignal(signal);
    return this;
  }

  single<
    ResultOne = unknown extends T
      ? Record<string, unknown>
      : T extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne, false> {
    void this._delegate.single();
    return this as unknown as Builder<ResultOne, false>;
  }

  maybeSingle<
    ResultOne = unknown extends T
      ? Record<string, unknown>
      : T extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne | null, false> {
    void this._delegate.maybeSingle();
    return this as unknown as Builder<ResultOne | null, false>;
  }

  csv(): Builder<string, false> {
    void this._delegate.csv();
    return this as unknown as Builder<string, false>;
  }

  geojson(): Builder<Record<string, unknown>, false> {
    void this._delegate.geojson();
    return this as unknown as Builder<Record<string, unknown>, false>;
  }

  explain(
    options?: Readonly<TransformExplainOptions> | undefined
  ): Builder<Array<Record<string, unknown>>, false> | Builder<string, false> {
    void this._delegate.explain(options);
    return this as unknown as
      Builder<Array<Record<string, unknown>>, false> | Builder<string, false>;
  }

  rollback(): this {
    void this._delegate.rollback();
    return this;
  }

  maxAffected(
    rows: number
  ): Method extends 'PATCH' | 'DELETE' | 'RPC'
    ? this
    : InvalidMethodError<'maxAffected method only available on update or delete'> {
    void this._delegate.maxAffected(rows);
    return this as unknown as Method extends 'PATCH' | 'DELETE' | 'RPC'
      ? this
      : InvalidMethodError<'maxAffected method only available on update or delete'>;
  }

  eq(column: string, value: NonNullable<unknown>): this {
    void this._delegate.eq(column, value);
    return this;
  }

  neq(column: string, value: unknown): this {
    void this._delegate.neq(column, value);
    return this;
  }

  gt(column: string, value: unknown): this {
    void this._delegate.gt(column, value);
    return this;
  }

  gte(column: string, value: unknown): this {
    void this._delegate.gte(column, value);
    return this;
  }

  lt(column: string, value: unknown): this {
    void this._delegate.lt(column, value);
    return this;
  }

  lte(column: string, value: unknown): this {
    void this._delegate.lte(column, value);
    return this;
  }

  like(column: string, pattern: string): this {
    void this._delegate.like(column, pattern);
    return this;
  }

  likeAllOf(column: string, patterns: readonly string[]): this {
    void this._delegate.likeAllOf(column, patterns);
    return this;
  }

  likeAnyOf(column: string, patterns: readonly string[]): this {
    void this._delegate.likeAnyOf(column, patterns);
    return this;
  }

  ilike(column: string, pattern: string): this {
    void this._delegate.ilike(column, pattern);
    return this;
  }

  ilikeAllOf(column: string, patterns: readonly string[]): this {
    void this._delegate.ilikeAllOf(column, patterns);
    return this;
  }

  ilikeAnyOf(column: string, patterns: readonly string[]): this {
    void this._delegate.ilikeAnyOf(column, patterns);
    return this;
  }

  regexMatch(column: string, pattern: string): this {
    void this._delegate.regexMatch(column, pattern);
    return this;
  }

  regexIMatch(column: string, pattern: string): this {
    void this._delegate.regexIMatch(column, pattern);
    return this;
  }

  is(column: string, value: boolean | null): this {
    void this._delegate.is(column, value);
    return this;
  }

  isDistinct(column: string, value: unknown): this {
    void this._delegate.isDistinct(column, value);
    return this;
  }

  in(column: string, values: readonly unknown[]): this {
    void this._delegate.in(column, values);
    return this;
  }

  notIn(column: string, values: readonly unknown[]): this {
    void this._delegate.notIn(column, values);
    return this;
  }

  contains<
    Value extends object & {
      readonly [K in keyof Value]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(column: string, value: string | readonly unknown[] | Value): this {
    void this._delegate.contains(
      column,
      value as string | readonly unknown[] | Record<string, unknown>
    );
    return this;
  }

  containedBy<
    Value extends object & {
      readonly [K in keyof Value]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(column: string, value: string | readonly unknown[] | Value): this {
    void this._delegate.containedBy(
      column,
      value as string | readonly unknown[] | Record<string, unknown>
    );
    return this;
  }

  rangeGt(column: string, range: string): this {
    void this._delegate.rangeGt(column, range);
    return this;
  }

  rangeGte(column: string, range: string): this {
    void this._delegate.rangeGte(column, range);
    return this;
  }

  rangeLt(column: string, range: string): this {
    void this._delegate.rangeLt(column, range);
    return this;
  }

  rangeLte(column: string, range: string): this {
    void this._delegate.rangeLte(column, range);
    return this;
  }

  rangeAdjacent(column: string, range: string): this {
    void this._delegate.rangeAdjacent(column, range);
    return this;
  }

  overlaps(column: string, value: string | readonly unknown[]): this {
    void this._delegate.overlaps(column, value);
    return this;
  }

  textSearch(
    column: string,
    query: string,
    options?: Readonly<FilterTextSearchOptions> | undefined
  ): this {
    void this._delegate.textSearch(column, query, options);
    return this;
  }

  match<
    Query extends object & {
      readonly [K in keyof Query]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(query: Query): this {
    void this._delegate.match(query as Record<string, unknown>);
    return this;
  }

  not<ColumnName extends string>(
    column: ColumnName,
    operator: 'is',
    value: null
  ): FilterBuilder<NarrowResultColumn<T, ColumnName>, Method, false> & this;
  not(
    column: string,
    operator: FilterOperator | (string & {}),
    value: unknown
  ): this;
  not<ColumnName extends string>(
    column: ColumnName,
    operator: FilterOperator | (string & {}),
    value: unknown
  ):
    | (FilterBuilder<NarrowResultColumn<T, ColumnName>, Method, false> & this)
    | this {
    void this._delegate.not(column, operator, value);
    return this as unknown as FilterBuilder<
      NarrowResultColumn<T, ColumnName>,
      Method,
      false
    > &
      this;
  }

  or(filters: string, options?: Readonly<FilterOrOptions> | undefined): this {
    void this._delegate.or(filters, options);
    return this;
  }

  filter(
    column: string,
    operator: `${'' | 'not.'}${FilterOperator}` | (string & {}),
    value: unknown
  ): this {
    void this._delegate.filter(column, operator, value);
    return this;
  }

  then<TResult1 = OperationResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: OperationResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
  ): PromiseLike<TResult1 | TResult2> {
    const result = this._execute();
    return onfulfilled || onrejected
      ? result.then(onfulfilled, onrejected)
      : (result as PromiseLike<TResult1 | TResult2>);
  }

  private _fail(
    error: FirebaseSqlError,
    status: number,
    statusText: string
  ): OperationResult<T> {
    if (this._shouldThrowOnError) {
      throw error;
    }
    const failure: OperationFailure = {
      success: false,
      error,
      data: null,
      count: null,
      status,
      statusText
    };
    return failure;
  }

  private _execute(): PromiseLike<OperationResult<T>> {
    // Bind a fresh per-execution tracker synchronously before invoking `this._delegate.then(...)`.
    // PostgrestFilterBuilder snapshots `this.fetch` and `this.signal` synchronously on entry before yielding microtasks.
    // Dynamic per-execution binding ensures concurrent executions of the same builder instance
    // (e.g. `Promise.all([query, query])`) each receive an isolated `BuilderExecutionTracker`
    // closure and a composed abort signal that interrupts retry sleeps on `terminate()`.
    const tracker: BuilderExecutionTracker = { clientError: null };
    const previousSignal = Reflect.get(this._delegate, 'signal') as
      | AbortSignal
      | undefined;
    const { signal: effectiveSignal, cleanup: cleanupSignal } = composeSignals(
      previousSignal,
      this._state.terminationSignal
    );
    Reflect.set(
      this._delegate,
      'fetch',
      this._createFetch(this._state, tracker)
    );
    if (effectiveSignal !== undefined) {
      Reflect.set(this._delegate, 'signal', effectiveSignal);
    }
    try {
      return this._delegate.then(
        raw => {
          cleanupSignal();
          // Re-check state.active and tracker.clientError after _delegate settles in case terminate()
          // was called in-flight or the transport recorded a pre-flight/token error and aborted fetchWithRetry.
          if (this._state.active === null) {
            return this._fail(
              new FirebaseSqlError(
                Code.NOT_INITIALIZED,
                'FirebaseSql instance has been terminated.',
                FirebaseSqlErrorCategory.SQL_CLIENT
              ),
              0,
              ''
            );
          }

          if (tracker.clientError !== null) {
            return this._fail(tracker.clientError, 0, '');
          }

          // @supabase/postgrest-js sets `success: error === null` after `JSON.parse(body)`,
          // so non-2xx responses with a `"null"` JSON body arrive with `raw.success === true`
          // and `raw.error === null` (whereas empty `404` rewrites normalize status to `200`/`204`).
          if (
            !raw.success ||
            raw.error !== null ||
            raw.status < 200 ||
            raw.status >= 300
          ) {
            return this._fail(
              this._mapError(raw.error, raw.status, raw.statusText),
              raw.status,
              raw.statusText
            );
          }

          const success: OperationSuccess<T> = {
            success: true,
            error: null,
            data: raw.data as T,
            count: raw.count,
            status: raw.status,
            statusText: raw.statusText
          };
          return success;
        },
        err => {
          cleanupSignal();
          throw err;
        }
      );
    } catch (err) {
      cleanupSignal();
      throw err;
    } finally {
      Reflect.set(this._delegate, 'fetch', undefined);
      Reflect.set(this._delegate, 'signal', previousSignal);
    }
  }
}
