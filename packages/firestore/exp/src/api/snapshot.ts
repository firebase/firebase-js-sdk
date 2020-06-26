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

import * as firestore from '../../index';

import { DocumentKey } from '../../../src/model/document_key';
import { Document } from '../../../src/model/document';
import {
  ServerTimestampBehavior,
  UserDataWriter
} from '../../../src/api/user_data_writer';
import {
  fieldPathFromArgument,
  DocumentSnapshot as LiteDocumentSnapshot
} from '../../../lite/src/api/snapshot';
import { Firestore } from './database';
import { cast } from '../../../lite/src/api/util';
import { DocumentReference } from '../../../lite/src/api/reference';
import { SnapshotMetadata } from '../../../src/api/database';

const DEFAULT_SERVER_TIMESTAMP_BEHAVIOR: ServerTimestampBehavior = 'none';

export class DocumentSnapshot<T = firestore.DocumentData>
  extends LiteDocumentSnapshot<T>
  implements firestore.DocumentSnapshot<T> {
  private readonly _firestoreImpl: Firestore;

  constructor(
    readonly _firestore: Firestore,
    key: DocumentKey,
    document: Document | null,
    converter: firestore.FirestoreDataConverter<T> | null,
    readonly metadata: firestore.SnapshotMetadata
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
        /* converter= */ null,
        this.metadata
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
