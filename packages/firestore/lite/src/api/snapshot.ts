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

import { fieldPathFromDotSeparatedString } from '../../../src/api/user_data_reader';
import { UserDataWriter } from '../../../src/api/user_data_writer';
import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { FieldPath as InternalFieldPath } from '../../../src/model/path';
import * as firestore from '../../index';

import { Firestore } from './database';
import { FieldPath } from './field_path';
import { DocumentReference } from './reference';
import { cast } from './util';

export class DocumentSnapshot<T = firestore.DocumentData>
  implements firestore.DocumentSnapshot<T> {
  // Note: This class is stripped down version of the DocumentSnapshot in
  // the legacy SDK. The changes are:
  // - No support for SnapshotMetadata.
  // - No support for SnapshotOptions.

  constructor(
    private _firestore: Firestore,
    private _key: DocumentKey,
    private _document: Document | null,
    private _converter?: firestore.FirestoreDataConverter<T>
  ) {}

  get id(): string {
    return this._key.path.lastSegment();
  }

  get ref(): firestore.DocumentReference<T> {
    return new DocumentReference<T>(
      this._firestore,
      this._key,
      this._converter
    );
  }

  exists(): this is firestore.QueryDocumentSnapshot<T> {
    return this._document !== null;
  }

  data(): T | undefined {
    if (!this._document) {
      return undefined;
    } else if (this._converter) {
      // We only want to use the converter and create a new DocumentSnapshot
      // if a converter has been provided.
      const snapshot = new QueryDocumentSnapshot(
        this._firestore,
        this._key,
        this._document
      );
      return this._converter.fromFirestore(snapshot);
    } else {
      const userDataWriter = new UserDataWriter(
        this._firestore._databaseId,
        /* timestampsInSnapshots= */ false,
        /* serverTimestampBehavior=*/ 'none',
        key => new DocumentReference(this._firestore, key)
      );
      return userDataWriter.convertValue(this._document.toProto()) as T;
    }
  }

  get(fieldPath: string | firestore.FieldPath): unknown {
    if (this._document) {
      const value = this._document
        .data()
        .field(fieldPathFromArgument('DocumentSnapshot.get', fieldPath));
      if (value !== null) {
        const userDataWriter = new UserDataWriter(
          this._firestore._databaseId,
          /* timestampsInSnapshots= */ false,
          /* serverTimestampBehavior=*/ 'none',
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
  data(): T {
    return super.data() as T;
  }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */
export function fieldPathFromArgument(
  methodName: string,
  arg: string | firestore.FieldPath
): InternalFieldPath {
  if (typeof arg === 'string') {
    return fieldPathFromDotSeparatedString(methodName, arg);
  } else {
    const path = cast(arg, FieldPath);
    return path._internalPath;
  }
}
