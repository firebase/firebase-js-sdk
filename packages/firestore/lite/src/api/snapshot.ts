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

import { Firestore } from './database';
import { DocumentReference, queryEqual } from './reference';
import { FieldPath } from './field_path';
import { cast } from './util';
import { DocumentKey } from '../../../src/model/document_key';
import { Document } from '../../../src/model/document';
import { UserDataWriter } from '../../../src/api/user_data_writer';
import { FieldPath as InternalFieldPath } from '../../../src/model/path';
import {
  fieldPathFromDotSeparatedString,
  UntypedFirestoreDataConverter
} from '../../../src/api/user_data_reader';
import { arrayEquals } from '../../../src/util/misc';

export class DocumentSnapshot<T = firestore.DocumentData>
  implements firestore.DocumentSnapshot<T> {
  // Note: This class is stripped down version of the DocumentSnapshot in
  // the legacy SDK. The changes are:
  // - No support for SnapshotMetadata.
  // - No support for SnapshotOptions.

  constructor(
    public _firestore: Firestore,
    public _key: DocumentKey,
    public _document: Document | null,
    public _converter: UntypedFirestoreDataConverter<T> | null
  ) {}

  get id(): string {
    return this._key.path.lastSegment();
  }

  get ref(): firestore.DocumentReference<T> {
    return new DocumentReference<T>(
      this._firestore,
      this._key.path,
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
        this._document,
        /* converter= */ null
      );
      return this._converter.fromFirestore(snapshot);
    } else {
      const userDataWriter = new UserDataWriter(
        this._firestore._databaseId,
        /* timestampsInSnapshots= */ true,
        /* serverTimestampBehavior=*/ 'none',
        key =>
          new DocumentReference(
            this._firestore,
            key.path,
            /* converter= */ null
          )
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
          /* timestampsInSnapshots= */ true,
          /* serverTimestampBehavior=*/ 'none',
          key =>
            new DocumentReference(this._firestore, key.path, this._converter)
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

export class QuerySnapshot<T = firestore.DocumentData>
  implements firestore.QuerySnapshot<T> {
  constructor(
    readonly query: firestore.Query<T>,
    readonly _docs: Array<QueryDocumentSnapshot<T>>
  ) {}

  get docs(): Array<firestore.QueryDocumentSnapshot<T>> {
    return [...this._docs];
  }

  get size(): number {
    return this.docs.length;
  }

  get empty(): boolean {
    return this.docs.length === 0;
  }

  forEach(
    callback: (result: firestore.QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void {
    this._docs.forEach(callback, thisArg);
  }
}

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
      queryEqual(left.query, right.query) &&
      arrayEquals(left.docs, right.docs, snapshotEqual)
    );
  }

  return false;
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
