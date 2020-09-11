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

import { DocumentKey } from '../../../src/model/document_key';
import { Document } from '../../../src/model/document';
import {
  ServerTimestampBehavior,
  UserDataWriter
} from '../../../src/api/user_data_writer';
import {
  DocumentSnapshot as _LiteDocumentSnapshot,
  fieldPathFromArgument
} from '../../../lite/src/api/snapshot';
import { FirebaseFirestore } from './database';
import {
  DocumentData,
  DocumentReference,
  Query,
  queryEqual,
  SetOptions
} from '../../../lite/src/api/reference';
import {
  changesFromSnapshot,
  SnapshotMetadata
} from '../../../src/api/database';
import { Code, FirestoreError } from '../../../src/util/error';
import { ViewSnapshot } from '../../../src/core/view_snapshot';
import { FieldPath } from '../../../lite/src/api/field_path';
import { SnapshotListenOptions } from './reference';
import { Bytes } from '../../../lite/src/api/bytes';

const DEFAULT_SERVER_TIMESTAMP_BEHAVIOR: ServerTimestampBehavior = 'none';

export interface FirestoreDataConverter<T> {
  toFirestore(modelObject: T): DocumentData;
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    options?: SnapshotOptions
  ): T;
}

export interface SnapshotOptions {
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}

export type DocumentChangeType = 'added' | 'removed' | 'modified';

export interface DocumentChange<T = DocumentData> {
  readonly type: DocumentChangeType;
  readonly doc: QueryDocumentSnapshot<T>;
  readonly oldIndex: number;
  readonly newIndex: number;
}

export class DocumentSnapshot<T = DocumentData> extends _LiteDocumentSnapshot<
  T
> {
  private readonly _firestoreImpl: FirebaseFirestore;

  /** @hideconstructor protected */
  constructor(
    readonly _firestore: FirebaseFirestore,
    key: DocumentKey,
    document: Document | null,
    readonly metadata: SnapshotMetadata,
    converter: FirestoreDataConverter<T> | null
  ) {
    super(_firestore, key, document, converter);
    this._firestoreImpl = _firestore;
  }

  exists(): this is QueryDocumentSnapshot<T> {
    return super.exists();
  }

  data(options?: SnapshotOptions): T | undefined {
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
      return this._converter.fromFirestore(snapshot, options);
    } else {
      const userDataWriter = new UserDataWriter(
        this._firestoreImpl._databaseId,
        /* timestampsInSnapshots= */ true,
        options?.serverTimestamps || DEFAULT_SERVER_TIMESTAMP_BEHAVIOR,
        key =>
          new DocumentReference(
            this._firestore,
            /* converter= */ null,
            key.path
          ),
        bytes => new Bytes(bytes)
      );
      return userDataWriter.convertValue(this._document.toProto()) as T;
    }
  }

  // We are using `any` here to avoid an explicit cast by our users.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(fieldPath: string | FieldPath, options: SnapshotOptions = {}): any {
    if (this._document) {
      const value = this._document
        .data()
        .field(fieldPathFromArgument('DocumentSnapshot.get', fieldPath));
      if (value !== null) {
        const userDataWriter = new UserDataWriter(
          this._firestoreImpl._databaseId,
          /* timestampsInSnapshots= */ true,
          options.serverTimestamps || DEFAULT_SERVER_TIMESTAMP_BEHAVIOR,
          key =>
            new DocumentReference(this._firestore, this._converter, key.path),
          bytes => new Bytes(bytes)
        );
        return userDataWriter.convertValue(value);
      }
    }
    return undefined;
  }
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<
  T
> {
  data(options: SnapshotOptions = {}): T {
    return super.data(options) as T;
  }
}

export class QuerySnapshot<T = DocumentData> {
  readonly metadata: SnapshotMetadata;

  private _cachedChanges?: Array<DocumentChange<T>>;
  private _cachedChangesIncludeMetadataChanges?: boolean;

  /** @hideconstructor */
  constructor(
    readonly _firestore: FirebaseFirestore,
    readonly query: Query<T>,
    readonly _snapshot: ViewSnapshot
  ) {
    this.metadata = new SnapshotMetadata(
      _snapshot.hasPendingWrites,
      _snapshot.fromCache
    );
  }

  get docs(): Array<QueryDocumentSnapshot<T>> {
    const result: Array<QueryDocumentSnapshot<T>> = [];
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
    callback: (result: QueryDocumentSnapshot<T>) => void,
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

  docChanges(options: SnapshotListenOptions = {}): Array<DocumentChange<T>> {
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
      this.query.converter
    );
  }
}

// TODO(firestoreexp): Add tests for snapshotEqual with different snapshot
// metadata
export function snapshotEqual<T>(
  left: DocumentSnapshot<T> | QuerySnapshot<T>,
  right: DocumentSnapshot<T> | QuerySnapshot<T>
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
