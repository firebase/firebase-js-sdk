/**
 * @license
 * Copyright 2022 Google LLC
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

import { Query } from './reference';

/**
 * Represents an aggregation that can be performed by Firestore.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class AggregateField<T> {
  /** A type string to uniquely identify instances of this class. */
  type = 'AggregateField';
}

/**
 * The union of all `AggregateField` types that are supported by Firestore.
 */
export type AggregateFieldType = AggregateField<number>;

/**
 * A type whose property values are all `AggregateField` objects.
 */
export interface AggregateSpec {
  [field: string]: AggregateFieldType;
}

/**
 * A type whose keys are taken from an `AggregateSpec`, and whose values are the
 * result of the aggregation performed by the corresponding `AggregateField`
 * from the input `AggregateSpec`.
 */
export type AggregateSpecData<T extends AggregateSpec> = {
  [P in keyof T]: T[P] extends AggregateField<infer U> ? U : never;
};

/**
 * The results of executing an aggregation query.
 */
export class AggregateQuerySnapshot<T extends AggregateSpec> {
  /** A type string to uniquely identify instances of this class. */
  readonly type = 'AggregateQuerySnapshot';

  /**
   * The underlying query over which the aggregations recorded in this
   * `AggregateQuerySnapshot` were performed.
   */
  readonly query: Query<unknown>;

  /** @hideconstructor */
  constructor(
    query: Query<unknown>,
    private readonly _data: AggregateSpecData<T>
  ) {
    this.query = query;
  }

  /**
   * Returns the results of the aggregations performed over the underlying
   * query.
   *
   * The keys of the returned object will be the same as those of the
   * `AggregateSpec` object specified to the aggregation method, and the values
   * will be the corresponding aggregation result.
   *
   * @returns The results of the aggregations performed over the underlying
   * query.
   */
  data(): AggregateSpecData<T> {
    return this._data;
  }
}
