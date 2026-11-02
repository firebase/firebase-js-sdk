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
  SqlClientState
} from '../../core/state';
import type {
  UntypedClientOptions,
  UntypedSchema,
  UntypedTable
} from '../../core/untypedSchema';
import type { FilterBuilder } from '../FilterBuilder';
import type {
  NonIterable,
  QueryBuilder,
  QueryDeleteOptions,
  QueryInsertOptions,
  QuerySelectOptions,
  QueryUpdateOptions,
  QueryUpsertOptions
} from '../QueryBuilder';

import {
  type AnyPostgrestFilterBuilder,
  FilterBuilderImpl
} from './FilterBuilderImpl';

export class QueryBuilderImpl implements QueryBuilder {
  private readonly _delegate: PostgrestQueryBuilder<
    UntypedClientOptions,
    UntypedSchema,
    UntypedTable
  >;
  private readonly _state: Readonly<SqlClientState>;
  private readonly _createFetch: CreateBuilderFetch;
  private readonly _mapError: MapPostgrestError;

  constructor(
    delegate: PostgrestQueryBuilder<
      UntypedClientOptions,
      UntypedSchema,
      UntypedTable
    >,
    state: Readonly<SqlClientState>,
    createFetch: CreateBuilderFetch,
    mapError: MapPostgrestError
  ) {
    this._delegate = delegate;
    this._state = state;
    this._createFetch = createFetch;
    this._mapError = mapError;
  }

  private _wrap<T, Method>(
    delegate: AnyPostgrestFilterBuilder
  ): FilterBuilder<T, Method> {
    return new FilterBuilderImpl<T, Method>(
      delegate,
      this._state,
      this._createFetch,
      this._mapError
    );
  }

  select(
    columns?: string | undefined,
    options?: Readonly<QuerySelectOptions> | undefined
  ): FilterBuilder<Array<Record<string, unknown>>, 'GET'> {
    return this._wrap(this._delegate.select(columns, options));
  }

  insert<
    Row extends NonIterable<
      object & {
        readonly [K in keyof Row]: unknown;
      }
    > = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryInsertOptions> | undefined
  ): FilterBuilder<null, 'POST'> {
    return this._wrap(
      this._delegate.insert(
        values as Record<string, unknown> | Array<Record<string, unknown>>,
        options
      )
    );
  }

  upsert<
    Row extends NonIterable<
      object & {
        readonly [K in keyof Row]: unknown;
      }
    > = Record<string, unknown>
  >(
    values: Row | readonly Row[],
    options?: Readonly<QueryUpsertOptions> | undefined
  ): FilterBuilder<null, 'POST'> {
    return this._wrap(
      this._delegate.upsert(
        values as Record<string, unknown> | Array<Record<string, unknown>>,
        options
      )
    );
  }

  update<
    Row extends NonIterable<
      object & {
        readonly [K in keyof Row]: unknown;
      }
    > = Record<string, unknown>
  >(
    values: Row,
    options?: Readonly<QueryUpdateOptions> | undefined
  ): FilterBuilder<null, 'PATCH'> {
    return this._wrap(
      this._delegate.update(values as Record<string, unknown>, options)
    );
  }

  delete(
    options?: Readonly<QueryDeleteOptions> | undefined
  ): FilterBuilder<null, 'DELETE'> {
    return this._wrap(this._delegate.delete(options));
  }
}
