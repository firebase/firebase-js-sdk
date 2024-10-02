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

import {
  newVectorQuery,
  VectorQuery as InternalVectorQuery
} from '../core/vector_query';
import { ObjectValue } from '../model/object_value';

import { Firestore } from './database';
import { DocumentData, Query } from './reference';
import {
  fieldPathFromArgument,
  newUserDataReader,
  parseVectorValue,
  UserDataSource
} from './user_data_reader';
import { VectorQuery } from './vector_query';
import { VectorQueryOptions } from './vector_query_options';
import { VectorValue } from './vector_value';

export function findNearest<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  options: VectorQueryOptions
): VectorQuery<AppModelType, DbModelType> {
  const internalVectorQuery: InternalVectorQuery = newVectorQuery(
    query._query,
    fieldPathFromArgument('findNearest', options.vectorField),
    _parseQueryVector(query.firestore, options.queryVector),
    options.limit,
    options.distanceMeasure,
    options.distanceResultField
      ? fieldPathFromArgument('findNearest', options.distanceResultField)
      : undefined,
    options.distanceThreshold
  );
  return new VectorQuery<AppModelType, DbModelType>(query, internalVectorQuery);
}

/**
 * Creates a new ObjectValue proto value representing a VectorValue
 */
function _parseQueryVector(
  firestore: Firestore,
  queryVector: VectorValue | number[]
): ObjectValue {
  const parseContext = newUserDataReader(firestore).createContext(
    UserDataSource.Argument,
    'findNearest'
  );
  const value = parseVectorValue(queryVector, parseContext);
  return new ObjectValue(value);
}
