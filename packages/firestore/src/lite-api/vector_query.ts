/**
 * @license
 * Copyright 2024 Google LLC
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

import { VectorQuery as InternalVectorQuery } from '../core/vector_query';

import { DocumentData, Query } from './reference';

export class VectorQuery<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> {
  /** @hideconstructor protected */
  constructor(
    private readonly _query: Query<AppModelType, DbModelType>,
    readonly _vectorQuery: InternalVectorQuery
  ) {}

  /** The query whose results participants in the vector search. Filtering
   * performed by the query will apply before the vector search.
   */
  get query(): Query<AppModelType, DbModelType> {
    return this._query;
  }
}
