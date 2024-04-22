/**
 * @license
 * Copyright 2017 Google LLC
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

import { ensureFirestoreConfigured, Firestore } from '../api/database';
import { AggregateImpl } from '../core/aggregate';
import { queryToAggregateTarget, queryToTarget } from '../core/query';
import { AggregateSpec } from '../lite-api/aggregate_types';
import { Query } from '../lite-api/reference';
import { cast } from '../util/input_validation';
import { mapToArray } from '../util/obj';

import { toQueryTarget, toRunAggregationQueryRequest } from './serializer';

/**
 * @internal
 * @private
 *
 * This function is for internal use only.
 *
 * Returns the `QueryTarget` representation of the given query. Returns `null`
 * if the Firestore client associated with the given query has not been
 * initialized or has been terminated.
 *
 * @param query - The Query to convert to proto representation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function _internalQueryToProtoQueryTarget(query: Query): any {
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const serializer = client._onlineComponents?.datastore.serializer;
  if (serializer === undefined) {
    return null;
  }
  return toQueryTarget(serializer!, queryToTarget(query._query)).queryTarget;
}

/**
 * @internal
 * @private
 *
 * This function is for internal use only.
 *
 * Returns
 * {
 *   request: RunAggregationQueryRequest;
 *   aliasMap: Record<string, string>;
 *   parent: ResourcePath;
 * }
 * which contains the proto representation of the given aggregation query.
 * Returns null if the Firestore client associated with the given query has not
 * been initialized or has been terminated.
 *
 * @param query - The Query to convert to proto representation.
 * @param aggregateSpec - The set of aggregations and their aliases.
 */
export function _internalAggregationQueryToProtoRunAggregationQueryRequest<
  AggregateSpecType extends AggregateSpec
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>(query: Query, aggregateSpec: AggregateSpecType): any {
  const aggregates = mapToArray(aggregateSpec, (aggregate, alias) => {
    return new AggregateImpl(
      alias,
      aggregate.aggregateType,
      aggregate._internalFieldPath
    );
  });
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const serializer = client._onlineComponents?.datastore.serializer;
  if (serializer === undefined) {
    return null;
  }

  return toRunAggregationQueryRequest(
    serializer!,
    queryToAggregateTarget(query._query),
    aggregates
  );
}
