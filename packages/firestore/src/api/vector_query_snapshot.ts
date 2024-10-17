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

import { DocumentData } from '../lite-api/reference';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { VectorQuery } from '../lite-api/vector_query';

import { Firestore } from './database';
import { QueryDocumentSnapshot, SnapshotMetadata } from './snapshot';

/**
 * A `VectorQuerySnapshot` contains zero or more `DocumentSnapshot` objects
 * representing the results of a vector query. The documents can be accessed as an
 * array via the `docs` property or enumerated using the `forEach` method. The
 * number of documents can be determined via the `empty` and `size`
 * properties.
 */
export class VectorQuerySnapshot<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> {
  /**
   * Metadata about this snapshot, concerning its source and if it has local
   * modifications.
   */
  readonly metadata: SnapshotMetadata;

  /**
   * The VectorQuery on which you called `get` or `onSnapshot` in order to get this
   * `QuerySnapshot`.
   */
  readonly query: VectorQuery<AppModelType, DbModelType>;

  /** @hideconstructor */
  constructor(
    readonly _firestore: Firestore,
    readonly _userDataWriter: AbstractUserDataWriter,
    query: VectorQuery<AppModelType, DbModelType>,
    readonly _docs: Array<QueryDocumentSnapshot<AppModelType, DbModelType>>
  ) {
    this.metadata = new SnapshotMetadata(false, false);
    this.query = query;
  }

  /** An array of all the documents in the `QuerySnapshot`. */
  get docs(): Array<QueryDocumentSnapshot<AppModelType, DbModelType>> {
    const result: Array<QueryDocumentSnapshot<AppModelType, DbModelType>> = [];
    this.forEach(doc => result.push(doc));
    return result;
  }

  /** The number of documents in the `QuerySnapshot`. */
  get size(): number {
    return this._docs.length;
  }

  /** True if there are no documents in the `QuerySnapshot`. */
  get empty(): boolean {
    return this.size === 0;
  }

  /**
   * Enumerates all of the documents in the `QuerySnapshot`.
   *
   * @param callback - A callback to be called with a `QueryDocumentSnapshot` for
   * each document in the snapshot.
   * @param thisArg - The `this` binding for the callback.
   */
  forEach(
    callback: (
      result: QueryDocumentSnapshot<AppModelType, DbModelType>
    ) => void,
    thisArg?: unknown
  ): void {
    this._docs.forEach(doc => {
      callback.call(thisArg, doc);
    });
  }

  // TODO remove docChanges from the API design
}
