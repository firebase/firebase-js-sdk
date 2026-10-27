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

import type { PostgrestQueryBuilder } from '@supabase/postgrest-js';

import type {
  CreateBuilderFetch,
  MapPostgrestError,
  ReadonlySqlClientState
} from '../../core/state';
import type { FilterBuilder } from '../FilterBuilder';
import type {
  QueryBuilder,
  QueryDeleteOptions,
  QueryInsertOptions,
  QuerySelectOptions,
  QueryUpdateOptions,
  QueryUpsertOptions
} from '../QueryBuilder';

import { FilterBuilderImpl, FilterDelegateHandle } from './FilterBuilderImpl';

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

type InternalPostgrestQueryBuilder = PostgrestQueryBuilder<
  UntypedClientOptions,
  UntypedSchema,
  UntypedTable,
  unknown
>;

export interface QueryDelegateHandle {
  url: URL;
  headers: Headers;
  schema?: string | undefined;
  fetch?: typeof fetch | undefined;
  urlLengthLimit: number;
}

export class QueryBuilderImpl implements QueryBuilder {
  readonly #delegate: InternalPostgrestQueryBuilder;
  readonly #state: ReadonlySqlClientState;
  readonly #createFetch: CreateBuilderFetch;
  readonly #mapError: MapPostgrestError;

  constructor(
    delegate: QueryDelegateHandle,
    state: ReadonlySqlClientState,
    createFetch: CreateBuilderFetch,
    mapError: MapPostgrestError
  ) {
    this.#delegate = delegate as InternalPostgrestQueryBuilder;
    this.#state = state;
    this.#createFetch = createFetch;
    this.#mapError = mapError;
  }

  #wrap<T, Method>(delegate: FilterDelegateHandle): FilterBuilder<T, Method> {
    return new FilterBuilderImpl<T, Method>(
      delegate,
      this.#state,
      this.#createFetch,
      this.#mapError
    );
  }

  select(
    columns?: string | undefined,
    options?: Readonly<QuerySelectOptions> | undefined
  ): FilterBuilder<Array<Record<string, unknown>>, 'GET'> {
    return this.#wrap(this.#delegate.select(columns, options));
  }

  insert<
    Row extends object & {
      readonly [K in keyof Row]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryInsertOptions> | undefined
  ): FilterBuilder<null, 'POST'> {
    return this.#wrap(
      this.#delegate.insert(
        values as Record<string, unknown> | Array<Record<string, unknown>>,
        options
      )
    );
  }

  upsert<
    Row extends object & {
      readonly [K in keyof Row]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryUpsertOptions> | undefined
  ): FilterBuilder<null, 'POST'> {
    return this.#wrap(
      this.#delegate.upsert(
        values as Record<string, unknown> | Array<Record<string, unknown>>,
        options
      )
    );
  }

  update<
    Row extends object & {
      readonly [K in keyof Row]: unknown;
    } & {
      readonly [Symbol.iterator]?: never;
    } = Record<string, unknown>
  >(
    values: Row,
    options?: Readonly<QueryUpdateOptions> | undefined
  ): FilterBuilder<null, 'PATCH'> {
    return this.#wrap(
      this.#delegate.update(values as Record<string, unknown>, options)
    );
  }

  delete(
    options?: Readonly<QueryDeleteOptions> | undefined
  ): FilterBuilder<null, 'DELETE'> {
    return this.#wrap(this.#delegate.delete(options));
  }
}
