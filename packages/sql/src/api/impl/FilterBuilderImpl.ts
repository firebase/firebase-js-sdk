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
import { validateHeaderName } from '../../core/settings';
import type {
  BuilderExecutionTracker,
  CreateBuilderFetch,
  MapPostgrestError,
  ReadonlySqlClientState
} from '../../core/state';
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

interface UntypedClientOptions {
  PostgrestVersion: '13';
}

interface UntypedRelationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

interface UntypedTable {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: UntypedRelationship[];
}

interface UntypedFunction {
  Args: Record<string, unknown>;
  Returns: unknown;
}

interface UntypedSchema {
  Tables: Record<string, UntypedTable>;
  Views: Record<string, UntypedTable>;
  Functions: Record<string, UntypedFunction>;
}

type InternalPostgrestFilterBuilder = PostgrestFilterBuilder<
  UntypedClientOptions,
  UntypedSchema,
  Record<string, unknown>,
  unknown,
  unknown,
  unknown,
  'PATCH',
  false
>;

export interface FilterDelegateHandle {
  stripNulls(): unknown;
  setHeader(name: string, value: string): unknown;
  retry(enabled: boolean): unknown;
  abortSignal(signal: AbortSignal): unknown;
  rollback(): unknown;
}

export class FilterBuilderImpl<T, Method = unknown> implements FilterBuilder<
  T,
  Method,
  false
> {
  readonly #delegate: InternalPostgrestFilterBuilder;
  readonly #state: ReadonlySqlClientState;
  readonly #createFetch: CreateBuilderFetch;
  readonly #mapError: MapPostgrestError;
  #shouldThrowOnError = false;

  constructor(
    delegate: FilterDelegateHandle,
    state: ReadonlySqlClientState,
    createFetch: CreateBuilderFetch,
    mapError: MapPostgrestError
  ) {
    this.#delegate = delegate as InternalPostgrestFilterBuilder;
    this.#state = state;
    this.#createFetch = createFetch;
    this.#mapError = mapError;
  }

  throwOnError(): FilterBuilder<T, Method, true> {
    // Keep #delegate in its default shouldThrowOnError = false mode so `await this.#delegate`
    // always resolves with HTTP status/statusText intact instead of throwing a PostgrestError
    // that discards them, allowing #execute() to map all errors to FirebaseSqlError first.
    this.#shouldThrowOnError = true;
    return this as unknown as FilterBuilder<T, Method, true>;
  }

  stripNulls(): this {
    // Delegate without catching so synchronous validation errors (e.g. `.csv().stripNulls()`)
    // propagate unwrapped as raw Error instances matching @supabase/postgrest-js.
    // `void` is used across synchronous builder mutations because PostgrestFilterBuilder is a lazy
    // PromiseLike that only executes when `.then()` is invoked, satisfying no-floating-promises.
    void this.#delegate.stripNulls();
    return this;
  }

  setHeader(name: string, value: string): this {
    const headerName = validateHeaderName(name);
    void this.#delegate.setHeader(headerName, value);
    return this;
  }

  retry(enabled: boolean): this {
    void this.#delegate.retry(enabled);
    return this;
  }

  returns<NewResult>(): TransformBuilder<
    CheckMatchingArrayTypes<T, NewResult>,
    Method,
    false
  > {
    void this.#delegate.returns<NewResult>();
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
    void this.#delegate.overrideTypes<NewResult, Options>();
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
    void this.#delegate.select(columns);
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
    void this.#delegate.order(column, options);
    return this;
  }

  limit(
    rows: number,
    options?: Readonly<TransformLimitOptions> | undefined
  ): this {
    void this.#delegate.limit(rows, options);
    return this;
  }

  range(
    from: number,
    to: number,
    options?: Readonly<TransformRangeOptions> | undefined
  ): this {
    void this.#delegate.range(from, to, options);
    return this;
  }

  abortSignal(signal: AbortSignal): this {
    void this.#delegate.abortSignal(signal);
    return this;
  }

  single<
    ResultOne = unknown extends T
      ? Record<string, unknown>
      : T extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne, false> {
    void this.#delegate.single();
    return this as unknown as Builder<ResultOne, false>;
  }

  maybeSingle<
    ResultOne = unknown extends T
      ? Record<string, unknown>
      : T extends ReadonlyArray<infer R>
        ? R
        : never
  >(): Builder<ResultOne | null, false> {
    void this.#delegate.maybeSingle();
    return this as unknown as Builder<ResultOne | null, false>;
  }

  csv(): Builder<string, false> {
    void this.#delegate.csv();
    return this as unknown as Builder<string, false>;
  }

  geojson(): Builder<Record<string, unknown>, false> {
    void this.#delegate.geojson();
    return this as unknown as Builder<Record<string, unknown>, false>;
  }

  explain(
    options?: Readonly<TransformExplainOptions> | undefined
  ): Builder<Array<Record<string, unknown>>, false> | Builder<string, false> {
    void this.#delegate.explain(options);
    return this as unknown as
      Builder<Array<Record<string, unknown>>, false> | Builder<string, false>;
  }

  rollback(): this {
    void this.#delegate.rollback();
    return this;
  }

  maxAffected(
    rows: number
  ): Method extends 'PATCH' | 'DELETE' | 'RPC'
    ? this
    : InvalidMethodError<'maxAffected method only available on update or delete'> {
    void this.#delegate.maxAffected(rows);
    return this as unknown as Method extends 'PATCH' | 'DELETE' | 'RPC'
      ? this
      : InvalidMethodError<'maxAffected method only available on update or delete'>;
  }

  eq(column: string, value: NonNullable<unknown>): this {
    void this.#delegate.eq(column, value);
    return this;
  }

  neq(column: string, value: unknown): this {
    void this.#delegate.neq(column, value);
    return this;
  }

  gt(column: string, value: unknown): this {
    void this.#delegate.gt(column, value);
    return this;
  }

  gte(column: string, value: unknown): this {
    void this.#delegate.gte(column, value);
    return this;
  }

  lt(column: string, value: unknown): this {
    void this.#delegate.lt(column, value);
    return this;
  }

  lte(column: string, value: unknown): this {
    void this.#delegate.lte(column, value);
    return this;
  }

  like(column: string, pattern: string): this {
    void this.#delegate.like(column, pattern);
    return this;
  }

  likeAllOf(column: string, patterns: readonly string[]): this {
    void this.#delegate.likeAllOf(column, patterns);
    return this;
  }

  likeAnyOf(column: string, patterns: readonly string[]): this {
    void this.#delegate.likeAnyOf(column, patterns);
    return this;
  }

  ilike(column: string, pattern: string): this {
    void this.#delegate.ilike(column, pattern);
    return this;
  }

  ilikeAllOf(column: string, patterns: readonly string[]): this {
    void this.#delegate.ilikeAllOf(column, patterns);
    return this;
  }

  ilikeAnyOf(column: string, patterns: readonly string[]): this {
    void this.#delegate.ilikeAnyOf(column, patterns);
    return this;
  }

  regexMatch(column: string, pattern: string): this {
    void this.#delegate.regexMatch(column, pattern);
    return this;
  }

  regexIMatch(column: string, pattern: string): this {
    void this.#delegate.regexIMatch(column, pattern);
    return this;
  }

  is(column: string, value: boolean | null): this {
    void this.#delegate.is(column, value);
    return this;
  }

  isDistinct(column: string, value: unknown): this {
    void this.#delegate.isDistinct(column, value);
    return this;
  }

  in(column: string, values: readonly unknown[]): this {
    void this.#delegate.in(column, values);
    return this;
  }

  notIn(column: string, values: readonly unknown[]): this {
    void this.#delegate.notIn(column, values);
    return this;
  }

  contains<
    Value extends object & {
      readonly [K in keyof Value]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(column: string, value: string | readonly unknown[] | Value): this {
    void this.#delegate.contains(
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
    void this.#delegate.containedBy(
      column,
      value as string | readonly unknown[] | Record<string, unknown>
    );
    return this;
  }

  rangeGt(column: string, range: string): this {
    void this.#delegate.rangeGt(column, range);
    return this;
  }

  rangeGte(column: string, range: string): this {
    void this.#delegate.rangeGte(column, range);
    return this;
  }

  rangeLt(column: string, range: string): this {
    void this.#delegate.rangeLt(column, range);
    return this;
  }

  rangeLte(column: string, range: string): this {
    void this.#delegate.rangeLte(column, range);
    return this;
  }

  rangeAdjacent(column: string, range: string): this {
    void this.#delegate.rangeAdjacent(column, range);
    return this;
  }

  overlaps(column: string, value: string | readonly unknown[]): this {
    void this.#delegate.overlaps(column, value);
    return this;
  }

  textSearch(
    column: string,
    query: string,
    options?: Readonly<FilterTextSearchOptions> | undefined
  ): this {
    void this.#delegate.textSearch(column, query, options);
    return this;
  }

  match<
    Query extends object & {
      readonly [K in keyof Query]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(query: Query): this {
    void this.#delegate.match(query as Record<string, unknown>);
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
    void this.#delegate.not(column, operator, value);
    return this as unknown as FilterBuilder<
      NarrowResultColumn<T, ColumnName>,
      Method,
      false
    > &
      this;
  }

  or(filters: string, options?: Readonly<FilterOrOptions> | undefined): this {
    void this.#delegate.or(filters, options);
    return this;
  }

  filter(
    column: string,
    operator: `${'' | 'not.'}${FilterOperator}` | (string & {}),
    value: unknown
  ): this {
    void this.#delegate.filter(column, operator, value);
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
    return this.#execute().then(onfulfilled, onrejected);
  }

  #fail(
    error: FirebaseSqlError,
    status: number,
    statusText: string
  ): OperationResult<T> {
    if (this.#shouldThrowOnError) {
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

  async #execute(): Promise<OperationResult<T>> {
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

    // Bind a fresh per-execution tracker synchronously before invoking `#delegate.then(...)`,
    // which snapshots `this.fetch` synchronously on entry before yielding, then clear
    // `#delegate.fetch` so long-lived builders do not retain the execution's tracker closure.
    const tracker: BuilderExecutionTracker = { clientError: null };
    (this.#delegate as unknown as { fetch: typeof fetch | undefined }).fetch =
      this.#createFetch(this.#state, tracker);
    let pending: PromiseLike<Awaited<InternalPostgrestFilterBuilder>>;
    try {
      pending = this.#delegate.then(res => res);
    } finally {
      (this.#delegate as unknown as { fetch: typeof fetch | undefined }).fetch =
        undefined;
    }
    const raw = await pending;

    // Re-check state.active and tracker.clientError after awaiting #delegate in case terminate()
    // was called in-flight or the transport recorded a pre-flight/token error and aborted fetchWithRetry.
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

    if (tracker.clientError !== null) {
      return this.#fail(tracker.clientError, 0, '');
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
      return this.#fail(
        this.#mapError(raw.error, raw.status, raw.statusText),
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
  }
}
