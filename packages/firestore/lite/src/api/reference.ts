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

import { FirebaseFirestore } from './database';
import {
  newQueryForCollectionGroup,
  newQueryForPath,
  Query as InternalQuery,
  queryEquals
} from '../../../src/core/query';
import { DocumentKey, ResourcePath } from '../../../src/model/path';
import { AutoId } from '../../../src/util/misc';
import { FirestoreDataConverter } from './snapshot';
import { FieldPath } from './field_path';
import {
  cast,
  validateCollectionPath,
  validateDocumentPath,
  validateNonEmptyArgument
} from '../../../src/util/input_validation';
import { Code, FirestoreError } from '../../../src/util/error';
import { Compat } from '../../../src/api/compat';

/**
 * Document data (for use with {@link setDoc}) consists of fields mapped to
 * values.
 */
export interface DocumentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

/**
 * Update data (for use with {@link updateDoc}) consists of field paths (e.g.
 * 'foo' or 'foo.baz') mapped to values. Fields that contain dots reference
 * nested fields within the document.
 */
export interface UpdateData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [fieldPath: string]: any;
}

/**
 * An options object that configures the behavior of {@link setDoc}, {@link
 * WriteBatch#set} and {@link Transaction#set} calls. These calls can be
 * configured to perform granular merges instead of overwriting the target
 * documents in their entirety by providing a `SetOptions` with `merge: true`.
 *
 * @param merge - Changes the behavior of a `setDoc()` call to only replace the
 * values specified in its data argument. Fields omitted from the `setDoc()`
 * call remain untouched.
 * @param mergeFields - Changes the behavior of `setDoc()` calls to only replace
 * the specified field paths. Any field path that is not specified is ignored
 * and remains untouched.
 */
export type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };

/**
 * A `DocumentReference` refers to a document location in a Firestore database
 * and can be used to write, read, or listen to the location. The document at
 * the referenced location may or may not exist.
 */
export class DocumentReference<T = DocumentData> {
  /** The type of this Firestore reference. */
  readonly type = 'document';

  /**
   * The {@link FirebaseFirestore} the document is in.
   * This is useful for performing transactions, for example.
   */
  readonly firestore: FirebaseFirestore;

  /** @hideconstructor */
  constructor(
    firestore: FirebaseFirestore,
    readonly _converter: FirestoreDataConverter<T> | null,
    readonly _key: DocumentKey
  ) {
    this.firestore = firestore;
  }

  get _path(): ResourcePath {
    return this._key.path;
  }

  /**
   * The document's identifier within its collection.
   */
  get id(): string {
    return this._key.path.lastSegment();
  }

  /**
   * A string representing the path of the referenced document (relative
   * to the root of the database).
   */
  get path(): string {
    return this._key.path.canonicalString();
  }

  /**
   * The collection this `DocumentReference` belongs to.
   */
  get parent(): CollectionReference<T> {
    return new CollectionReference<T>(
      this.firestore,
      this._converter,
      this._key.path.popLast()
    );
  }

  /**
   * Applies a custom data converter to this `DocumentReference`, allowing you
   * to use your own custom model objects with Firestore. When you call {@link
   * setDoc}, {@link getDoc}, etc. with the returned `DocumentReference`
   * instance, the provided converter will convert between Firestore data and
   * your custom type `U`.
   *
   * @param converter - Converts objects to and from Firestore.
   * @returns A `DocumentReference<U>` that uses the provided converter.
   */
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, converter, this._key);
  }
}

/**
 * A `Query` refers to a Query which you can read or listen to. You can also
 * construct refined `Query` objects by adding filters and ordering.
 */
export class Query<T = DocumentData> {
  /** The type of this Firestore reference. */
  readonly type: 'query' | 'collection' = 'query';

  /**
   * The `FirebaseFirestore` for the Firestore database (useful for performing
   * transactions, etc.).
   */
  readonly firestore: FirebaseFirestore;

  // This is the lite version of the Query class in the main SDK.

  /** @hideconstructor protected */
  constructor(
    firestore: FirebaseFirestore,
    readonly _converter: FirestoreDataConverter<T> | null,
    readonly _query: InternalQuery
  ) {
    this.firestore = firestore;
  }

  /**
   * Applies a custom data converter to this query, allowing you to use your own
   * custom model objects with Firestore. When you call {@link getDocs} with
   * the returned query, the provided converter will convert between Firestore
   * data and your custom type `U`.
   *
   * @param converter - Converts objects to and from Firestore.
   * @returns A `Query<U>` that uses the provided converter.
   */
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U> {
    return new Query<U>(this.firestore, converter, this._query);
  }
}

/**
 * A `CollectionReference` object can be used for adding documents, getting
 * document references, and querying for documents (using {@link query}).
 */
export class CollectionReference<T = DocumentData> extends Query<T> {
  readonly type = 'collection';

  /** @hideconstructor */
  constructor(
    readonly firestore: FirebaseFirestore,
    converter: FirestoreDataConverter<T> | null,
    readonly _path: ResourcePath
  ) {
    super(firestore, converter, newQueryForPath(_path));
  }

  /** The collection's identifier. */
  get id(): string {
    return this._query.path.lastSegment();
  }

  /**
   * A string representing the path of the referenced collection (relative
   * to the root of the database).
   */
  get path(): string {
    return this._query.path.canonicalString();
  }

  /**
   * A reference to the containing `DocumentReference` if this is a
   * subcollection. If this isn't a subcollection, the reference is null.
   */
  get parent(): DocumentReference<DocumentData> | null {
    const parentPath = this._path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(
        this.firestore,
        /* converter= */ null,
        new DocumentKey(parentPath)
      );
    }
  }

  /**
   * Applies a custom data converter to this CollectionReference, allowing you
   * to use your own custom model objects with Firestore. When you call {@link
   * addDoc} with the returned `CollectionReference` instance, the provided
   * converter will convert between Firestore data and your custom type `U`.
   *
   * @param converter - Converts objects to and from Firestore.
   * @returns A `CollectionReference<U>` that uses the provided converter.
   */
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(this.firestore, converter, this._path);
  }
}

/**
 * Gets a `CollectionReference` instance that refers to the collection at
 * the specified absolute path.
 *
 * @param firestore - A reference to the root Firestore instance.
 * @param path - A slash-separated path to a collection.
 * @param pathSegments - Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @returns The `CollectionReference` instance.
 */
export function collection(
  firestore: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference - A reference to a collection.
 * @param path - A slash-separated path to a collection.
 * @param pathSegments - Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @returns The `CollectionReference` instance.
 */
export function collection(
  reference: CollectionReference<unknown>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference - A reference to a Firestore document.
 * @param path - A slash-separated path to a collection.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @returns The `CollectionReference` instance.
 */
export function collection(
  reference: DocumentReference,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
export function collection(
  parent:
    | FirebaseFirestore
    | DocumentReference<unknown>
    | CollectionReference<unknown>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData> {
  if (parent instanceof Compat) {
    parent = parent._delegate;
  }

  validateNonEmptyArgument('collection', 'path', path);
  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathSegments);
    validateCollectionPath(absolutePath);
    return new CollectionReference(parent, /* converter= */ null, absolutePath);
  } else {
    if (
      !(parent instanceof DocumentReference) &&
      !(parent instanceof CollectionReference)
    ) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Expected first argument to collection() to be a CollectionReference, ' +
          'a DocumentReference or FirebaseFirestore'
      );
    }
    const absolutePath = ResourcePath.fromString(
      parent.path,
      ...pathSegments
    ).child(ResourcePath.fromString(path));
    validateCollectionPath(absolutePath);
    return new CollectionReference(
      parent.firestore,
      /* converter= */ null,
      absolutePath
    );
  }
}

// TODO(firestorelite): Consider using ErrorFactory -
// https://github.com/firebase/firebase-js-sdk/blob/0131e1f/packages/util/src/errors.ts#L106

/**
 * Creates and returns a new `Query` instance that includes all documents in the
 * database that are contained in a collection or subcollection with the
 * given `collectionId`.
 *
 * @param firestore - A reference to the root Firestore instance.
 * @param collectionId - Identifies the collections to query over. Every
 * collection or subcollection with this ID as the last segment of its path
 * will be included. Cannot contain a slash.
 * @returns The created `Query`.
 */
export function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData> {
  firestore = cast(firestore, FirebaseFirestore);

  validateNonEmptyArgument('collectionGroup', 'collection id', collectionId);
  if (collectionId.indexOf('/') >= 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid collection ID '${collectionId}' passed to function ` +
        `collectionGroup(). Collection IDs must not contain '/'.`
    );
  }

  return new Query(
    firestore,
    /* converter= */ null,
    newQueryForCollectionGroup(collectionId)
  );
}

/**
 * Gets a `DocumentReference` instance that refers to the document at the
 * specified abosulute path.
 *
 * @param firestore - A reference to the root Firestore instance.
 * @param path - A slash-separated path to a document.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @returns The `DocumentReference` instance.
 */
export function doc(
  firestore: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path. If no path is specified, an
 * automatically-generated unique ID will be used for the returned
 * `DocumentReference`.
 *
 * @param reference - A reference to a collection.
 * @param path - A slash-separated path to a document. Has to be omitted to use
 * auto-genrated IDs.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @returns The `DocumentReference` instance.
 */
export function doc<T>(
  reference: CollectionReference<T>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference<T>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path.
 *
 * @param reference - A reference to a Firestore document.
 * @param path - A slash-separated path to a document.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @returns The `DocumentReference` instance.
 */
export function doc(
  reference: DocumentReference<unknown>,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
export function doc<T>(
  parent:
    | FirebaseFirestore
    | CollectionReference<T>
    | DocumentReference<unknown>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference {
  if (parent instanceof Compat) {
    parent = parent._delegate;
  }

  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    path = AutoId.newId();
  }
  validateNonEmptyArgument('doc', 'path', path);

  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathSegments);
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent,
      /* converter= */ null,
      new DocumentKey(absolutePath)
    );
  } else {
    if (
      !(parent instanceof DocumentReference) &&
      !(parent instanceof CollectionReference)
    ) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Expected first argument to collection() to be a CollectionReference, ' +
          'a DocumentReference or FirebaseFirestore'
      );
    }
    const absolutePath = parent._path.child(
      ResourcePath.fromString(path, ...pathSegments)
    );
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent.firestore,
      parent instanceof CollectionReference ? parent._converter : null,
      new DocumentKey(absolutePath)
    );
  }
}

/**
 * Returns true if the provided references are equal.
 *
 * @param left - A reference to compare.
 * @param right - A reference to compare.
 * @returns true if the references point to the same location in the same
 * Firestore database.
 */
export function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean {
  if (left instanceof Compat) {
    left = left._delegate;
  }
  if (right instanceof Compat) {
    right = right._delegate;
  }

  if (
    (left instanceof DocumentReference ||
      left instanceof CollectionReference) &&
    (right instanceof DocumentReference || right instanceof CollectionReference)
  ) {
    return (
      left.firestore === right.firestore &&
      left.path === right.path &&
      left._converter === right._converter
    );
  }
  return false;
}

/**
 * Returns true if the provided queries point to the same collection and apply
 * the same constraints.
 *
 * @param left - A `Query` to compare.
 * @param right - A `Query` to compare.
 * @returns true if the references point to the same location in the same
 * Firestore database.
 */
export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean {
  if (left instanceof Compat) {
    left = left._delegate;
  }
  if (right instanceof Compat) {
    right = right._delegate;
  }

  if (left instanceof Query && right instanceof Query) {
    return (
      left.firestore === right.firestore &&
      queryEquals(left._query, right._query) &&
      left._converter === right._converter
    );
  }
  return false;
}
