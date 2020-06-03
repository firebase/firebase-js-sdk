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
import { Firestore } from './database';
import { DocumentKeyReference } from '../../../src/api/user_data_reader';
import { Query as InternalQuery } from '../../../src/core/query';
import { FirebaseFirestore, FirestoreDataConverter } from '../../index';
import { ResourcePath } from '../../../src/model/path';
import { AutoId } from '../../../src/util/misc';
import { cast } from './util';
import {
  validateArgType,
  validateCollectionPath,
  validateDocumentPath
} from '../../../src/util/input_validation';

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = firestore.DocumentData>
  extends DocumentKeyReference<T>
  implements firestore.DocumentReference<T> {
  constructor(
    readonly firestore: Firestore,
    key: DocumentKey,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {
    super(firestore._databaseId, key, _converter);
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get path(): string {
    return this._key.path.canonicalString();
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, this._key, converter);
  }
}

export class Query<T = firestore.DocumentData> implements firestore.Query<T> {
  constructor(
    readonly firestore: Firestore,
    readonly _query: InternalQuery,
    readonly _converter?: FirestoreDataConverter<T>
  ) {}

  where(
    fieldPath: string | firestore.FieldPath,
    opStr: firestore.WhereFilterOp,
    value: unknown
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  orderBy(
    fieldPath: string | firestore.FieldPath,
    directionStr?: firestore.OrderByDirection
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  limit(limit: number): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  limitToLast(limit: number): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  startAfter(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  startAt(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  endAt(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  endBefore(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.Query<U> {
    return new Query<U>(this.firestore, this._query, converter);
  }
}

export class CollectionReference<T = firestore.DocumentData> extends Query<T>
  implements firestore.CollectionReference<T> {
  constructor(
    readonly firestore: Firestore,
    readonly _path: ResourcePath,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {
    super(firestore, InternalQuery.atPath(_path), _converter);
  }

  get id(): string {
    return this._query.path.lastSegment();
  }

  get path(): string {
    return this._query.path.canonicalString();
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.CollectionReference<U> {
    return new CollectionReference<U>(this.firestore, this._path, converter);
  }
}

export function collection(
  firestore: FirebaseFirestore,
  collectionPath: string
): CollectionReference<firestore.DocumentData>;
export function collection(
  reference: DocumentReference,
  collectionPath: string
): CollectionReference<firestore.DocumentData>;
export function collection(
  parent: firestore.FirebaseFirestore | firestore.DocumentReference<unknown>,
  relativePath: string
): CollectionReference<firestore.DocumentData> {
  validateArgType('doc', 'non-empty string', 2, relativePath);
  const path = ResourcePath.fromString(relativePath);
  if (parent instanceof Firestore) {
    validateCollectionPath(path);
    return new CollectionReference(parent, path);
  } else {
    const doc = cast(parent, DocumentReference);
    const absolutePath = doc._key.path.child(path);
    validateCollectionPath(absolutePath);
    return new CollectionReference(doc.firestore, absolutePath);
  }
}

export function doc(
  firestore: FirebaseFirestore,
  documentPath: string
): DocumentReference<firestore.DocumentData>;
export function doc<T>(
  reference: CollectionReference<T>,
  documentPath?: string
): DocumentReference<T>;
export function doc<T>(
  parent: firestore.FirebaseFirestore | firestore.CollectionReference<T>,
  relativePath?: string
): DocumentReference {
  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    relativePath = AutoId.newId();
  }
  validateArgType('doc', 'non-empty string', 2, relativePath);
  const path = ResourcePath.fromString(relativePath!);
  if (parent instanceof Firestore) {
    validateDocumentPath(path);
    return new DocumentReference(parent, new DocumentKey(path));
  } else {
    const coll = cast(parent, CollectionReference);
    const absolutePath = coll._path.child(path);
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      coll.firestore,
      new DocumentKey(absolutePath),
      coll._converter
    );
  }
}

export function parent(
  reference: CollectionReference<unknown>
): DocumentReference<firestore.DocumentData> | null;
export function parent<T>(
  reference: DocumentReference<T>
): CollectionReference<T>;
export function parent<T>(
  child: firestore.CollectionReference<unknown> | firestore.DocumentReference<T>
): DocumentReference<firestore.DocumentData> | CollectionReference<T> | null {
  if (child instanceof CollectionReference) {
    const parentPath = child._path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(
        child.firestore,
        new DocumentKey(parentPath)
      );
    }
  } else {
    const doc = cast<DocumentReference<T>>(child, DocumentReference);
    return new CollectionReference<T>(
      doc.firestore,
      doc._key.path.popLast(),
      doc._converter
    );
  }
}
