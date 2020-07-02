/**
 * @license
 * Copyright 2020 Google LLC
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
  DocumentReference,
  Query,
  queryEqual
} from '../../../lite/src/api/reference';
import {
  fieldPathFromArgument,
  DocumentSnapshot as LiteDocumentSnapshot
} from '../../../lite/src/api/snapshot';
import { cast } from '../../../lite/src/api/util';
import {
  changesFromSnapshot,
  SnapshotMetadata
} from '../../../src/api/database';
import {
  ServerTimestampBehavior,
  UserDataWriter
} from '../../../src/api/user_data_writer';
import { ViewSnapshot } from '../../../src/core/view_snapshot';
import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { Code, FirestoreError } from '../../../src/util/error';
import * as firestore from '../../index';

import { Firestore } from './database';

const DEFAULT_SERVER_TIMESTAMP_BEHAVIOR: ServerTimestampBehavior = 'none';

export class DocumentSnapshot<T = firestore.DocumentData>
  extends LiteDocumentSnapshot<T>
  implements firestore.DocumentSnapshot<T> {
  private readonly _firestoreImpl: Firestore;

  constructor(
    readonly _firestore: Firestore,
    key: DocumentKey,
    document: Document | null,
    readonly metadata: firestore.SnapshotMetadata,
    converter: firestore.FirestoreDataConverter<T> | null
  ) {
    super(_firestore, key, document, converter);
    this._firestoreImpl = cast(_firestore, Firestore);
  }

  exists(): this is firestore.QueryDocumentSnapshot<T> {
    return super.exists();
  }

  data(options: firestore.SnapshotOptions = {}): T | undefined {
    if (!this._document) {
      return undefined;
    } else if (this._converter) {
      // We only want to use the converter and create a new DocumentSnapshot
      // if a converter has been provided.
      const snapshot = new QueryDocumentSnapshot(
        this._firestore,
        this._key,
        this._document,
        this.metadata,
        /* converter= */ null
      );
      return this._converter.fromFirestore(snapshot);
    } else {
      const userDataWriter = new UserDataWriter(
        this._firestoreImpl._databaseId,
        /* timestampsInSnapshots= */ true,
        options.serverTimestamps || DEFAULT_SERVER_TIMESTAMP_BEHAVIOR,
        key =>
          new DocumentReference(this._firestore, key, /* converter= */ null)
      );
      return userDataWriter.convertValue(this._document.toProto()) as T;
    }
  }

  get(
    fieldPath: string | firestore.FieldPath,
    options: firestore.SnapshotOptions = {}
  ): unknown {
    if (this._document) {
      const value = this._document
        .data()
        .field(fieldPathFromArgument('DocumentSnapshot.get', fieldPath));
      if (value !== null) {
        const userDataWriter = new UserDataWriter(
          this._firestoreImpl._databaseId,
          /* timestampsInSnapshots= */ true,
          options.serverTimestamps || DEFAULT_SERVER_TIMESTAMP_BEHAVIOR,
          key => new DocumentReference(this._firestore, key, this._converter)
        );
        return userDataWriter.convertValue(value);
      }
    }
    return undefined;
  }
}

export class QueryDocumentSnapshot<T = firestore.DocumentData>
  extends DocumentSnapshot<T>
  implements firestore.QueryDocumentSnapshot<T> {
  data(options: firestore.SnapshotOptions = {}): T {
    return super.data(options) as T;
  }
}

export class QuerySnapshot<T = firestore.DocumentData>
  implements firestore.QuerySnapshot<T> {
  readonly metadata: SnapshotMetadata;

  private _cachedChanges?: Array<firestore.DocumentChange<T>>;
  private _cachedChangesIncludeMetadataChanges?: boolean;

  constructor(
    readonly _firestore: Firestore,
    readonly query: Query<T>,
    readonly _snapshot: ViewSnapshot
  ) {
    this.metadata = new SnapshotMetadata(
      _snapshot.hasPendingWrites,
      _snapshot.fromCache
    );
  }

  get docs(): Array<firestore.QueryDocumentSnapshot<T>> {
    const result: Array<firestore.QueryDocumentSnapshot<T>> = [];
    this.forEach(doc => result.push(doc));
    return result;
  }

  get size(): number {
    return this._snapshot.docs.size;
  }

  get empty(): boolean {
    return this.size === 0;
  }

  forEach(
    callback: (result: firestore.QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void {
    this._snapshot.docs.forEach(doc => {
      callback.call(
        thisArg,
        this._convertToDocumentSnapshot(
          doc,
          this._snapshot.fromCache,
          this._snapshot.mutatedKeys.has(doc.key)
        )
      );
    });
  }

  docChanges(
    options: firestore.SnapshotListenOptions = {}
  ): Array<firestore.DocumentChange<T>> {
    const includeMetadataChanges = !!options.includeMetadataChanges;

    if (includeMetadataChanges && this._snapshot.excludesMetadataChanges) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'To include metadata changes with your document changes, you must ' +
          'also pass { includeMetadataChanges:true } to onSnapshot().'
      );
    }

    if (
      !this._cachedChanges ||
      this._cachedChangesIncludeMetadataChanges !== includeMetadataChanges
    ) {
      this._cachedChanges = changesFromSnapshot<QueryDocumentSnapshot<T>>(
        this._snapshot,
        includeMetadataChanges,
        this._convertToDocumentSnapshot.bind(this)
      );
      this._cachedChangesIncludeMetadataChanges = includeMetadataChanges;
    }

    return this._cachedChanges;
  }

  private _convertToDocumentSnapshot(
    doc: Document,
    fromCache: boolean,
    hasPendingWrites: boolean
  ): QueryDocumentSnapshot<T> {
    return new QueryDocumentSnapshot<T>(
      this._firestore,
      doc.key,
      doc,
      new SnapshotMetadata(hasPendingWrites, fromCache),
      this.query._converter
    );
  }
}

// TODO(firestoreexp): Add tests for snapshotEqual with different snapshot
// metadata
export function snapshotEqual<T>(
  left: firestore.DocumentSnapshot<T> | firestore.QuerySnapshot<T>,
  right: firestore.DocumentSnapshot<T> | firestore.QuerySnapshot<T>
): boolean {
  if (left instanceof DocumentSnapshot && right instanceof DocumentSnapshot) {
    return (
      left._firestore === right._firestore &&
      left._key.isEqual(right._key) &&
      (left._document === null
        ? right._document === null
        : left._document.isEqual(right._document)) &&
      left._converter === right._converter
    );
  } else if (left instanceof QuerySnapshot && right instanceof QuerySnapshot) {
    return (
      left._firestore === right._firestore &&
      queryEqual(left.query, right.query) &&
      left.metadata.isEqual(right.metadata) &&
      left._snapshot.isEqual(right._snapshot)
    );
  }

  return false;
}
