/**
 * @license
 * Copyright 2021 Google LLC
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

import { FieldPath } from './path';

/**
 * An index definition for field indexes in Firestore.
 *
 * Every index is associated with a collection. The definition contains a list
 * of fields and their index kind (which can be `ASCENDING`, `DESCENDING` or
 * `CONTAINS` for ArrayContains/ArrayContainsAny queries).
 *
 * Unlike the backend, the SDK does not differentiate between collection or
 * collection group-scoped indices. Every index can be used for both single
 * collection and collection group queries.
 */
export class FieldIndex {
  /** An ID for an index that has not yet been added to persistence.  */
  static UNKNOWN_ID: -1;

  constructor(
    /**
     * The index ID. Returns -1 if the index ID is not available (e.g. the index
     * has not yet been persisted).
     */
    readonly indexId: number,
    /** The collection ID this index applies to. */
    readonly collectionGroup: string,
    /** The field segments for this index. */
    readonly segments: Segment[]
  ) {}
}

/** The type of the index, e.g. for which type of query it can be used. */
export const enum Kind {
  /**
   * Ordered index. Can be used for <, <=, ==, >=, >, !=, IN and NOT IN queries.
   */
  ASCENDING,
  /**
   * Ordered index. Can be used for <, <=, ==, >=, >, !=, IN and NOT IN queries.
   */
  DESCENDING,
  /** Contains index. Can be used for ArrayContains and ArrayContainsAny. */
  CONTAINS
}

/** An index component consisting of field path and index type.  */
export class Segment {
  constructor(
    /** The field path of the component. */
    readonly fieldPath: FieldPath,
    /** The fields sorting order. */
    readonly kind: Kind
  ) {}
}
