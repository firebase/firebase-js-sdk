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

import { ObjectValue } from '../model/object_value';
import { FieldPath } from '../model/path';

import { Query } from './query';

/**
 * Union type representing the aggregate type to be performed.
 */
export type DistanceMeasure = 'EUCLIDEAN' | 'COSINE' | 'DOT_PRODUCT';

/**
 * Represents an VectorQuery.
 */
export interface VectorQuery {
  readonly query: Query;
  vectorField: FieldPath;
  queryVector: ObjectValue;
  limit: number;
  distanceMeasure: DistanceMeasure;
  distanceResultField?: FieldPath;
  distanceThreshold?: number;
}

/**
 * Concrete implementation of the VectorQuery type.
 */
class VectorQueryImpl implements VectorQuery {
  constructor(
    readonly query: Query,
    readonly vectorField: FieldPath,
    readonly queryVector: ObjectValue,
    readonly limit: number,
    readonly distanceMeasure: DistanceMeasure,
    readonly distanceResultField?: FieldPath,
    readonly distanceThreshold?: number
  ) {}
}

/**
 * Creates a new VectorQuery
 */
export function newVectorQuery(
  query: Query,
  vectorField: FieldPath,
  queryVector: ObjectValue,
  limit: number,
  distanceMeasure: DistanceMeasure,
  distanceResultField?: FieldPath,
  distanceThreshold?: number
): VectorQuery {
  return new VectorQueryImpl(
    query,
    vectorField,
    queryVector,
    limit,
    distanceMeasure,
    distanceResultField,
    distanceThreshold
  );
}
