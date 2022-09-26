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
 * An `AggregateField`that captures input type T.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class AggregateField<T> {
  type = 'AggregateField';
}

/**
 * Creates and returns an aggregation field that counts the documents in the result set.
 * @returns An `AggregateField` object with number input type.
 */
export function count(): AggregateField<number> {
  return new AggregateField<number>();
}

/**
 * The union of all `AggregateField` types that are returned from the factory
 * functions.
 */
export type AggregateFieldType = ReturnType<typeof count>;

/**
 * A type whose values are all `AggregateField` objects.
 * This is used as an argument to the "getter" functions, and the snapshot will
 * map the same names to the corresponding values.
 */
export interface AggregateSpec {
  [field: string]: AggregateFieldType;
}

/**
 * A type whose keys are taken from an `AggregateSpec` type, and whose values
 * are the result of the aggregation performed by the corresponding
 * `AggregateField` from the input `AggregateSpec`.
 */
export type AggregateSpecData<T extends AggregateSpec> = {
  [P in keyof T]: T[P] extends AggregateField<infer U> ? U : never;
};

/**
 * An `AggregateQuerySnapshot` contains the results of running an aggregate query.
 */
export class AggregateQuerySnapshot<T extends AggregateSpec> {
  readonly type = 'AggregateQuerySnapshot';

  /** @hideconstructor */
  constructor(
    readonly query: Query<unknown>,
    private readonly _data: AggregateSpecData<T>
  ) {}

  /**
   * The results of the requested aggregations. The keys of the returned object
   * will be the same as those of the `AggregateSpec` object specified to the
   * aggregation method, and the values will be the corresponding aggregation
   * result.
   *
   * @returns The aggregation statistics result of running a query.
   */
  data(): AggregateSpecData<T> {
    return this._data;
  }
}
